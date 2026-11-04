// =========================================================
// Área do professor (ideia do EduFácil)
// - Criar atividade (Etapa 8) e Criar prova (Etapa 9) usam a mesma tela
// - A IA cria o material (ou o professor começa em branco)
// - O professor edita tudo e imprime em folha econômica
// - Prova: tipo de material, turma, valor de cada questão,
//   nota total e versões A e B embaralhadas
// - O gabarito fica só no app
// Tudo fica guardado no aparelho do professor.
// =========================================================

const TIPOS_ATIVIDADE = {
  multipla: 'Múltipla escolha',
  vf: 'Verdadeiro ou falso',
  discursiva: 'Discursiva',
  associacao: 'Associação',
  interpretacao: 'Interpretação de texto'
};

// Tipos de material da tela "Criar prova" (decididos pela dupla do Davison)
const NOMES_DOS_MATERIAIS = {
  prova: 'Prova',
  simulado: 'Simulado',
  exercicios: 'Exercícios',
  recuperacao: 'Recuperação'
};

// 'atividade' (Criar atividade) ou 'prova' (Criar prova)
let modoProfessor = 'atividade';

// ---------- Guardar e carregar (cada conta vê só as suas) ----------
// Provas ficam na mesma lista; elas têm o campo "material".
let atividades = [];
let atividadeAberta = null;
function carregarAtividades() {
  atividades = [];
  atividadeAberta = null;
  try {
    const guardadas = JSON.parse(localStorage.getItem(chaveDoUsuario('atividades')));
    if (Array.isArray(guardadas)) atividades = guardadas;
  } catch (erro) {}
}
aoTrocarConta(carregarAtividades);
carregarAtividades();
function salvarAtividades() {
  try { localStorage.setItem(chaveDoUsuario('atividades'), JSON.stringify(atividades)); } catch (erro) {}
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Na associação, a coluna B sai embaralhada na folha. A ordem fica guardada.
function embaralhar(quantidade) {
  const ordem = [];
  for (let i = 0; i < quantidade; i++) ordem.push(i);
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const troca = ordem[i]; ordem[i] = ordem[j]; ordem[j] = troca;
  }
  return ordem;
}
function prepararQuestao(q) {
  if (q.tipo === 'associacao' && (!q.ordem || q.ordem.length !== q.pares.length)) q.ordem = embaralhar(q.pares.length);
  return q;
}

// Questão vazia, para o professor escrever
function questaoEmBranco(tipo) {
  const q = { tipo: tipo, enunciado: '', explicacao: '', tema: '' };
  if (tipo === 'multipla') { q.opcoes = ['', '', '', '']; q.correta = 0; }
  if (tipo === 'vf') q.correta = true;
  if (tipo === 'discursiva') q.resposta_esperada = '';
  if (tipo === 'associacao') { q.enunciado = 'Associe as colunas.'; q.pares = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }]; }
  if (tipo === 'interpretacao') { q.texto = ''; q.resposta_esperada = ''; }
  return prepararQuestao(q);
}

function nomeDoAno(valor) {
  const opcao = OPCOES_NIVEL_ENSINO.find(function (o) { return o[0] === valor; });
  return opcao ? opcao[1] : '';
}

