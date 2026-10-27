// =========================================================
// Cronograma de estudos (Etapa 2)
// O aluno escolhe os dias de cada matéria e cadastra os assuntos.
// Ao estudar um assunto, marca e ele fica riscado.
// Tudo fica guardado só no aparelho (localStorage).
// =========================================================

// Matérias da escola (escolhidas por Millena e Vanusa)
const MATERIAS = ['Português', 'Matemática', 'História', 'Ciências', 'Geografia', 'Inglês', 'Arte', 'Religião', 'Educação Física'];

// Dias da semana começando na segunda.
// "numero" segue o JavaScript: 0 = domingo, 1 = segunda ... 6 = sábado
const DIAS = [
  { numero: 1, curto: 'Seg', longo: 'Segunda-feira' },
  { numero: 2, curto: 'Ter', longo: 'Terça-feira' },
  { numero: 3, curto: 'Qua', longo: 'Quarta-feira' },
  { numero: 4, curto: 'Qui', longo: 'Quinta-feira' },
  { numero: 5, curto: 'Sex', longo: 'Sexta-feira' },
  { numero: 6, curto: 'Sáb', longo: 'Sábado' },
  { numero: 0, curto: 'Dom', longo: 'Domingo' }
];

// ---------- Guardar e carregar ----------
function carregarCronograma() {
  let dados = null;
  try { dados = JSON.parse(localStorage.getItem('cronograma')); } catch (erro) {}
  if (!dados || !dados.materias) dados = { materias: {} };
  MATERIAS.forEach(function (materia) {
    if (!dados.materias[materia]) dados.materias[materia] = { dias: [], assuntos: [] };
  });
  return dados;
}
function salvarCronograma() {
  try { localStorage.setItem('cronograma', JSON.stringify(cronograma)); } catch (erro) {}
}

const cronograma = carregarCronograma();
const hoje = new Date().getDay();
let diaEscolhido = hoje;
let abaAtual = 'semana';
const materiasAbertas = new Set();

