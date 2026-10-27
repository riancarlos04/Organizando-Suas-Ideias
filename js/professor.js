// =========================================================
// Área do professor: criar atividade (Etapa 8, ideia do EduFácil)
// - Entrada com o código dos professores
// - A IA cria a atividade (ou o professor começa em branco)
// - O professor edita tudo e imprime em folha econômica
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

// ---------- Entrada da área do professor ----------
// Na prévia (sem servidor) a área fica aberta, só para mostrar as telas.
function professorLiberado() {
  return !!window.MODO_PREVIA || !!ler('codigo-professor');
}

document.getElementById('form-entrar-professor').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  const campo = document.getElementById('codigo-professor');
  const aviso = document.getElementById('erro-entrar');
  const botao = this.querySelector('button');
  if (!campo.value.trim()) return;
  guardar('codigo-professor', campo.value.trim());
  botao.disabled = true;
  aviso.hidden = true;
  try {
    await pedirIAProfessor({ tarefa: 'professor-entrar' });
    campo.value = '';
    location.hash = '#/professor';
  } catch (erro) {
    guardar('codigo-professor', '');
    aviso.textContent = erro.message;
    aviso.hidden = false;
  } finally {
    botao.disabled = false;
  }
});

// ---------- Guardar e carregar ----------
let atividades = [];
try {
  const guardadas = JSON.parse(localStorage.getItem('atividades'));
  if (Array.isArray(guardadas)) atividades = guardadas;
} catch (erro) {}
function salvarAtividades() {
  try { localStorage.setItem('atividades', JSON.stringify(atividades)); } catch (erro) {}
}

let atividadeAberta = null;

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

// ---------- Criar ----------
function lerFormularioAtividade() {
  return {
    materia: document.getElementById('a-materia').value,
    ano: document.getElementById('a-ano').value,
    assunto: document.getElementById('a-assunto').value.trim(),
    quantidade: Number(valorMarcado('a-quantidade')),
    nivel: valorMarcado('a-nivel'),
    tipos: Array.prototype.map.call(document.querySelectorAll('input[name="a-tipos"]:checked'), function (c) { return c.value; })
  };
}

