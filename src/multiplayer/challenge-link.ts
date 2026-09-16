/** Native share-sheet Copy actions can include the message after the URL. */
export function challengeToken(pathname:string):string|null {
 let path:string;try{path=decodeURIComponent(pathname);}catch{return null;}
 const match=path.match(/^\/challenge\/([A-Za-z0-9_-]{43})(.*)$/s);if(!match)return null;
 const suffix=match[2];
 // Browsers may remove the newline separating the URL from the share message.
 if(suffix!==''&&suffix!=='/'&&!/^\s/.test(suffix)&&!/^.{1,32} challenged you to PickleBash\. Think you can outplay them\??$/.test(suffix))return null;
 return match[1];
}
