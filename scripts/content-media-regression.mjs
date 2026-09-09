import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleFrom(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function('exports', code)(exports);
  return exports;
}
const { correctShellContent, DEPARTED } = moduleFrom('lib/content-rules.ts');
const { rewriteHtmlMedia, cfImage } = moduleFrom('lib/img.ts');
for (const file of fs.readdirSync('app/_rendered')) {
  const html = correctShellContent(fs.readFileSync(`app/_rendered/${file}`, 'utf8'));
  for (const name of DEPARTED) assert.equal(name.test(html), false, `${file}: departed name`);
  assert.ok(html.includes('<main'), `${file}: page content preserved`);
}
const media = rewriteHtmlMedia('<img src="{{ p.url }}"><video src="/assets/video/hero-main.mp4" autoplay muted poster="/assets/poster.png"></video>');
assert.ok(media.includes('data-ugt-bound-src="{{ p.url }}"'));
assert.ok(media.includes('data-ugt-video="/assets/light-v1/video/hero-main.mp4"'));
assert.equal(/\sautoplay(?:\s|>)/i.test(media), false, 'No offscreen eager autoplay');
assert.ok(fs.existsSync('public' + cfImage('/assets/poster.png', 960)));
assert.ok(fs.statSync('public' + cfImage('/assets/poster.png', 960)).size < 150_000);
for (const name of ['hero-main', 'hero-1']) assert.ok(fs.statSync(`public/assets/light-v1/video/${name}.mp4`).size < 1_200_000);
console.log('PASS: all captured pages remove departed names; inert bound media; poster and video size budgets');
