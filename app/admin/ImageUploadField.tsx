'use client';
import {useId,useState} from 'react';
import {upload} from '@/lib/client/media-upload';
import styles from './ImageUploadField.module.css';
export default function ImageUploadField({label,value,onChange,purpose,disabled=false,onBusyChange}:{label:string;value:string;onChange:(url:string)=>void;purpose:'events'|'stories'|'campaigns'|'products';disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
 const id=useId();const [progress,setProgress]=useState<number|null>(null),[error,setError]=useState('');
 async function pick(file:File){
  setError('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP image.');return}
  if(!file.size||file.size>8*1024*1024){setError('Choose an image smaller than 8 MB.');return}
  setProgress(0);onBusyChange?.(true);
  try{
   await new Promise<void>((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve()};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('invalid_image'))};image.src=url});
   const result=await upload(file.name,file,{handleUploadUrl:`/api/admin/media/upload?purpose=${purpose}`,onUploadProgress:event=>setProgress(Math.min(99,Math.round(event.percentage)))});
   onChange(result.url);
  }catch(e){const message=e instanceof Error?e.message:'';setError(message==='invalid_image'?'This file could not be opened as an image.':message==='unauthorized'?'Your session expired. Sign in again, then retry.':message==='forbidden'?'Your account needs access to this module to upload.':'Upload did not complete. Your existing image is unchanged. Retry or choose a smaller image.')}
  finally{setProgress(null);onBusyChange?.(false)}
 }
 return <div className={styles.field}><label htmlFor={id}>{label}</label>{value&&<img src={value} alt={`${label} preview`} className={styles.preview}/>}<input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||progress!==null} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void pick(file)}}/><small>JPG, PNG or WebP · up to 8 MB</small>{progress!==null&&<div role="status"><progress value={progress} max={100}/><span>{progress===99?'Saving image…':`Uploading ${progress}%`}</span></div>}{error&&<p role="alert">{error}</p>}<details><summary>Use an existing image URL</summary><label htmlFor={id+'-url'}>Image URL</label><input id={id+'-url'} value={value} disabled={disabled||progress!==null} onChange={e=>onChange(e.target.value)}/></details></div>
}
