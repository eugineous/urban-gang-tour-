export type UploadState='pending'|'uploading'|'done'|'failed';
export type QueueItem={id:string;file:File;path:string;category:string;state:UploadState;progress:number;url?:string;error?:string};
/** Serial execution keeps mobile memory/network use bounded. No auto retry. */
export async function runUploadQueue(items:QueueItem[],work:(item:QueueItem,progress:(n:number)=>void)=>Promise<void>,update:(id:string,patch:Partial<QueueItem>)=>void){
 for(const item of items){
  if(item.state==='done')continue;
  update(item.id,{state:'uploading',progress:0,error:''});
  try{await work(item,n=>update(item.id,{progress:Math.min(99,Math.max(0,n))}));update(item.id,{state:'done',progress:100});}
  catch(error){const code=error instanceof Error?error.message:'';update(item.id,{state:'failed',error:code==='invalid_image'?'Choose a JPG, PNG or WebP image, up to 8 MB.':code==='image_inspection_failed'?'This image could not be opened. Choose another file.':'This photo did not finish. Retry when you are ready.'});}
 }
}
