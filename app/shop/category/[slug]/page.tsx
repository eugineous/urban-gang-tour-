import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
import {discoveryImageUrl} from '@/app/_lib/seo';
import {readPublicProducts} from '@/lib/server/public-products';
import {buildShopCatalogue} from '@/lib/shop-discovery';
import {isSafeShopCategorySlug,shopCategoryLinks} from '@/lib/shop-categories';
import {SITE} from '@/lib/site';

export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};

const categoryForPage=cache(async(slug:string)=>{
 if(!isSafeShopCategorySlug(slug))notFound();
 const knownDesignCategory=shopCategoryLinks(buildShopCatalogue([]).map(product=>product.category||'')).find(category=>category.slug===slug);
 const products=await readPublicProducts().catch(error=>{
  // Public design names remain real when the live source is unavailable.
  // Undefined preserves the existing browser loading/retry path; [] would
  // falsely describe an authoritative catalogue with no live merchandise.
  if(knownDesignCategory)return undefined;
  throw error;
 });
 const catalogue=buildShopCatalogue(products||[]);
 const category=shopCategoryLinks(catalogue.map(product=>product.category||'')).find(category=>category.slug===slug);
 if(!category)notFound();
 return {...category,products,image:catalogue.find(product=>product.category===category.name)?.image};
});

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const category=await categoryForPage((await params).slug);
 const title=`${category.name} Merchandise | Urban Gang Tour`;
 const description=`Browse Urban Gang Tour ${category.name} merchandise. Live products and design previews are clearly labelled.`;
 const url=SITE.domain+category.href,image=discoveryImageUrl(category.image)||SITE.defaultOg;
 return {
  title,description,alternates:{canonical:url},
  openGraph:{type:'website',siteName:SITE.name,locale:'en_KE',title,description,url,images:[{url:image,alt:category.name}]},
  twitter:{card:'summary_large_image',title,description,images:[image]},
 };
}

export default async function CategoryPage({params}:Props){
 const category=await categoryForPage((await params).slug);
 return <LiveCommerce categoryName={category.name} initialProducts={category.products}/>;
}
