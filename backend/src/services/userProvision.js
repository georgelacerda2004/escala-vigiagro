import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { hashPassword } from './userService.js';
import { env } from '../config/env.js';

// "DA MATTA" -> "damatta" ; "George" -> "george"
export function slugLogin(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function uniqueLogin(base) {
  let login = base || 'usuario';
  let n = 1;
  // garante unicidade no campo email (usado como login)
  while (await prisma.user.findUnique({ where: { email: login } })) {
    n += 1;
    login = `${base}${n}`;
  }
  return login;
}

/**
 * Cria um usuario OPERATOR para cada Person que ainda nao tem usuario.
 * Login = primeiro/identificador do nome (sem acento), senha inicial = login + "123".
 * Nao altera usuarios existentes. Retorna a quantidade criada.
 */
export async function ensureUsersForPeople() {
  const people = await prisma.person.findMany({
    where: { user: { is: null } },
    orderBy: { name: 'asc' },
  });

  let created = 0;
  for (const p of people) {
    const base = slugLogin(p.name);
    if (!base) continue;
    const login = await uniqueLogin(base);
    const senha = `${base}123`;
    await prisma.user.create({
      data: {
        name: p.name,
        email: login,
        passwordHash: await hashPassword(senha),
        role: 'OPERATOR',
        personId: p.id,
      },
    });
    created += 1;
  }

  await writeCredentialsDoc();
  return created;
}

// Gera docs/USUARIOS.md (lista de logins; senha inicial = login + 123).
async function writeCredentialsDoc() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'OPERATOR' },
      include: { person: { include: { team: true } } },
      orderBy: { name: 'asc' },
    });
    const lines = [
      '# Usuários dos servidores (acesso ao app)',
      '',
      '> Regra: **login = nome sem acento** · **senha inicial = login + `123`**.',
      '> Cada servidor deve trocar a senha no primeiro acesso (perfil somente leitura).',
      '',
      '| Servidor | Equipe | Login | Senha inicial |',
      '|----------|--------|-------|---------------|',
      ...users.map(
        (u) =>
          `| ${u.name} | ${u.person?.team?.sigla || '-'} | \`${u.email}\` | \`${u.email}123\` |`
      ),
      '',
      '_Admin do sistema: ver `backend/.env` (ADMIN_EMAIL / ADMIN_PASSWORD)._',
      '',
    ];
    const docsDir = path.resolve(env.backendRoot, '..', 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'USUARIOS.md'), lines.join('\n'), 'utf8');
  } catch (e) {
    logger.warn(`[users] falha ao gerar USUARIOS.md: ${e.message}`);
  }
}
