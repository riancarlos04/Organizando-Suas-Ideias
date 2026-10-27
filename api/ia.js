// =========================================================
// Função que roda no servidor da Vercel (não no celular).
// Ela guarda a chave da OpenAI escondida e só aceita pedidos
// de quem tem o código de acesso da escola.
//
// Configurar na Vercel (Settings → Environment Variables):
//   OPENAI_API_KEY = chave da OpenAI (platform.openai.com)
//   CODIGO_ESCOLA  = código que os alunos digitam no app
//   CODIGO_PROFESSOR = código da área do professor (só os professores sabem)
//   OPENAI_MODELO  = (opcional) modelo da OpenAI a usar
// =========================================================

const MODELO_PADRAO = 'gpt-4o-mini';

// ---------- Perfil do aluno (Etapa 7) ----------
// O app manda o perfil; aqui só valem as opções desta lista.
const NIVEIS_DE_ENSINO = {
  '6ano': 'aluno do 6º ano do ensino fundamental',
  '7ano': 'aluno do 7º ano do ensino fundamental',
  '8ano': 'aluno do 8º ano do ensino fundamental',
  '9ano': 'aluno do 9º ano do ensino fundamental',
  medio: 'aluno do ensino médio',
  tecnico: 'aluno de curso técnico',
  superior: 'aluno do ensino superior (faculdade), que entende termos técnicos',
  concurso: 'pessoa que estuda para concursos e vestibulares'
};
const CONHECIMENTOS = {
  iniciante: 'está começando agora e precisa de explicações bem básicas',
  intermediario: 'já conhece o básico do assunto',
  avancado: 'já domina o assunto e quer aprofundar'
};
const OBJETIVOS = {
  prova: 'quer passar na prova',
  zero: 'quer aprender do zero',
  revisar: 'quer revisar o conteúdo'
};
const TEMPOS = {
  curto: 'tem até 30 minutos por dia para estudar',
  medio: 'tem de 30 minutos a 1 hora por dia para estudar',
  longo: 'tem mais de 1 hora por dia para estudar'
};

// Descreve o aluno para a IA. Sem perfil, vale o público da escola (8º/9º ano).
function descreverAluno(perfil) {
  perfil = perfil || {};
  let texto = NIVEIS_DE_ENSINO[perfil.nivelEnsino] || 'aluno do 8º ou 9º ano do ensino fundamental';
  if (CONHECIMENTOS[perfil.conhecimento]) texto += ', que ' + CONHECIMENTOS[perfil.conhecimento];
  if (OBJETIVOS[perfil.objetivo]) texto += ', ' + OBJETIVOS[perfil.objetivo];
  if (TEMPOS[perfil.tempo]) texto += ' e ' + TEMPOS[perfil.tempo];
  return texto;
}

function instrucoesGerais(perfil, paraProfessor) {
  const publico = paraProfessor
    ? 'Um professor está preparando material para: ' + descreverAluno(perfil) + '. Adapte a linguagem e a profundidade a esses alunos. '
    : 'Quem está usando agora: ' + descreverAluno(perfil) + '. Adapte a linguagem, a profundidade e os exemplos a essa pessoa. ';
  return 'Você é o assistente de estudos do app "Organizando Seus Conhecimentos", de uma escola pública brasileira. ' +
    publico +
    'Responda sempre em português do Brasil, com linguagem clara. ' +
    'Seja correto: se não tiver certeza de uma informação, diga isso. ' +
    'Recuse com educação pedidos que não sejam sobre estudo. ';
}
const FORMATO_TEXTO =
  'Formate a resposta só com: títulos começando com "## ", listas começando com "- " e destaques entre **asteriscos duplos**. Não use tabelas nem outros formatos.';
const FORMATO_JSON = 'Responda somente com um objeto JSON válido, sem nenhum texto antes ou depois.';

function textoLimpo(valor, limite) {
  return String(valor || '').slice(0, limite).trim();
}

