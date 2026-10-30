// sync — leva um projeto para a versão do kit em execução, sem perder alterações locais.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  availablePacks, compareVersions, hashFile, installFile, KitError, listTrackedFiles, MANIFEST, readManifest,
  VERSION, writeManifest,
} from './kit.js';

// Compara o manifesto (kit à data da instalação), o disco e a nova versão do kit.
function classify(known, disk, kit) {
  if (disk === undefined) {
    if (known === undefined) return 'added';
    return known === kit ? 'unchanged' : 'deletedLocally';
  }
  if (disk === kit) return 'unchanged';
  if (disk === known) return 'updated';
  return known === kit ? 'unchanged' : 'conflict';
}

function report(title, files) {
  if (files.length === 0) return;
  console.log(`\n${title}`);
  for (const file of files) console.log(`  ${file}`);
}

export function sync(destArg, { dryRun }) {
  const dest = resolve(destArg);
  const manifest = readManifest(dest);
  if (!manifest) throw new KitError(`${MANIFEST} não encontrado em ${dest}: corre o \`sync\` dentro do projeto, indica o caminho dele, ou usa \`init\` para o adotar. Para atualizar a própria CLI, usa \`upgrade\`.`);
  if (compareVersions(manifest.version, VERSION) > 0) {
    throw new KitError(`o projeto está na versão ${manifest.version} do kit, mais recente do que esta (${VERSION}).`);
  }

  const available = availablePacks();
  const packs = manifest.packs.filter((pack) => available.includes(pack));
  const files = {};
  const actions = { added: [], updated: [], conflict: [], deletedLocally: [], unchanged: [] };

  for (const { source, target } of listTrackedFiles(packs)) {
    const path = join(dest, target);
    const kit = hashFile(source);
    const action = classify(manifest.files[target], existsSync(path) ? hashFile(path) : undefined, kit);
    actions[action].push(target);
    files[target] = kit;
    if (dryRun) continue;
    if (action === 'added' || action === 'updated') installFile(source, path);
    if (action === 'conflict') installFile(source, `${path}.kit-new`);
  }

  const removed = Object.keys(manifest.files).filter((target) => !(target in files));
  const droppedPacks = manifest.packs.filter((pack) => !packs.includes(pack));
  if (!dryRun) writeManifest(dest, packs, files);

  console.log(`kit ${manifest.version} → ${VERSION}${dryRun ? ' (dry-run: nada foi escrito)' : ''}`);
  report('Atualizados:', actions.updated);
  report('Novos:', actions.added);
  report('Alterados no projeto e no kit (nova versão em <ficheiro>.kit-new; reconcilia à mão e apaga-o):', actions.conflict);
  report('Apagados no projeto e alterados no kit (mantidos apagados):', actions.deletedLocally);
  report('Saíram do kit (mantidos no projeto; apaga-os se já não fizerem falta):', removed);
  report('Packs que já não existem no kit:', droppedPacks);
  const changes = actions.updated.length + actions.added.length + actions.conflict.length + removed.length;
  if (changes === 0) console.log('Nada a atualizar.');
}
