import { jsPDF, AcroFormTextField, AcroFormCheckBox } from 'jspdf';

// Native text and AcroForm annotations: readable when printed and editable in a PDF reader.
// No submission action, JavaScript, tracking, external font, or applicant data is embedded.
const INK = '#1b1918', MUTED = '#57524e', LINE = '#cfc8bf';
const MAGENTA = '#ad1264', CREAM = '#f7f3ed';
export const DOCUMENT_VERSION = '28 OCT 2026 / V1';

function sheet(title, fileId, logoData) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  pdf.setProperties({ title, author: 'Urban Gang Tour', subject: 'Event-specific application and partnership enquiries', creator: 'Urban Gang Tour native document generator' });
  pdf.setCreationDate(new Date('2026-10-28T00:00:00Z'));
  if (!/^[a-f\d]{32}$/i.test(fileId)) throw new Error('Document ID must be 32 hexadecimal characters');
  pdf.setFileId(fileId);
  const text = (value, x, y, size = 9, bold = false, color = INK) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size); pdf.setTextColor(color); pdf.text(value, x, y);
  };
  const paragraph = (value, x, y, width = 182, size = 8.8, leading = 3.9) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(value, width);
    lines.forEach((line, i) => text(line, x, y + i * leading, size, false, MUTED));
    return y + lines.length * leading;
  };
  const rule = (y, color = LINE) => { pdf.setDrawColor(color); pdf.setLineWidth(0.25); pdf.line(14, y, 196, y); };
  const section = (number, label, y) => {
    text(number, 14, y, 9, true, MAGENTA); text(label.toUpperCase(), 23, y, 10, true); rule(y + 2.8);
  };
  const field = (name, label, x, y, width, height = 10, multiline = false, maxLength = 180) => {
    text(label, x, y, 8.1, true);
    pdf.setFillColor('#ffffff'); pdf.setDrawColor(LINE); pdf.setLineWidth(0.25); pdf.roundedRect(x, y + 3, width, height, 1, 1, 'FD');
    const f = new AcroFormTextField();
    f.fieldName = name; f.Rect = [x + 1, y + 3.7, width - 2, height - 1.4];
    f.fontName = 'Helvetica'; f.fontSize = 9; f.maxFontSize = 9; f.color = '#1b1918';
    f.multiline = multiline; f.maxLength = maxLength; f.showWhenPrinted = true;
    f.value = ''; f.defaultValue = ''; pdf.addField(f);
  };
  const check = (name, label, x, y, width = 83) => {
    pdf.setDrawColor(LINE); pdf.setLineWidth(0.25); pdf.rect(x, y - 3.3, 3.6, 3.6);
    const f = new AcroFormCheckBox(); f.fieldName = name; f.Rect = [x, y - 3.3, 3.6, 3.6];
    f.appearanceState = 'Off'; f.value = 'Off'; f.defaultValue = 'Off';
    f.showWhenPrinted = true; pdf.addField(f);
    paragraph(label, x + 6, y - 0.3, width - 6, 8, 3.2);
  };
  const header = (kind, page, heading, subtitle) => {
    pdf.setFillColor('#ffffff'); pdf.rect(0, 0, 210, 297, 'F');
    if (logoData) pdf.addImage(logoData, 'PNG', 14, 11, 31, 18.5, undefined, 'FAST');
    else { text('URBAN GANG TOUR', 14, 19, 12, true); text('From Potential to Purpose', 14, 25, 8, false, MUTED); }
    text(kind.toUpperCase(), 113, 16, 8, true, MAGENTA);
    text(DOCUMENT_VERSION, 113, 22, 7.3, false, MUTED);
    text(`${page} / 2`, 185, 28, 9, true);
    rule(33, MAGENTA);
    text(heading, 14, 44, 23, true);
    if (subtitle) paragraph(subtitle, 14, 51, 182, 9, 4);
  };
  const footer = (kind, page) => {
    rule(285);
    text('urbangangtour.co.ke  |  admin@urbangangtour.co.ke', 14, 290, 7.5, false, MUTED);
    text(`${kind}  |  ${page} / 2`, 156, 290, 7.5, false, MUTED);
    pdf.link(14, 286, 108, 6, { url: 'https://urbangangtour.co.ke/vendors' });
  };
  return { pdf, text, paragraph, rule, section, field, check, header, footer };
}

