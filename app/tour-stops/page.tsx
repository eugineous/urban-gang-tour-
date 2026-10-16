import {permanentRedirect} from 'next/navigation';
// Keep previously shared URLs working; the live archive replaces the static
// timeline. Approved historical photographs remain in their gallery routes.
export default function Page(){permanentRedirect('/events?kind=school&period=all')}
