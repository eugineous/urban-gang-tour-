#!/usr/bin/env python3
"""Generate focal metadata locally; originals never change and no image leaves the machine."""
import hashlib,json,sys
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1]
output=root/'data/image-focus.json'
cache=root/'data/image-focus-cache.json'
previous_path=cache if cache.exists() else output
previous=json.loads(previous_path.read_text()) if previous_path.exists() else {}
base_cache={}
overrides_path=root/'data/image-focus-overrides.json'
overrides=json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
detector=cv2.FaceDetectorYN.create(str(root/'scripts/models/yunet.onnx'),'',(320,320),0.8,0.3,5000)
result={};detected=0;errors=[]
for path in sorted((root/'public').rglob('*')):
 if path.suffix.lower() not in {'.jpg','.jpeg','.png','.webp','.avif'}:continue
 url='/'+path.relative_to(root/'public').as_posix()
 try:
  digest=hashlib.sha256(path.read_bytes()).hexdigest()
  if previous.get(url,{}).get('digest')==digest:entry=previous[url]
  else:
   with Image.open(path) as im:
    im=ImageOps.exif_transpose(im).convert('RGB');w,h=im.size
    scale=min(1,1280/max(w,h));sample=im.resize((max(32,round(w*scale)),max(32,round(h*scale))))
    data=cv2.cvtColor(np.asarray(sample),cv2.COLOR_RGB2BGR)
   sh,sw=data.shape[:2];detector.setInputSize((sw,sh));_,faces=detector.detect(data)
   entry={'digest':digest,'width':w,'height':h,'x':0.5,'y':0.5,'faces':0,'source':'center'}
   if faces is not None:
    # Ignore tiny background faces when a clear foreground person is present.
    area=faces[:,2]*faces[:,3];main=faces[area>=max(area)*0.15]
    x0=max(0,float(min(main[:,0])));y0=max(0,float(min(main[:,1])))
    x1=min(sw,float(max(main[:,0]+main[:,2])));y1=min(sh,float(max(main[:,1]+main[:,3])))
    entry.update(x=round((x0+x1)/2/sw,6),y=round((y0+y1)/2/sh,6),faces=len(main),source='faces',region=[round(x0/sw,6),round(y0/sh,6),round(x1/sw,6),round(y1/sh,6)])
  base_cache[url]=dict(entry)
  if url in overrides:
   o=overrides[url];entry={**entry,'x':float(o['x']),'y':float(o['y']),'source':'manual'}
   if not all(0<=entry[k]<=1 for k in ['x','y']):raise ValueError('Override coordinates must be between 0 and 1')
  result[url]=entry;detected+=entry['faces']>0
 except Exception as e:errors.append({'image':url,'error':str(e)})
if errors:
 print(json.dumps({'errors':errors}),file=sys.stderr);sys.exit(1)
output.parent.mkdir(exist_ok=True)
cache.write_text(json.dumps(base_cache,separators=(',',':')))
runtime={url:{k:entry[k] for k in ['x','y','source']} for url,entry in result.items() if entry['source']!='center'}
tmp=output.with_suffix('.tmp');tmp.write_text(json.dumps(runtime,separators=(',',':')));tmp.replace(output)
print(json.dumps({'images':len(result),'imagesWithFaces':detected,'output':str(output)}))
