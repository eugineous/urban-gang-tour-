/** Public tasks, not internal departments. Existing canonical URLs are retained. */
export const PRIMARY_NAVIGATION=[['Services','/experience'],['Events','/events'],['Our work','/portfolio'],['Shop','/shop'],['About','/about']];
export const SITE_MENU_GROUPS=[
 {title:'Explore',items:[...PRIMARY_NAVIGATION,['Book an event','/book']]},
 {title:'More',items:[['News','/blog'],['Photos & videos','/gallery'],['Partners','/partners'],['Contact','/contact-us']]},
];
export const SITE_UTILITY_NAVIGATION=[['Orders & receipts','/account'],['International enquiries','/international'],['Accessibility','/accessibility'],['Organizer portal','/organizer/login']];
/** Nested pages retain their section context; query filters are not new sections. */
export function isNavigationCurrent(path:string,href:string){
 const target=href.split(/[?#]/)[0];
 return path===target||target!=='/'&&path.startsWith(target+'/');
}
