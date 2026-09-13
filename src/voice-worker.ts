import {env,pipeline,TextStreamer} from '@huggingface/transformers';
// A single WASM thread works in embedded browsers without cross-origin isolation.
env.allowLocalModels=false;
env.backends.onnx.wasm!.numThreads=1;
// Extended ORT optimization rejects older Whisper q8 scales (onnxruntime issue #28306).
let model:ReturnType<typeof pipeline<'automatic-speech-recognition'>>|null=null;
let queue=Promise.resolve();
async function run(event:MessageEvent<{id:number;audio?:Float32Array}>){
 const {id,audio}=event.data;
 try{
  model??=pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{
   device:'wasm',dtype:'q8',session_options:{graphOptimizationLevel:'basic'},progress_callback:(progress:unknown)=>{
    const p=progress as {status:string;file?:string;progress?:number};
    if(p.status==='progress')self.postMessage({id,progress:`Loading voice model: ${p.file??''} ${Math.round(p.progress??0)}%`});
   }
  }).catch(error=>{model=null;throw error});
  const transcriber=await model;
  if(!audio){self.postMessage({id,ready:true});return}
  let partial='';
  const streamer=new TextStreamer(transcriber.tokenizer,{skip_special_tokens:true,callback_function:piece=>{partial+=piece;self.postMessage({id,partial:partial.trim()})}});
  const output=await transcriber(audio,{streamer,max_new_tokens:80,do_sample:false,return_timestamps:false});
  self.postMessage({id,text:Array.isArray(output)?output[0].text:output.text});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Local transcription failed.'})}
};

self.onmessage=event=>{queue=queue.then(()=>run(event))};
