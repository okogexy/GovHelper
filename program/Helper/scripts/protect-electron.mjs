import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'rolldown';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'protected-electron');
await mkdir(outputDir, { recursive: true });

async function bundle(input, file) {
  await build({
    input: path.join(root, input),
    platform: 'node',
    external: ['electron'],
    output: {
      file: path.join(outputDir, file),
      format: 'cjs',
      minify: true,
      sourcemap: false,
      comments: false,
    },
  });
  const result = await stat(path.join(outputDir, file));
  if (result.size < 100) throw new Error(`Защищённый модуль ${file} не собран.`);
}

await bundle('electron/main.cjs', 'main.cjs');
await bundle('electron/preload.cjs', 'preload.cjs');