// ---------- Pontos da prova ----------
// 1,5 em vez de 1.5
function pontos(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
function somaDosValores(a) {
  return Math.round(a.questoes.reduce(function (total, q) { return total + (Number(q.valor) || 0); }, 0) * 100) / 100;
}
// Divide o valor total igualmente; a última questão leva a sobra dos centavos
function distribuirValor(a, total) {
  const n = a.questoes.length;
  if (!n) return;
  const base = Math.floor(total * 100 / n) / 100;
  a.questoes.forEach(function (q) { q.valor = base; });
  a.questoes[n - 1].valor = Math.round((total - base * (n - 1)) * 100) / 100;
}

// ---------- Versão B: questões e alternativas embaralhadas ----------
// Fica guardada na prova, para a folha e o gabarito sempre baterem.
function versaoB(a) {
  let v = a.versaoB;
  if (!v || !v.ordem || v.ordem.length !== a.questoes.length) v = { ordem: embaralhar(a.questoes.length), opcoes: {}, pares: {} };
  a.questoes.forEach(function (q, i) {
    if (q.tipo === 'multipla' && (!v.opcoes[i] || v.opcoes[i].length !== q.opcoes.length)) v.opcoes[i] = embaralhar(q.opcoes.length);
    if (q.tipo === 'associacao' && (!v.pares[i] || v.pares[i].length !== q.pares.length)) v.pares[i] = embaralhar(q.pares.length);
  });
  a.versaoB = v;
  return v;
}
// As questões na ordem de cada versão.
// "opcoes" diz qual alternativa original fica em cada letra; "ordemPares" é a coluna B da associação.
function questoesDaVersao(a, versao) {
  const v = versao === 'B' ? versaoB(a) : null;
  const ordem = v ? v.ordem : a.questoes.map(function (q, i) { return i; });
  return ordem.map(function (i) {
    const q = a.questoes[i];
    return {
      q: q,
      opcoes: q.tipo === 'multipla' ? (v ? v.opcoes[i] : [0, 1, 2, 3]) : null,
      ordemPares: q.tipo === 'associacao' ? (v ? v.pares[i] : q.ordem) : null
    };
  });
}
function temVersoes(a) {
  return !!(a.material && a.versoes);
}

// ---------- Criar ----------
function lerFormularioAtividade() {
  const dados = {
    materia: document.getElementById('a-materia').value,
    ano: document.getElementById('a-ano').value,
    assunto: document.getElementById('a-assunto').value.trim(),
    quantidade: Number(valorMarcado('a-quantidade')),
    nivel: valorMarcado('a-nivel'),
    tipos: Array.prototype.map.call(document.querySelectorAll('input[name="a-tipos"]:checked'), function (c) { return c.value; })
  };
  if (modoProfessor === 'prova') {
    dados.material = document.getElementById('a-material').value;
    dados.turma = document.getElementById('a-turma').value.trim();
    dados.valorTotal = Number(document.getElementById('a-valor').value) || 10;
    dados.versoes = document.getElementById('a-versoes').checked;
  }
  return dados;
}

function abrirNovaAtividade(dados, questoes) {
  atividadeAberta = {
    id: novoId(),
    titulo: [dados.material ? NOMES_DOS_MATERIAIS[dados.material] : '', dados.materia, dados.assunto].filter(Boolean).join(' · ') || 'Atividade',
    materia: dados.materia,
    ano: dados.ano,
    assunto: dados.assunto,
    nivel: dados.nivel,
    data: dataDeHoje(),
    questoes: questoes.map(prepararQuestao)
  };
  if (dados.material) {
    atividadeAberta.material = dados.material;
    atividadeAberta.turma = dados.turma;
    atividadeAberta.valorTotal = dados.valorTotal;
    atividadeAberta.versoes = dados.versoes;
    distribuirValor(atividadeAberta, dados.valorTotal);
  }
  atividades.push(atividadeAberta);
  salvarAtividades();
  desenharAtividades(modoProfessor);
  document.getElementById('atividade-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mostrarErroAtividade(mensagem) {
  document.getElementById('atividade-area').innerHTML = '<p class="erro">' + seguro(mensagem) + '</p>';
}

// Questões de atividades e provas anteriores do mesmo assunto (para a IA não repetir)
function questoesDeOutrasAtividades(assunto) {
  const procurado = semAcento(assunto);
  const lista = [];
  atividades.slice().reverse().forEach(function (a) {
    if (semAcento(a.assunto || '') !== procurado) return;
    a.questoes.forEach(function (q) { if (q.enunciado) lista.push(q.enunciado); });
  });
  return lista.slice(0, 40);
}

document.getElementById('form-atividade').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  const dados = lerFormularioAtividade();
  if (!dados.assunto) { mostrarErroAtividade('Escreva o assunto.'); document.getElementById('a-assunto').focus(); return; }
  if (!dados.tipos.length) { mostrarErroAtividade('Escolha pelo menos um tipo de questão.'); return; }

  const botao = document.getElementById('botao-atividade');
  botao.disabled = true;
  botao.textContent = 'Gerando…';
  document.getElementById('atividade-area').innerHTML = '<p class="carregando">A IA está criando as questões. Isso pode levar alguns segundos…</p>';
  try {
    const resposta = await pedirIAProfessor({
      tarefa: 'atividade',
      material: dados.material,
      materia: dados.materia,
      assunto: dados.assunto,
      quantidade: dados.quantidade,
      nivel: dados.nivel,
      tipos: dados.tipos,
      perfil: { nivelEnsino: dados.ano },
      evitar: questoesDeOutrasAtividades(dados.assunto)
    });
    abrirNovaAtividade(dados, resposta.dados.questoes);
  } catch (erro) {
    mostrarErroAtividade(erro.message);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Gerar com IA';
  }
});

