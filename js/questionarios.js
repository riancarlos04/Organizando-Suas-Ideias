// =========================================================
// Questionários com IA (Etapa 6)
// O aluno escolhe assunto, número de questões, nível, tipos e
// se quer gabarito. A IA cria as questões e corrige as
// discursivas; as outras o próprio app corrige.
// Ao final: acertos, temas para estudar mais e (com gabarito)
// cada questão com a resposta certa e a explicação.
// =========================================================

const NOMES_DOS_TIPOS = { multipla: 'Múltipla escolha', vf: 'Verdadeiro ou falso', discursiva: 'Discursiva' };
const NOMES_DOS_NIVEIS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const LETRAS = ['A', 'B', 'C', 'D'];

// ---------- Guardar e carregar ----------
let questionariosFeitos = [];   // questionários terminados
let emAndamento = null;         // questionário sendo respondido agora
try {
  const feitos = JSON.parse(localStorage.getItem('questionarios'));
  if (Array.isArray(feitos)) questionariosFeitos = feitos;
  emAndamento = JSON.parse(localStorage.getItem('questionario-atual'));
} catch (erro) {}

function salvarQuestionarios() {
  try {
    localStorage.setItem('questionarios', JSON.stringify(questionariosFeitos));
    if (emAndamento) localStorage.setItem('questionario-atual', JSON.stringify(emAndamento));
    else localStorage.removeItem('questionario-atual');
  } catch (erro) {}
}

let resultadoAberto = null;   // questionário terminado que está na tela
let corrigindo = false;

// Média dos questionários (usada no painel "Meu desempenho")
function mediaDosQuestionarios() {
  if (!questionariosFeitos.length) return null;
  const soma = questionariosFeitos.reduce(function (total, q) { return total + q.porcentagem; }, 0);
  return Math.round(soma / questionariosFeitos.length);
}

// ---------- Gerar ----------
// A IA não lembra dos pedidos anteriores. Por isso o app manda junto
// as questões que o aluno já fez sobre o mesmo assunto (as mais novas primeiro),
// para a IA não repetir.
function questoesJaFeitas(assunto) {
  const procurado = semAcento(assunto.trim());
  const enunciados = [];
  questionariosFeitos.slice().reverse().forEach(function (q) {
    if (semAcento(q.assunto.trim()) !== procurado) return;
    q.questoes.forEach(function (questao) { enunciados.push(questao.enunciado); });
  });
  return enunciados.slice(0, 40);
}

function valorMarcado(nome) {
  const marcado = document.querySelector('input[name="' + nome + '"]:checked');
  return marcado ? marcado.value : '';
}

async function gerarQuestionario(pedido) {
  const botao = document.getElementById('botao-questionario');
  const area = document.getElementById('questionario-area');
  botao.disabled = true;
  botao.textContent = 'Gerando questionário…';
  area.innerHTML = '<p class="carregando">A IA está criando as questões. Isso pode levar alguns segundos…</p>';
  try {
    const resposta = await pedirIA(pedido);
    emAndamento = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      assunto: pedido.assunto,
      materia: pedido.materia,
      nivel: pedido.nivel,
      gabarito: pedido.gabarito,
      perfil: pedido.perfil,
      questoes: resposta.dados.questoes,
      respostas: resposta.dados.questoes.map(function () { return null; })
    };
    salvarQuestionarios();
    if (emAndamento.materia && !sessaoAtual) comecarEstudo(emAndamento.materia);
    desenharQuestionarios();
    document.getElementById('questionario-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (erro) {
    area.innerHTML = '<p class="erro">' + seguro(erro.message) + '</p>';
  } finally {
    botao.disabled = false;
    botao.textContent = 'Gerar questionário';
  }
}

