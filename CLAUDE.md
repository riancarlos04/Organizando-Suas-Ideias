# Contexto do projeto: Organizando Seus Conhecimentos

Este arquivo guarda o contexto das conversas com o Claude, para continuar de onde paramos em qualquer computador.
O Claude Code lê este arquivo sozinho ao abrir a pasta. **Atualize-o ao final de cada etapa.**

Última atualização: 03/11/2026, depois da Etapa 10a (login real + aprovação por admin).

## Quem é quem

- **Professor responsável:** professor de Educação Digital de uma escola municipal (cerca de 220 alunos, poucos recursos de tecnologia). É quem conversa com o Claude e leva as perguntas para a turma.
- **Turma A (8º/9º ano):** fez o projeto de criação de apps e votou nas ideias.
- **Millena Vitória e Vanusa Macedo:** dupla da **ideia vencedora**, "Organizando Seus Conhecimentos". O app é a visão delas: cronograma, resumos, questionários, personalização e progresso.
- **Dupla do Davison:** autores do "EduFácil". A ideia não venceu a votação, mas a turma aproveitou o **lado do professor** (criar atividade, prova e plano de aula com IA, pensado para imprimir e funcionar sem exigir celular de todo aluno).

## Regras de trabalho (combinadas com o professor)

1. Uma etapa por vez, em aulas separadas ao longo do ano.
2. **Antes de programar cada etapa**, mandar uma lista curta, em português simples, do que perguntar em aula, dizendo **para quem** é cada pergunta: Millena/Vanusa, dupla do Davison, turma toda ou o professor.
3. Não inventar conteúdo definitivo: usar placeholders e esperar as decisões da aula. O que for escolha do Claude deve ser avisado como provisório.
4. Ao final de cada etapa, mostrar o que ficou pronto e propor a próxima.
5. O professor acompanha pelo site publicado: **toda mudança pronta vai para o GitHub** (commit e push).
6. Respostas e textos para o professor sempre em português simples.

## Onde fica cada coisa

