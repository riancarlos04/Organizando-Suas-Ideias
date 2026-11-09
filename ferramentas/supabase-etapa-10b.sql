-- Rode isto no SQL Editor do Supabase (Etapa 10b: dados de estudo na nuvem).
-- Precisa ter rodado supabase.sql antes (cria a tabela usuarios).

-- Cronograma: 1 linha por aluno (documento único, upsert)
create table cronograma (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  materias jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);

-- Metas: 1 linha por meta
create table metas (
  id text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  texto text not null,
  prazo date,
  feita boolean not null default false,
  criado_em timestamptz not null default now()
);
create index metas_usuario_idx on metas (usuario_id);

-- Resumos guardados: 1 linha por resumo
create table resumos (
  id text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  assunto text,
  materia text,
  tipo text,
  texto text not null,
  pedido jsonb,
  data date not null,
  criado_em timestamptz not null default now()
);
create index resumos_usuario_idx on resumos (usuario_id);

-- Questionários terminados: 1 linha por questionário
create table questionarios_feitos (
  id text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  assunto text,
  materia text,
  nivel text,
  gabarito text,
  total int,
  acertos int,
  em_branco int,
  porcentagem int,
  questoes jsonb not null,
  data date not null,
  criado_em timestamptz not null default now()
);
create index questionarios_feitos_usuario_idx on questionarios_feitos (usuario_id);

-- Questionário em andamento: 1 linha por aluno (documento único, upsert; some quando termina/desiste)
create table questionario_em_andamento (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Perfil educacional: 1 linha por aluno (documento único, upsert)
create table perfil_aluno (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  nivel_ensino text,
  objetivo text,
  conhecimento text,
  tempo text,
  atualizado_em timestamptz not null default now()
);

-- Pesquisas (para "pontos fracos"): 1 linha por pesquisa, cortado em 200 pelo próprio código
create table pesquisas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  assunto text,
  materia text,
  data date not null,
  criado_em timestamptz not null default now()
);
create index pesquisas_usuario_idx on pesquisas (usuario_id);

-- Atividades e provas do professor: 1 linha por atividade/prova
create table atividades (
  id text primary key,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  titulo text,
  materia text,
  ano text,
  assunto text,
  nivel text,
  material text,
  turma text,
  valor_total numeric,
  versoes boolean,
  versao_b jsonb,
  questoes jsonb not null default '[]',
  data date not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index atividades_usuario_idx on atividades (usuario_id);

-- Sessões de estudo terminadas (histórico, painel "Meu desempenho"): 1 linha por sessão
create table sessoes_estudo (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  materia text not null,
  inicio timestamptz not null,
  minutos int not null,
  criado_em timestamptz not null default now()
);
create index sessoes_estudo_usuario_idx on sessoes_estudo (usuario_id);

-- Cronômetro em andamento: 1 linha por aluno (documento único, upsert; some ao terminar/cancelar)
create table sessao_em_andamento (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  materia text not null,
  inicio timestamptz not null
);

alter table cronograma enable row level security;
alter table metas enable row level security;
alter table resumos enable row level security;
alter table questionarios_feitos enable row level security;
alter table questionario_em_andamento enable row level security;
alter table perfil_aluno enable row level security;
alter table pesquisas enable row level security;
alter table atividades enable row level security;
alter table sessoes_estudo enable row level security;
alter table sessao_em_andamento enable row level security;
-- Nenhuma política criada = nega tudo por padrão para anon/authenticated.
-- Só a service_role (usada por api/dados.js) ignora RLS.
