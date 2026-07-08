export interface Leader {
  name: string;
  role: string;
  bio: string;
  img: string;
  ig: string;
  tags: string[];
}

export interface CrewMember {
  name: string;
  role: string;
  bio?: string;
  img?: string;
  ig?: string;
}

export const LEADERSHIP: Leader[] = [
  {
    name: "Eugine Micah",
    role: "Founder, Creative Director & Lead Host",
    bio: "The face and engine of the tour. TIBS College valedictorian, Class of 2024. Co-hosts Urban News on Urban Gang Tour, leads his own team, and opens every stage the tour builds.",
    img: "/assets/p/eugine_4.jpg",
    ig: "eugine.micah",
    tags: ["Lead Host", "Urban News Co-Host", "Team Holder"],
  },
  {
    name: "Lucy Ogunde",
    role: "Founder, Co-Host & Executive Producer",
    bio: "Co-fronts every event and every Urban News episode, and leads her own team. The other half of the duo on every poster, every stage, and every broadcast.",
    img: "/assets/p/lucy_portrait.jpg",
    ig: "lucyogunde",
    tags: ["Co-Host", "Executive Producer", "Team Holder"],
  },
  {
    name: "Hype Ola",
    role: "Main Partner, Head of Entertainment, The Experience Hub",
    bio: "The third pillar the tour leans on. Leads The Experience Hub and holds his own team, a 30-strong energy unit with 5+ dancers per event. Pivotal to every stop the tour makes.",
    img: "/assets/p/hype_ola_2.jpg",
    ig: "hypeola",
    tags: ["Head of Entertainment", "The Experience Hub", "Team Holder"],
  },
];

export const OPERATIONS_CREW: CrewMember[] = [
  { name: "Mark Davinci", role: "The Overseer, Merch & Printing", bio: "Oversees the whole machine on event day, co-runs security with Fred, and heads all Urban Gang merchandise and printing.", img: "/assets/p/mark_davinci.jpg" },
  { name: "Fred (Baba Harshna)", role: "Stage Manager & Security", bio: "Runs the stage clock and keeps every act on cue, while co-holding security with Mark.", img: "/assets/p/fred_oduor.jpeg", ig: "baba_harshna" },
  { name: "Tae (Justus)", role: "Tree Planting & Environment", bio: "CEO of Delo Greens Movement. Leads tree planting and environmental action at every stop." },
  { name: "Kalamu Nyeusi", role: "Branding & Visibility", bio: "Spoken word and poetry lead turned brand guardian. Makes sure the gang is seen, everywhere.", img: "/assets/p/kalamu_2.jpg", ig: "kalamunyeusi" },
  { name: "MC Paps", role: "Urban Pods Leader", bio: "Mental health coach and MC. Leads the Urban Pods, three to five sessions per stop on talent, money, digital, leadership, and mind.", img: "/assets/p/mc_paps.jpg", ig: "paps_mc" },
  { name: "Ferooz Mkenya", role: "Transport & Logistics", bio: "Moves the machine county to county: trucks, kit, crew, and the travelling merch tent.", img: "/assets/p/ferooz_1.jpg", ig: "ferooz_mkenya" },
  { name: "Pauline Masika", role: "Sound Engineer", bio: "Video and audio recording. The reason every battle sounds as big as it felt.", img: "/assets/p/pauline_2.png" },
  { name: "MC Larry Raj", role: "MC & Hype Opener", bio: "First voice on the mic. Opens the day and hands the crowd over at full temperature.", ig: "mc_larryraj" },
  { name: "DJ Xavi", role: "DJ", bio: "Holds the decks across battles, runway, and hype sets.", img: "/assets/p/dj_xavi.jpg" },
  { name: "DJ Carian", role: "DJ", bio: "Second pair of hands on the decks, seamless transitions from first bell to crowning.", img: "/assets/p/dj_carian.jpg" },
  { name: "DJ JayJey", role: "DJ", bio: "Rounds out the DJ unit across battles, runway walks, and hype sets.", img: "/assets/p/dj_jayjey.jpg" },
  { name: "Esther Gakunju", role: "Head of Modelling & Pageantry", bio: "Leads Synapse Models. Directs the runway and the Mrs/Miss of the Institution pageant.", img: "/assets/p/esther_wambui.jpg", ig: "wambui_gakunju" },
  { name: "George Morgan", role: "Cameraman", bio: "Urban Gang Tour camera crew. Frames the broadcast feed that reaches national screens.", img: "/assets/p/george_morgan.jpg" },
  { name: "Tony Lallez", role: "Cameraman", bio: "Urban Gang Tour camera crew. Second angle on every battle, every crowning, every eruption." },
];

export const ENERGY_UNIT: CrewMember[] = [
  { name: "Khloe Nyarangi", role: "Dance Crew Lead", ig: "its_n.y.a.r.a.n.g.i" },
  { name: "Drop Junior", role: "Dancer & Creative", ig: "drop__junior" },
  { name: "Mercie Smalls", role: "Dancer, The Experience Hub", ig: "mercie_smalls" },
  { name: "Karembo Eilahd", role: "Dancer & Performer", img: "/assets/p/karembo_1.jpg", ig: "karembo_eilahd" },
  { name: "Captain Dia", role: "Creative & Performer", img: "/assets/p/captain_dia_1.jpg", ig: "_captain_dia" },
  { name: "Rania Martin", role: "Creative & Performer", img: "/assets/p/rania.jpg" },
  { name: "Gig Real", role: "Creative & Performer", img: "/assets/p/gigreal.jpg" },
];

export const TOURING_ARTISTS: CrewMember[] = [
  { name: "Staricon", role: "Performing Artist", ig: "staricon_official" },
  { name: "Olemojo", role: "Performing Artist", ig: "olemojo__" },
  { name: "Muga", role: "Performing Artist", ig: "88.muga" },
  { name: "King Ibra", role: "Performing Artist", ig: "king_ibra_official" },
];
