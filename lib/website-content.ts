export const EDITABLE_PAGES = [
  { path: "/", name: "Homepage" },
  { path: "/about", name: "About us" },
  { path: "/faq", name: "Booking questions" },
  { path: "/author/eugine-micah", name: "Eugine’s biography" },
  { path: "/author/lucy-ogunde", name: "Lucy’s biography" },
] as const;
export type WebsiteContent = {
  title: string;
  summary: string;
  body: string[];
  image: string;
  faqs: { question: string; answer: string }[];
};
export const pagePath = (value: unknown): value is string =>
  typeof value === "string" &&
  EDITABLE_PAGES.some((page) => page.path === value);
export function websiteContent(value: unknown): WebsiteContent {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_content");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (key) => !["title", "summary", "body", "image", "faqs"].includes(key),
    )
  )
    throw Error("unexpected_field");
  const text = (input: unknown, max: number) => {
    if (typeof input !== "string" || input.length > max || input.includes("\0"))
      throw Error("invalid_text");
    return input;
  };
  const title = text(v.title, 120),
    summary = text(v.summary, 500),
    image = text(v.image, 1000);
  if (!title.trim()) throw Error("missing_title");
  if (
    image &&
    !(
      image.startsWith("/") &&
      !image.startsWith("//") &&
      !/[\\\r\n]/.test(image)
    ) &&
    !/^https:\/\/[^\s\\]+$/.test(image)
  )
    throw Error("invalid_image");
  if (
    !Array.isArray(v.body) ||
    v.body.length > 30 ||
    !Array.isArray(v.faqs) ||
    v.faqs.length > 30
  )
    throw Error("invalid_blocks");
  const body = v.body.map((line) => text(line, 3000));
  const faqs = v.faqs.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).some((key) => !["question", "answer"].includes(key))
    )
      throw Error("invalid_faq");
    return {
      question: text(item.question, 300),
      answer: text(item.answer, 3000),
    };
  });
  if (faqs.some((item) => !item.question.trim() || !item.answer.trim()))
    throw Error("incomplete_faq");
  return { title, summary, body, image, faqs };
}
export const WEBSITE_DEFAULTS: Record<string, WebsiteContent> = {
  "/": {
    title: "Urban Gang Tour.",
    summary:
      "School shows. Campus concerts. Live hosting. Brand activations.",
    body: [],
    image: "",
    faqs: [],
  },
  "/about": {
    title: "About us.",
    summary:
      "Events, hosting and production for schools, campuses and brands in Kenya.",
    image: "",
    body: [
      "Urban Gang Tour runs talent shows, cultural days, colour festivals and live events for schools and campuses.",
      "Eugine Micah and Lucy Ogunde host events and co-present Urban News on PPP TV Kenya. See their photographs, films and event credits.",
    ],
    faqs: [],
  },
  "/faq": {
    title: "Before you book",
    summary: "Your questions, answered.",
    image: "",
    body: [],
    faqs: [
      {
        question: "Can you bring the tour to our school?",
        answer:
          "Yes. Tell us your school, preferred date and event format. We’ll discuss the programme, permissions, safeguarding requirements and a quote before confirming.",
      },
      {
        question: "Can we book Eugine and Lucy on their own?",
        answer:
          "Yes. Request live hosting or a personal appearance through the booking form. Availability and fees are confirmed directly with you.",
      },
      {
        question: "Do you host campus and public events?",
        answer:
          "We plan and host school, campus and public experiences. Talk to us about the audience, venue, production and ticketing you need.",
      },
      {
        question: "Where do I buy tickets?",
        answer:
          "Tickets appear on the event page when the organizer opens sales. School-only events are clearly marked and are not public ticket sales.",
      },
      {
        question: "What happens after I send a booking request?",
        answer:
          "The team reviews your event details and contacts you using the details you provide. Sending a request does not confirm a booking.",
      },
    ],
  },
};
WEBSITE_DEFAULTS["/author/eugine-micah"] = {
  title: "Eugine Micah.",
  summary: "Television presenting and live event hosting.",
  image: "",
  faqs: [],
  body: [
    "Eugine Micah is a Kenyan television presenter, journalist and live event host. He co-hosts Urban News on PPP TV Kenya with Lucy Ogunde.",
    "He is Urban Gang Tour’s founder and executive producer, coordinating school and campus events, live production and event coverage.",
    "His work also includes digital media strategy, audience engagement and event supply. Contact the team for individual hosting or event production.",
  ],
};
WEBSITE_DEFAULTS["/author/lucy-ogunde"] = {
  title: "Lucy Ogunde.",
  summary: "Television presenting and live event hosting.",
  image: "",
  faqs: [],
  body: [
    "Lucy Ogunde is a television presenter, MC and event host. She co-hosts Urban News on PPP TV Kenya with Eugine Micah.",
    "She presents on television, hosts school and campus events, and appears in brand campaigns.",
    "Book Lucy for hosting, interviews or campaigns, individually or with Eugine.",
  ],
};
