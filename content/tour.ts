export interface CompletedStop {
  day: string;
  month: string;
  school: string;
  body: string;
  img: string;
}

export const NEXT_STOP = {
  school: "Lari Boys High School",
  location: "Kimende, Lari, Kiambu County",
  isoDate: "2026-07-19T09:00:00+03:00",
  dateLabel: "Sunday, 19 July 2026 - 9:00 AM EAT",
  day: "19",
  month: "JULY 2026",
  note: "Talent showcases, mentorship pods, a modelling runway, and a national Urban News broadcast.",
  img: "/v25-assets/gal/lari.jpg",
};

export interface UpcomingStop {
  tag: string;
  name: string;
  where: string;
  status: "IN TALKS" | "DATE BEING SET" | "IN THE PIPELINE";
}

export const UPCOMING_STOPS: UpcomingStop[] = [
  { tag: "In talks", name: "Tenwek Boys High School", where: "Bomet County", status: "IN TALKS" },
  { tag: "Awaiting date", name: "Mai Mahiu Girls High School", where: "Naivasha, likely third term", status: "DATE BEING SET" },
  { tag: "Awaiting date", name: "Mai Mahiu Boys High School", where: "Naivasha, likely third term", status: "DATE BEING SET" },
  { tag: "In the pipeline", name: "Ribe Girls High School", where: "Kilifi County", status: "IN THE PIPELINE" },
  { tag: "In the pipeline", name: "Kikuyu High School", where: "Kiambu County", status: "IN THE PIPELINE" },
];

export const COMPLETED_STOPS: CompletedStop[] = [
  {
    day: "07",
    month: "JUNE 2026",
    school: "PCEA Gituamba Girls High School",
    body: "The Festival of Colours: showcases across every discipline, the full runway with crowning, mentorship pods, tree planting with Delo Greens Movement, and a wrap that fed straight into Urban News.",
    img: "/v25-assets/gal/gituamba.jpg",
  },
  {
    day: "01",
    month: "JUNE 2026",
    school: "Loreto Kiambu Girls High School",
    body: "A full day takeover with the travelling crew, modelling directed by Synapse Models, and The Experience Hub running the energy.",
    img: "/v25-assets/gal/loreto.jpg",
  },
  {
    day: "30",
    month: "MAY 2026",
    school: "Senior Chief Koinange Girls Senior School",
    body: "The stop that opened the 2026 tour. Talent showcases, mentorship pods, awards, and the institution crowning, all on camera.",
    img: "/v25-assets/gal/koinange.jpg",
  },
];