export function buildVendorApplication({ logoData } = {}) {
  const { pdf, text, paragraph, section, field, check, header, footer } = sheet('Urban Gang Tour - Food & Event Vendor Application', '55475456454E444F523230323631303238'.slice(0, 32), logoData);
  header('Food & event vendors', 1, 'Your next event starts here.', 'For individuals and businesses. Complete both pages, save a copy and email the application with your menu or product list. Use a PDF reader, or print and write clearly.');
  section('01', 'Applicant & contact', 68);
  field('applicant_type', 'Applicant type: individual / business', 14, 75, 55, 9);
  field('applicant_name', 'Applicant / authorised contact name', 75, 75, 121, 9);
  field('trading_name', 'Trading / business name, if applicable', 14, 92, 88, 9);
  field('business_registration', 'Registration reference, if applicable (no ID copy)', 108, 92, 88, 9);
  field('contact_email', 'Email', 14, 109, 88, 9);
  field('contact_phone', 'Phone / preferred contact number', 108, 109, 88, 9);

  section('02', 'Event & package request', 132);
  field('event_name', 'Event name / tour stop (or proposed event)', 14, 139, 88, 9);
  field('event_date_location', 'Date & venue / county, if known', 108, 139, 88, 9);
  field('package_choice', 'Requested package: 1 / Main Vendor or 2 / Minor Vendor', 14, 156, 182, 9);
  text('Package 1 — Main Vendor', 14, 175, 9, true); text('KES 30,000-45,000', 14, 181, 10, true, MAGENTA);
  text('Package 2 — Minor Vendor', 111, 175, 9, true); text('KES 10,000-15,000', 111, 181, 10, true, MAGENTA);
  paragraph('Indicative fee ranges only. Final written quote confirms the event, allocation, inclusions, utilities, taxes where applicable and agreed payment / cancellation terms. No space or services are reserved by this form.', 14, 185, 182, 8.4, 3.6);

  section('03', 'Offer, prices & allergens', 202);
  field('menu_prices_allergens', 'Menu / products, KES selling prices & allergens (attach a full list if needed)', 14, 209, 182, 21, true, 700);

  section('04', 'Space & utilities needed', 244);
  text('State requirements; availability and any charges must be agreed in writing.', 14, 251, 8, false, MUTED);
  field('space_dimensions', 'Footprint (m) + equipment', 14, 257, 43, 14, true, 100);
  field('power_requirements', 'Power: equipment + kW/A', 60, 257, 43, 14, true, 100);
  field('water_handwashing', 'Water + handwashing', 106, 257, 43, 14, true, 100);
  field('cold_storage', 'Cold / hot holding plan', 152, 257, 44, 14, true, 100);
  footer('Vendor application', 1);

  pdf.addPage('a4');
  header('Food & event vendors', 2, 'Ready to trade responsibly.', 'Complete the checks that apply to your operation. If a document is pending, note its status in your safety plan. UGT will confirm event-specific requirements before any trading approval.');
  field('application_reference', 'Applicant / trading name + event (to keep both pages together)', 14, 59, 182, 8);

  section('05', 'Safety & operating plan', 80);
  paragraph('Food vendors: explain raw / cooked separation, safe cooking and temperature checks, chilled / hot holding, safe water, handwashing, cleaning, allergen communication, illness reporting and waste / wastewater disposal. Non-food vendors: describe relevant product and operational risks.', 14, 87, 182, 8.3, 3.6);
  field('food_safety_plan', 'Controls / responsible person / pending documents (attach a plan if needed)', 14, 102, 182, 24, true, 800);
  field('staffing_fire_controls', 'Staff numbers & supervisor; cooking fuel / gas / fire controls, if applicable', 14, 136, 182, 11, true, 250);

  section('06', 'Document readiness - tick those ready', 160);
  check('check_menu', 'Menu / products, prices & allergen list', 14, 169);
  check('check_handler', 'Food-handler certificate status, if required', 108, 169);
  check('check_permits', 'Applicable county / public-health permits', 14, 178);
  check('check_risk', 'Relevant hygiene / risk plan', 108, 178);
  check('check_utilities', 'Equipment / utility requirements', 14, 187);
  check('check_insurance', 'Liability cover, if required for the event', 108, 187);

  section('07', 'Selection, terms & your information', 199);
  paragraph('Selection considers offer, suitability, safety readiness and available event space. An application is not acceptance or a payment receipt. Trade only after written approval and the applicable permits, food-handler requirements and venue rules are confirmed. No alcohol or tobacco promotion at school events.', 14, 206, 182, 8.3, 3.6);
  paragraph('Final written quote and agreement set allocation, inclusions / exclusions, utilities, taxes if applicable, payment, cancellation, refunds and responsibilities. No sales, footfall or exclusivity is promised.', 14, 223, 182, 8.3, 3.6);
  paragraph('Privacy: contact details and application information are used to assess this request, check relevant requirements and arrange participation. See urbangangtour.co.ke/privacy-policy; contact admin@urbangangtour.co.ke about your information. Do not send passport / ID copies, bank details or medical records. List certificate status / expiry; provide evidence only when requested through an agreed private channel. Tax details only if later needed for contracting / invoicing.', 14, 234, 182, 7.8, 3.2);
  check('applicant_declaration', 'I am authorised to apply, the information is accurate to my knowledge, and I will meet applicable safety, permit and venue requirements before trading. I understand this application does not reserve a space or confirm acceptance.', 14, 254, 182);
  field('declaration_name', 'Applicant / authorised signatory name (confirmation)', 14, 266, 118, 8);
  field('declaration_date', 'Date', 138, 266, 58, 8);
  text('Before sending: complete both pages, confirm your declaration and attach your menu / product list.', 14, 281, 7.7, true);
  footer('Vendor application', 2);
  return pdf;
}

