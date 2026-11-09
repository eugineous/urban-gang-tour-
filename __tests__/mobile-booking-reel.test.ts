import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MobileBookingVideo} from '@/ui/components/MobileBookingVideo';
import {ContactEntry} from '@/ui/components/ContactEntry';
it('offers a short booking-or-contact choice without a new submission backend',()=>{
 const html=renderToStaticMarkup(createElement(ContactEntry));
 expect([...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1])).toEqual(['/book','/contact-us']);
 expect(html).not.toContain('<form');
});
it('renders a seamless repeated video sequence, muted and looped without server-side downloads',()=>{
 const html=renderToStaticMarkup(createElement(MobileBookingVideo,{labels:{title:'See us in action',play:'Play video',failed:'Could not load',retry:'Try again',videos:'More videos',book:'Book us',advertise:'List your event'}}));
 const videos=[...html.matchAll(/<video\b[^>]*>/g)].map(match=>match[0]);
 expect(videos).toHaveLength(6);
 for(const video of videos){expect(video).toContain('muted=""');expect(video).toContain('loop=""');expect(video).not.toContain(' src=')}
 expect(html).toContain('aria-label="Pause videos"');
});