// ---------- Resumos (Etapa 5) ----------
const TIPOS_DE_RESUMO = {
  curto: 'Faça um resumo curto, com no máximo 5 frases.',
  detalhado: 'Faça um resumo detalhado, organizado em tópicos com subtítulos.',
  conceitos: 'Liste os principais conceitos, cada um com uma explicação de uma ou duas frases.',
  palavras: 'Liste de 8 a 12 palavras-chave, cada uma com uma explicação bem curta.',
  simples: 'Explique de forma bem simples, como para alguém que está vendo o assunto pela primeira vez.',
  exemplos: 'Dê de 3 a 5 exemplos práticos, ligados ao dia a dia dos alunos.'
};

function pedidoDeResumo(dados) {
  const instrucao = TIPOS_DE_RESUMO[dados.tipo];
  const assunto = textoLimpo(dados.assunto, 200);
  const texto = textoLimpo(dados.texto, 12000);
  if (!instrucao || (!assunto && !texto)) return null;

  let pedido = instrucao + '\n';
  if (dados.materia) pedido += 'Matéria: ' + textoLimpo(dados.materia, 50) + '\n';
  if (assunto) pedido += 'Assunto: ' + assunto + '\n';
  if (texto) {
    pedido += '\nUse somente as informações do texto abaixo, enviado pelo aluno:\n"""\n' + texto + '\n"""';
  } else {
    pedido += '\nO aluno não enviou texto. Faça o resumo com base no que é ensinado sobre esse assunto.';
  }
  // Botão "Explicar mais simples"
  if (dados.simplificar === true) {
    pedido += '\n\nO aluno achou difícil a primeira explicação. Explique de um jeito ainda mais simples: frases curtas, palavras do dia a dia e pelo menos um exemplo.';
  }
  return pedido;
}

// ---------- Questionários (Etapa 6) ----------
// O que cada nível quer dizer na prática (sem isso a IA faz tudo fácil)
const NIVEIS = {
  facil: 'FÁCIL: questões diretas, que cobram lembrar definições, fatos e ideias básicas do assunto.',
  medio: 'MÉDIO: questões que pedem para entender e aplicar o conteúdo em situações simples, com um ou dois passos de raciocínio. ' +
    'Nas de múltipla escolha, as alternativas erradas devem ser erros comuns de quem estudou pouco.',
  dificil: 'DIFÍCIL: questões desafiadoras para o nível de ensino do aluno: problemas com vários passos, situações novas que exigem aplicar o conteúdo, ' +
    'comparação entre conceitos, causa e consequência, interpretação de um pequeno texto, tabela ou situação descrita no enunciado. ' +
    'Nas de múltipla escolha, todas as alternativas erradas devem parecer certas para quem não domina o assunto. ' +
    'NÃO faça perguntas que se respondem só lembrando uma definição ou um nome.'
};
const TIPOS_DE_QUESTAO = {
  multipla: 'múltipla escolha (4 opções, só uma correta)',
  vf: 'verdadeiro ou falso',
  discursiva: 'discursiva (resposta curta escrita pelo aluno)',
  associacao: 'associação (o aluno liga cada item da coluna A ao item certo da coluna B; de 4 a 5 pares)',
  interpretacao: 'interpretação de texto (um texto curto, de 4 a 8 linhas, e uma pergunta sobre ele)'
};
// O aluno responde no celular só estes; o professor imprime os cinco
const TIPOS_DO_ALUNO = ['multipla', 'vf', 'discursiva'];
const TIPOS_DO_PROFESSOR = Object.keys(TIPOS_DE_QUESTAO);

