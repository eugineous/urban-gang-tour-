/** Only shown while a route is actually suspended; no fabricated percentages. */
export default function RouteLoading(){
 return <div className="route-loading" role="status" aria-live="polite"><img src="/assets/ugt-logo.png" alt="" width="72" height="72"/><p>Getting things ready…</p><span className="sr-only">Loading your page</span></div>;
}
