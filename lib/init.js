// init — monta (ou complementa) um projeto a partir dos packs, sem sobrescrever o que já existe.
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import {
  availablePacks, compareVersions, hashFile, installFile, KIT_ROOT, KitError, listPackFiles, listTrackedFiles,
  MANIFEST, readManifest, runCommand, VERSION, writeManifest,
} from './kit.js';

const PLACEHOLDER = 'cap-template';
const PLACEHOLDER_FILES = ['package.json', 'package-lock.json', 'mta.yaml', 'xs-security.json'];
const AGENTS_MARKER = '<!-- sap-btp-skills-and-agents: base -->';

// Lista final: base primeiro, dependências antes de quem depende delas, sem repetidos.
function resolvePacks(requested) {
  const available = availablePacks();
  const selected = new Set(['base']);
  for (const pack of requested.split(',').filter(Boolean)) {
    if (!available.includes(pack)) {
      const others = available.filter((name) => name !== 'base').join(',');
      throw new KitError(`pack desconhecido: ${pack} (disponíveis: ${others})`);
    }
    if (pack === 'cap-app') selected.add('cap-patterns');
    selected.add(pack);
  }
  return [...selected];
}

// Acrescenta as instruções da base sem o título e a introdução.
function appendAgents(source, target) {
  const existing = readFileSync(target, 'utf8');
  if (existing.includes(AGENTS_MARKER)) return;
  const content = readFileSync(source, 'utf8');
  const section = content.slice(content.search(/^## /m));
  appendFileSync(target, `\n${AGENTS_MARKER}\n${section}`);
  console.log('  AGENTS.md já existia — instruções da base acrescentadas no fim.');
}

function copyPack(pack, dest, skipped) {
  console.log(`pack: ${pack}`);
  for (const { source, target } of listPackFiles(pack)) {
    const path = join(dest, target);
    if (!existsSync(path)) installFile(source, path);
    else if (target === 'AGENTS.md') appendAgents(source, path);
    else skipped.push(target);
  }
}

function replacePlaceholder(dest, name) {
  for (const file of PLACEHOLDER_FILES) {
    const path = join(dest, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    if (content.includes(PLACEHOLDER)) writeFileSync(path, content.replaceAll(PLACEHOLDER, name));
  }
  console.log(`  placeholder '${PLACEHOLDER}' substituído por '${name}'.`);
}

function assertTools(tools) {
  if (!/^[a-z0-9-]+(,[a-z0-9-]+)*$/i.test(tools)) throw new KitError(`--tools inválido: ${tools}`);
  const result = runCommand('openspec', ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new KitError('openspec não está instalado (npm i -g @fission-ai/openspec).');
  }
}

export function init(destArg, { packs, tools, name }) {
  const selected = resolvePacks(packs);
  const hasCapApp = selected.includes('cap-app');
  const projectName = name || basename(resolve(destArg));
  if (hasCapApp && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(projectName)) {
    throw new KitError(`nome '${projectName}' inválido para o projeto CAP — usa --name em kebab-case.`);
  }
  if (tools) assertTools(tools);

  mkdirSync(destArg, { recursive: true });
  const dest = realpathSync(destArg);
  const kitRoot = realpathSync(KIT_ROOT);
  if (dest === kitRoot || dest.startsWith(kitRoot + sep)) {
    throw new KitError('o destino não pode estar dentro deste repositório.');
  }

  // Complementar um projeto noutra versão misturaria ficheiros de versões diferentes no manifesto.
  const manifest = readManifest(dest);
  if (manifest && compareVersions(manifest.version, VERSION) !== 0) {
    throw new KitError(`o projeto está na versão ${manifest.version} do kit e esta é a ${VERSION}: alinha-as com \`sync\` antes de acrescentar packs.`);
  }

  const skipped = [];
  for (const pack of selected) copyPack(pack, dest, skipped);
  if (hasCapApp) replacePlaceholder(dest, projectName);

  // Guarda o hash do kit, e não o do disco: um ficheiro local diferente conta como alteração local.
  const packList = [...new Set([...(manifest?.packs ?? []), ...selected])];
  const files = Object.fromEntries(listTrackedFiles(packList).map(({ source, target }) => [target, hashFile(source)]));
  writeManifest(dest, packList, files);
  console.log(`  ${MANIFEST} gravado (kit ${VERSION}).`);

  if (skipped.length > 0) {
    console.log('\nJá existiam no destino e NÃO foram alterados (compara à mão com o pack):');
    for (const target of skipped) console.log(`  ${target}`);
  }

  console.log();
  if (tools) {
    // O init mantém o openspec/config.yaml copiado da base e só gera as skills de cada ferramenta.
    const result = runCommand('openspec', ['init', '--tools', tools, '--no-animation', '.'], { cwd: dest, stdio: ['ignore', 'ignore', 'inherit'] });
    if (result.status !== 0) throw new KitError('`openspec init` falhou.');
    console.log(`Skills do OpenSpec geradas também para: ${tools}`);
  } else {
    console.log('Skills do OpenSpec em .agents/skills/ (Codex e agentes que leem .agents/).');
    console.log(`Para Claude Code, Cursor e outros com pasta própria: openspec init --tools claude,cursor "${dest}"`);
  }
  console.log(`Projeto pronto em ${dest}`);
}