function abrirNovaAtividade(dados, questoes) {
  atividadeAberta = {
    id: novoId(),
    titulo: [dados.materia, dados.assunto].filter(Boolean).join(' · ') || 'Atividade',
    materia: dados.materia,
    ano: dados.ano,
    assunto: dados.assunto,
    nivel: dados.nivel,
    data: dataDeHoje(),
    questoes: questoes.map(prepararQuestao)
  };
  atividades.push(atividadeAberta);
  salvarAtividades();
  desenharAtividades();
  document.getElementById('atividade-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mostrarErroAtividade(mensagem) {
  document.getElementById('atividade-area').innerHTML = '<p class="erro">' + seguro(mensagem) + '</p>';
}

// Questões de atividades anteriores do mesmo assunto (para a IA não repetir)
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
  if (!dados.assunto) { mostrarErroAtividade('Escreva o assunto da atividade.'); document.getElementById('a-assunto').focus(); return; }
  if (!dados.tipos.length) { mostrarErroAtividade('Escolha pelo menos um tipo de questão.'); return; }

  const botao = document.getElementById('botao-atividade');
  botao.disabled = true;
  botao.textContent = 'Gerando atividade…';
  document.getElementById('atividade-area').innerHTML = '<p class="carregando">A IA está criando a atividade. Isso pode levar alguns segundos…</p>';
  try {
    const resposta = await pedirIAProfessor({
      tarefa: 'atividade',
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

function desenharEditor() {
  const a = atividadeAberta;
  let html = '<div class="editor">' +
    '<label for="ativ-titulo" class="rotulo">Título da atividade</label>' +
    '<input type="text" id="ativ-titulo" class="titulo-editor" value="' + seguro(a.titulo) + '">' +
    '<p class="cartao-detalhe">' + [a.materia, nomeDoAno(a.ano), NOMES_DOS_NIVEIS[a.nivel]].filter(Boolean).join(' · ') +
    ' · ' + plural(a.questoes.length, 'questão', 'questões') + ' · Salva automaticamente</p>';

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
    '<button type="button" class="botao-acao" data-imprimir>Imprimir atividade</button>' +
    '<button type="button" class="botao-secundario" data-ver-gabarito>Ver gabarito</button>' +
    '<button type="button" class="botao-secundario" data-fechar-atividade>Fechar</button></div>' +
    '<p class="erro" id="erro-editor" hidden></p>' +
    '<div id="gabarito-atividade"></div></div>';
  document.getElementById('atividade-area').innerHTML = html;
}

// ---------- Gabarito (só no app) ----------
function gabaritoDaQuestao(q) {
  if (q.tipo === 'multipla') return LETRAS[q.correta] + ') ' + seguro(q.opcoes[q.correta]);
  if (q.tipo === 'vf') return q.correta ? 'Verdadeiro' : 'Falso';
  if (q.tipo === 'associacao') {
    // Coluna B na ordem da folha: cada linha recebe o número do item da coluna A
    return q.ordem.map(function (indice) { return '(' + (indice + 1) + ') ' + seguro(q.pares[indice].b); }).join('<br>');
  }
  return seguro(q.resposta_esperada || '');
}
function desenharGabarito() {
  const area = document.getElementById('gabarito-atividade');
  area.innerHTML = '<section class="gabarito-professor"><h3>Gabarito</h3><ol>' + atividadeAberta.questoes.map(function (q) {
    return '<li><p>' + gabaritoDaQuestao(q) + '</p>' + (q.explicacao ? '<p class="explicacao">' + seguro(q.explicacao) + '</p>' : '') + '</li>';
  }).join('') + '</ol></section>';
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Folha para imprimir (letra menor e duas colunas, para gastar menos papel) ----------
function linhasParaEscrever(quantidade) {
  let html = '<div class="folha-linhas">';
  for (let i = 0; i < quantidade; i++) html += '<span></span>';
  return html + '</div>';
}
function montarFolha() {
  const a = atividadeAberta;
  let html = '<div class="folha"><header class="folha-topo"><h1>' + seguro(a.titulo) + '</h1>' +
    '<p>Nome: <span class="folha-campo"></span> Data: ____/____/______</p></header><ol class="folha-questoes">';
  a.questoes.forEach(function (q) {
    html += '<li class="folha-questao">';
    if (q.tipo === 'interpretacao') html += '<p class="folha-texto">' + seguro(q.texto) + '</p>';
    html += '<p>' + seguro(q.enunciado) + '</p>';
    if (q.tipo === 'multipla') {
      // Mesmas letras do gabarito: A) B) C) D)
      html += '<ul class="folha-opcoes">' + q.opcoes.map(function (o, n) { return '<li>' + LETRAS[n] + ') ' + seguro(o) + '</li>'; }).join('') + '</ul>';
    }
    if (q.tipo === 'vf') html += '<p>(&nbsp;&nbsp;&nbsp;) Verdadeiro &nbsp;&nbsp; (&nbsp;&nbsp;&nbsp;) Falso</p>';
    if (q.tipo === 'discursiva' || q.tipo === 'interpretacao') html += linhasParaEscrever(3);
    if (q.tipo === 'associacao') {
      html += '<div class="folha-colunas"><ol>' + q.pares.map(function (p) { return '<li>' + seguro(p.a) + '</li>'; }).join('') + '</ol>' +
        '<ul>' + q.ordem.map(function (indice) { return '<li>(&nbsp;&nbsp;&nbsp;) ' + seguro(q.pares[indice].b) + '</li>'; }).join('') + '</ul></div>';
    }
    html += '</li>';
  });
  return html + '</ol></div>';
}
function imprimirAtividade() {
  document.getElementById('folha-impressao').innerHTML = montarFolha();
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
    a.questoes[i] = prepararQuestao(resposta.dados.questoes[0]);
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
function desenharListaAtividades() {
  const lista = document.getElementById('lista-atividades');
  if (!atividades.length) {
    lista.innerHTML = '<p class="sem-assunto">Nenhuma atividade criada ainda.</p>';
    return;
  }
  lista.innerHTML = '<ul class="lista-resumos">' + atividades.slice().reverse().map(function (a) {
    return '<li><button type="button" class="abrir-resumo" data-abrir-atividade="' + a.id + '">' +
      '<strong>' + seguro(a.titulo) + '</strong>' +
      '<span>' + plural(a.questoes.length, 'questão', 'questões') + ' · ' + formatarDia(a.data) + '</span></button>' +
      '<button type="button" class="remover" data-remover-atividade="' + a.id + '" aria-label="Apagar atividade: ' + seguro(a.titulo) + '">×</button></li>';
  }).join('') + '</ul>';
}

function desenharAtividades() {
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
  if (!atividadeAberta) return;
  if (campo.id === 'ativ-titulo') {
    atividadeAberta.titulo = campo.value;
    salvarAtividades();
    return;
  }
  if (campo.dataset.q === undefined) return;
  const q = atividadeAberta.questoes[Number(campo.dataset.q)];
  const extra = Number(campo.dataset.extra);
  switch (campo.dataset.campo) {
    case 'correta': q.correta = q.tipo === 'vf' ? campo.value === 'true' : Number(campo.value); break;
    case 'opcao': q.opcoes[extra] = campo.value; break;
    case 'par-a': q.pares[extra].a = campo.value; break;
    case 'par-b': q.pares[extra].b = campo.value; break;
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
    a.questoes.push(questaoEmBranco(document.getElementById('nova-questao-tipo').value));
    salvarAtividades();
    desenharEditor();
    const campos = document.querySelectorAll('.questao-editor:last-child textarea');
    if (campos.length) campos[0].focus();
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