document.getElementById('atividade-em-branco').addEventListener('click', function () {
  abrirNovaAtividade(lerFormularioAtividade(), []);
});

// ---------- Editor ----------
function campoTexto(rotulo, i, campo, valor, linhas, extra) {
  const id = 'q' + i + '-' + campo + (extra !== undefined ? '-' + extra : '');
  const atributos = ' id="' + id + '" data-q="' + i + '" data-campo="' + campo + '"' + (extra !== undefined ? ' data-extra="' + extra + '"' : '');
  return '<label for="' + id + '">' + rotulo + '</label>' +
    (linhas
      ? '<textarea' + atributos + ' rows="' + linhas + '">' + seguro(valor || '') + '</textarea>'
      : '<input type="text"' + atributos + ' value="' + seguro(valor || '') + '">');
}

function editorDaQuestao(q, i) {
  let html = '<li class="questao-editor"><div class="questao-editor-topo">' +
    '<strong>Questão ' + (i + 1) + '</strong> <small>' + TIPOS_ATIVIDADE[q.tipo] + '</small>' +
    (atividadeAberta.material
      ? '<label class="valor-questao" for="q' + i + '-valor">Valor <input type="number" id="q' + i + '-valor" data-q="' + i + '" data-campo="valor" min="0" step="0.25" value="' + (Number(q.valor) || 0) + '"></label>'
      : '') +
    '<span class="questao-editor-botoes">' +
    '<button type="button" class="botao-secundario pequeno" data-trocar="' + i + '">Trocar por outra da IA</button>' +
    '<button type="button" class="remover" data-apagar="' + i + '" aria-label="Apagar questão ' + (i + 1) + '">×</button>' +
    '</span></div>';

  if (q.tipo === 'interpretacao') html += campoTexto('Texto', i, 'texto', q.texto, 5);
  html += campoTexto('Enunciado', i, 'enunciado', q.enunciado, 2);

  if (q.tipo === 'multipla') {
    html += '<fieldset class="opcoes-editor"><legend>Alternativas <small>(marque a certa)</small></legend>';
    q.opcoes.forEach(function (opcao, o) {
      html += '<div class="opcao-editor">' +
        '<input type="radio" name="correta-' + i + '" id="q' + i + '-correta-' + o + '" data-q="' + i + '" data-campo="correta" value="' + o + '"' + (q.correta === o ? ' checked' : '') + '>' +
        '<label for="q' + i + '-correta-' + o + '">' + LETRAS[o] + ')</label>' +
        '<input type="text" aria-label="Alternativa ' + LETRAS[o] + '" data-q="' + i + '" data-campo="opcao" data-extra="' + o + '" value="' + seguro(opcao) + '">' +
        '</div>';
    });
    html += '</fieldset>';
  }
  if (q.tipo === 'vf') {
    html += '<label for="q' + i + '-vf">Resposta certa</label>' +
      '<select id="q' + i + '-vf" data-q="' + i + '" data-campo="correta">' +
      '<option value="true"' + (q.correta ? ' selected' : '') + '>Verdadeiro</option>' +
      '<option value="false"' + (!q.correta ? ' selected' : '') + '>Falso</option></select>';
  }
  if (q.tipo === 'discursiva' || q.tipo === 'interpretacao') {
    html += campoTexto('Resposta esperada <small>(só no gabarito)</small>', i, 'resposta_esperada', q.resposta_esperada, 2);
  }
  if (q.tipo === 'associacao') {
    html += '<fieldset class="opcoes-editor"><legend>Pares <small>(coluna A → coluna B certa)</small></legend>';
    q.pares.forEach(function (par, p) {
      html += '<div class="par-editor">' +
        '<input type="text" aria-label="Par ' + (p + 1) + ', coluna A" data-q="' + i + '" data-campo="par-a" data-extra="' + p + '" value="' + seguro(par.a) + '">' +
        '<span aria-hidden="true">→</span>' +
        '<input type="text" aria-label="Par ' + (p + 1) + ', coluna B" data-q="' + i + '" data-campo="par-b" data-extra="' + p + '" value="' + seguro(par.b) + '">' +
        (q.pares.length > 2 ? '<button type="button" class="remover" data-remover-par="' + i + '-' + p + '" aria-label="Remover par ' + (p + 1) + '">×</button>' : '') +
        '</div>';
    });
    html += '<button type="button" class="link" data-adicionar-par="' + i + '">Adicionar par</button></fieldset>';
  }
  return html + '</li>';
}

