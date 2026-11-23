-- Rode isto no SQL Editor do Supabase.
-- Adiciona o selo "Idealizadora do app" para Millena e Vanusa.
-- Precisa ter rodado supabase.sql antes (cria a tabela usuarios).

alter table usuarios add column criador boolean not null default false;