const MODELOS_DE_QUESTAO = {
  multipla: '{"tipo": "multipla", "enunciado": "...", "opcoes": ["...", "...", "...", "..."], "correta": 0, "explicacao": "...", "tema": "..."}',
  vf: '{"tipo": "vf", "enunciado": "...", "correta": true, "explicacao": "...", "tema": "..."}',
  discursiva: '{"tipo": "discursiva", "enunciado": "...", "resposta_esperada": "...", "explicacao": "...", "tema": "..."}',
  associacao: '{"tipo": "associacao", "enunciado": "Associe as colunas.", "pares": [{"a": "...", "b": "..."}], "explicacao": "...", "tema": "..."}',
  interpretacao: '{"tipo": "interpretacao", "texto": "...", "enunciado": "...", "resposta_esperada": "...", "explicacao": "...", "tema": "..."}'
};
const REGRAS_DO_FORMATO =
  'Regras: em "multipla", "correta" é a posição da opção certa (0 a 3). Em "vf", "correta" é true ou false. ' +
  'Em "associacao", cada par liga um item "a" ao seu item "b" certo. ' +
  '"explicacao" explica a resposta certa em 1 ou 2 frases. "tema" é o subtópico da questão em 2 a 4 palavras.';

// Lista de questões que não podem ser repetidas (o app manda; a IA não tem memória)
function listaParaEvitar(dados) {
  return (Array.isArray(dados.evitar) ? dados.evitar : []).slice(0, 40).map(function (e) {
    return '- ' + textoLimpo(e, 200);
  }).filter(function (e) { return e.length > 2; });
}

// Monta o pedido de várias questões (questionário do aluno ou atividade do professor)
function pedidoDeQuestoes(dados, tiposPermitidos, comeco, quemJaViu) {
  const assunto = textoLimpo(dados.assunto, 200);
  const quantidade = Number(dados.quantidade);
  const nivel = NIVEIS[dados.nivel];
  const tipos = (Array.isArray(dados.tipos) ? dados.tipos : []).filter(function (t) { return tiposPermitidos.indexOf(t) !== -1; });
  if (!assunto || [5, 10, 15, 20].indexOf(quantidade) === -1 || !nivel || !tipos.length) return null;
  const jaFeitas = listaParaEvitar(dados);

  return comeco + ' com exatamente ' + quantidade + ' questões.\n' +
    'Nível: ' + nivel + '\n' +
    (dados.materia ? 'Matéria: ' + textoLimpo(dados.materia, 50) + '\n' : '') +
    'Assunto: ' + assunto + '\n' +
    'Tipos de questão permitidos (distribua entre eles): ' + tipos.map(function (t) { return t + ' = ' + TIPOS_DE_QUESTAO[t]; }).join('; ') + '.\n' +
    'Varie os subtópicos: cubra partes diferentes do assunto, não só as mais conhecidas.\n' +
    (jaFeitas.length
      ? '\n' + quemJaViu + ' NÃO repita nenhuma delas, nem com outras palavras; pergunte coisas novas:\n' + jaFeitas.join('\n') + '\n'
      : '') +
    '\nUse este formato JSON:\n{"questoes": [\n  ' +
    tipos.map(function (t) { return MODELOS_DE_QUESTAO[t]; }).join(',\n  ') + '\n]}\n' +
    REGRAS_DO_FORMATO;
}

function pedidoDeQuestionario(dados) {
  return pedidoDeQuestoes(dados, TIPOS_DO_ALUNO, 'Crie um questionário',
    'O aluno já respondeu as questões abaixo sobre esse assunto.');
}
function pedidoDeAtividade(dados) {
  return pedidoDeQuestoes(dados, TIPOS_DO_PROFESSOR,
    'Crie uma atividade escrita que o professor vai imprimir e entregar aos alunos',
    'O professor já usou as questões abaixo sobre esse assunto.');
}

// Uma questão nova, para trocar uma que o professor não gostou
function pedidoDeUmaQuestao(dados) {
  const assunto = textoLimpo(dados.assunto, 200);
  const nivel = NIVEIS[dados.nivel];
  if (!assunto || !nivel || TIPOS_DO_PROFESSOR.indexOf(dados.tipo) === -1) return null;
  const jaFeitas = listaParaEvitar(dados);
  return 'Crie 1 questão do tipo ' + TIPOS_DE_QUESTAO[dados.tipo] + ' para uma atividade impressa.\n' +
    'Nível: ' + nivel + '\n' +
    (dados.materia ? 'Matéria: ' + textoLimpo(dados.materia, 50) + '\n' : '') +
    'Assunto: ' + assunto + '\n' +
    (jaFeitas.length ? '\nA atividade já tem as questões abaixo. A nova questão precisa ser diferente de todas:\n' + jaFeitas.join('\n') + '\n' : '') +
    '\nUse este formato JSON:\n{"questoes": [' + MODELOS_DE_QUESTAO[dados.tipo] + ']}\n' + REGRAS_DO_FORMATO;
}

