export type ShopCategoryLink={name:string;slug:string;href:string};

export function isSafeShopCategorySlug(slug:string):boolean{
 return slug.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Derive routes from published category names; never guess a category from a URL. */
export function shopCategoryLinks(names:string[]):ShopCategoryLink[]{
 const categories=[...new Set(names.filter(name=>name.trim()))].map(name=>({
  name,
  slug:name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
 }));
 return categories.filter(category=>isSafeShopCategorySlug(category.slug)&&categories.filter(other=>other.slug===category.slug).length===1)
  .map(category=>({...category,href:'/shop/category/'+category.slug}));
}