// ---------- Responder ----------
function desenharRespondendo() {
  const q = emAndamento;
  let html = '<form class="responder" id="form-respostas">' +
    '<div class="responder-topo"><p class="rotulo">' + seguro(q.assunto) + (q.materia ? ' · ' + seguro(q.materia) : '') + ' · ' + NOMES_DOS_NIVEIS[q.nivel] + '</p>' +
    '<p class="cartao-detalhe">' + plural(q.questoes.length, 'questão', 'questões') + (q.gabarito === 'com' ? ' · com gabarito' : ' · sem gabarito') + '</p></div>';

  q.questoes.forEach(function (questao, i) {
    const resposta = q.respostas[i];
    html += '<fieldset class="questao"><legend><span>Questão ' + (i + 1) + '</span> <small>' + NOMES_DOS_TIPOS[questao.tipo] + '</small></legend>' +
      '<p class="enunciado">' + seguro(questao.enunciado) + '</p>';
    if (questao.tipo === 'multipla') {
      questao.opcoes.forEach(function (opcao, o) {
        html += '<label class="opcao"><input type="radio" name="q-' + i + '" value="' + o + '"' + (resposta === o ? ' checked' : '') + '>' +
          '<span><strong>' + LETRAS[o] + ')</strong> ' + seguro(opcao) + '</span></label>';
      });
    } else if (questao.tipo === 'vf') {
      html += '<label class="opcao"><input type="radio" name="q-' + i + '" value="true"' + (resposta === true ? ' checked' : '') + '><span>Verdadeiro</span></label>' +
        '<label class="opcao"><input type="radio" name="q-' + i + '" value="false"' + (resposta === false ? ' checked' : '') + '><span>Falso</span></label>';
    } else {
      html += '<label class="sr" for="q-' + i + '">Sua resposta</label>' +
        '<textarea id="q-' + i + '" name="q-' + i + '" rows="3" maxlength="1000" placeholder="Escreva sua resposta">' + seguro(resposta || '') + '</textarea>';
    }
    html += '</fieldset>';
  });

  html += '<div class="resumo-botoes"><button type="submit" class="botao-acao" id="botao-terminar"' + (corrigindo ? ' disabled' : '') + '>' +
    (corrigindo ? 'Corrigindo…' : 'Terminar e ver resultado') + '</button>' +
    '<button type="button" class="botao-secundario" data-desistir>Desistir</button></div>' +
    '<p class="erro" id="erro-correcao" hidden></p></form>';
  document.getElementById('questionario-area').innerHTML = html;
}

// Guarda cada resposta assim que o aluno marca ou digita
function guardarResposta(campo) {
  if (!emAndamento || !campo.name || campo.name.indexOf('q-') !== 0) return;
  const i = Number(campo.name.slice(2));
  const tipo = emAndamento.questoes[i].tipo;
  if (tipo === 'multipla') emAndamento.respostas[i] = Number(campo.value);
  else if (tipo === 'vf') emAndamento.respostas[i] = campo.value === 'true';
  else emAndamento.respostas[i] = campo.value;
  salvarQuestionarios();
}

// ---------- Corrigir ----------
async function terminarQuestionario() {
  const q = emAndamento;
  const semResposta = q.respostas.filter(function (r) { return r === null || r === ''; }).length;
  corrigindo = true;
  desenharRespondendo();

  // Questões objetivas: o próprio app corrige
  const corrigidas = q.questoes.map(function (questao, i) {
    const item = Object.assign({}, questao, { resposta: q.respostas[i] });
    if (questao.tipo !== 'discursiva') item.certa = q.respostas[i] === questao.correta;
    return item;
  });

  // Questões discursivas: a IA corrige
  const discursivas = corrigidas.filter(function (item) { return item.tipo === 'discursiva'; });
  if (discursivas.length) {
    try {
      const resposta = await pedirIA({
        tarefa: 'corrigir',
        perfil: q.perfil,
        itens: discursivas.map(function (item) {
          return { enunciado: item.enunciado, resposta_esperada: item.resposta_esperada, resposta_aluno: item.resposta || '' };
        })
      });
      discursivas.forEach(function (item, n) {
        item.certa = !!item.resposta && resposta.dados.correcoes[n].correta;
        item.comentario = resposta.dados.correcoes[n].comentario;
      });
    } catch (erro) {
      corrigindo = false;
      desenharRespondendo();
      const aviso = document.getElementById('erro-correcao');
      aviso.textContent = 'Não deu para corrigir as discursivas: ' + erro.message + ' Toque em "Terminar" para tentar de novo.';
      aviso.hidden = false;
      return;
    }
  }

  const acertos = corrigidas.filter(function (item) { return item.certa; }).length;
  const feito = {
    id: q.id,
    assunto: q.assunto,
    materia: q.materia,
    nivel: q.nivel,
    gabarito: q.gabarito,
    data: dataDeHoje(),
    total: corrigidas.length,
    acertos: acertos,
    emBranco: semResposta,
    porcentagem: Math.round(acertos / corrigidas.length * 100),
    questoes: corrigidas
  };
  questionariosFeitos.push(feito);
  emAndamento = null;
  corrigindo = false;
  salvarQuestionarios();
  resultadoAberto = feito;
  desenharQuestionarios();
  document.getElementById('questionario-area').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Mais de 60%: parabéns. Senão: pede para revisar (decisão da turma)
  if (passouDeSessenta(feito)) mostrarMensagem('Parabéns!', 'Você acertou ' + feito.acertos + ' de ' + feito.total + '.');
  else mostrarMensagem('Revise o conteúdo', 'Você acertou ' + feito.acertos + ' de ' + feito.total + '. Revise o conteúdo e se esforce mais.');
}

