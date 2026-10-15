import {EMPTY_PARTNER,type PartnerDetails} from './partner-events';

// Owner-supplied poster briefs. These are templates, NOT published records.
// Original artwork is intentionally not replaced with generated imagery.
export type PartnerEventDraft = {key:string;name:string;eventDate:string;dateLabel:string;eventTime:string;venue:string;city:string;description:string;partnerDetails:PartnerDetails;review:string;news:{headline:string;dek:string;body:string[]}};
const details=(patch:Partial<PartnerDetails>):PartnerDetails=>({...EMPTY_PARTNER,admission:'unconfirmed',...patch});
export const PARTNER_EVENT_DRAFTS:PartnerEventDraft[]=[
  {
    key:'mr-miss-air-travel-2026',name:'Mr & Miss Air Travel 2026',eventDate:'2026-09-18',dateLabel:'',eventTime:'',venue:'Air Travel Karen',city:'Nairobi',
    description:'Mr & Miss Air Travel 2026 at Air Travel Karen. Eugine Micah was credited on hype duties alongside Hype Ola, through our collaboration with Sherehe Vibes Africa.',
    partnerDetails:details({organizer:'Air Travel & Related Studies Centre and Sherehe Vibes Africa',client:'Sherehe Vibes Africa',role:'Eugine Micah — hype, alongside Hype Ola.',admission:'external',ticketUrl:'https://airtravel.hustlesasa.shop/',institutions:['Air Travel & Related Studies Centre'],newsSlug:'mr-miss-air-travel-2026'}),
    review:'Past event: choose Completed after review. Poster advertises historical non-student early-bird KES 500 / gate KES 750, not current ticket inventory. Start time not supplied.',
    news:{headline:'Eugine Micah joins the Mr & Miss Air Travel 2026 line-up',dek:'A look at Urban Gang Tour’s credited involvement at Air Travel Karen through Sherehe Vibes Africa.',body:[
      'Mr & Miss Air Travel 2026 was scheduled for 18 September at Air Travel Karen, presented by Air Travel & Related Studies Centre and Sherehe Vibes Africa.',
      'The event poster credited Eugine Micah and Hype Ola on hype duties, with music from DJ Cabian and Deejay Xavi, and Goddy Tennor as guest artist. Urban Gang Tour’s involvement forms part of its contracted work with Sherehe Vibes Africa.',
      'This portfolio entry records the announced line-up and our credited role. It is not a ticket-sale listing or a claim about attendance or event results.',
    ]},
  },
  {
    key:'freshers-bash-color-blast',name:'Freshers Bash x Color Blast',eventDate:'',dateLabel:'25 September · year to be confirmed',eventTime:'2:00 PM',venue:'Faculty of Agriculture, University of Nairobi',city:'Nairobi',
    description:'Freshers Bash x Color Blast at the University of Nairobi’s Faculty of Agriculture, with Deejay Xavi, hype by Eugine Micah and interviews by Lucy Ogunde.',
    partnerDetails:details({organizer:'UNSA Faculty of Agriculture and Sherehe Vibes Africa',client:'Sherehe Vibes Africa',role:'Eugine Micah — hype. Lucy Ogunde — interviews.',institutions:['University of Nairobi','Faculty of Agriculture, University of Nairobi'],newsSlug:'freshers-bash-color-blast'}),
    review:'Poster says Friday 25 September, 2 PM till late, but does not print a year. Confirm year and entry arrangements before publication. Do not assume free entry.',
    news:{headline:'Freshers Bash x Color Blast: campus energy at the University of Nairobi',dek:'Eugine Micah and Lucy Ogunde feature in the Faculty of Agriculture event line-up.',body:[
      'The Freshers Bash x Color Blast poster brings together UNSA Faculty of Agriculture and Sherehe Vibes Africa at the University of Nairobi’s Faculty of Agriculture.',
      'Eugine Micah is credited for hype, Lucy Ogunde for interviews, and Deejay Xavi for music. Their involvement sits within Urban Gang Tour’s contracted collaboration with Sherehe Vibes Africa.',
      'The poster lists Friday 25 September from 2 PM till late. The year and entry arrangements are awaiting confirmation before this draft is published.',
    ]},
  },
  {
    key:'unifest-2026-university-of-nairobi',name:'UniFest 2026',eventDate:'2026-11-06',dateLabel:'',eventTime:'',venue:'Graduation Square, University of Nairobi',city:'Nairobi',
    description:'One campus. Many cultures. One vibe. UniFest 2026 brings culture, student talent, entertainment and Color Blast to the University of Nairobi’s Graduation Square. Free admission.',
    partnerDetails:details({organizer:'University of Nairobi and Sherehe Vibes Africa',client:'Sherehe Vibes Africa',role:'Event promotion through our contracted collaboration with Sherehe Vibes Africa.',admission:'free',institutions:['University of Nairobi'],newsSlug:'unifest-2026-university-of-nairobi'}),
    review:'Upcoming: 6 November 2026, free admission. Three poster variants belong to this ONE event. Individual Eugine/Lucy duties and start time are not listed. Confirm organiser attribution with the client before publishing.',
    news:{headline:'UniFest 2026 heads to the University of Nairobi on 6 November',dek:'Free admission, campus culture and student creativity at Graduation Square.',body:[
      'UniFest 2026 is announced for Friday 6 November at Graduation Square, University of Nairobi. Under the banner “One Campus | Many Cultures | One Vibe”, the poster confirms free admission.',
      'The announced programme includes Color Blast, cultural wear, campus modeling, a food fest, live performances, DJs and entertainment, dance and cultural showcases, student talent and creative experiences.',
      'Urban Gang Tour is promoting the event through its contracted collaboration with Sherehe Vibes Africa. A separate artwork invites vendors and partners; individual hosting duties and a start time have not been announced in the supplied posters.',
    ]},
  },
  {
    key:'moi-mr-miss-culture-gala-2026',name:'Mr & Miss Culture Gala Night',eventDate:'2026-10-30',dateLabel:'',eventTime:'',venue:'Student Center, Moi University',city:'',
    description:'Moi University Students Organization presents Mr & Miss Culture Gala Night: Echoes of Roots — harmonizing culture for peace and national integration. Official dress code.',
    partnerDetails:details({organizer:'Moi University Students Organization',institutions:['Moi University'],newsSlug:'moi-mr-miss-culture-gala-2026'}),
    review:'Upcoming: 30 October 2026. Confirm contracting company, Urban Gang’s exact role, admission and start time. Sherehe Vibes Africa and individual team credits are not shown on this poster.',
    news:{headline:'Moi University announces Mr & Miss Culture Gala Night',dek:'Echoes of Roots is the theme for the 30 October 2026 gala at the Student Center.',body:[
      'Moi University Students Organization presents Mr & Miss Culture Gala Night on 30 October 2026 at the Student Center.',
      'The announced theme is “Echoes of Roots”, with a focus on harmonizing culture for peace and national integration. The poster specifies an official dress code.',
      'Admission arrangements, the start time and Urban Gang Tour’s precise contracted role are awaiting confirmation before this draft is published.',
    ]},
  },
  {
    key:'satuk-award-gala-2026',name:'SATUK Award Gala',eventDate:'2026-11-05',dateLabel:'',eventTime:'4:00 PM',venue:'Technical University of Kenya',city:'Nairobi',
    description:'The SATUK Office of the President and Sherehe Vibes Africa present the SATUK Award Gala at the Technical University of Kenya, from 4 PM on 5 November 2026.',
    partnerDetails:details({organizer:'SATUK Office of the President and Sherehe Vibes Africa',institutions:['Technical University of Kenya'],newsSlug:'satuk-award-gala-2026'}),
    review:'Upcoming: 5 November 2026, 4 PM. Confirm the contracting company, Urban Gang’s credited role and admission. The poster does not identify its pictured individual by name.',
    news:{headline:'SATUK Award Gala set for 5 November at Technical University of Kenya',dek:'The Office of the President and Sherehe Vibes Africa announce an afternoon gala from 4 PM.',body:[
      'The Students Association of the Technical University of Kenya announces the SATUK Award Gala for Thursday 5 November 2026, from 4 PM at the Technical University of Kenya.',
      'The poster names the Office of the President and Sherehe Vibes Africa as presenters. Admission arrangements and Urban Gang Tour’s precise role are awaiting confirmation before publication.',
    ]},
  },
];