// Confere uma questão que veio da IA
function questaoValida(q, tiposPermitidos) {
  if (!q || tiposPermitidos.indexOf(q.tipo) === -1) return false;
  if (typeof q.enunciado !== 'string' || typeof q.explicacao !== 'string') return false;
  if (q.tipo === 'multipla') return Array.isArray(q.opcoes) && q.opcoes.length === 4 && [0, 1, 2, 3].indexOf(q.correta) !== -1;
  if (q.tipo === 'vf') return typeof q.correta === 'boolean';
  if (q.tipo === 'discursiva') return typeof q.resposta_esperada === 'string';
  if (q.tipo === 'associacao') {
    return Array.isArray(q.pares) && q.pares.length >= 3 && q.pares.length <= 6 &&
      q.pares.every(function (p) { return p && typeof p.a === 'string' && typeof p.b === 'string'; });
  }
  if (q.tipo === 'interpretacao') return typeof q.texto === 'string' && typeof q.resposta_esperada === 'string';
  return false;
}
// Copia só os campos que interessam a cada tipo
function questaoLimpa(q) {
  return {
    tipo: q.tipo,
    enunciado: q.enunciado,
    texto: q.tipo === 'interpretacao' ? q.texto : undefined,
    opcoes: q.tipo === 'multipla' ? q.opcoes.map(String) : undefined,
    correta: q.tipo === 'multipla' || q.tipo === 'vf' ? q.correta : undefined,
    resposta_esperada: q.tipo === 'discursiva' || q.tipo === 'interpretacao' ? q.resposta_esperada : undefined,
    pares: q.tipo === 'associacao' ? q.pares.map(function (p) { return { a: p.a, b: p.b }; }) : undefined,
    explicacao: q.explicacao,
    tema: typeof q.tema === 'string' ? q.tema : ''
  };
}
// Confere o que a IA mandou e joga fora questões com defeito
function limparQuestoes(json, quantidade, tiposPermitidos) {
  const questoes = (json && Array.isArray(json.questoes) ? json.questoes : [])
    .filter(function (q) { return questaoValida(q, tiposPermitidos); })
    .slice(0, quantidade)
    .map(questaoLimpa);
  return questoes.length ? { questoes: questoes } : null;
}
function limparQuestionario(json, dados) { return limparQuestoes(json, Number(dados.quantidade), TIPOS_DO_ALUNO); }
function limparAtividade(json, dados) { return limparQuestoes(json, Number(dados.quantidade), TIPOS_DO_PROFESSOR); }
function limparUmaQuestao(json, dados) { return limparQuestoes(json, 1, [dados.tipo]); }

// ---------- Correção de questões discursivas (Etapa 6) ----------
function pedidoDeCorrecao(dados) {
  const itens = (Array.isArray(dados.itens) ? dados.itens : []).slice(0, 20);
  if (!itens.length) return null;
  return 'Corrija as respostas do aluno nas questões discursivas abaixo. Seja justo: aceite respostas com as palavras do aluno, desde que a ideia esteja certa.\n\n' +
    itens.map(function (item, i) {
      return 'Questão ' + (i + 1) + ': ' + textoLimpo(item.enunciado, 600) + '\n' +
        'Resposta esperada: ' + textoLimpo(item.resposta_esperada, 600) + '\n' +
        'Resposta do aluno: ' + (textoLimpo(item.resposta_aluno, 1000) || '(em branco)');
    }).join('\n\n') +
    '\n\nUse este formato JSON, com uma correção para cada questão, na mesma ordem:\n' +
    '{"correcoes": [{"correta": true, "comentario": "uma frase explicando o que está certo ou o que faltou"}]}';
}
function limparCorrecao(json, dados) {
  const correcoes = json && Array.isArray(json.correcoes) ? json.correcoes : [];
  if (correcoes.length !== dados.itens.length) return null;
  return {
    correcoes: correcoes.map(function (c) {
      return { correta: c && c.correta === true, comentario: c && typeof c.comentario === 'string' ? c.comentario : '' };
    })
  };
}

