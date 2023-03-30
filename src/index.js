import path from 'node:path'
import { createRequire } from 'module'
import fs from 'fs'

const RUNTIME_CLIENT_RUNTIME_PATH = '/@vite-plugin-drupal-template-hmr-runtime'
const RUNTIME_CLIENT_ENTRY_PATH = '/@vite-plugin-drupal-template-hmr';

const composePreambleCode = (base = '/', options) => `
import {doHMR} from "${base}${RUNTIME_CLIENT_RUNTIME_PATH.slice(1)}";
doHMR({
  templateBase: "${options.templateBase}"
});
`

const _require = createRequire(import.meta.url);
const runtimeSourceFilePath = _require.resolve('./runtime/main.js');
const runtimeCode = `${fs.readFileSync(runtimeSourceFilePath, 'utf-8')};`;

export default async function viteDrupalTemplateHMR(options) {

  const templateBase = options.templateBase || '';

  return {
    name: 'vite-plugin-drupal-template-hmr',
    apply: 'serve',
    resolveId(id) {
      if (id === RUNTIME_CLIENT_RUNTIME_PATH || id === RUNTIME_CLIENT_ENTRY_PATH) {
        return id;
      }
    },
    load(id) {
      if (id === RUNTIME_CLIENT_RUNTIME_PATH) {
        return runtimeCode;
      }

      if (id === RUNTIME_CLIENT_ENTRY_PATH) {
        return composePreambleCode(options.base, { templateBase });
      }
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: composePreambleCode(options.base, { templateBase }),
        },
      ];
    },
    handleHotUpdate({ file, server }) {
      if (path.extname(file) === '.twig') {
        server.ws.send({ type: 'custom', event: 'drupal:update:twig', data: {file, config: server.config} });
      }
    }
  }
}
