// Peças comuns aos comandos: packs, hashes, cópia de ficheiros e manifesto do projeto.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const { name: PACKAGE, version: VERSION } = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8'));
export const MANIFEST = '.sap-btp-kit.json';

const PACKS_DIR = join(KIT_ROOT, 'packs');
const PRUNED = new Set(['node_modules', 'gen', '.DS_Store']);
// Pontos de partida: depois do init, o código pertence ao projeto e o sync não lhe toca.
const STARTER_PACKS = new Set(['cap-app']);

export class KitError extends Error {}

// No Windows o npm e o openspec são .cmd, que só correm através de uma shell.
export function runCommand(command, args, options) {
  if (process.platform === 'win32') return spawnSync(`${command} ${args.join(' ')}`, { ...options, shell: true });
  return spawnSync(command, args, options);
}

export function availablePacks() {
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

// O npm não publica ficheiros .gitignore, por isso o pack guarda-os como `gitignore`.
function targetPath(rel) {
  return basename(rel) === 'gitignore' ? posix.join(posix.dirname(rel), '.gitignore') : rel;
}

function walk(root, rel = '') {
  return readdirSync(join(root, rel), { withFileTypes: true })
    .filter((entry) => !PRUNED.has(entry.name))
    .flatMap((entry) => {
      const path = posix.join(rel, entry.name); // o manifesto é partilhado entre sistemas
      return entry.isDirectory() ? walk(root, path) : [path];
    });
}

export function listPackFiles(pack) {
  const root = join(PACKS_DIR, pack);
  return walk(root).map((rel) => ({ pack, source: join(root, rel), target: targetPath(rel) }));
}

// Ficheiros acompanhados pelo manifesto e pelo sync.
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
  if (!existsSync(path)) return null;
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  // A versão 0.1.0 gravava no Windows caminhos com `\`.
  const files = Object.entries(manifest.files).map(([target, hash]) => [target.replaceAll('\\', '/'), hash]);
  return { ...manifest, files: Object.fromEntries(files) };
}

export function writeManifest(dest, packs, files) {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(dest, MANIFEST), `${JSON.stringify({ version: VERSION, packs, files: sorted }, null, 2)}\n`);
}

// > 0 quando a versão `a` é mais recente do que `b`.
export function compareVersions(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}