export function buildSponsorshipPack({ logoData } = {}) {
  const { pdf, text, paragraph, section, field, header, footer } = sheet('Urban Gang Tour - Sponsorship & Partnership Opportunities', '55475453504F4E534F5232303236313032'.slice(0, 32), logoData);
  header('Sponsorship & partnerships', 1, 'Create an experience together.', 'Connect your brand or organisation with a clearly scoped event, activation or production. Start with the outcome you want; we will shape the opportunity and written proposal around it.');
  pdf.setFillColor(CREAM); pdf.roundedRect(14, 70, 182, 33, 2, 2, 'F');
  text('SCHOOLS & CAMPUSES', 19, 80, 9, true);
  text('LIVE HOSTING', 84, 80, 9, true);
  text('ACTIVATIONS & PRODUCTION', 130, 80, 8.5, true);
  paragraph('Event-led experiences, hosting and production with Urban Gang Tour. The event, audience suitability, venue permission, deliverables and commercial terms are agreed for each project.', 19, 88, 172, 9, 4);
  section('01', 'Choose a starting point', 115);
  const columns = [14, 59, 117, 159], widths = [45, 58, 42, 37];
  pdf.setFillColor(INK); pdf.rect(14, 121, 182, 11, 'F');
  ['OPPORTUNITY', 'POSSIBLE RIGHTS', 'ACTIVATION', 'EVIDENCE'].forEach((s, i) => text(s, columns[i] + 3, 128, 7.7, true, '#ffffff'));
  const rows = [
    ['Principal / presenting', 'Agreed event association, naming wording and approved brand placements.', 'Co-created event or campaign integration.', 'Placement record; agreed campaign report.'],
    ['Activation partner', 'Defined on-site presence and approved event communications.', 'Product experience, demonstration or sampling, where permitted.', 'Activity delivery; interactions by an agreed method.'],
    ['Community / in-kind', 'Acknowledgement tied to a defined, accepted contribution.', 'Equipment, services or access support with agreed value.', 'Delivery records; contribution and participation evidence.'],
    ['Media / production', 'Agreed credits, usage rights and channel deliverables.', 'Production, approved content or media collaboration.', 'Published links; delivery logs and available analytics.'],
  ];
  rows.forEach((row, r) => {
    const y = 132 + r * 29;
    pdf.setFillColor(r % 2 ? '#ffffff' : CREAM); pdf.rect(14, y, 182, 29, 'F');
    row.forEach((cell, c) => {
      if (c === 0) {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(cell, widths[c] - 7);
        lines.forEach((line, i) => text(line, columns[c] + 3, y + 7 + i * 4, 9, true));
      } else paragraph(cell, columns[c] + 3, y + 7, widths[c] - 7, 8.4, 3.8);
    });
  });
  text('Quote only - every opportunity is event-specific.', 14, 259, 11, true, MAGENTA);
  paragraph('These are discussion options, not fixed packages or a confirmed offer. Branding, quantities, access, content, dates, any exclusivity, costs and taxes require a written proposal and agreement. No audience size, reach, sales or editorial coverage is guaranteed.', 14, 266, 182, 8.5, 3.8);
  footer('Partnership pack', 1);

  pdf.addPage('a4');
  header('Sponsorship & partnerships', 2, 'A clear brief. A useful result.', 'Complete this optional brief and email both pages, or use the sponsorship / partnership enquiry on our website. Share only information needed to scope the opportunity.');
  section('02', 'Tell us what you want to achieve', 68);
  field('sponsor_organisation', 'Organisation / brand & contact name', 14, 75, 88, 11);
  field('sponsor_contact', 'Email / phone', 108, 75, 88, 11);
  field('sponsor_event', 'Event / location / preferred dates', 14, 96, 88, 11);
  field('sponsor_interest', 'Opportunity / product or service category', 108, 96, 88, 11);
  field('sponsor_objective', 'Audience suitability, objective & desired outcome', 14, 117, 88, 21, true, 350);
  field('sponsor_contribution', 'Indicative budget / in-kind offer & requirements', 108, 117, 88, 21, true, 350);

  section('03', 'Define the agreement before activation', 154);
  paragraph('Agree deliverables, approvals, brand / intellectual-property use, production scope, channels, dates and a named lead on each side. Confirm any category conflicts or exclusivity in writing; approval of one opportunity grants no automatic rights to another event, venue or channel.', 14, 162, 182, 8.8, 3.9);
  paragraph('School and youth settings require venue approval and age-appropriate activity. No alcohol or tobacco promotion at school events. Product sampling, filming and data capture need the relevant permissions; no student contact lists are included. Label sponsored content and protect editorial independence.', 14, 180, 182, 8.8, 3.9);

  section('04', 'Measure delivery and the outcome', 203);
  paragraph('Set objectives, a baseline where available, agreed metrics, evidence sources and a reporting date before launch. Separate outputs from outcomes; identify limits, sample methods and consent requirements. Use actual results and avoid advertising-value-equivalent claims.', 14, 211, 182, 8.8, 3.9);
  const metrics = [
    ['OUTPUTS', 'Approved placements, delivered activities, content links and available reach data.'],
    ['OUTCOMES', 'Opt-in enquiries, relevant feedback or agreed research, where feasible.'],
    ['ACCOUNTABILITY', 'Agreed deliverables vs actual delivery; evidence, limitations and next steps.'],
  ];
  metrics.forEach(([label, detail], i) => {
    const x = 14 + i * 62;
    text(label, x, 233, 8.2, true, MAGENTA); paragraph(detail, x, 239, 56, 8.2, 3.5);
  });
  text('Start the conversation', 14, 261, 11, true);
  text('admin@urbangangtour.co.ke', 14, 268, 10, true, MAGENTA);
  pdf.link(14, 263, 76, 7, { url: 'mailto:admin@urbangangtour.co.ke?subject=Sponsorship%20or%20partnership%20enquiry' });
  paragraph('Or visit urbangangtour.co.ke/book?type=sponsorship. This brief is an enquiry, not an agreement. We use your information to respond and scope the request: urbangangtour.co.ke/privacy-policy.', 14, 275, 182, 7.8, 3.2);
  pdf.link(14, 271, 182, 6, { url: 'https://urbangangtour.co.ke/book?type=sponsorship' });
  footer('Partnership pack', 2);
  return pdf;
}
