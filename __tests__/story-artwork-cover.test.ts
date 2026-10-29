import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({illustration:true,caption:'AI-generated editorial illustration',alt:'Fictional illustrated stage'}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>[{slug:'fixture-cover',headline:'Fictional cover',datePublished:'2026-10-25',dateModified:'2026-10-25',section:'Analysis',image:'/fixture.webp',imageAlt:state.alt,imageCaption:state.caption,imageIllustration:state.illustration,description:'Fixture only',body:[]}],articleJsonLd:()=>({'@type':'BlogPosting'})}));
vi.mock('@/app/_components/PartnerEventPortfolio',()=>({default:()=>null}));
vi.mock('@/app/_components/ShareBar',()=>({ShareBar:()=>null}));
vi.mock('@/app/_components/Ads',()=>({ArticleAd:()=>null}));
import BlogPost from '@/app/blog/[slug]/page';
it('identifies approved illustrations for uncropped cover rendering without changing the image or alt text',async()=>{
 state.illustration=true;const html=renderToStaticMarkup(await BlogPost({params:Promise.resolve({slug:'fixture-cover'})}));
 expect(html).toContain('data-editorial-illustration="true"');expect(html).toContain('src="/fixture.webp"');expect(html).toContain('alt="Fictional illustrated stage"');
});
it('preserves the existing photograph frame and does not infer asset type from caption wording',async()=>{
 state.illustration=false;const html=renderToStaticMarkup(await BlogPost({params:Promise.resolve({slug:'fixture-cover'})}));
 expect(html).not.toContain('data-editorial-illustration');expect(html).toContain('class="article-cover"');
});
it('uses a neutral public illustration caption and descriptive alt without modifying stored provenance or photographs',async()=>{
 state.illustration=true;state.caption='AI-generated editorial illustration';state.alt='AI-generated black-and-white illustration of a fictional planning desk';
 const html=renderToStaticMarkup(await BlogPost({params:Promise.resolve({slug:'fixture-cover'})}));
 expect(html).toContain('>Editorial illustration</p>');expect(html).toContain('alt="black-and-white illustration of a fictional planning desk"');expect(html).not.toContain('AI-generated');
 expect(state.caption).toBe('AI-generated editorial illustration');expect(state.alt).toMatch(/^AI-generated/);
 state.illustration=false;state.caption='Photograph: owner-supplied event image';state.alt='Documentary stage photograph';
 const photograph=renderToStaticMarkup(await BlogPost({params:Promise.resolve({slug:'fixture-cover'})}));
 expect(photograph).toContain('>Photograph: owner-supplied event image</p>');expect(photograph).toContain('alt="Documentary stage photograph"');
 state.alt='Fictional illustrated stage';state.caption='AI-generated editorial illustration';
});
