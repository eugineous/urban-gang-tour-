import { designFor, guilloche } from "./document-designs";
export type PrintRecord = {
  type: string;
  event: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  amount: number;
  order: string;
  id: string;
  tier: string;
  qty: number;
  status: string;
  verifyUrl: string;
  reference: string;
  items: { name: string; qty: number; price: number }[];
};
export type PrintBrand = {
  name?: string;
  logo?: string;
  photo?: string;
  accent?: string;
  proof?: string;
};
/** Native PDF text + vector QR; never rasterize the whole page. No browser DOM required. */
export async function compactDocumentPdf(
  record: PrintRecord,
  design = "festival",
  brand: PrintBrand = {},
) {
  const [{ jsPDF }, QR] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const ticket = record.type === "ticket",
    invoice = record.type === "invoice",
    d = designFor(design);
  const width = ticket ? 139.7 : invoice ? 148 : 80,
    height = ticket
      ? 50.8
      : invoice
        ? 210
        : Math.max(
            93,
            105 +
              record.items.reduce(
                (n, l) => n + Math.max(1, Math.ceil(l.name.length / 27)) * 4 + 3,
                0,
              ),
          );
  const p = new jsPDF({
    unit: "mm",
    format: [width, height],
    orientation: width > height ? "landscape" : "portrait",
    compress: true,
  });
  p.setProperties({
    title: `${record.type} ${record.order}`,
    author: brand.name || "Urban Gang Tour",
    subject: "Scan the official QR to check current status",
    keywords: brand.proof || record.id,
  });
  const fill = (color: string, x: number, y: number, w: number, h: number) => {
      p.setFillColor(color);
      p.rect(x, y, w, h, "F");
    },
    text = (
      s: string,
      x: number,
      y: number,
      size = 9,
      color = "#171717",
      bold = false,
    ) => {
      p.setFont("helvetica", bold ? "bold" : "normal");
      p.setFontSize(size);
      p.setTextColor(color);
      p.text(String(s), x, y);
    },
    rule = (x: number, y: number, w: number, color = "#d6d0c9") => {
      p.setDrawColor(color);
      p.setLineWidth(0.15);
      p.line(x, y, x + w, y);
    },
    logo = (x: number, y: number, w: number, h: number) => {
      if (brand.logo)
        try {
          p.addImage(
            brand.logo,
            brand.logo.startsWith("data:image/jpeg") ? "JPEG" : "PNG",
            x,
            y,
            w,
            h,
            undefined,
            "FAST",
          );
        } catch {}
    },
    qr = (x: number, y: number, size: number) => {
      const matrix = QR.create(record.verifyUrl, {
          errorCorrectionLevel: "M",
        }).modules,
        n = matrix.size,
        unit = size / (n + 8);
      fill("#ffffff", x, y, size, size);
      p.setFillColor("#111111");
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (matrix.get(r, c))
            p.rect(
              x + (c + 4) * unit,
              y + (r + 4) * unit,
              unit + 0.01,
              unit + 0.01,
              "F",
            );
    };
  const accent = /^#[0-9a-f]{6}$/i.test(brand.accent || "")
      ? brand.accent!
      : d.accent,
    brandName = (brand.name || "Urban Gang Tour").slice(0, 65),
    money = (n: number) => "KES " + n.toLocaleString("en-KE");
  if (ticket) {
    fill(d.paper, 0, 0, width, height);
    fill(accent, 74, 0, 32, height);
    // Different geometric print compositions, with a calm opaque panel for real names.
    p.setDrawColor(d.secondary);
    p.setLineWidth(design === "minimal" ? 0.5 : 2);
    for (let i = 0; i < 8; i++) {
      const x = 76 + i * 4;
      if (design === "wave")
        p.lines(
          [
            [4, 9],
            [-6, 10],
            [7, 10],
            [-5, 21],
          ],
          x,
          0,
          [1, 1],
          "S",
        );
      else if (design === "electric" || design === "comic")
        p.lines(
          [
            [5, 9],
            [-7, 10],
            [9, 10],
            [-5, 21],
          ],
          x,
          0,
          [1, 1],
          "S",
        );
      else p.line(x, 0, x + 15, height);
    }
    p.setDrawColor(accent);
    p.setLineWidth(0.12);
    for (let ring = 0; ring < 6; ring++) {
      const points = guilloche(87, 25, 10 + ring)
        .match(/-?\d+\.\d+,-?\d+\.\d+/g)!
        .map((v) => v.split(",").map(Number));
      for (let i = 1; i < points.length; i++)
        p.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    }
    fill(d.paper, 4, 4, 67, 42);
    logo(5, 5, 16, 10);
    text(brandName, 23, 9, 8, d.ink, true);
    text(
      /sample/i.test(record.status) ? "DESIGN SAMPLE" : "OFFICIAL ADMISSION",
      23,
      13,
      6,
      d.ink,
    );
    p.setFont("helvetica", "bold");
    p.setFontSize(
      record.event.length > 45 ? 12 : record.event.length > 28 ? 15 : 19,
    );
    const lines = p.splitTextToSize(record.event.toUpperCase(), 66);
    p.setTextColor(d.ink);
    p.text(lines.slice(0, 3), 5, 23);
    text(record.date, 5, 35, 8, d.ink, true);
    text(
      p
        .splitTextToSize(`${record.time} · ${record.venue}`, 65)
        .slice(0, 2)
        .join("\n"),
      5,
      39,
      7,
      d.ink,
    );
    if (brand.photo) { try { p.addImage(brand.photo, brand.photo.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 75, 3, 29, 39, undefined, "FAST"); } catch {} }
    fill(d.paper, 0, 43, 106, 7);
    p.setFont("helvetica","bold");p.setFontSize(record.name.length > 30 ? 6 : 8);p.setTextColor(d.ink);p.text(p.splitTextToSize(record.name,50).slice(0,2),5,record.name.length>30?46:47.5);
    text(record.tier.slice(0, 28), 58, 47.5, 7, d.ink, true);
    fill("#fffdf6", 106, 0, 33.7, height);
    rule(106, 0, 0);
    text(record.amount < 0 ? "ENTRY PASS" : money(record.amount), 109, 6, 9, "#111", true);
    qr(108, 8, 29.5);
    text("ADMIT " + record.qty, 109, 41, 7, "#111", true);
    text(record.order.slice(0, 24), 109, 45, 5.5);
    text(
      /sample/i.test(record.status)
        ? "SAMPLE · NOT FOR ENTRY"
        : "ISSUER VERIFIED ONLINE",
      109,
      49,
      4.5,
    );
    text((brand.proof || record.id).slice(0, 40), 5, 50, 3.5, d.ink);
  } else {
    const dark = design === "premium",
      paper = dark ? "#151716" : design === "ledger" ? "#edf4fa" : design === "minimal" ? "#ffffff" : "#fffdf7",
      ink = dark ? "#fff8e8" : "#181818";
    fill(paper, 0, 0, width, height);
    fill(accent, 0, 0, width, 2);
    logo(5, 6, 13, 10);
    text(brandName, 21, 10, invoice ? 13 : 10, ink, true);
    text(invoice ? "INVOICE" : "PURCHASE RECEIPT", 21, 15, 7, ink, true);
    text(record.status.toUpperCase(), 5, 23, 7, ink);
    text(record.date + " " + record.time, 5, 28, 7, ink);
    text(record.order, 5, 33, 7, ink, true);
    text("Customer: " + record.name.slice(0, invoice ? 65 : 35), 5, 38, 7, ink);
    rule(5, 42, width - 10, accent);
    let y = 48;
    for (const l of record.items) {
      if (invoice && y > height - 65) { p.addPage([width, height]); fill(paper,0,0,width,height); text(brandName + " · " + record.order,5,10,9,ink,true); y=20; }
      p.setFontSize(7);
      p.setTextColor(ink);
      const lines = p.splitTextToSize(`${l.qty} x ${l.name}`, width - 30);
      p.text(lines, 5, y);
      text(money(l.qty * l.price), width - 24, y, 7, ink, true);
      y += Math.max(1, lines.length) * 4 + 3;
    }
    if(invoice && y > height-55){p.addPage([width,height]);fill(paper,0,0,width,height);text(brandName+" · "+record.order,5,10,9,ink,true);y=20;}
    rule(5, y, width - 10, accent);
    text("TOTAL", 5, y + 7, 10, ink, true);
    text(money(record.amount), width - 30, y + 7, 10, ink, true);
    qr(5, y + 12, 22);
    text("Verify this document", 30, y + 16, 8, ink, true);
    p.setFontSize(6);
    p.setTextColor(ink);
    p.text(p.splitTextToSize(record.reference, width - 36), 30, y + 21);
    text("Not an eTIMS tax invoice.", 30, y + 30, 5.5, ink);
    text("Thank you for being part of the culture.", 5, height - 7, 6, ink);
    text((brand.proof || record.id).slice(0, 45), 5, height - 3, 4, ink);
  }
  return p;
}
