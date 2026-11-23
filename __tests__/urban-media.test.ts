import {expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HostIdentity,UrbanMediaFeature,WatchLibrary,watchableFilms} from '@/ui/components/UrbanMedia';
import {media} from '@/ui/components/MediaLibrary';
import {existsSync} from 'node:fs';
it('restores genuine portraits linked to both public profiles',()=>{
 const html=renderToStaticMarkup(createElement(HostIdentity));
 expect(html).toContain('/author/eugine-micah');expect(html).toContain('/author/lucy-ogunde');
 expect(html).toContain('/media-library/8e63b88fd01a11a4.webp');expect(html).toContain('/media-library/a4499d970f6ef310.webp');
 expect(html).not.toContain('mobile/');
});
it('shows archived owned footage with existing native muted controls and booking paths',()=>{
 const html=renderToStaticMarkup(createElement(UrbanMediaFeature));
 expect(html).toContain('<video');expect(html).toContain('controls=""');expect(html).toContain('muted=""');expect(html).toContain('preload="none"');
 expect(html).toContain('href="/watch"');expect(html).toContain('href="/book"');expect(html).toContain('archive');
});
it('deduplicates public family-appropriate films by source without mutating the catalogue',()=>{
 const first=media.find(x=>x.kind==='video'&&!x.adult)!;
 const rows=watchableFilms([first,{...first,id:'duplicate'},{...first,id:'adult',adult:true},{...first,id:'photo',kind:'photograph'}]);
 expect(rows.map(x=>x.id)).toEqual([first.id]);expect(media.length).toBeGreaterThan(100);
 for(const item of watchableFilms(media)){expect(existsSync('public'+item.src)).toBe(true);expect(item.poster&&existsSync('public'+item.poster)).toBe(true)}
});
it('offers an actual watch catalogue rather than a decorative link',()=>{
 const html=renderToStaticMarkup(createElement(WatchLibrary));expect(html).toContain('<h1');expect(html).toContain('<video');expect(html).toContain('type="search"');expect(html).toContain('href="/gallery/');expect(existsSync('app/watch/page.tsx')).toBe(true);
});
import {UrbanNewsHome} from '@/app/_components/UrbanNews';
it('keeps real hosts, original video and personal-edition access in the news-first home',()=>{
 const html=renderToStaticMarkup(createElement(UrbanNewsHome,{posts:[],newsCurrent:true,events:[],eventsCurrent:true,products:[],productsCurrent:true,now:Date.parse('2026-11-18T00:00:00Z')}));
 expect(html).toContain('<video');expect(html).toContain('/media-library/8e63b88fd01a11a4.webp');expect(html).toContain('href="/news-preferences"');
});
it('gives desktop visitors a contextual link to their personal edition',()=>{const html=renderToStaticMarkup(createElement(UrbanNewsHome,{posts:[],newsCurrent:true,events:[],eventsCurrent:true,products:[],productsCurrent:true,now:Date.parse('2026-11-18T00:00:00Z')}));expect(html).toContain('href="/for-you"')});
