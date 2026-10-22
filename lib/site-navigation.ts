/** Public tasks, not internal departments. Existing canonical URLs are retained. */
export const PRIMARY_NAVIGATION=[['Events','/events'],['Our work','/portfolio'],['Shop','/shop'],['About','/about'],['Services','/experience']];
export const SITE_MENU_GROUPS=[
 {title:'Explore',items:[...PRIMARY_NAVIGATION,['Book an event','/book']]},
 {title:'Stories & media',items:[['News','/blog'],['Photos & videos','/gallery'],['Partners','/partners'],['Contact','/contact-us']]},
];
export const SITE_UTILITY_NAVIGATION=[['Orders & receipts','/account'],['International enquiries','/international'],['Accessibility','/accessibility'],['Organizer portal','/organizer/login']];
/** Footer columns share the same real destinations, rather than a wrapped link wall. */
export const FOOTER_NAVIGATION=[
 {title:'Explore',items:PRIMARY_NAVIGATION},
 {title:'Connect',items:[['Let’s talk','/contact-us'],['Book an event','/book'],['News','/blog'],['Photos & videos','/gallery'],['Partners','/partners']]},
 {title:'Help',items:[...SITE_UTILITY_NAVIGATION,['Ticketing guide','/ticketing'],['Languages / Lugha','/welcome/en']]},
];
/** Nested pages retain their section context; query filters are not new sections. */
export function isNavigationCurrent(path:string,href:string){
 const target=href.split(/[?#]/)[0];
 return path===target||target!=='/'&&path.startsWith(target+'/');
}