// Configurações que só a prova tem (tipo, turma, valores, versões A e B)
function configuracaoDaProva(a) {
  return '<div class="prova-config">' +
    '<div class="prova-config-linha">' +
    '<label for="prova-material">Tipo</label><select id="prova-material">' + Object.keys(NOMES_DOS_MATERIAIS).map(function (m) {
      return '<option value="' + m + '"' + (a.material === m ? ' selected' : '') + '>' + NOMES_DOS_MATERIAIS[m] + '</option>';
    }).join('') + '</select>' +
    '<label for="prova-turma">Turma</label><input type="text" id="prova-turma" maxlength="30" value="' + seguro(a.turma || '') + '">' +
    '</div>' +
    '<div class="prova-config-linha">' +
    '<span>Nota total: <strong id="soma-valores">' + pontos(somaDosValores(a)) + '</strong></span>' +
    '<label for="prova-valor-total">Dividir</label><input type="number" id="prova-valor-total" min="0" step="0.5" value="' + (a.valorTotal || 10) + '">' +
    '<button type="button" class="botao-secundario pequeno" data-distribuir>Dividir igualmente entre as questões</button>' +
    '</div>' +
    '<div class="prova-config-linha">' +
    '<label class="marcar" for="prova-versoes"><input type="checkbox" id="prova-versoes"' + (a.versoes ? ' checked' : '') + '> Versões A e B (questões e alternativas embaralhadas)</label>' +
    (a.versoes ? '<button type="button" class="link" data-reembaralhar>Embaralhar a versão B de novo</button>' : '') +
    '</div></div>';
}

function desenharEditor() {
  const a = atividadeAberta;
  const nome = a.material ? NOMES_DOS_MATERIAIS[a.material].toLowerCase() : 'atividade';
  let html = '<div class="editor">' +
    '<label for="ativ-titulo" class="rotulo">Título</label>' +
    '<input type="text" id="ativ-titulo" class="titulo-editor" value="' + seguro(a.titulo) + '">' +
    '<p class="cartao-detalhe">' + [a.materia, nomeDoAno(a.ano), NOMES_DOS_NIVEIS[a.nivel]].filter(Boolean).join(' · ') +
    ' · ' + plural(a.questoes.length, 'questão', 'questões') + ' · Salva automaticamente</p>' +
    (a.material ? configuracaoDaProva(a) : '') +
    '<p class="revisar">Confira as respostas antes de imprimir: a IA pode errar, principalmente em contas.</p>';

  if (a.questoes.length) {
    html += '<ol class="lista-editor">' + a.questoes.map(editorDaQuestao).join('') + '</ol>';
  } else {
    html += '<p class="sem-assunto">Nenhuma questão ainda. Escolha o tipo e adicione abaixo.</p>';
  }

  html += '<div class="adicionar-questao"><label for="nova-questao-tipo">Nova questão</label>' +
    '<select id="nova-questao-tipo">' + Object.keys(TIPOS_ATIVIDADE).map(function (t) {
      return '<option value="' + t + '">' + TIPOS_ATIVIDADE[t] + '</option>';
    }).join('') + '</select>' +
    '<button type="button" class="botao-secundario" data-adicionar-questao>Adicionar questão</button></div>' +
    '<div class="resumo-botoes">' +
    '<button type="button" class="botao-acao" data-imprimir>Imprimir ' + nome + (temVersoes(a) ? ' (A e B)' : '') + '</button>' +
    '<button type="button" class="botao-secundario" data-ver-gabarito>Ver gabarito</button>' +
    '<button type="button" class="botao-secundario" data-fechar-atividade>Fechar</button></div>' +
    '<p class="erro" id="erro-editor" hidden></p>' +
    '<div id="gabarito-atividade"></div></div>';
  document.getElementById('atividade-area').innerHTML = html;
}

