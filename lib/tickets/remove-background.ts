/** Local-only edge-connected plain-background removal; never uploads the photo. */
export async function removePlainBackground(source:string,tolerance=50):Promise<string>{
 const image=new Image();image.src=source;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
 const frame=ctx.getImageData(0,0,canvas.width,canvas.height),{data,width,height}=frame;
 const corners=[0,width-1,(height-1)*width,width*height-1].map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let tail=0,head=0;
 const eligible=(i:number)=>corners.some(c=>Math.max(Math.abs(data[i*4]-c[0]),Math.abs(data[i*4+1]-c[1]),Math.abs(data[i*4+2]-c[2]))<tolerance);
 const add=(i:number)=>{if(!seen[i]&&eligible(i)){seen[i]=1;queue[tail++]=i}};
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1)}
 while(head<tail){const i=queue[head++];data[i*4+3]=0;if(i%width)add(i-1);if(i%width<width-1)add(i+1);if(i>=width)add(i-width);if(i<width*(height-1))add(i+width)}
 ctx.putImageData(frame,0,0);return canvas.toDataURL('image/png');
}