// ---------- Ajudantes ----------
// Evita que o texto digitado pelo aluno vire código HTML
function seguro(texto) {
  return String(texto).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function materiasDoDia(numeroDia) {
  return MATERIAS.filter(function (m) { return cronograma.materias[m].dias.indexOf(numeroDia) !== -1; });
}
function plural(qtd, singular, varios) {
  return qtd + ' ' + (qtd === 1 ? singular : varios);
}
function acharAssunto(materia, id) {
  return cronograma.materias[materia].assuntos.find(function (a) { return a.id === id; });
}

// ---------- Desenhar a tela ----------
function desenharCronograma() {
  ['semana', 'materias'].forEach(function (aba) {
    document.getElementById('aba-' + aba).setAttribute('aria-selected', aba === abaAtual);
    document.getElementById('painel-' + aba).hidden = aba !== abaAtual;
  });
  if (abaAtual === 'semana') desenharSemana();
  else desenharMaterias();
}

// Aba "Minha semana": calendário + assuntos do dia escolhido
function desenharSemana() {
  let html = '<div class="semana">';
  DIAS.forEach(function (dia) {
    const qtd = materiasDoDia(dia.numero).length;
    html += '<button type="button" class="dia' + (dia.numero === hoje ? ' hoje' : '') + '" id="dia-' + dia.numero + '"' +
      ' data-dia="' + dia.numero + '" aria-pressed="' + (dia.numero === diaEscolhido) + '" aria-label="' + dia.longo + ', ' + plural(qtd, 'matéria', 'matérias') + '">' +
      '<span class="dia-nome">' + dia.curto + '</span>' +
      '<span class="dia-qtd">' + qtd + '</span>' +
      (dia.numero === hoje ? '<span class="dia-hoje">hoje</span>' : '') +
      '</button>';
  });
  html += '</div>';

  const dia = DIAS.find(function (d) { return d.numero === diaEscolhido; });
  const materias = materiasDoDia(diaEscolhido);
  html += '<h2>' + dia.longo + (diaEscolhido === hoje ? ' · hoje' : '') + '</h2>';

  if (materias.length === 0) {
    html += '<div class="vazio"><p>Nenhuma matéria marcada para este dia.</p>' +
      '<button type="button" class="botao-acao" data-ir-materias>Escolher os dias das matérias</button></div>';
  }
  materias.forEach(function (m) {
    const assuntos = cronograma.materias[m].assuntos;
    // Botão do cronômetro (arquivo progresso.js)
    let botaoEstudar = '<button type="button" class="botao-estudar" data-estudar="' + seguro(m) + '">Estudar agora</button>';
    if (sessaoAtual) {
      botaoEstudar = sessaoAtual.materia === m
        ? '<span class="estudando-agora">Estudando agora</span>'
        : '';
    }
    html += '<article class="cartao-materia"><div class="cartao-materia-topo"><h3>' + seguro(m) + '</h3>' + botaoEstudar + '</div>';
    if (assuntos.length === 0) {
      html += '<p class="sem-assunto">Nenhum assunto cadastrado. ' +
        '<button type="button" class="link" data-abrir-materia="' + seguro(m) + '">Adicionar assuntos</button></p>';
    } else {
      html += '<ul class="lista-assuntos">';
      assuntos.forEach(function (a) {
        html += '<li><input type="checkbox" id="feito-' + a.id + '" data-materia="' + seguro(m) + '" data-assunto="' + a.id + '"' + (a.feito ? ' checked' : '') + '>' +
          '<label for="feito-' + a.id + '"' + (a.feito ? ' class="feito"' : '') + '>' + seguro(a.nome) + '</label></li>';
      });
      html += '</ul>';
    }
    html += '</article>';
  });

  document.getElementById('painel-semana').innerHTML = html;
}

// Aba "Matérias e assuntos": dias de cada matéria e cadastro de assuntos
function desenharMaterias() {
  let html = '<p class="explica">Toque numa matéria para escolher os dias de estudo e cadastrar os assuntos.</p>';
  MATERIAS.forEach(function (m, i) {
    const dados = cronograma.materias[m];
    html += '<details class="materia" data-materia="' + seguro(m) + '"' + (materiasAbertas.has(m) ? ' open' : '') + '>' +
      '<summary><span>' + seguro(m) + '</span><small>' + plural(dados.dias.length, 'dia', 'dias') + ' · ' + plural(dados.assuntos.length, 'assunto', 'assuntos') + '</small></summary>' +
      '<div class="materia-corpo">' +
      '<p class="rotulo">Dias de estudo</p><div class="chips">';
    DIAS.forEach(function (dia) {
      html += '<button type="button" class="chip" id="chip-' + i + '-' + dia.numero + '" data-materia="' + seguro(m) + '" data-alternar-dia="' + dia.numero + '"' +
        ' aria-pressed="' + (dados.dias.indexOf(dia.numero) !== -1) + '" aria-label="' + dia.longo + '">' + dia.curto + '</button>';
    });
    html += '</div><p class="rotulo">Assuntos</p>';
    if (dados.assuntos.length === 0) {
      html += '<p class="sem-assunto">Nenhum assunto ainda.</p>';
    } else {
      html += '<ul class="lista-editar">';
      dados.assuntos.forEach(function (a) {
        html += '<li><span' + (a.feito ? ' class="feito"' : '') + '>' + seguro(a.nome) + '</span>' +
          '<button type="button" class="remover" data-materia="' + seguro(m) + '" data-remover="' + a.id + '" aria-label="Remover ' + seguro(a.nome) + '">×</button></li>';
      });
      html += '</ul>';
    }
    html += '<form class="novo-assunto" data-materia="' + seguro(m) + '">' +
      '<label class="sr" for="novo-' + i + '">Novo assunto de ' + seguro(m) + '</label>' +
      '<input id="novo-' + i + '" type="text" placeholder="Digite um assunto" maxlength="80" autocomplete="off">' +
      '<button type="submit" class="botao-acao">Adicionar</button></form>' +
      '</div></details>';
  });

  document.getElementById('painel-materias').innerHTML = html;
}

// Depois de redesenhar, devolve o foco para o mesmo lugar
function focar(id) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.focus();
}

// ---------- Cliques e digitação ----------
function trocarAba(aba) {
  abaAtual = aba;
  desenharCronograma();
}
document.getElementById('aba-semana').addEventListener('click', function () { trocarAba('semana'); });
document.getElementById('aba-materias').addEventListener('click', function () { trocarAba('materias'); });

