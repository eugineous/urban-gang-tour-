import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {expect,it} from 'vitest';

const css=postcss.parse(readFileSync('ui/components/HomeSections.module.css','utf8'));
const declarations=(selector:string)=>{
 const found:Record<string,string>={};
 css.walkRules(rule=>{if(rule.selector===selector)rule.walkDecls(declaration=>{found[declaration.prop]=declaration.value})});
 return found;
};
it('keeps video and poster sharp while cropping the logo-bearing edges',()=>{
 const media=declarations('.heroImage,.hero :global(.hero-video)');
 expect(media['object-fit']).toBe('cover');
 expect(media.filter).toBe('none');
 const scale=parseFloat(media['block-size'])/100,offset=-parseFloat(media['inset-block-start'])/100;
 expect(offset/scale).toBeGreaterThan(.15);
 expect((scale-1-offset)/scale).toBeGreaterThan(.15);
 expect(media['pointer-events']).toBe('none');
});
it('uses a restrained text scrim without altering playback opacity or hiding the video',()=>{
 const shade=declarations('.heroShade');
 expect(shade.background).toContain('rgba(17, 16, 20, .26)');
 expect(shade.background).toContain('rgba(17, 16, 20, .56)');
 const media=declarations('.heroImage,.hero :global(.hero-video)');
 expect(media.opacity).toBeUndefined();expect(media.display).toBeUndefined();
 expect(shade['pointer-events']).toBe('none');
});
