-- Rode isto no SQL Editor do Supabase (Etapa 10: login e aprovação).
-- Cria a tabela de usuários (alunos, professores e admins).

create extension if not exists "pgcrypto";

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  nome text not null,
  senha_hash text not null,
  papel text not null check (papel in ('aluno', 'professor', 'admin')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  aprovado_por uuid references usuarios(id)
);
create index usuarios_papel_status_idx on usuarios (papel, status);

-- Trava de segurança extra: ninguém lê/escreve direto pelo Supabase,
-- só as funções da Vercel (que usam a chave service_role e ignoram isto).
alter table usuarios enable row level security;

-- Depois de rodar o script acima, crie o primeiro admin (precisa existir
-- antes de qualquer aprovação, já que todo cadastro nasce "pendente").
-- Peça ao Claude Code para gerar o hash bcrypt da senha escolhida, e troque
-- 'HASH_AQUI' pelo hash gerado antes de rodar:
--
-- insert into usuarios (usuario, nome, senha_hash, papel, status, aprovado_em)
-- values ('admin', 'Nome do Admin', 'HASH_AQUI', 'admin', 'aprovado', now());
