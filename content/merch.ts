export type OptionType = "size" | "color" | "one";

export interface MerchProduct {
  key: string;
  img: string;
  tag: string;
  optionType: OptionType;
  info?: string;
  desc: string;
  orderText: string;
  defaultOption: string;
}

export const MERCH_PRODUCTS: MerchProduct[] = [
  {
    key: "magenta-tee",
    img: "/v25-assets/merch/magenta-tee.png",
    tag: "The classic",
    optionType: "size",
    desc: "Heavyweight oversized tour tee in signature magenta. The one the hosts actually wear on stage.",
    orderText: "Yo UGT, the Magenta Oversized Tee caught my eye. Size {v}. What is the price and how do I pay?",
    defaultOption: "M",
  },
  {
    key: "crewneck",
    img: "/v25-assets/merch/crewneck.png",
    tag: "Heavy rotation",
    optionType: "size",
    desc: "Heavyweight brushed-fleece crewneck. Survives the tour bus, the early call time, all of it.",
    orderText: "I need the Black Crewneck Sweatshirt. Size {v}. Lock me in, what is the price and payment method?",
    defaultOption: "M",
  },
  {
    key: "baby-tee",
    img: "/v25-assets/merch/baby-tee.png",
    tag: "For the girls",
    optionType: "size",
    desc: "Fitted cropped baby tee. Soft on the outside, loud about the gang.",
    orderText: "The Cropped Baby Tee is so cute, I need it. Size {v}. What is the price and how do I pay?",
    defaultOption: "M",
  },
  {
    key: "jersey",
    img: "/v25-assets/merch/jersey.png",
    tag: "Squad kit",
    optionType: "size",
    desc: "Breathable football-style jersey with the tour badge. Wear it to the show, keep it for the highlight reel.",
    orderText: "The Football Jersey is hard. Size {v}. What is the price and how do I pay?",
    defaultOption: "M",
  },
  {
    key: "snapback",
    img: "/v25-assets/merch/snapback.png",
    tag: "Crown it",
    optionType: "one",
    info: "One size",
    desc: "Six-panel structured snapback with the embroidered mark. One size, full confidence.",
    orderText: "That Structured Snapback though, one size. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "bucket-hat",
    img: "/v25-assets/merch/bucket-hat.png",
    tag: "Head first",
    optionType: "one",
    info: "One size",
    desc: "All-day festival bucket hat. Shade for your eyes, heat for your fit.",
    orderText: "Bucket Hat is the move, one size. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "beanie",
    img: "/v25-assets/merch/beanie.png",
    tag: "Keep it warm",
    optionType: "one",
    info: "One size",
    desc: "Ribbed cuffed knit beanie with a woven tab. For the cold mornings and the late-night sets.",
    orderText: "I want the Cuffed Beanie, it is the season. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "tote",
    img: "/v25-assets/merch/tote.png",
    tag: "Carry the gang",
    optionType: "one",
    info: "Heavy canvas",
    desc: "Heavy cotton canvas tote, logo front and centre. Books, snacks, merch from the next stop.",
    orderText: "I want the Canvas Tote. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "waist-bag",
    img: "/v25-assets/merch/waist-bag.png",
    tag: "Hands free",
    optionType: "one",
    info: "Crossbody",
    desc: "Crossbody waist bag for your phone, cards, and passes. Festival ready.",
    orderText: "Waist Bag is a whole vibe, I want one. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "gym-sack",
    img: "/v25-assets/merch/gym-sack.png",
    tag: "Grab and go",
    optionType: "one",
    info: "Drawstring",
    desc: "Lightweight drawstring sack. Throw in your kit, your shades, your charger. Done.",
    orderText: "I want the Drawstring Gym Sack, it is clean. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "bottle",
    img: "/v25-assets/merch/bottle.png",
    tag: "Stay watered",
    optionType: "one",
    info: "Insulated steel",
    desc: "Matte-black double-wall insulated steel bottle. From the lecture hall to the dance floor.",
    orderText: "The Insulated Bottle caught my eye, I want one. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "lanyard",
    img: "/v25-assets/merch/lanyard.png",
    tag: "Neck game",
    optionType: "one",
    info: "ID holder",
    desc: "Black woven lanyard for passes and keys. Spotted on every crew member at every stop.",
    orderText: "I need the Woven Lanyard. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "wristbands",
    img: "/v25-assets/merch/wristbands.png",
    tag: "Stack them",
    optionType: "color",
    desc: "Silicone wristband pack. Pick one or wear all three, the cheapest way to rep the gang all term.",
    orderText: "I want the Wristband Pack, colour {v}. What is the price and payment method?",
    defaultOption: "Magenta",
  },
  {
    key: "stickers",
    img: "/v25-assets/merch/stickers.png",
    tag: "Stick it everywhere",
    optionType: "one",
    info: "Vinyl sheet",
    desc: "Die-cut vinyl sticker sheet. Laptop, water bottle, locker, phone. People ask, you tell them.",
    orderText: "That Sticker Sheet is fire, I want one. What is the price and how do I pay?",
    defaultOption: "One size",
  },
];

export const COMING_SOON: string[] = [];

export const SIZES = ["S", "M", "L", "XL", "XXL"];
export const COLORS = ["Black", "Magenta", "Orange"];
