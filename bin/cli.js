#!/usr/bin/env node
// sap-btp-kit — monta e atualiza projetos a partir dos packs deste repositório.
import { parseArgs } from 'node:util';
import { KitError } from '../lib/kit.js';
import { init } from '../lib/init.js';
import { update } from '../lib/update.js';

const USAGE = `Uso:
  sap-btp-kit init <destino> [--packs <lista>] [--tools <lista>] [--name <nome>]
  sap-btp-kit update [destino] [--dry-run]

init    monta (ou complementa) um projeto. Ficheiros existentes nunca são sobrescritos: o
        AGENTS.md recebe as instruções da base no fim, o resto é ignorado e listado.
          --packs  packs além da base, separados por vírgula:
                     cap-app                    código do template CAP (inclui cap-patterns)
                     cap-patterns               docs/patterns/cap/
                     fiori-elements-patterns    docs/patterns/fiori-elements/
                     fiori-freestyle-patterns   docs/patterns/fiori-freestyle/
          --tools  ferramentas de IA com pasta própria de skills (ex.: claude,cursor), geradas
                   com \`openspec init\`; as skills em .agents/skills/ vêm sempre na base
          --name   nome do projeto (kebab-case) que substitui o placeholder \`cap-template\` do
                   cap-app; por omissão, o nome da pasta de destino

update  aplica a versão instalada do kit a um projeto com .sap-btp-kit.json (por omissão, a pasta
        atual). Ficheiros alterados no projeto nunca são substituídos: em conflito, a nova versão
        fica em <ficheiro>.kit-new. O código do cap-app não é atualizado.
          --dry-run  só mostra o que mudaria`;

const OPTIONS = {
  packs: { type: 'string', default: '' },
  tools: { type: 'string', default: '' },
  name: { type: 'string' },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
};

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === undefined || command === '-h' || command === '--help') {
    console.log(USAGE);
    return command === undefined ? 1 : 0;
  }
  const { values, positionals } = parseArgs({ args: rest, options: OPTIONS, allowPositionals: true });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  if (positionals.length > 1) throw new KitError('só um destino é aceite.');

  if (command === 'update') {
    update(positionals[0] ?? '.', { dryRun: values['dry-run'] });
    return 0;
  }
  if (command === 'init' && positionals.length === 1) {
    init(positionals[0], values);
    return 0;
  }
  console.error(USAGE);
  return 1;
}

try {
  process.exitCode = main();
} catch (error) {
  if (!(error instanceof KitError) && error.code?.startsWith('ERR_PARSE_ARGS') !== true) throw error;
  console.error(`sap-btp-kit: ${error.message}`);
  process.exitCode = 1;
}
