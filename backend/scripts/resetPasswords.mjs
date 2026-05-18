// Gera uma senha forte e unica para cada usuario de servidor (OPERATOR),
// atualiza o banco e grava a folha de credenciais em docs/SENHAS-NOVAS.md.
// Uso: (na pasta backend)  node scripts/resetPasswords.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function strongPwd() {
  // 10 caracteres, sem ambiguos
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const b = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  return s;
}

const users = await prisma.user.findMany({
  where: { role: 'OPERATOR' },
  include: { person: { include: { team: true } } },
  orderBy: { name: 'asc' },
});

const rows = [];
for (const u of users) {
  const senha = strongPwd();
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await bcrypt.hash(senha, 10) },
  });
  rows.push({ nome: u.name, sigla: u.person?.team?.sigla || '-', login: u.email, senha });
}

const md = [
  '# Senhas (NOVAS) — distribuição confidencial',
  '',
  `> Geradas em ${new Date().toLocaleString('pt-BR')}. Entregue a cada servidor`,
  '> apenas a sua linha. Oriente a trocar no primeiro acesso.',
  '',
  '| Servidor | Equipe | Login | Senha |',
  '|----------|--------|-------|-------|',
  ...rows.map((r) => `| ${r.nome} | ${r.sigla} | \`${r.login}\` | \`${r.senha}\` |`),
  '',
].join('\n');

const docsDir = path.resolve(process.cwd(), '..', 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const out = path.join(docsDir, 'SENHAS-NOVAS.md');
fs.writeFileSync(out, md, 'utf8');

console.log(`OK: ${rows.length} senhas redefinidas.`);
console.log(`Folha de credenciais: ${out}`);
await prisma.$disconnect();