// ---------- Gabarito (só no app) ----------
function gabaritoDoItem(item) {
  const q = item.q;
  if (q.tipo === 'multipla') return LETRAS[item.opcoes.indexOf(q.correta)] + ') ' + seguro(q.opcoes[q.correta]);
  if (q.tipo === 'vf') return q.correta ? 'Verdadeiro' : 'Falso';
  if (q.tipo === 'associacao') {
    // Coluna B na ordem da folha: cada linha recebe o número do item da coluna A
    return item.ordemPares.map(function (indice) { return '(' + (indice + 1) + ') ' + seguro(q.pares[indice].b); }).join('<br>');
  }
  return seguro(q.resposta_esperada || '');
}
function listaDeGabarito(a, versao, titulo) {
  return '<h3>' + titulo + '</h3><ol>' + questoesDaVersao(a, versao).map(function (item) {
    return '<li><p>' + gabaritoDoItem(item) + (a.material ? ' <small>(' + pontos(item.q.valor) + ' pt)</small>' : '') + '</p>' +
      (item.q.explicacao ? '<p class="explicacao">' + seguro(item.q.explicacao) + '</p>' : '') + '</li>';
  }).join('') + '</ol>';
}
function desenharGabarito() {
  const a = atividadeAberta;
  const area = document.getElementById('gabarito-atividade');
  area.innerHTML = '<section class="gabarito-professor">' +
    (temVersoes(a)
      ? '<div class="gabarito-versoes"><div>' + listaDeGabarito(a, 'A', 'Gabarito · Versão A') + '</div><div>' + listaDeGabarito(a, 'B', 'Gabarito · Versão B') + '</div></div>'
      : listaDeGabarito(a, null, 'Gabarito')) +
    '</section>';
  salvarAtividades();   // a versão B pode ter acabado de ser sorteada
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Folha para imprimir (letra menor e duas colunas, para gastar menos papel) ----------
function linhasParaEscrever(quantidade) {
  let html = '<div class="folha-linhas">';
  for (let i = 0; i < quantidade; i++) html += '<span></span>';
  return html + '</div>';
}
function montarFolha(a, versao) {
  a = a || atividadeAberta;
  let html = '<div class="folha"><header class="folha-topo"><h1>' + seguro(a.titulo) + '</h1>' +
    '<p>Nome: <span class="folha-campo"></span> Data: ____/____/______</p>';
  if (a.material) {
    html += '<p class="folha-prova">Turma: ' + (a.turma ? seguro(a.turma) : '__________') +
      ' &nbsp; Valor: ' + pontos(somaDosValores(a)) + ' &nbsp; Nota: ________' +
      (versao ? ' &nbsp; <strong>Versão ' + versao + '</strong>' : '') + '</p>';
  }
  html += '</header><ol class="folha-questoes">';
  questoesDaVersao(a, versao).forEach(function (item) {
    const q = item.q;
    html += '<li class="folha-questao">';
    if (q.tipo === 'interpretacao') html += '<p class="folha-texto">' + seguro(q.texto) + '</p>';
    html += '<p>' + (a.material ? '<strong>(' + pontos(q.valor) + ' pt)</strong> ' : '') + seguro(q.enunciado) + '</p>';
    if (q.tipo === 'multipla') {
      // Mesmas letras do gabarito: A) B) C) D)
      html += '<ul class="folha-opcoes">' + item.opcoes.map(function (original, n) { return '<li>' + LETRAS[n] + ') ' + seguro(q.opcoes[original]) + '</li>'; }).join('') + '</ul>';
    }
    if (q.tipo === 'vf') html += '<p>(&nbsp;&nbsp;&nbsp;) Verdadeiro &nbsp;&nbsp; (&nbsp;&nbsp;&nbsp;) Falso</p>';
    if (q.tipo === 'discursiva' || q.tipo === 'interpretacao') html += linhasParaEscrever(3);
    if (q.tipo === 'associacao') {
      html += '<div class="folha-colunas"><ol>' + q.pares.map(function (p) { return '<li>' + seguro(p.a) + '</li>'; }).join('') + '</ol>' +
        '<ul>' + item.ordemPares.map(function (indice) { return '<li>(&nbsp;&nbsp;&nbsp;) ' + seguro(q.pares[indice].b) + '</li>'; }).join('') + '</ul></div>';
    }
    html += '</li>';
  });
  return html + '</ol></div>';
}
function imprimirAtividade() {
  const a = atividadeAberta;
  // Com versões, sai a A e depois a B, cada uma começando numa folha nova
  document.getElementById('folha-impressao').innerHTML = temVersoes(a) ? montarFolha(a, 'A') + montarFolha(a, 'B') : montarFolha(a, null);
  salvarAtividades();
  window.print();
}

// ---------- Trocar uma questão por outra da IA ----------
async function trocarQuestao(i, botao) {
  const a = atividadeAberta;
  const aviso = document.getElementById('erro-editor');
  botao.disabled = true;
  botao.textContent = 'Gerando…';
  try {
    const resposta = await pedirIAProfessor({
      tarefa: 'questao',
      tipo: a.questoes[i].tipo,
      materia: a.materia,
      assunto: a.assunto || a.titulo,
      nivel: a.nivel || 'medio',
      perfil: { nivelEnsino: a.ano },
      evitar: a.questoes.map(function (q) { return q.enunciado; }).filter(Boolean)
    });
    const nova = prepararQuestao(resposta.dados.questoes[0]);
    if (a.material) nova.valor = a.questoes[i].valor;   // a questão nova vale o mesmo
    a.questoes[i] = nova;
    salvarAtividades();
    desenharEditor();
  } catch (erro) {
    botao.disabled = false;
    botao.textContent = 'Trocar por outra da IA';
    aviso.textContent = erro.message;
    aviso.hidden = false;
  }
}

// ---------- Tela ----------
function doModoAtual(a) {
  return modoProfessor === 'prova' ? !!a.material : !a.material;
}

function desenharListaAtividades() {
  const lista = document.getElementById('lista-atividades');
  const doModo = atividades.filter(doModoAtual);
  if (!doModo.length) {
    lista.innerHTML = '<p class="sem-assunto">' + (modoProfessor === 'prova' ? 'Nenhuma prova criada ainda.' : 'Nenhuma atividade criada ainda.') + '</p>';
    return;
  }
  lista.innerHTML = '<ul class="lista-resumos">' + doModo.slice().reverse().map(function (a) {
    return '<li><button type="button" class="abrir-resumo" data-abrir-atividade="' + a.id + '">' +
      '<strong>' + seguro(a.titulo) + '</strong>' +
      '<span>' + plural(a.questoes.length, 'questão', 'questões') +
      (a.material ? ' · ' + pontos(somaDosValores(a)) + ' pontos' + (a.turma ? ' · ' + seguro(a.turma) : '') : '') +
      ' · ' + formatarDia(a.data) + '</span></button>' +
      '<button type="button" class="remover" data-remover-atividade="' + a.id + '" aria-label="Apagar: ' + seguro(a.titulo) + '">×</button></li>';
  }).join('') + '</ul>';
}

// modo: 'atividade' (Criar atividade) ou 'prova' (Criar prova)
function desenharAtividades(modo) {
  if (modo) modoProfessor = modo;
  if (atividadeAberta && !doModoAtual(atividadeAberta)) atividadeAberta = null;   // trocou de tela
  const prova = modoProfessor === 'prova';
  document.getElementById('titulo-atividade').textContent = prova ? 'Criar prova' : 'Criar atividade';
  document.getElementById('titulo-lista-atividades').textContent = prova ? 'Minhas provas' : 'Minhas atividades';
  document.getElementById('campos-prova').hidden = !prova;
  document.getElementById('form-atividade').hidden = !!atividadeAberta;
  if (atividadeAberta) desenharEditor();
  else document.getElementById('atividade-area').innerHTML = '';
  desenharListaAtividades();
}

// Listas do formulário
document.getElementById('a-materia').innerHTML = MATERIAS.map(function (m) { return '<option>' + seguro(m) + '</option>'; }).join('');
document.getElementById('a-ano').value = '8ano';

// Digitação no editor: muda a atividade e salva, sem redesenhar (para não perder o cursor)
const telaAtividade = document.getElementById('tela-atividade');
function aoEditar(evento) {
  const campo = evento.target;
  const a = atividadeAberta;
  if (!a) return;
  switch (campo.id) {
    case 'ativ-titulo': a.titulo = campo.value; salvarAtividades(); return;
    case 'prova-material': a.material = campo.value; salvarAtividades(); return;
    case 'prova-turma': a.turma = campo.value; salvarAtividades(); return;
    case 'prova-valor-total': a.valorTotal = Number(campo.value) || 0; salvarAtividades(); return;
    case 'prova-versoes':
      if (evento.type !== 'change') return;
      a.versoes = campo.checked;
      salvarAtividades();
      desenharEditor();
      return;
  }
  if (campo.dataset.q === undefined) return;
  const q = a.questoes[Number(campo.dataset.q)];
  const extra = Number(campo.dataset.extra);
  switch (campo.dataset.campo) {
    case 'correta': q.correta = q.tipo === 'vf' ? campo.value === 'true' : Number(campo.value); break;
    case 'opcao': q.opcoes[extra] = campo.value; break;
    case 'par-a': q.pares[extra].a = campo.value; break;
    case 'par-b': q.pares[extra].b = campo.value; break;
    case 'valor':
      q.valor = Number(campo.value) || 0;
      document.getElementById('soma-valores').textContent = pontos(somaDosValores(a));
      break;
    default: q[campo.dataset.campo] = campo.value;
  }
  salvarAtividades();
}
telaAtividade.addEventListener('input', aoEditar);
telaAtividade.addEventListener('change', aoEditar);

telaAtividade.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  const a = atividadeAberta;
  if (alvo.dataset.trocar !== undefined) {
    trocarQuestao(Number(alvo.dataset.trocar), alvo);
  } else if (alvo.dataset.apagar !== undefined) {
    a.questoes.splice(Number(alvo.dataset.apagar), 1);
    salvarAtividades();
    desenharEditor();
  } else if (alvo.dataset.adicionarPar !== undefined) {
    const q = a.questoes[Number(alvo.dataset.adicionarPar)];
    q.pares.push({ a: '', b: '' });
    q.ordem = embaralhar(q.pares.length);
    salvarAtividades();
    desenharEditor();
  } else if (alvo.dataset.removerPar) {
    const partes = alvo.dataset.removerPar.split('-').map(Number);
    const q = a.questoes[partes[0]];
    q.pares.splice(partes[1], 1);
    q.ordem = embaralhar(q.pares.length);
    salvarAtividades();
    desenharEditor();
  } else if (alvo.hasAttribute('data-adicionar-questao')) {
    const nova = questaoEmBranco(document.getElementById('nova-questao-tipo').value);
    if (a.material) nova.valor = 1;
    a.questoes.push(nova);
    salvarAtividades();
    desenharEditor();
    const campos = document.querySelectorAll('.questao-editor:last-child textarea');
    if (campos.length) campos[0].focus();
  } else if (alvo.hasAttribute('data-distribuir')) {
    distribuirValor(a, a.valorTotal || 10);
    salvarAtividades();
    desenharEditor();
  } else if (alvo.hasAttribute('data-reembaralhar')) {
    a.versaoB = null;
    versaoB(a);
    salvarAtividades();
    mostrarMensagem('Versão B embaralhada', 'Confira o gabarito novo antes de imprimir.');
    if (document.querySelector('.gabarito-professor')) desenharGabarito();
  } else if (alvo.hasAttribute('data-imprimir')) {
    imprimirAtividade();
  } else if (alvo.hasAttribute('data-ver-gabarito')) {
    desenharGabarito();
  } else if (alvo.hasAttribute('data-fechar-atividade')) {
    atividadeAberta = null;
    desenharAtividades();
  } else if (alvo.dataset.abrirAtividade) {
    atividadeAberta = atividades.find(function (x) { return x.id === alvo.dataset.abrirAtividade; });
    desenharAtividades();
    document.getElementById('atividade-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (alvo.dataset.removerAtividade) {
    atividades = atividades.filter(function (x) { return x.id !== alvo.dataset.removerAtividade; });
    if (atividadeAberta && atividadeAberta.id === alvo.dataset.removerAtividade) atividadeAberta = null;
    salvarAtividades();
    desenharAtividades();
  }
});
