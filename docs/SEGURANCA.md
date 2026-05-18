# Segurança — leia antes de publicar na internet

O app trata **dados pessoais de servidores públicos** (nomes, função,
escala). Publicar na internet exige cuidado (LGPD).

## Riscos do modo "túnel rápido" (Cloudflare trycloudflare)

1. **Senhas previsíveis**: por padrão, login = nome e senha = nome + `123`.
   Fáceis de adivinhar. **Mitigação**: rode `TROCAR-SENHAS.bat` (gera senhas
   fortes únicas em `docs/SENHAS-NOVAS.md`) antes de divulgar a URL.
2. **URL pública sem filtro de IP**: qualquer um com o link chega à tela de
   login. A proteção real é a senha — por isso o item 1 é essencial.
3. **Sessão/ť token JWT** válido por 8h (`JWT_EXPIRES_IN`). Ajuste se quiser.
4. **PC exposto**: enquanto o túnel roda, este computador atende a internet.
   Mantenha o Windows atualizado e o antivírus ativo. Feche o túnel quando
   não estiver em uso.
5. **URL temporária**: o endereço `trycloudflare.com` muda a cada reinício
   do túnel. Para URL fixa, use um túnel nomeado do Cloudflare (requer conta
   gratuita + domínio) ou deploy em nuvem.

## Recomendações mínimas antes de divulgar

- [ ] `TROCAR-SENHAS.bat` (senhas fortes) e distribuir individualmente.
- [ ] Trocar `JWT_SECRET` e a senha do admin em `backend/.env`.
- [ ] Orientar cada servidor a não compartilhar a senha.
- [ ] Avaliar com a área de TI/segurança do órgão se a exposição via túnel
      é aceitável ou se deve ir para um ambiente oficial com HTTPS e
      controle de acesso institucional.

## Alternativa mais segura (futuro)

Deploy em nuvem (Render/Railway/VPS) com PostgreSQL, HTTPS próprio, backups
e, idealmente, login integrado ao diretório do órgão (SSO/gov.br).
