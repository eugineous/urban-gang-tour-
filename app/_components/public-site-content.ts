export type PublicPage = {
  title: string;
  standfirst: string;
  action: { label: string; href: string };
  image: string;
  tone: "ink" | "paper" | "magenta" | "cyan";
};

export const MOBILE_NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/gallery", label: "Gallery", icon: "frames" },
  { href: "/shop", label: "Shop", icon: "bag" },
  { href: "/book", label: "Book", icon: "spark" },
] as const;

export const FOUNDERS = [
  {
    name: "Eugine Micah",
    role: "Co-founder · Creative Director · Lead Host",
    image: "/assets/light-v1/crew/eugine-micah.png.960.webp",
    bio: "Eugine shapes the live experience and hosts the moments young people remember long after the lights go down.",
  },
  {
    name: "Lucy Ogunde",
    role: "Co-founder · Co-host",
    image: "/assets/light-v1/crew/lucy-ogunde.jpg.960.webp",
    bio: "Lucy brings people into the story—on stage, on screen and in the communities that invite the tour in.",
  },
] as const;

const PAGES: Record<string, PublicPage> = {
  "/": {
    title: "Looking for a school event students will remember?",
    standfirst:
      "Urban Gang Tour produces talent shows, cultural days, colour festivals and campus experiences across Kenya.",
    action: { label: "Get a school event plan", href: "/book" },
    image: "/assets/light-v1/gal/campus-rave.jpg.1440.webp",
    tone: "ink",
  },
  "/about": {
    title: "A tour with a bigger stage.",
    standfirst:
      "Urban Gang Tour turns young people’s talent, voice and ambition into moments worth seeing.",
    action: { label: "Meet the founders", href: "/the-gang" },
    image: "/assets/light-v1/gal/g-winning.jpg.1440.webp",
    tone: "paper",
  },
  "/the-gang": {
    title: "Meet the two people behind the movement.",
    standfirst:
      "Urban Gang Tour is led publicly by its co-founders, Eugine Micah and Lucy Ogunde.",
    action: { label: "Book the founders", href: "/book" },
    image: "/assets/light-v1/gal/g-crowning.jpg.1440.webp",
    tone: "magenta",
  },
  "/experience": {
    title: "One school day. A lifetime of proof.",
    standfirst:
      "Mentorship, performance, colour and broadcast-ready production designed around young talent.",
    action: { label: "Plan a tour stop", href: "/book" },
    image: "/assets/light-v1/gal/xp-dance.jpg.1440.webp",
    tone: "cyan",
  },
  "/events": {
    title: "Find your next loud night.",
    standfirst:
      "Tour stops, campus energy and ticketed experiences—published with the details that matter.",
    action: { label: "Explore live events", href: "#live-events" },
    image: "/assets/light-v1/events/e1.jpg.1440.webp",
    tone: "ink",
  },
  "/gallery": {
    title: "The tour, in full colour.",
    standfirst:
      "Every frame is a real stop, a real school and a real reason the movement keeps growing.",
    action: { label: "Book your moment", href: "/book" },
    image: "/assets/light-v1/gal/festival-colours.jpg.1440.webp",
    tone: "ink",
  },
  "/shop": {
    title: "Wear the moment.",
    standfirst:
      "Official pieces for the people who were there, and the ones taking the energy with them.",
    action: { label: "Browse official merch", href: "#collection" },
    image: "/assets/light-v1/events/e4.webp.1440.webp",
    tone: "paper",
  },
  "/book": {
    title: "Put your school on the map.",
    standfirst:
      "Tell us about your students, audience and date. We will shape the right live experience with you.",
    action: { label: "Start a booking", href: "#booking-form" },
    image:
      "/assets/light-v1/doc-art/school-partnership/school-stage-courtyard-v1.png.1440.webp",
    tone: "magenta",
  },
  "/contact-us": {
    title: "Let’s make a plan.",
    standfirst:
      "Bookings, partnerships, media and a direct line to the Urban Gang Tour team.",
    action: { label: "Send a message", href: "#booking-form" },
    image:
      "/assets/light-v1/doc-art/school-partnership/school-meeting-v1.png.1440.webp",
    tone: "cyan",
  },
  "/partners": {
    title: "Put your brand inside the moment.",
    standfirst:
      "Partner with a youth movement that appears live, on screen and where culture is actually happening.",
    action: { label: "Start a partnership", href: "/contact-us" },
    image:
      "/assets/light-v1/doc-art/campaign/youth-arts-warehouse-v1.png.1440.webp",
    tone: "ink",
  },
  "/eventbrite-alternative-kenya": {
    title: "Need an Eventbrite alternative built for Kenyan events?",
    standfirst:
      "Compare a global self-service ticketing platform with a Kenya-based event partner that combines ticketing, mobile money and live production.",
    action: { label: "Discuss your event setup", href: "/book" },
    image: "/assets/light-v1/events/e1.jpg.1440.webp",
    tone: "paper",
  },
  "/work-with-us": {
    title: "Build the next loud moment with us.",
    standfirst:
      "For schools, campuses, cultural partners and brands ready to make something people will feel.",
    action: { label: "Work with us", href: "/contact-us" },
    image: "/assets/light-v1/doc-art/urban-gang-event-master-v2.png.1440.webp",
    tone: "paper",
  },
};

const FALLBACK: PublicPage = {
  title: "Urban Gang Tour",
  standfirst: "Culture in motion across Kenya.",
  action: { label: "Explore the tour", href: "/" },
  image: "/assets/light-v1/gal/campus-rave.jpg.1440.webp",
  tone: "ink",
};

export function resolvePublicPage(pathName: string): PublicPage {
  return PAGES[pathName] || FALLBACK;
}