const painelSemana = document.getElementById('painel-semana');
painelSemana.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  if (alvo.dataset.dia !== undefined) {
    diaEscolhido = Number(alvo.dataset.dia);
    desenharSemana();
    focar('dia-' + diaEscolhido);
  } else if (alvo.hasAttribute('data-ir-materias')) {
    trocarAba('materias');
  } else if (alvo.dataset.abrirMateria) {
    materiasAbertas.add(alvo.dataset.abrirMateria);
    trocarAba('materias');
  } else if (alvo.dataset.estudar) {
    comecarEstudo(alvo.dataset.estudar);
  }
});
painelSemana.addEventListener('change', function (evento) {
  const caixa = evento.target;
  if (!caixa.dataset.assunto) return;
  const assunto = acharAssunto(caixa.dataset.materia, caixa.dataset.assunto);
  assunto.feito = caixa.checked;
  salvarCronograma();
  desenharSemana();
  focar(caixa.id);
});

const painelMaterias = document.getElementById('painel-materias');
// Lembra quais matérias estão abertas
painelMaterias.addEventListener('toggle', function (evento) {
  const materia = evento.target.dataset.materia;
  if (evento.target.open) materiasAbertas.add(materia);
  else materiasAbertas.delete(materia);
}, true);
painelMaterias.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  const materia = alvo.dataset.materia;
  if (alvo.dataset.alternarDia !== undefined) {
    const dias = cronograma.materias[materia].dias;
    const numero = Number(alvo.dataset.alternarDia);
    const posicao = dias.indexOf(numero);
    if (posicao === -1) dias.push(numero);
    else dias.splice(posicao, 1);
    salvarCronograma();
    desenharMaterias();
    focar(alvo.id);
  } else if (alvo.dataset.remover) {
    const assuntos = cronograma.materias[materia].assuntos;
    cronograma.materias[materia].assuntos = assuntos.filter(function (a) { return a.id !== alvo.dataset.remover; });
    salvarCronograma();
    desenharMaterias();
    focar('novo-' + MATERIAS.indexOf(materia));
  }
});
painelMaterias.addEventListener('submit', function (evento) {
  evento.preventDefault();
  const formulario = evento.target;
  const materia = formulario.dataset.materia;
  const campo = formulario.querySelector('input');
  const nome = campo.value.trim();
  if (!nome) return;
  cronograma.materias[materia].assuntos.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nome: nome,
    feito: false
  });
  salvarCronograma();
  desenharMaterias();
  focar(campo.id);
});

// ---------- Busca na tela inicial do aluno ----------
function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
const campoBusca = document.getElementById('busca-aluno');
const resultadosBusca = document.getElementById('resultados-busca');

function mostrarResultados() {
  const termo = semAcento(campoBusca.value.trim());
  if (!termo) {
    resultadosBusca.hidden = true;
    resultadosBusca.innerHTML = '';
    return;
  }
  let html = '';
  let total = 0;
  MATERIAS.forEach(function (m) {
    const materiaCombina = semAcento(m).indexOf(termo) !== -1;
    const assuntos = cronograma.materias[m].assuntos.filter(function (a) {
      return materiaCombina || semAcento(a.nome).indexOf(termo) !== -1;
    });
    if (materiaCombina && assuntos.length === 0) {
      html += '<li><button type="button" data-abrir-materia="' + seguro(m) + '"><strong>' + seguro(m) + '</strong> <span>nenhum assunto ainda</span></button></li>';
      total++;
    }
    assuntos.forEach(function (a) {
      html += '<li><button type="button" data-abrir-materia="' + seguro(m) + '"><strong>' + seguro(m) + '</strong> ' +
        '<span' + (a.feito ? ' class="feito"' : '') + '>' + seguro(a.nome) + '</span></button></li>';
      total++;
    });
  });
  if (total === 0) html = '<li class="nada">Nada encontrado. Cadastre seus assuntos no Cronograma.</li>';
  resultadosBusca.innerHTML = html;
  resultadosBusca.hidden = false;
}
campoBusca.addEventListener('input', mostrarResultados);
resultadosBusca.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('[data-abrir-materia]');
  if (!alvo) return;
  materiasAbertas.add(alvo.dataset.abrirMateria);
  abaAtual = 'materias';
  campoBusca.value = '';
  mostrarResultados();
  location.hash = '#/aluno/cronograma';
});
