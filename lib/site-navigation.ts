/** Visitor journey: discover, explore proof, build trust, then shop or book. */
export const PRIMARY_NAVIGATION=[['Events','/events'],['Our work','/portfolio'],['Gallery','/gallery'],['Clients','/clients'],['About','/about'],['Shop','/shop'],['Book','/book']];
export const SITE_MENU_GROUPS=[
 {title:'Explore',items:PRIMARY_NAVIGATION},
];
export const SITE_UTILITY_NAVIGATION=[['My tickets','/account']];
/** Footer columns share the same real destinations, rather than a wrapped link wall. */
export const FOOTER_NAVIGATION=[
 {title:'Explore',items:[['Events','/events'],['Shop','/shop'],['Our work','/portfolio'],['Clients','/clients'],['News','/blog'],['About','/about']]},
 {title:'Help',items:[['My tickets','/account'],['Sell tickets','/organizer/login'],['Contact','/contact-us'],['Accessibility','/accessibility']]},
];
/** Nested pages retain their section context; query filters are not new sections. */
export function isNavigationCurrent(path:string,href:string){
 const target=href.split(/[?#]/)[0];
 return path===target||target!=='/'&&path.startsWith(target+'/');
}
