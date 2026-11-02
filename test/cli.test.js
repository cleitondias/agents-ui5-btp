import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const TRACKED = 'docs/patterns/cap/testing.md';
const OLD_HASH = `sha256:${'0'.repeat(64)}`;

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

describe('sap-btp-kit', () => {
  let root;
  let dest;
  const read = (file) => readFileSync(join(dest, file), 'utf8');
  const manifest = () => JSON.parse(read('.sap-btp-kit.json'));
  const setManifest = (change) => {
    const data = manifest();
    change(data);
    writeFileSync(join(dest, '.sap-btp-kit.json'), JSON.stringify(data));
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'kit-'));
    dest = join(root, 'vendas-api');
  });
  afterEach(() => rmSync(root, { recursive: true }));

  it('help lista os comandos', () => {
    for (const args of [['help'], ['--help'], ['-h'], ['init', '--help']]) {
      const result = run(...args);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /sap-btp-kit init/);
      assert.match(result.stdout, /sap-btp-kit sync/);
      assert.match(result.stdout, /sap-btp-kit help/);
    }
  });

  it('-v e --version mostram a versão do pacote', () => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    for (const flag of ['-v', '--version']) {
      const result = run(flag);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), version);
    }
  });

  it('upgrade recusa correr a partir de um clone', () => {
    const result = run('upgrade');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /clone[^]*git pull/);
  });

  describe('init', () => {
    it('monta o cap-app com placeholder, dotfiles e manifesto', () => {
      const result = run('init', dest, '--packs', 'cap-app');
      assert.equal(result.status, 0, result.stderr);

      assert.ok(read('package.json').includes('vendas-api'));
      assert.ok(!read('package.json').includes('cap-template'));
      assert.ok(existsSync(join(dest, '.gitignore')));
      assert.ok(!existsSync(join(dest, 'gitignore')));
      assert.ok(existsSync(join(dest, TRACKED)));
      assert.ok(statSync(join(dest, 'scripts/oflow.sh')).mode & 0o100);

      const { packs, files } = manifest();
      assert.deepEqual(packs, ['base', 'cap-patterns', 'cap-app']);
      assert.ok(files[TRACKED].startsWith('sha256:'));
      assert.ok(!('mta.yaml' in files));
    });

    it('não sobrescreve ficheiros e acrescenta a base ao AGENTS.md uma só vez', () => {
      mkdirSync(join(dest, 'scripts'), { recursive: true });
      writeFileSync(join(dest, 'scripts/oflow.sh'), 'local\n');
      writeFileSync(join(dest, 'AGENTS.md'), '# Meu projeto\n');

      const result = run('init', dest);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /scripts\/oflow\.sh/);
      assert.equal(read('scripts/oflow.sh'), 'local\n');
      assert.ok(read('AGENTS.md').startsWith('# Meu projeto\n'));
      assert.match(read('AGENTS.md'), /## Padrões de código/);
      assert.ok(!read('AGENTS.md').includes('Instruções para agentes'));

      const agents = read('AGENTS.md');
      assert.equal(run('init', dest).status, 0);
      assert.equal(read('AGENTS.md'), agents);
    });

    it('rejeita pack desconhecido, nome inválido e versão diferente da do projeto', () => {
      assert.match(run('init', dest, '--packs', 'nada').stderr, /pack desconhecido: nada/);
      assert.match(run('init', dest, '--packs', 'cap-app', '--name', 'Mau_Nome').stderr, /inválido/);
      assert.match(run('init', dest, '--tools', 'claude;x').stderr, /--tools inválido/);

      assert.equal(run('init', dest).status, 0);
      setManifest((data) => { data.version = '0.0.1'; });
      assert.match(run('init', dest, '--packs', 'cap-patterns').stderr, /alinha-as com `sync`/);
    });

    it('leva a skill review-mr, igual para cada ferramenta, e regista-a no manifesto', () => {
      assert.equal(run('init', dest).status, 0);
      const skills = ['.agents', '.claude', '.cursor'].map((dir) => `${dir}/skills/review-mr/SKILL.md`);
      const { files } = manifest();
      for (const skill of skills) assert.ok(files[skill], `${skill} fora do manifesto`);
      assert.equal(new Set(skills.map(read)).size, 1, 'as cópias da skill review-mr divergem');
    });
  });

  describe('sync', () => {
    beforeEach(() => {
      assert.equal(run('init', dest, '--packs', 'cap-patterns').status, 0);
    });

    it('substitui um ficheiro sem alterações locais', () => {
      const current = read(TRACKED);
      writeFileSync(join(dest, TRACKED), 'antigo\n');
      const oldHash = `sha256:${createHash('sha256').update('antigo\n').digest('hex')}`;
      setManifest((data) => { data.files[TRACKED] = oldHash; });

      assert.equal(run('sync', dest).status, 0);
      assert.equal(read(TRACKED), current);
    });

    it('mantém uma alteração local quando o kit não mudou', () => {
      writeFileSync(join(dest, TRACKED), 'meu\n');
      const result = run('sync', dest);
      assert.equal(result.status, 0);
      assert.equal(read(TRACKED), 'meu\n');
      assert.ok(!existsSync(join(dest, `${TRACKED}.kit-new`)));
      assert.match(result.stdout, /Nada a atualizar/);
    });

    it('em conflito grava .kit-new e não insiste na atualização seguinte', () => {
      writeFileSync(join(dest, TRACKED), 'meu\n');
      setManifest((data) => { data.files[TRACKED] = OLD_HASH; });

      assert.match(run('sync', dest).stdout, /kit-new/);
      assert.equal(read(TRACKED), 'meu\n');
      assert.ok(existsSync(join(dest, `${TRACKED}.kit-new`)));

      rmSync(join(dest, `${TRACKED}.kit-new`));
      assert.match(run('sync', dest).stdout, /Nada a atualizar/);
      assert.ok(!existsSync(join(dest, `${TRACKED}.kit-new`)));
    });

    it('copia ficheiros novos no kit e respeita os apagados no projeto', () => {
      rmSync(join(dest, TRACKED));
      assert.match(run('sync', dest).stdout, /Nada a atualizar/);
      assert.ok(!existsSync(join(dest, TRACKED)));

      setManifest((data) => { delete data.files[TRACKED]; });
      assert.match(run('sync', dest).stdout, /Novos:/);
      assert.ok(existsSync(join(dest, TRACKED)));
    });

    it('avisa sobre ficheiros que saíram do kit sem os apagar', () => {
      writeFileSync(join(dest, 'docs/antigo.md'), 'x\n');
      setManifest((data) => { data.files['docs/antigo.md'] = OLD_HASH; });

      assert.match(run('sync', dest).stdout, /Saíram do kit[^]*docs\/antigo\.md/);
      assert.ok(existsSync(join(dest, 'docs/antigo.md')));
      assert.ok(!('docs/antigo.md' in manifest().files));
    });

    it('lê manifestos da 0.1.0 com caminhos do Windows e normaliza-os', () => {
      setManifest((data) => {
        data.files[TRACKED.replaceAll('/', '\\')] = data.files[TRACKED];
        delete data.files[TRACKED];
      });

      assert.match(run('sync', dest).stdout, /Nada a atualizar/);
      assert.ok(TRACKED in manifest().files);
      assert.ok(Object.keys(manifest().files).every((file) => !file.includes('\\')));
    });

    it('update continua a funcionar como alias do sync, com aviso', () => {
      const result = run('update', dest);
      assert.equal(result.status, 0);
      assert.match(result.stderr, /usa `sync`/);
      assert.match(result.stdout, /Nada a atualizar/);
    });

    it('--dry-run não escreve nada', () => {
      writeFileSync(join(dest, TRACKED), 'meu\n');
      setManifest((data) => { data.version = '0.0.1'; data.files[TRACKED] = OLD_HASH; });
      const before = read('.sap-btp-kit.json');

      assert.match(run('sync', dest, '--dry-run').stdout, /dry-run/);
      assert.equal(read('.sap-btp-kit.json'), before);
      assert.ok(!existsSync(join(dest, `${TRACKED}.kit-new`)));
    });

    it('recusa projetos sem manifesto e versões mais recentes', () => {
      setManifest((data) => { data.version = '99.0.0'; });
      assert.match(run('sync', dest).stderr, /mais recente/);
      assert.match(run('sync', root).stderr, /não encontrado[^]*upgrade/);
    });
  });
});
