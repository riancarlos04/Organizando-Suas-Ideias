# Organizando Seus Conhecimentos

Webapp educacional da **Turma A**. A ideia é de **Millena Vitória e Vanusa Macedo**, e a área do professor tem ideias do projeto **EduFácil**, da dupla do Davison.

O app está sendo construído em etapas ao longo do ano letivo.

## Como ver no computador

Dê dois cliques em `index.html`. O site abre no navegador.

A IA (Resumos) não funciona assim. Ela só funciona com o site publicado na Vercel.

## Como publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e escolha o repositório. Não precisa mudar nenhuma configuração.
3. Em **Settings → Environment Variables**, crie:
   - `OPENAI_API_KEY`: a chave da OpenAI (criada em platform.openai.com → API keys)
   - `CODIGO_ESCOLA`: o código que os alunos digitam para usar a IA
   - `OPENAI_MODELO` (opcional): o modelo da OpenAI. Se ficar vazio, usa `gpt-4o-mini`.
4. Clique em **Redeploy** para as variáveis valerem.

A chave da OpenAI fica só na Vercel. Ela nunca aparece no site nem no celular dos alunos.

## Onde fica cada coisa

| Arquivo | Para que serve |
|---|---|
| `index.html` | As telas do app |
| `css/estilo.css` | Cores e aparência (paleta da turma no topo do arquivo) |
| `js/app.js` | Navegação entre as telas e menu lateral |
| `js/cronograma.js` | Cronograma: matérias, dias, assuntos e busca (Etapa 2) |
| `js/metas.js` | Metas e mensagem de parabéns (Etapa 3) |
| `js/progresso.js` | Barra de progresso, cronômetro de estudo e painel "Meu desempenho" (Etapa 4) |
| `js/ia.js` | Conversa com a IA e pedido do código da escola |
| `js/resumos.js` | Resumos com IA (Etapa 5) |
| `js/questionarios.js` | Questionários com IA, correção e resultado (Etapa 6) |
| `api/ia.js` | Roda no servidor da Vercel: guarda a chave da OpenAI e monta os pedidos para a IA |
| `manifest.webmanifest` | Nome e ícone quando o site é instalado como app |
| `sw.js` | Faz o app abrir rápido e funcionar sem internet |
| `icones/` | Logo (cérebro roxo) e ícones do app |
| `ferramentas/gerar-previa.ps1` | Junta tudo num arquivo só, para gerar a prévia |