// Cada "tarefa" monta seu próprio pedido aqui no servidor.
// Assim o app não consegue mandar qualquer pergunta para a IA.
// Tarefas com "limpar" pedem JSON e conferem a resposta antes de devolver.
// Tarefas com "professor" só funcionam com o código dos professores.
const TAREFAS = {
  resumo: { montar: pedidoDeResumo },
  questionario: { montar: pedidoDeQuestionario, limpar: limparQuestionario },
  corrigir: { montar: pedidoDeCorrecao, limpar: limparCorrecao },
  'professor-entrar': { professor: true, semIA: true },
  atividade: { professor: true, montar: pedidoDeAtividade, limpar: limparAtividade },
  questao: { professor: true, montar: pedidoDeUmaQuestao, limpar: limparUmaQuestao }
};

async function chamarOpenAI(pedido, querJson, perfil, paraProfessor) {
  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODELO || MODELO_PADRAO,
      messages: [
        { role: 'system', content: instrucoesGerais(perfil, paraProfessor) + (querJson ? FORMATO_JSON : FORMATO_TEXTO) },
        { role: 'user', content: pedido }
      ],
      response_format: querJson ? { type: 'json_object' } : undefined,
      max_completion_tokens: querJson ? 6000 : 1500
    })
  });
  const json = await resposta.json();
  if (!resposta.ok) {
    console.error('Erro da OpenAI:', json);
    throw new Error('openai');
  }
  return json.choices[0].message.content;
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Use POST.' });
    return;
  }
  if (!process.env.OPENAI_API_KEY || !process.env.CODIGO_ESCOLA) {
    res.status(500).json({ erro: 'A IA ainda não foi configurada na Vercel.' });
    return;
  }

  const dados = req.body || {};
  const tarefa = TAREFAS[dados.tarefa];
  if (!tarefa) {
    res.status(400).json({ erro: 'Pedido desconhecido.' });
    return;
  }

  // Quem pode usar: professor com o código dos professores; aluno com o código da escola
  const ehProfessor = !!process.env.CODIGO_PROFESSOR && req.headers['x-codigo-professor'] === process.env.CODIGO_PROFESSOR;
  const ehDaEscola = req.headers['x-codigo-escola'] === process.env.CODIGO_ESCOLA;
  if (tarefa.professor && !process.env.CODIGO_PROFESSOR) {
    res.status(500).json({ erro: 'O código dos professores ainda não foi configurado na Vercel.' });
    return;
  }
  if (tarefa.professor ? !ehProfessor : !(ehDaEscola || ehProfessor)) {
    res.status(401).json({ erro: tarefa.professor ? 'Código do professor incorreto.' : 'Código da escola incorreto.' });
    return;
  }
  if (tarefa.semIA) {
    res.status(200).json({ dados: { ok: true } });
    return;
  }

  const pedido = tarefa.montar(dados);
  if (!pedido) {
    res.status(400).json({ erro: 'Pedido incompleto. Confira os campos e tente de novo.' });
    return;
  }

  try {
    const texto = await chamarOpenAI(pedido, !!tarefa.limpar, dados.perfil, !!tarefa.professor);
    if (!tarefa.limpar) {
      res.status(200).json({ texto: texto });
      return;
    }
    let limpo = null;
    try { limpo = tarefa.limpar(JSON.parse(texto), dados); } catch (erro) {}
    if (!limpo) {
      res.status(502).json({ erro: 'A IA mandou uma resposta com defeito. Tente de novo.' });
      return;
    }
    res.status(200).json({ dados: limpo });
  } catch (erro) {
    console.error('Falha ao falar com a OpenAI:', erro);
    res.status(502).json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' });
  }
};
