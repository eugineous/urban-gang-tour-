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
    key: "tee3d",
    img: "/assets/merch/tee_3d_logo.png",
    tag: "The classic",
    optionType: "size",
    desc: "The full colour logo on heavyweight black cotton. The one the hosts actually wear on stage. Start here.",
    orderText: "Yo UGT, the 3D Logo Tee black caught my eye. Size {v}. What is the price and how do I pay?",
    defaultOption: "L",
  },
  {
    key: "puff",
    img: "/assets/merch/tee_magenta.png",
    tag: "Tone on tone",
    optionType: "size",
    desc: "All magenta, raised puff print, motto sitting underneath. Loud without saying a word.",
    orderText: "The Magenta Puff Tee is clean, I want one. Size {v}. What is the price and how do I pay?",
    defaultOption: "L",
  },
  {
    key: "hoodie",
    img: "/assets/merch/hoodie_black.png",
    tag: "Cold season",
    optionType: "size",
    desc: "Chenille logo stitched into heavy black fleece. Survives the tour bus, the 6am prelim, all of it.",
    orderText: "I need the Embroidered Hoodie. Size {v}. Lock me in, what is the price and payment method?",
    defaultOption: "L",
  },
  {
    key: "pinkcity",
    img: "/assets/merch/pink_city_tee.png",
    tag: "All pink everything",
    optionType: "size",
    desc: "Oversized magenta, motto across the chest. The fit that says you were front row.",
    orderText: "Pink City Tee is the vibe. Size {v}. What is the price and how do I pay?",
    defaultOption: "L",
  },
  {
    key: "babytee",
    img: "/assets/merch/baby_tee.png",
    tag: "For the girls",
    optionType: "size",
    desc: "Fitted white crop, clean little logo. Soft on the outside, loud about the gang.",
    orderText: "The Baby Tee white is so cute, I need it. Size {v}. What is the price and how do I pay?",
    defaultOption: "M",
  },
  {
    key: "crewneck",
    img: "/assets/merch/crewneck.png",
    tag: "Heavy rotation",
    optionType: "size",
    desc: "Embroidered chest, big motto on the back. The one you reach for when the hoodie is in the wash.",
    orderText: "The Crewneck black caught my eye. Size {v}. What is the price and payment method?",
    defaultOption: "L",
  },
  {
    key: "jersey",
    img: "/assets/merch/jersey.png",
    tag: "Squad kit",
    optionType: "size",
    desc: "Mesh, your number on the back, gang on the front. Wear it to the show, keep it for the highlight reel.",
    orderText: "The Event Jersey is hard. Size {v}, number ___. What is the price and how do I pay?",
    defaultOption: "L",
  },
  {
    key: "cap",
    img: "/assets/merch/cap.png",
    tag: "Crown it",
    optionType: "one",
    info: "One size",
    desc: "Snapback, 3D front logo, magenta tab on the strap. One size, full confidence.",
    orderText: "That Tour Cap though, one size. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "buckethat",
    img: "/assets/merch/bucket_hat.png",
    tag: "Head first",
    optionType: "one",
    info: "One size",
    desc: "Black, embroidered front, magenta tag on the brim. Shade for your eyes, heat for your fit.",
    orderText: "Bucket Hat is the move, one size. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "beanie",
    img: "/assets/merch/beanie.png",
    tag: "Keep it warm",
    optionType: "one",
    info: "One size",
    desc: "Cuffed knit, embroidered logo. For the cold mornings and the late night sets.",
    orderText: "I want the Beanie black, it is the season. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "tote",
    img: "/assets/merch/tote.png",
    tag: "Carry the gang",
    optionType: "one",
    info: "12oz canvas",
    desc: "Heavy canvas, logo front and centre. Books, snacks, merch from the next stop. It holds the whole movement.",
    orderText: "I want the Gang Tote. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "waistbag",
    img: "/assets/merch/waist_bag.png",
    tag: "Hands free",
    optionType: "one",
    info: "Crossbody",
    desc: "Crossbody, magenta zip, holds the essentials. Festival ready, pickpocket proof.",
    orderText: "Waist Bag is a whole vibe, I want one. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "drawstring",
    img: "/assets/merch/drawstring.png",
    tag: "Grab and go",
    optionType: "one",
    info: "Drawstring",
    desc: "Logo glowing orange on black. Throw in your gym kit, your shades, your charger. Done.",
    orderText: "I want the Drawstring Bag, it is clean. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "bottle",
    img: "/assets/merch/bottle.png",
    tag: "Stay watered",
    optionType: "one",
    info: "500ml steel",
    desc: "Matte black steel, full colour logo. From the lecture hall to the dance floor, it keeps up.",
    orderText: "The Water Bottle caught my eye, I want one. What is the price and how do I pay?",
    defaultOption: "One size",
  },
  {
    key: "lanyard",
    img: "/assets/merch/lanyard.png",
    tag: "Neck game",
    optionType: "one",
    info: "ID holder",
    desc: "Woven, loud, holds your ID and your room key. Spotted on every crew member at every stop.",
    orderText: "I need the Lanyard. What is the price and payment method?",
    defaultOption: "One size",
  },
  {
    key: "wristbands",
    img: "/assets/merch/wristbands.png",
    tag: "Stack them",
    optionType: "color",
    desc: "Black, magenta, orange. Pick one or wear all three. The cheapest way to rep the gang all term.",
    orderText: "I want Wristbands, colour {v}, quantity ___. What is the price and payment method?",
    defaultOption: "Magenta",
  },
  {
    key: "stickers",
    img: "/assets/merch/stickers.png",
    tag: "Stick it everywhere",
    optionType: "one",
    info: "Vinyl sheet",
    desc: "Laptop, water bottle, locker, phone. The logo, the bolt, the motto. People ask, you tell them.",
    orderText: "That Sticker Pack is fire, I want ___ packs. What is the price and how do I pay?",
    defaultOption: "One size",
  },
];

export const COMING_SOON = ["Campus Notebook"];

export const SIZES = ["S", "M", "L", "XL", "2XL"];
export const COLORS = ["Black", "Magenta", "Orange"];