function passouDeSessenta(feito) {
  return feito.acertos / feito.total > 0.6;
}

// ---------- Resultado ----------
function textoDaResposta(questao, resposta) {
  if (resposta === null || resposta === undefined || resposta === '') return 'Em branco';
  if (questao.tipo === 'multipla') return LETRAS[resposta] + ') ' + questao.opcoes[resposta];
  if (questao.tipo === 'vf') return resposta ? 'Verdadeiro' : 'Falso';
  return resposta;
}

function desenharResultado() {
  const r = resultadoAberto;
  let html = '<article class="resultado">' +
    '<p class="rotulo">Resultado · ' + seguro(r.assunto) + (r.materia ? ' · ' + seguro(r.materia) : '') + '</p>' +
    '<p class="nota-grande">' + r.acertos + ' de ' + r.total + '</p>' +
    (passouDeSessenta(r)
      ? '<p class="tudo-certo">Parabéns!</p>'
      : '<p class="revisar">Revise o conteúdo e se esforce mais.</p>') +
    (r.emBranco ? '<p class="cartao-detalhe">' + plural(r.emBranco, 'questão ficou', 'questões ficaram') + ' em branco.</p>' : '');

  // Temas das questões erradas
  const temas = [];
  r.questoes.forEach(function (q) {
    const tema = q.tema || r.assunto;
    if (!q.certa && temas.indexOf(tema) === -1) temas.push(tema);
  });
  if (temas.length) {
    html += '<h3>Precisa estudar mais</h3><ul class="temas">' + temas.map(function (tema) {
      return '<li><span>' + seguro(tema) + '</span><button type="button" class="botao-estudar" data-resumo-tema="' + seguro(tema) + '" data-materia="' + seguro(r.materia || '') + '">Ver resumo</button></li>';
    }).join('') + '</ul>';
  }

  if (r.gabarito === 'com') {
    html += '<h3>Gabarito</h3><ol class="gabarito">' + r.questoes.map(function (q) {
      let certa = '';
      if (q.tipo === 'discursiva') certa = q.resposta_esperada;
      else certa = textoDaResposta(q, q.correta);
      return '<li class="' + (q.certa ? 'acertou' : 'errou') + '">' +
        '<p class="selo-resultado">' + (q.certa ? '✓ Certo' : '✗ Errado') + '</p>' +
        '<p class="enunciado">' + seguro(q.enunciado) + '</p>' +
        '<p><strong>Sua resposta:</strong> ' + seguro(textoDaResposta(q, q.resposta)) + '</p>' +
        (q.certa && q.tipo !== 'discursiva' ? '' : '<p><strong>' + (q.tipo === 'discursiva' ? 'Resposta esperada' : 'Resposta certa') + ':</strong> ' + seguro(certa) + '</p>') +
        (q.comentario ? '<p><strong>Correção da IA:</strong> ' + seguro(q.comentario) + '</p>' : '') +
        '<p class="explicacao">' + seguro(q.explicacao) + '</p>' +
        '</li>';
    }).join('') + '</ol>';
  } else {
    html += '<p class="cartao-detalhe">Questionário sem gabarito: aparecem só os acertos.</p>';
  }

  html += '<p class="aviso-ia">Questões e correção feitas por IA. Na dúvida, confira com o professor.</p>' +
    '<div class="resumo-botoes"><button type="button" class="botao-acao" data-fechar-resultado>Novo questionário</button></div></article>';
  document.getElementById('questionario-area').innerHTML = html;
}

