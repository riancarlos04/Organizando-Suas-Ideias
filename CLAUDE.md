# Contexto do projeto: Organizando Seus Conhecimentos

Este arquivo guarda o contexto das conversas com o Claude, para continuar de onde paramos em qualquer computador.
O Claude Code lê este arquivo sozinho ao abrir a pasta. **Atualize-o ao final de cada etapa.**

Última atualização: 09/11/2026, depois da Etapa 10b (dados de estudo migrados para o Supabase). O plano de aula (Etapa 9, parte 2) espera o modelo da coordenadora.

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
- **Banco de dados:** Supabase (projeto já criado pelo professor). Tabela `usuarios` (script em `ferramentas/supabase.sql`) e, desde a Etapa 10b, mais 10 tabelas de dados de estudo (script em `ferramentas/supabase-etapa-10b.sql`): `cronograma`, `metas`, `resumos`, `questionarios_feitos`, `questionario_em_andamento`, `perfil_aluno`, `pesquisas`, `atividades`, `sessoes_estudo`, `sessao_em_andamento`.
- **Variáveis na Vercel:** `OPENAI_API_KEY`, `OPENAI_MODELO` (opcional; padrão `gpt-4o-mini`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (nunca a `anon`), `AUTH_JWT_SECRET` (string aleatória inventada, não vem do Supabase). As variáveis antigas `CODIGO_ESCOLA` e `CODIGO_PROFESSOR` foram removidas do código e devem ser apagadas da Vercel.

## Tecnologia

- HTML, CSS e JavaScript puros, sem ferramentas de build, para a turma conseguir ler o código. É um PWA instalável (`manifest.webmanifest`, `sw.js`). Desde a Etapa 10a, o `sw.js` só guarda em cache os ícones/manifest — HTML, CSS e JS sempre vêm direto da internet, para nunca misturar versão antiga com nova depois de um deploy (um bug assim travou o app na tela de abertura logo depois do primeiro deploy da Etapa 10). Ainda assim, **aumentar a versão do `CACHE` no `sw.js`** se algum dia voltar a guardar mais arquivos.
- Os dados de estudo (cronograma, metas, resumos, questionários, perfil educacional, pesquisas, atividades/provas, sessões de estudo) ficam no Supabase desde a Etapa 10b, associados ao `usuario_id` da conta — sincronizam entre aparelhos. As **contas** (usuário, senha, aprovação) ficam no Supabase desde a Etapa 10a.
- A IA é a OpenAI, chamada só pela função da Vercel `api/ia.js`. A chave nunca vai para o navegador. O app manda uma **"tarefa"** e o servidor monta o pedido; não existe chat livre.
- Login (Etapa 10a): nome de usuário + senha (sem e-mail), para aluno e professor. Tabela própria `usuarios` no Supabase (não usa o Supabase Auth nativo), com hash bcrypt da senha. Login emite um JWT próprio (`api/auth.js`, segredo em `AUTH_JWT_SECRET`), guardado no navegador em `localStorage` (`sessao-token`). Todo cadastro novo nasce com `status: 'pendente'` e só funciona depois que um **admin** aprovar em `#/admin` (`api/admin.js`). O client nunca fala direto com o Supabase — só pelas funções `api/*.js`, que usam a chave `service_role` (nunca exposta ao navegador).
- O papel **admin** é separado de aluno/professor. Não tem tela de login própria: se o usuário+senha digitado em `#/aluno/entrar` OU `#/professor/entrar` pertencer a uma conta admin, o app abre `#/admin` em vez da área normal.
- Ordem dos scripts no `index.html`: **auth** → cronograma → metas → progresso → ia → resumos → questionarios → perfil → professor → admin → app. `auth.js` precisa vir primeiro porque define `pedirDados()` e `aoTrocarConta()`, usadas por todos os módulos de dados.
- **Dados de estudo no Supabase (Etapa 10b):** `api/dados.js` é o único endpoint para cronograma, metas, resumos, questionários, perfil, pesquisas, atividades e sessões de estudo — roteado por `{ recurso, acao }` no corpo, igual ao dicionário de tarefas de `api/ia.js`. Nunca confia em `usuario_id` vindo do cliente; usa sempre o `sub` do JWT validado no servidor. Cada módulo JS (`cronograma.js`, `metas.js`, etc.) chama `pedirDados(recurso, acao, dados)` (definida em `js/auth.js`) e registra sua função de recarregamento em `aoTrocarConta()`, disparada após login, logout e na checagem de sessão do boot — assim os dados trocam junto quando a conta muda, e sincronizam entre aparelhos (celular, computador) porque não dependem mais do `localStorage`.
  - **Cronograma, perfil educacional, questionário em andamento e sessão em andamento** são "documento único por aluno" (upsert: 1 linha na tabela, sobrescrita inteira a cada salvamento) — reflete como o código já tratava esses dados antes (salvava o objeto inteiro).
  - **Metas, resumos, questionários feitos, atividades, pesquisas e sessões de estudo terminadas** são coleções (1 linha por item), com ações `listar`/`criar`/`atualizar`/`remover`.
  - **Editor de atividades/provas** (`aoEditar` em `professor.js`) salva com atraso de ~1s depois de parar de digitar (debounce), para não virar uma requisição por tecla; força um salvamento imediato ao trocar de questão/tela/fechar a aba, e antes de imprimir ou ver o gabarito (a versão B sorteada precisa estar salva). O campo de resposta discursiva em questionários usa o mesmo debounce.
  - Sem suporte offline nesta etapa: toda leitura/escrita exige internet; sem conexão, mostra erro (como já acontece com a IA). Sem lógica de resolver conflito entre aparelhos (a última escrita vence) — risco baixo dado o padrão de uso.
  - Enquanto os dados carregam, cada tela mostra "Carregando…"; o gate de `app.js` que decide se o aluno precisa completar o perfil (`temPerfilAluno()`) finge que já tem perfil durante o carregamento, para não mandar o aluno pro cadastro à toa antes de saber a resposta real.
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
   - a área do professor exige login de professor (desde a Etapa 10a; antes era um código fixo);
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

10. **Criar prova** (Etapa 9, parte 1, em 04/11/2026; decisões da dupla do Davison):
   - usa a **mesma tela e o mesmo editor** de "Criar atividade" (`js/professor.js`). A rota `#/professor/prova` mostra a seção `professor/atividade` com `modoProfessor = 'prova'`;
   - as provas ficam na mesma tabela `atividades` do Supabase, marcadas pelo campo `material`, e cada tela mostra só as suas;
   - **tipo de material:** Prova, Simulado, Exercícios ou Recuperação (vai também para a IA, em `MATERIAIS` no `api/ia.js`);
   - **turma** e **valor** de cada questão: o valor total (padrão 10, escolha provisória do Claude) é dividido igualmente e pode ser mudado questão a questão. A folha mostra Turma, Valor, Nota e "(X pt)" em cada questão;
   - **versões A e B:** a B embaralha a ordem das questões, as alternativas e a coluna B da associação. A ordem fica guardada em `versaoB`, para a folha e o gabarito sempre baterem. Há o botão "Embaralhar a versão B de novo". A impressão sai a A e a B em páginas separadas, e o gabarito das duas fica no app.
11. **Dados de estudo no Supabase** (Etapa 10b, em 09/11/2026):
   - cronograma, metas, resumos, questionários (feitos e em andamento), perfil educacional, pesquisas, atividades/provas e sessões de estudo (incluindo o cronômetro em andamento) saem do `localStorage` e passam a viver no Supabase, associados à conta logada — sincronizam entre aparelhos (celular, computador);
   - novo `api/dados.js` (único endpoint para os 8 recursos) e `js/auth.js` ganhou `pedirDados()`;
   - **Escopo fechado:** só os dados de estudo listados acima. Sem suporte offline e sem resolução de conflito entre aparelhos (decisões já tomadas, ver seção "Tecnologia");
   - **Dados de teste antigos** (localStorage de antes da 10b) foram perdidos de propósito, sem migração automática — mesma decisão já tomada na 10a;
   - **Pendente do professor, fora do código:** rodar `ferramentas/supabase-etapa-10b.sql` no Supabase (depois de já ter rodado `supabase.sql`) e testar o fluxo completo em dois aparelhos diferentes, logado na mesma conta, para confirmar a sincronização.

## Em aberto

- **Prioridade combinada em 09/11/2026:** focar no que falta do lado do **aluno**. A parte do professor (plano de aula, Etapa 9 parte 2) fica pausada por enquanto. Do lado do aluno, as funcionalidades centrais da ideia original (cronograma, metas, progresso, resumos, questionários, perfil) já estão todas prontas — a próxima peça grande é a Etapa 11 (turmas), mas ela depende da resposta sobre atividades chegarem pelo app (pergunta abaixo). **Decisão: esperar a resposta da escola antes de avançar em algo novo do lado do aluno.**
- **Plano de aula (Etapa 9, parte 2) — pausado:** o professor vai alinhar o modelo com a coordenadora e trazer. **Não inventar a estrutura**; esperar o modelo.
- **Prévia online desatualizada:** desde o login, a área do professor e as telas do aluno só aparecem para quem está logado, e `window.MODO_PREVIA` não é mais usado. Para testar, o Claude simula `contaLogada` nas páginas de teste — e agora também precisa simular as respostas de `api/dados.js`, já que não há mais fallback de `localStorage`.
- **Perguntas levadas para a escola em 04/11/2026, ainda sem resposta:** as opções de tempo de estudo do perfil (Millena/Vanusa) e se a atividade do professor chega ao aluno pelo app (turma).
- **Ordem proposta depois:** Etapa 11 (turmas: o professor manda a atividade e o aluno recebe; notas e dificuldades da turma).
- **Ainda sem resposta:** se a atividade do professor chega ao aluno pelo app (por enquanto é só impressa) e se o modelo da IA será trocado.
- **Opcionais no fim do ano:** correção de prova por foto (ideia do EduFácil) e apresentação final.
