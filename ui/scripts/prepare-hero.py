"""Build short, clear web loops from the approved local 1080p archive; originals stay untouched."""
import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=Path('/workspace/ugt-media-intake/assets/reference-media/Campus EVents portfolio/Mr and Miss UoN 2022/Mr and Miss UoN 2022.mp4');out=root/'public/media-library'
for name,width,crf,rate in [('desktop',1920,'21','3500k'),('mobile',1280,'22','1800k'),('lite',854,'24','850k')]:
 subprocess.run(['ffmpeg','-v','error','-threads','2','-ss','34','-i',str(source),'-t','8','-an','-vf',f'scale={width}:-2','-r','24','-c:v','libx264','-preset','medium','-crf',crf,'-maxrate',rate,'-bufsize',str(int(rate[:-1])*2)+'k','-g','48','-keyint_min','48','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(out/f'hero-{name}-v2.mp4')],check=True)
print(json.dumps({p.name:p.stat().st_size for p in out.glob('hero-*-v2.*')}))
