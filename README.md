# Agenda da Psicóloga (Next.js + Prisma)

Aplicação web minimalista para organização de atendimentos de psicologia online:
- Agenda diária com fluxo rápido.
- Encerramento de sessão com lembretes e pagamento.
- Financeiro simples (mês/geral, pendências e gastos).
- Cadastro e ficha individual de pacientes.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + componentes estilo Shadcn/UI + Lucide
- Prisma ORM + PostgreSQL (Supabase/Neon)

## 1) Configurar variáveis de ambiente
Crie um arquivo `.env` com:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/banco?schema=public"
AUTH_PASSWORD="sua_senha_unica_forte"
AUTH_COOKIE_SECRET="um_segredo_longo_e_aleatorio"
```

## 2) Instalar e preparar banco
```bash
npm install
npx prisma migrate dev --name init
npm run prisma:seed
```

## 3) Rodar localmente
```bash
npm run dev
```

Abra `http://localhost:3000`.

## Scripts úteis
- `npm run lint`
- `npm run build`
- `npm run prisma:generate`
- `npm run prisma:seed`
