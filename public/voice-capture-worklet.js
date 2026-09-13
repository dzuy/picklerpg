// PCM capture is independent of browser speech services and audio codecs.
class VoiceCapture extends AudioWorkletProcessor {
 process(inputs) {
  const channel=inputs[0]?.[0];
  if(channel)this.port.postMessage(channel.slice());
  return true;
 }
}
registerProcessor('voice-capture',VoiceCapture);
