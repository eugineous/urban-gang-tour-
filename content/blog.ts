export interface BlogPost {
  slug: string;
  tag: string;
  date: string; // ISO 8601, e.g. 2026-06-10
  dateLabel: string; // human display, e.g. "10 June 2026"
  title: string;
  teaser: string;
  img: string;
  strip: string[];
  quote: string;
  paras: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "5000-students-later",
    tag: "MILESTONE",
    date: "2026-06-10",
    dateLabel: "10 June 2026",
    title: "5,000 students later: what the road has taught us",
    teaser:
      "Three schools, one second-term run, and more than five thousand young people reached live. A look back at what the tour has learned — and where the machine rolls next.",
    img: "/assets/g/stage_9.jpg",
    strip: ["/assets/g/stage_12.jpg", "/assets/g/stage_3.jpg", "/assets/g/event_8.jpg"],
    quote:
      '"Every school we walk into, there is a star nobody has noticed yet. Five thousand students in, that has been true every single time." — Eugine Micah',
    paras: [
      "When the 2nd term run kicked off at Senior Chief Koinange Girls, nobody on the bus was counting. We were thinking about the stage build, the battle brackets, the pods, the cameras. But somewhere between Koinange, Loreto Kiambu, and Gituamba, the number crossed five thousand — more than five thousand students who have now stood in front of our stage, walked our runway, battled in our categories, or sat in an Urban Pod talking about money, mental health, and what they want their lives to become.",
      "The number matters because of what it represents: five thousand young people who got proof that their talent is worth a stage, a camera, and a crowd. Winners who went on air through Urban News on Urban Gang Tour. Quiet students who walked the runway in cultural wear and got crowned in front of their whole school. Whole institutions that planted trees with Delo Greens before the speakers were even packed.",
      "It also matters because of what it took. A travelling crew thirty to fifty strong, depending on the day. A stage and sound rig that gets built at dawn and torn down after dark. Partners — Vibes Studios on cameras, Synapse Models on the runway, The Experience Hub on energy, Moyo Response on standby — who show up stop after stop.",
      "So what has the road taught us? That talent is everywhere and evenly distributed, but stages are not. That a pod conversation about mental health can be louder than a hype set. And that the second a crowd realises the cameras are rolling for national TV, the whole day changes shape.",
      "The counter does not stop here. Goshen Group of Schools and Achego Girls are in the works, and Campus XP is coming for the universities. Five thousand is a checkpoint, not a finish line.",
    ],
  },
  {
    slug: "gituamba-went-up",
    tag: "TOUR STOP",
    date: "2026-06-06",
    dateLabel: "6 June 2026",
    title: "Gituamba went up — the good kind",
    teaser:
      "PCEA Gituamba Girls closed our second-term hat-trick with battles in all eight categories, a full runway, and a crowning the school will be talking about for terms.",
    img: "/assets/g/stage_12.jpg",
    strip: ["/assets/g/stage_10.jpg", "/assets/g/stage_5.jpg", "/assets/g/stage_16.jpg"],
    quote:
      '"The principal told us the school had never sounded like that. We told her: that sound was always in there. We just brought the speakers."',
    paras: [
      "Some schools warm up slowly. Gituamba did not. By the time the first battle category opened, the crowd had already decided this was their day, and every competitor who touched the mic got the kind of reception artists tour years to earn.",
      "All eight battle categories ran — music, dance, spoken word, poetry slam, comedy, drama, news reporting, and the modelling runway. The runway, directed by Synapse Models, went through cultural wear, creative wear, cosplay, and professional wear before the day closed with the crowning of Mrs/Miss of the Institution, presented by the school's leadership alongside Eugine and Lucy.",
      "Between battles, the Urban Pods ran through the day — picked from our five themes to fit what Gituamba's students wanted to talk about most. The Mind Your Mind sessions filled up first. They usually do.",
      "Before pack-down, the tour and Delo Greens Movement put trees in the ground with the students — the part of every stop that outlives the event by decades. The full episode feeds into Urban News on Urban Gang Tour, and the gallery from the day is already live.",
      "Gituamba closed the hat-trick: Koinange, Loreto Kiambu, Gituamba — three schools in eight days. The bus barely cooled down. We like it that way.",
    ],
  },
  {
    slug: "loreto-kiambu-runway",
    tag: "TOUR STOP",
    date: "2026-06-01",
    dateLabel: "1 June 2026",
    title: "Loreto Kiambu: the day the quad became a runway",
    teaser:
      "Madaraka Day weekend, a full crew, and a school that turned its quad into the loudest venue in Kiambu county.",
    img: "/assets/g/stage_11.jpg",
    strip: ["/assets/g/stage_6.jpg", "/assets/g/stage_13.jpg", "/assets/g/stage_4.jpg"],
    quote:
      '"You have not seen a runway walk until you have seen one done in front of two best friends screaming the walker\'s name."',
    paras: [
      "Loreto Kiambu Girls received the tour with the kind of organisation that makes a production crew emotional: coordinators ready, venue mapped, students primed. We arrived early, built the T-shaped stage, and by mid-morning the quad was unrecognisable.",
      "The battles were close in every category, but the runway stole the day. Synapse Models had the walkers moving like a Fashion Week call sheet — cultural wear that brought the loudest cheers of the morning, and a professional wear round that looked like a corporate takeover in the best way.",
      "The Experience Hub's dancers ran hype sets between segments, and the pods pulled crowds of their own — the Own Your Money session ran over time because the questions would not stop. That is the part the cameras rarely capture: a hundred students asking how money actually works.",
      "The day closed with the crowning and the full awards ceremony, all filmed by Vibes Studios and the Urban Gang Tour crews for Urban News. Loreto Kiambu, you set a standard.",
    ],
  },
  {
    slug: "it-started-at-koinange",
    tag: "TOUR STOP",
    date: "2026-05-30",
    dateLabel: "30 May 2026",
    title: "It started at Koinange",
    teaser:
      "Every run needs a first stop. Senior Chief Koinange Girls opened the 2nd term tour and set the temperature for everything that followed.",
    img: "/assets/g/stage_1.jpg",
    strip: ["/assets/g/stage_2.jpg", "/assets/g/stage_14.jpg", "/assets/g/event_2.jpg"],
    quote: '"First stops are auditions for the whole tour. Koinange made sure we passed."',
    paras: [
      "There is a particular nervousness to the first stop of a run. The gear is packed tighter, the checklists get read twice, and everybody on the bus is quietly asking the same question: will the term answer the door when we knock? Senior Chief Koinange Girls answered on the first knock.",
      "The battles opened with music and never let the energy dip — by the comedy round, teachers were laughing harder than students. The news reporting category produced anchors so composed the Urban News hosts started taking notes. And the runway crowning closed the day with the whole school on its feet.",
      "The pods ran through the afternoon, sized to the day's topics, and the tree planting with Delo Greens marked the ground before we left. Everything was captured by Vibes Studios and the tour camera crews for Urban News.",
      "Koinange was the proof of concept for the whole second-term run. Three stops and five thousand students later, it reads like prophecy.",
    ],
  },
];

export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
