// upgrade — atualiza a própria CLI; os projetos só mudam com o sync.
import { sep } from 'node:path';
import { compareVersions, KIT_ROOT, KitError, PACKAGE, runCommand, VERSION } from './kit.js';

export function upgrade() {
  if (!KIT_ROOT.includes(`${sep}node_modules${sep}`)) {
    throw new KitError('a correr a partir de um clone do kit: atualiza-o com `git pull`.');
  }
  if (KIT_ROOT.includes(`${sep}_npx${sep}`)) {
    console.log(`Com npx não há instalação para atualizar: usa \`npx ${PACKAGE}@latest <comando>\`.`);
    return;
  }

  const view = runCommand('npm', ['view', PACKAGE, 'version'], { encoding: 'utf8' });
  const latest = view.stdout?.trim();
  if (view.status !== 0 || !latest) throw new KitError('não foi possível consultar o registry: confirma o token no ~/.npmrc.');
  if (compareVersions(latest, VERSION) <= 0) {
    console.log(`Já estás na versão mais recente (${VERSION}).`);
    return;
  }

  const install = runCommand('npm', ['i', '-g', `${PACKAGE}@${latest}`], { stdio: 'inherit' });
  if (install.status !== 0) throw new KitError('`npm i -g` falhou.');
  console.log(`CLI atualizada: ${VERSION} → ${latest}. Corre \`sap-btp-kit sync\` em cada projeto.`);
}
