// Read-only static inventory: named guards are evidence to review, not proof
// that every branch is protected. Never calls providers or reads credentials.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const guardNames = new Set(['verifyAdminSession', 'hasPerm', 'isSuperAdmin', 'requireOrigin', 'sameOrigin', 'validatedCurrentBuyer', 'currentApprovedOrganizer', 'rateLimit', 'limit', 'verifyToken', 'timingSafeEqual']);
async function files(dir) {
  const found = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(found.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name === 'route.ts' ? [path.join(dir, entry.name)] : []));
  return groups.flat().sort();
}
const routes = [];
for (const file of await files(path.join(root, 'app/api'))) {
  const text = await readFile(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name && methods.has(node.name.text) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)).map(node => node.name.text);
  const calls = new Set();
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && guardNames.has(node.expression.text)) calls.add(node.expression.text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  routes.push({
    route: '/' + path.relative(path.join(root, 'app'), file).replaceAll(path.sep, '/').replace(/\/route\.ts$/, ''),
    file: path.relative(root, file), methods: exported,
    namedGuards: [...calls].sort(),
    permissionKeys: [...new Set([...text.matchAll(/hasPerm\([^,]+,\s*['"]([^'"]+)['"]\)/g)].map(match => match[1]))].sort(),
    reviewRequired: true,
  });
}
console.log(JSON.stringify({ schemaVersion: 1, assurance: 'Static inventory only; guards must be traced per method and branch.', routeCount: routes.length, handlerCount: routes.reduce((n, route) => n + route.methods.length, 0), routes }, null, 2));
