# Organizando Seus Conhecimentos

Webapp educacional da **Turma A**. A ideia é de **Millena Vitória e Vanusa Macedo**, e a área do professor tem ideias do projeto **EduFácil**, da dupla do Davison.

O app está sendo construído em etapas ao longo do ano letivo.

## Como ver no computador

Dê dois cliques em `index.html`. O site abre no navegador, mas trava na tela de entrar: a IA e todos os dados de estudo (cronograma, resumos, questionários...) só funcionam com o site publicado na Vercel.

## Como publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e escolha o repositório. Não precisa mudar nenhuma configuração.
3. No [Supabase](https://supabase.com), crie um projeto e rode, nessa ordem, o SQL de `ferramentas/supabase.sql` (contas) e depois `ferramentas/supabase-etapa-10b.sql` (dados de estudo) no SQL Editor.
4. Em **Settings → Environment Variables** da Vercel, crie:
   - `OPENAI_API_KEY`: a chave da OpenAI (criada em platform.openai.com → API keys)
   - `OPENAI_MODELO` (opcional): o modelo da OpenAI. Se ficar vazio, usa `gpt-4o-mini`.
   - `SUPABASE_URL`: a URL do projeto Supabase (em Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY`: a chave **service_role** do Supabase (não é a `anon`!)
   - `AUTH_JWT_SECRET`: um texto aleatório longo, inventado (ex.: gerado com `openssl rand -hex 32`)
5. Clique em **Redeploy** para as variáveis valerem.

A chave da OpenAI e as chaves do Supabase ficam só na Vercel. Nunca aparecem no site nem no celular dos alunos.

## Login (Etapa 10)

Aluno e professor criam conta com usuário e senha, mas só conseguem entrar depois que um **admin** aprovar o cadastro no painel (`#/admin`). Como ainda não existe nenhum admin no início, o primeiro precisa ser criado direto no banco — veja `ferramentas/supabase.sql`.

## Onde fica cada coisa

| Arquivo | Para que serve |
|---|---|
| `index.html` | As telas do app |
| `css/estilo.css` | Cores e aparência (paleta da turma no topo do arquivo) |
| `js/app.js` | Navegação entre as telas e menu lateral |
| `js/cronograma.js` | Cronograma: matérias, dias, assuntos e busca (Etapa 2) |
| `js/metas.js` | Metas e mensagem de parabéns (Etapa 3) |
| `js/progresso.js` | Barra de progresso, cronômetro de estudo e painel "Meu desempenho" (Etapa 4) |
| `js/auth.js` | Login, cadastro, sessão e `pedirDados()` (fala com `api/dados.js`) |
| `js/ia.js` | Conversa com a IA, usando o token da sessão |
| `js/resumos.js` | Resumos com IA (Etapa 5) |
| `js/questionarios.js` | Questionários com IA, correção e resultado (Etapa 6) |
| `js/perfil.js` | Perfil educacional do aluno e pontos fracos (Etapa 7) |
| `js/professor.js` | Área do professor: criar atividade/prova para imprimir (Etapas 8 e 9) |
| `js/admin.js` | Painel do administrador: aprova ou rejeita cadastros (Etapa 10) |
| `api/auth.js` | Roda na Vercel: cadastro, login e verificação de sessão (Supabase) |
| `api/admin.js` | Roda na Vercel: lista, aprova e rejeita cadastros pendentes |
| `api/dados.js` | Roda na Vercel: cronograma, metas, resumos, questionários, perfil, pesquisas, atividades e sessões de estudo (Supabase, Etapa 10b) |
| `api/ia.js` | Roda no servidor da Vercel: guarda a chave da OpenAI e monta os pedidos para a IA |
| `manifest.webmanifest` | Nome e ícone quando o site é instalado como app |
| `sw.js` | Faz o app abrir rápido e funcionar sem internet |
| `icones/` | Logo (cérebro roxo) e ícones do app |
| `ferramentas/gerar-previa.ps1` | Junta tudo num arquivo só, para gerar a prévia |
| `ferramentas/supabase.sql` | Script para criar a tabela de usuários no Supabase |
| `ferramentas/supabase-etapa-10b.sql` | Script para criar as tabelas de dados de estudo no Supabase |
