// Run an immutable, dry-bundled production Worker without Wrangler's watch/proxy.
// No remote database, payments, email credentials or R2 bindings are supplied.
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import path from 'node:path';
const runtime = path.resolve(process.argv[2] || '/tmp/ugt-flow-runtime');
const options = convertV4MiniflareOptions({
  host: '127.0.0.1', port: Number(process.env.FLOW_PORT || 4184),
  workers: [{
    name: 'urban-gang-tour', modules: true,
    modulesRoot: path.join(runtime, 'bundle'),
    scriptPath: path.join(runtime, 'bundle/worker.js'),
    compatibilityDate: '2024-09-23', compatibilityFlags: ['nodejs_compat'],
    kvNamespaces: ['UGT_MEDIA'],
    serviceBindings: {WORKER_SELF_REFERENCE: 'urban-gang-tour'},
    assets: {
      directory: path.join(runtime, '.open-next/assets'), binding: 'ASSETS',
      run_worker_first: true, assetConfig: {html_handling: 'none'},
      routerConfig: {has_user_worker: true},
    },
  }],
});
// The pinned v4 compatibility converter does not infer the default export.
options.workers[0].config.exports.default = {type: 'worker'};
const runtimeServer = new Miniflare(options);
console.log('Frozen production Worker preview:', String(await runtimeServer.ready));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  await runtimeServer.dispose(); process.exit();
});
