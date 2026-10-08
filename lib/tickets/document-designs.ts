/** Original, editable print designs. Decorative marks never replace server verification. */
export const ticketDesigns = [
  {
    id: "festival",
    name: "Culture / Festival",
    paper: "#fff8ef",
    ink: "#151515",
    accent: "#e6218c",
    secondary: "#ffd400",
    shape: "festival",
  },
  {
    id: "summer",
    name: "Summer / Party",
    paper: "#fffef8",
    ink: "#151515",
    accent: "#6837c5",
    secondary: "#ffd400",
    shape: "summer",
  },
  {
    id: "electric",
    name: "Electric / Concert",
    paper: "#fffdf4",
    ink: "#121212",
    accent: "#087cff",
    secondary: "#ffb713",
    shape: "electric",
  },
  {
    id: "wave",
    name: "Wave / Dance",
    paper: "#eafff8",
    ink: "#07372c",
    accent: "#009b76",
    secondary: "#b8ffe7",
    shape: "wave",
  },
  {
    id: "comic",
    name: "Amplify / Comedy",
    paper: "#fff9e7",
    ink: "#171717",
    accent: "#e52648",
    secondary: "#ffe133",
    shape: "comic",
  },
  {
    id: "headliner",
    name: "Headliner / Live",
    paper: "#f7f5ea",
    ink: "#153529",
    accent: "#107048",
    secondary: "#d3ff24",
    shape: "headliner",
  },
  {
    id: "minimal",
    name: "Edition / Exhibition",
    paper: "#f8f6f0",
    ink: "#161616",
    accent: "#222222",
    secondary: "#e9e3d6",
    shape: "minimal",
  },
  {
    id: "campus",
    name: "Campus / School",
    paper: "#fffdf5",
    ink: "#152337",
    accent: "#16398c",
    secondary: "#f1bb38",
    shape: "campus",
  },
  {
    id: "premium",
    name: "Reserve / VIP",
    paper: "#151716",
    ink: "#fff8e8",
    accent: "#c4994b",
    secondary: "#363d34",
    shape: "premium",
  },
] as const;
export type TicketDesignId = (typeof ticketDesigns)[number]["id"];
export const receiptDesigns = [
  "retail",
  "ledger",
  "minimal",
  "premium",
] as const;
export const designFor = (id: string) =>
  ticketDesigns.find((x) => x.id === id) || ticketDesigns[0];
export function guilloche(cx = 90, cy = 90, r = 70) {
  return (
    Array.from({ length: 361 }, (_, i) => {
      const a = (i * Math.PI) / 180,
        k = r * (0.77 + 0.23 * Math.cos(13 * a));
      return `${i ? "L" : "M"}${(cx + k * Math.cos(a)).toFixed(2)},${(cy + k * Math.sin(a)).toFixed(2)}`;
    }).join(" ") + " Z"
  );
}
export function designSvg(id: string, accent?: string) {
  const d = designFor(id),
    a = /^#[0-9a-f]{6}$/i.test(accent || "") ? accent! : d.accent;
  const rose = `<path d="${guilloche(640, 175, 132)}" fill="none" stroke="${a}" stroke-width="1.3" opacity=".25"/>`;
  let art = "";
  if (d.shape === "festival")
    art = `<path d="M0 0H150L70 349H0Z" fill="${a}"/><path d="M510 0H730V349H650Z" fill="${d.secondary}"/>`;
  if (d.shape === "summer")
    art = `<path d="M520 0H730V349H610Q540 260 620 210Q550 130 610 70Z" fill="${a}"/><circle cx="610" cy="70" r="40" fill="${d.secondary}"/><path d="M520 0L580 40 535 105 595 160 550 220 610 300 580 349" fill="none" stroke="${d.secondary}" stroke-width="20"/>`;
  if (d.shape === "electric")
    art = Array.from(
      { length: 7 },
      (_, i) =>
        `<path d="M${490 + i * 30} 0L${550 + i * 30} 65 ${500 + i * 30} 140 ${590 + i * 30} 200 ${530 + i * 30} 349" fill="none" stroke="${i % 2 ? a : d.secondary}" stroke-width="22"/>`,
    ).join("");
  if (d.shape === "wave")
    art = Array.from(
      { length: 14 },
      (_, i) =>
        `<path d="M${500 + i * 14} -10 Q${400 + i * 15} 90 ${570 + i * 14} 175T${530 + i * 14} 360" fill="none" stroke="${a}" stroke-width="${i % 3 ? 2 : 9}" opacity=".65"/>`,
    ).join("");
  if (d.shape === "comic")
    art = `<path d="M540 0L600 80 725 15 640 135 730 210 635 220 690 349 580 285 535 349 540 230 470 220 530 145 470 100 565 110Z" fill="${d.secondary}" stroke="${a}" stroke-width="12"/>`;
  if (d.shape === "headliner")
    art = `<rect x="490" width="240" height="349" fill="${a}"/><circle cx="570" cy="190" r="110" fill="${d.secondary}" opacity=".9"/>`;
  if (d.shape === "minimal")
    art = `<rect x="510" width="220" height="349" fill="${d.secondary}"/><circle cx="620" cy="174" r="78" fill="none" stroke="${a}" stroke-width="24"/><path d="M520 0V349M680 0V349" stroke="${a}" stroke-width="1"/>`;
  if (d.shape === "campus")
    art = `<path d="M535 0H730V349H610Z" fill="${a}"/><path d="M555 0L630 349M580 0L655 349M605 0L680 349" stroke="${d.secondary}" stroke-width="5"/>`;
  if (d.shape === "premium")
    art = `<path d="M500 0H730V349H560Z" fill="${d.secondary}"/><path d="M540 0L600 349M570 0L630 349M600 0L660 349" stroke="${a}" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 730 349"><rect width="730" height="349" fill="${d.paper}"/>${art}${rose}</svg>`;
}
