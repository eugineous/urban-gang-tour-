export interface CompletedStop {
  day: string;
  month: string;
  school: string;
  body: string;
}

export interface UpcomingStop {
  tag: string;
  name: string;
  where: string;
  status: "IN TALKS" | "DATE BEING SET" | "IN THE PIPELINE" | "CANCELLED";
}

export const NEXT_STOP = {
  school: "Ngeya Girls Senior School",
  location: "Mai Mahiu, Naivasha, Nakuru County",
  day: "24",
  month: "JULY 2026",
  note: "Full tour, all 8 categories",
};

export const COMPLETED_STOPS: CompletedStop[] = [
  {
    day: "06",
    month: "JUNE 2026",
    school: "PCEA Gituamba Girls High School",
    body: "Battles across all 8 categories, the full runway with crowning, the Urban Pods, tree planting with Delo Greens, and a wrap that fed straight into Urban News.",
  },
  {
    day: "01",
    month: "JUNE 2026",
    school: "Loreto Kiambu Girls High School",
    body: "A full day takeover with the full travelling crew, modelling directed by Synapse Models, and The Experience Hub running the energy.",
  },
  {
    day: "30",
    month: "MAY 2026",
    school: "Senior Chief Koinange Girls High School",
    body: "The stop that opened the second-term run. Talent battles, pods, awards, and the institution crown, all on camera.",
  },
];

export const UPCOMING_STOPS: UpcomingStop[] = [
  { tag: "In talks", name: "Tenwek Boys High School", where: "Bomet County", status: "IN TALKS" },
  { tag: "Awaiting date", name: "Mai Mahiu Girls High School", where: "Naivasha, likely third term", status: "DATE BEING SET" },
  { tag: "Awaiting date", name: "Mai Mahiu Boys High School", where: "Naivasha, likely third term", status: "DATE BEING SET" },
  { tag: "In the pipeline", name: "Ribe Girls High School", where: "Kilifi County", status: "IN THE PIPELINE" },
  { tag: "In the pipeline", name: "Kikuyu High School", where: "Kiambu County", status: "IN THE PIPELINE" },
  { tag: "No longer on the route", name: "Gathirimu Girls High School", where: "Kiambu County", status: "CANCELLED" },
];
