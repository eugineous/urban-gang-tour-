/** Pure HTML renderer. contentHtml must be trusted markup with user values escaped. */
export function escapeEmailHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type EmailLetterhead = {
  title: string;
  eyebrow?: string;
  contentHtml: string;
  previewText?: string;
};

/** Fluid table layout and inline fallbacks work without remote fonts or scripts. */
export function renderEmailLetterhead({title, eyebrow = 'Urban Gang Tour', contentHtml, previewText = title}: EmailLetterhead): string {
  const heading = escapeEmailHtml(title);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title>
<style>@media only screen and (max-width:480px){.ugt-email-header{padding:20px!important}.ugt-email-body{padding:20px!important}.ugt-email-title{font-size:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f1f3;color:#211b20;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapeEmailHtml(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f1f3;border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid #dfd5dc;border-collapse:separate;border-spacing:0;background:#fff;border-radius:14px;overflow:hidden">
<tr><td class="ugt-email-header" style="padding:24px 28px;background:#211b20;color:#fff;border-bottom:4px solid #941358">
<a href="https://urbangangtour.co.ke/" style="display:inline-block;text-decoration:none"><img src="https://urbangangtour.co.ke/assets/ugt-logo.png" alt="Urban Gang Tour" width="88" height="52" style="display:block;width:88px;height:auto;max-width:100%;border:0"></a>
<p style="margin:18px 0 8px;color:#f3b7d5;font-size:12px;font-weight:700;letter-spacing:.06em;line-height:1.5;text-transform:uppercase">${escapeEmailHtml(eyebrow)}</p>
<h1 class="ugt-email-title" style="margin:0;color:#fff;font-size:28px;font-weight:600;line-height:1.25;word-break:break-word;overflow-wrap:anywhere">${heading}</h1>
</td></tr>
<tr><td class="ugt-email-body" style="padding:24px 28px;color:#211b20;font-size:15px;line-height:1.65;word-break:break-word;overflow-wrap:anywhere">${contentHtml}</td></tr>
<tr><td style="padding:18px 24px;border-top:1px solid #e8dfe5;color:#655b62;font-size:12px;line-height:1.7;word-break:break-word">
<strong style="color:#211b20">Urban Gang Tour</strong><br>
<a href="https://urbangangtour.co.ke/" style="color:#7d164b;text-decoration:underline">urbangangtour.co.ke</a> &nbsp;·&nbsp; <a href="mailto:admin@urbangangtour.co.ke" style="color:#7d164b;text-decoration:underline">Contact the team</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** Accessible metadata table: labels and values are escaped, never interpreted. */
export function renderEmailRows(rows: ReadonlyArray<readonly [string, string]>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;table-layout:fixed">${rows.map(([label, value]) => `<tr><th scope="row" align="left" style="width:32%;padding:10px 12px 10px 0;border-bottom:1px solid #eee7ec;color:#655b62;vertical-align:top;font-weight:400;word-break:break-word">${escapeEmailHtml(label)}</th><td style="padding:10px 0;border-bottom:1px solid #eee7ec;color:#211b20;vertical-align:top;word-break:break-word;overflow-wrap:anywhere">${escapeEmailHtml(value)}</td></tr>`).join('')}</table>`;
}
