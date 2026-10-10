import {describe,it,expect} from 'vitest';
import {publicImageUrl} from '@/lib/public-image-url';
describe('published image links',()=>{
  it('preserves CDN images and resolves normal local images',()=>{
    expect(publicImageUrl('https://images.example.com/story.webp')).toBe('https://images.example.com/story.webp');
    expect(publicImageUrl('/media-library/story.webp')).toBe('https://urbangangtour.co.ke/media-library/story.webp');
  });
  it('uses the existing social fallback for malformed or executable URLs',()=>{
    expect(publicImageUrl('javascript:alert(1)')).toContain('https://urbangangtour.co.ke/');
    expect(publicImageUrl('')).toBe(publicImageUrl('javascript:alert(1)'));
    expect(publicImageUrl('https://user:password@example.com/image.webp')).toBe(publicImageUrl('javascript:alert(1)'));
    expect(publicImageUrl('https://[')).toContain('https://urbangangtour.co.ke/');
  });
});
