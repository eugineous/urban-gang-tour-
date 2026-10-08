export type FocalPoint={x:number;y:number};
// CSS percentages refer to the overflowing distance, not the entire image.
// Clamp at an edge so centring a face never exposes blank space.
export function focalPosition(point:FocalPoint,imageWidth:number,imageHeight:number,frameWidth:number,frameHeight:number):string{
 if(Math.min(imageWidth,imageHeight,frameWidth,frameHeight)<=0)return '50% 50%';
 const scale=Math.max(frameWidth/imageWidth,frameHeight/imageHeight);
 const visibleWidth=frameWidth/scale,visibleHeight=frameHeight/scale;
 const axis=(focus:number,size:number,visible:number)=>size-visible<0.001?50:Math.max(0,Math.min(100,(focus*size-visible/2)/(size-visible)*100));
 return `${axis(point.x,imageWidth,visibleWidth).toFixed(3)}% ${axis(point.y,imageHeight,visibleHeight).toFixed(3)}%`;
}