// ---------- Tela ----------
function desenharListaQuestionarios() {
  const lista = document.getElementById('lista-questionarios');
  if (!questionariosFeitos.length) {
    lista.innerHTML = '<p class="sem-assunto">Nenhum questionário feito ainda.</p>';
    return;
  }
  lista.innerHTML = '<ul class="lista-resumos">' + questionariosFeitos.slice().reverse().map(function (q) {
    return '<li><button type="button" class="abrir-resumo" data-abrir-questionario="' + q.id + '">' +
      '<strong>' + seguro(q.assunto) + ' · ' + q.acertos + ' de ' + q.total + '</strong>' +
      '<span>' + (q.materia ? seguro(q.materia) + ' · ' : '') + NOMES_DOS_NIVEIS[q.nivel] + ' · ' + formatarDia(q.data) + '</span></button>' +
      '<button type="button" class="remover" data-remover-questionario="' + q.id + '" aria-label="Remover questionário: ' + seguro(q.assunto) + '">×</button></li>';
  }).join('') + '</ul>';
}

function desenharQuestionarios() {
  document.getElementById('form-questionario').hidden = !!emAndamento || !!resultadoAberto;
  if (emAndamento) desenharRespondendo();
  else if (resultadoAberto) desenharResultado();
  else document.getElementById('questionario-area').innerHTML = '';
  desenharListaQuestionarios();
}

// Lista de matérias no formulário
document.getElementById('q-materia').innerHTML = '<option value="">Nenhuma</option>' +
  MATERIAS.map(function (m) { return '<option>' + seguro(m) + '</option>'; }).join('');

document.getElementById('form-questionario').addEventListener('submit', function (evento) {
  evento.preventDefault();
  const pedido = {
    tarefa: 'questionario',
    assunto: document.getElementById('q-assunto').value.trim(),
    materia: document.getElementById('q-materia').value,
    quantidade: Number(valorMarcado('q-quantidade')),
    nivel: valorMarcado('q-nivel'),
    tipos: Array.prototype.map.call(document.querySelectorAll('input[name="q-tipos"]:checked'), function (c) { return c.value; }),
    gabarito: valorMarcado('q-gabarito'),
    perfil: perfilParaIA(document.getElementById('q-ensino').value)   // arquivo perfil.js
  };
  pedido.evitar = questoesJaFeitas(pedido.assunto);
  const area = document.getElementById('questionario-area');
  if (!pedido.assunto) {
    area.innerHTML = '<p class="erro">Escreva o assunto do questionário.</p>';
    document.getElementById('q-assunto').focus();
    return;
  }
  if (!pedido.tipos.length) {
    area.innerHTML = '<p class="erro">Escolha pelo menos um tipo de questão.</p>';
    return;
  }
  registrarPesquisa(pedido.assunto, pedido.materia);
  gerarQuestionario(pedido);
});

const telaQuestionarios = document.getElementById('tela-questionarios');
telaQuestionarios.addEventListener('change', function (evento) { guardarResposta(evento.target); });
telaQuestionarios.addEventListener('input', function (evento) {
  if (evento.target.tagName === 'TEXTAREA') guardarResposta(evento.target);
});
telaQuestionarios.addEventListener('submit', function (evento) {
  if (evento.target.id !== 'form-respostas') return;
  evento.preventDefault();
  if (!corrigindo) terminarQuestionario();
});
telaQuestionarios.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  if (alvo.hasAttribute('data-desistir')) {
    emAndamento = null;
    salvarQuestionarios();
    desenharQuestionarios();
  } else if (alvo.hasAttribute('data-fechar-resultado')) {
    resultadoAberto = null;
    desenharQuestionarios();
    document.getElementById('q-assunto').focus();
  } else if (alvo.dataset.abrirQuestionario) {
    resultadoAberto = questionariosFeitos.find(function (q) { return q.id === alvo.dataset.abrirQuestionario; });
    if (!emAndamento) {
      desenharQuestionarios();
      document.getElementById('questionario-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else if (alvo.dataset.removerQuestionario) {
    questionariosFeitos = questionariosFeitos.filter(function (q) { return q.id !== alvo.dataset.removerQuestionario; });
    if (resultadoAberto && resultadoAberto.id === alvo.dataset.removerQuestionario) resultadoAberto = null;
    salvarQuestionarios();
    desenharQuestionarios();
  } else if (alvo.dataset.resumoTema) {
    // "Ver resumo": abre os Resumos com o tema preenchido
    document.getElementById('resumo-assunto').value = alvo.dataset.resumoTema;
    document.getElementById('resumo-materia').value = alvo.dataset.materia;
    location.hash = '#/aluno/resumos';
  }
});