- **GitHub:** https://github.com/riancarlos04/Organizando-Suas-Ideias (branch `main`)
- **Site:** publicado na Vercel (conta do professor), que atualiza sozinha a cada push.
- **Prévia online** (feita pelo Claude): https://claude.ai/artifact/3abr9rkBYjinFFVFNSmHay. Ela é gerada com `ferramentas/gerar-previa.ps1`, que junta tudo num HTML só. Na prévia a IA não funciona e a área do professor fica aberta (`window.MODO_PREVIA`). **Pendência:** a prévia ainda não foi atualizada para o novo fluxo de login da Etapa 10; hoje ela pode não refletir as telas de entrar/cadastro/admin.
- **Banco de dados:** Supabase (projeto já criado pelo professor). Só a tabela `usuarios` existe até agora (script em `ferramentas/supabase.sql`). Cronograma/metas/resumos/questionários/atividades continuam no `localStorage`, não no banco.
- **Variáveis na Vercel:** `OPENAI_API_KEY`, `OPENAI_MODELO` (opcional; padrão `gpt-4o-mini`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (nunca a `anon`), `AUTH_JWT_SECRET` (string aleatória inventada, não vem do Supabase). As variáveis antigas `CODIGO_ESCOLA` e `CODIGO_PROFESSOR` foram removidas do código e devem ser apagadas da Vercel.

## Tecnologia

- HTML, CSS e JavaScript puros, sem ferramentas de build, para a turma conseguir ler o código. É um PWA instalável (`manifest.webmanifest`, `sw.js`). **Aumentar a versão do `CACHE` no `sw.js` a cada mudança.**
- Os dados de estudo (cronograma, metas, resumos, questionários, atividades) ficam no `localStorage` de cada aparelho. As **contas** (usuário, senha, aprovação) ficam no Supabase, desde a Etapa 10a.
- A IA é a OpenAI, chamada só pela função da Vercel `api/ia.js`. A chave nunca vai para o navegador. O app manda uma **"tarefa"** e o servidor monta o pedido; não existe chat livre.
- Login (Etapa 10a): nome de usuário + senha (sem e-mail), para aluno e professor. Tabela própria `usuarios` no Supabase (não usa o Supabase Auth nativo), com hash bcrypt da senha. Login emite um JWT próprio (`api/auth.js`, segredo em `AUTH_JWT_SECRET`), guardado no navegador em `localStorage` (`sessao-token`). Todo cadastro novo nasce com `status: 'pendente'` e só funciona depois que um **admin** aprovar em `#/admin` (`api/admin.js`). O client nunca fala direto com o Supabase — só pelas funções `api/*.js`, que usam a chave `service_role` (nunca exposta ao navegador).
- O papel **admin** é separado de aluno/professor. Não tem tela de login própria: se o usuário+senha digitado em `#/aluno/entrar` OU `#/professor/entrar` pertencer a uma conta admin, o app abre `#/admin` em vez da área normal.
- Ordem dos scripts no `index.html`: cronograma → metas → progresso → auth → ia → resumos → questionarios → perfil → professor → admin → app.
- Navegação por `#/rota` em `js/app.js` (`mostrarTela`).
- **Testes sem IA:** o Claude cria páginas no scratchpad com a prévia mais um `pedirIA` falso e abre no Edge sem janela (headless). Neste PC: o Python é só um atalho da loja; o Bash não roda `.ps1`, então scripts PowerShell rodam pela ferramenta PowerShell; o Git roda pelo Bash.

## Identidade visual (decidida pela turma)

- **4 cores:** roxo `#7B2CBF` (topo, títulos e identidade), azul Pantone 3005 C `#0077C8` (ações, com texto branco em negrito), branco (fundo) e preto (texto e impressão). Só tons claros dessas mesmas cores.
- **Botões de perfil e do menu:** fundo branco com borda roxa.
- **Logo:** cérebro roxo (`icones/logo.png`). O ícone do app é o cérebro em fundo branco.
- **Nome:** "Organizando Seus Conhecimentos" (também o nome curto do app instalado).
- **Telas iniciais no estilo Claude/ChatGPT:** "Olá, [nome]!" em letra manuscrita (Kaushan Script), barra de busca no centro e menu lateral escondido no botão ☰.
- **Abertura animada:** o cérebro aparece no centro e voa até o lugar dele (o logo da tela de escolha ou o cérebro pequeno da barra roxa).
- **Ideias não escolhidas:** ícones no menu, letra dos títulos, modo escuro, desenhos e formato dos botões.

## Etapas prontas

1. **Fundação:** escolha Sou aluno / Sou professor, paleta, logo, PWA e menu lateral.
2. **Cronograma** (`js/cronograma.js`):
   - matérias fixas: Português, Matemática, História, Ciências, Geografia, Inglês, Arte, Religião e Educação Física;
   - o aluno cadastra os assuntos e escolhe só os dias, sem horário;
   - abas "Minha semana" (calendário e assuntos do dia) e "Matérias e assuntos";
   - assunto estudado fica riscado;
   - a busca da tela inicial filtra matérias e assuntos, e o Enter leva para os Resumos.
3. **Metas** (`js/metas.js`): texto livre, prazo opcional e "Parabéns!" ao cumprir. Ficam só em "Minhas metas", não na tela do Olá.
4. **Meu progresso** (`js/progresso.js`):
   - progresso = assuntos riscados + metas cumpridas, mostrado **só no painel "Meu desempenho"**;
   - cronômetro de estudo ("Estudar agora", "Terminei", "Cancelar");
   - cartões, comparação com a semana passada e barras por matéria.
5. **Resumos com IA** (`js/resumos.js`):
   - 6 tipos de resumo; se o aluno colar um texto, a IA resume aquele texto, senão faz um resumo próprio;
   - o aluno decide se guarda;
   - abrir um resumo com matéria inicia o cronômetro.
6. **Questionários com IA** (`js/questionarios.js`):
   - 5, 10, 15 ou 20 questões, nível, tipos (múltipla escolha, V/F, discursiva) e com ou sem gabarito ("sem" mostra só os acertos);
   - a IA corrige as discursivas;
   - nota no formato "7 de 10": acima de 60% aparece "Parabéns!", com 60% ou menos aparece "Revise o conteúdo e se esforce mais";
   - "Ver resumo" nos temas errados e média no painel;
   - os níveis são explicados para a IA, e o app manda até 40 questões já feitas do mesmo assunto para ela não repetir.
7. **Personalização** (`js/perfil.js`):
   - cadastro rápido na 1ª vez (nome opcional, nível de ensino, objetivo, conhecimento e tempo), depois em "Meu perfil";
   - as opções de tempo (até 30 min / 30 min–1 h / mais de 1 h) foram escolhidas pelo Claude e são provisórias;
   - o perfil vai para a IA, e dá para trocar o nível em cada resumo ou questionário;
   - botão "Explicar mais simples";
   - pontos fracos no painel (erro = 2 pontos, pesquisa = 1 ponto), com a frase do slide: "Você apresenta maior dificuldade em…".
8. **Professor: criar atividade** (`js/professor.js`, ideia do EduFácil):
   - a área do professor pede o código dos professores;
   - a IA cria a atividade, ou o professor começa em branco;
   - 5 tipos: múltipla, V/F, discursiva, associação e interpretação de texto;
   - editor completo: mudar textos, apagar, adicionar e trocar uma questão pela IA;
   - impressão econômica (2 colunas, só nome e data no topo);
   - o gabarito fica só no app, e as atividades ficam em "Minhas atividades".
   - **Correção depois de um erro de matemática:** cada questão gerada traz um campo `resolucao` **antes** da resposta, para a IA resolver antes de marcar. Se ainda errar, a sugestão é trocar `OPENAI_MODELO` ou criar uma conferência automática (custa o dobro de pedidos).
9. **Login real + aprovação por admin** (`js/auth.js`, `js/admin.js`, `api/auth.js`, `api/admin.js`, Etapa 10a, banco Supabase):
   - LGPD já autorizada pela escola para guardar dados de alunos no Supabase.
   - Aluno e professor se cadastram com nome + usuário + senha; todo cadastro nasce `pendente`.
   - Um admin aprova/rejeita em `#/admin` (`js/admin.js`). Sem aprovação, o login mostra "aguardando aprovação" e não entra.
   - As telas `#/aluno/entrar` e `#/professor/entrar` reconhecem contas admin automaticamente e abrem `#/admin` nessas duas portas (não existe uma 3ª tela de login de admin).
   - Os códigos fixos antigos (`CODIGO_ESCOLA`, `CODIGO_PROFESSOR`) foram removidos do código; o professor precisa apagá-los da Vercel.
   - **Escopo fechado para esta etapa:** só contas e aprovação. Cronograma/metas/resumos/questionários/atividades continuam em `localStorage`, sem migração — isso fica para a Etapa 10b.
   - **Dados de teste antigos** (localStorage de testes anteriores à Etapa 10) foram perdidos de propósito — decisão combinada com o professor, sem migração automática.
   - **Pendente do professor, fora do código:** rodar `ferramentas/supabase.sql` no Supabase, configurar as novas variáveis na Vercel (ver seção "Onde fica cada coisa") e testar o fluxo completo (cadastro → aprovação → login) antes de levar para a escola.

## Em aberto

- **Etapa 10b (ainda não feita):** migrar cronograma, metas, resumos, questionários feitos, pesquisas e atividades do `localStorage` para o Supabase, associados à conta logada. É o item de maior volume de trabalho que ficou de fora da 10a de propósito.
- **Próxima etapa proposta depois da 10b: Etapa 9, Criar prova + Plano de aula** (perguntas para a dupla do Davison) — a ordem numérica ficou invertida porque o login (originalmente Etapa 10) foi priorizado a pedido do professor; ok manter os números como estão ou renumerar, perguntar antes de seguir.
- **Ordem proposta depois:** Etapa 11 (turmas: o professor manda a atividade e o aluno recebe; notas e dificuldades da turma).
- **Ainda sem resposta:** se a atividade do professor chega ao aluno pelo app (por enquanto é só impressa) e se o modelo da IA será trocado.
- **Opcionais no fim do ano:** correção de prova por foto (ideia do EduFácil) e apresentação final.
