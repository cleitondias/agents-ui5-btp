// Peças comuns ao init e ao update: packs, hashes, cópia de ficheiros e manifesto do projeto.
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const VERSION = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8')).version;
export const MANIFEST = '.sap-btp-kit.json';

const PACKS_DIR = join(KIT_ROOT, 'packs');
const PRUNED = new Set(['node_modules', 'gen', '.DS_Store']);
// Pontos de partida: depois do init, o código pertence ao projeto e o update não lhe toca.
const STARTER_PACKS = new Set(['cap-app']);

export class KitError extends Error {}

export function availablePacks() {
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

// O npm não publica ficheiros .gitignore, por isso o pack guarda-os como `gitignore`.
function targetPath(rel) {
  return basename(rel) === 'gitignore' ? join(dirname(rel), '.gitignore') : rel;
}

function walk(root, rel = '') {
  return readdirSync(join(root, rel), { withFileTypes: true })
    .filter((entry) => !PRUNED.has(entry.name))
    .flatMap((entry) => {
      const path = join(rel, entry.name);
      return entry.isDirectory() ? walk(root, path) : [path];
    });
}

export function listPackFiles(pack) {
  const root = join(PACKS_DIR, pack);
  return walk(root).map((rel) => ({ pack, source: join(root, rel), target: targetPath(rel) }));
}

// Ficheiros acompanhados pelo manifesto e pelo update.
export function listTrackedFiles(packs) {
  return packs.filter((pack) => !STARTER_PACKS.has(pack)).flatMap(listPackFiles);
}

export function hashFile(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

export function installFile(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  if (target.endsWith('.sh')) chmodSync(target, 0o755);
}

export function readManifest(dest) {
  const path = join(dest, MANIFEST);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

export function writeManifest(dest, packs, files) {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(dest, MANIFEST), `${JSON.stringify({ version: VERSION, packs, files: sorted }, null, 2)}\n`);
}

// > 0 quando a versão `a` é mais recente do que `b`.
export function compareVersions(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}
