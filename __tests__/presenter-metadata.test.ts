import {describe,it,expect} from 'vitest';
import {metadataForPath} from '../app/_lib/seo';
describe('presenter page metadata',()=>{
  it.each(['/author/eugine-micah','/author/lucy-ogunde'])('has independent metadata for %s',path=>{
    const metadata=metadataForPath(path);
    expect(metadata.alternates?.canonical).toBe('https://urbangangtour.co.ke'+path);
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(metadata.openGraph?.url).toBe('https://urbangangtour.co.ke'+path);
  });
});
