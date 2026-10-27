// =========================================================
// Progresso, cronômetro de estudo e painel "Meu desempenho" (Etapa 4)
// - Progresso geral = assuntos riscados + metas cumpridas
// - Cronômetro: o aluno começa a estudar uma matéria e toca
//   em "Terminei" no final; o tempo fica guardado.
// Usa dados de cronograma.js e metas.js.
// =========================================================

// ---------- Guardar e carregar ----------
let sessoes = [];        // estudos já terminados: { materia, inicio, minutos }
let sessaoAtual = null;  // estudo em andamento: { materia, inicio }
try {
  const guardadas = JSON.parse(localStorage.getItem('sessoes'));
  if (Array.isArray(guardadas)) sessoes = guardadas;
  sessaoAtual = JSON.parse(localStorage.getItem('sessao-atual'));
} catch (erro) {}

function salvarSessoes() {
  try {
    localStorage.setItem('sessoes', JSON.stringify(sessoes));
    if (sessaoAtual) localStorage.setItem('sessao-atual', JSON.stringify(sessaoAtual));
    else localStorage.removeItem('sessao-atual');
  } catch (erro) {}
}

// ---------- Progresso geral (mostrado só no painel "Meu desempenho") ----------
function contarAssuntos(materia) {
  const lista = materia ? cronograma.materias[materia].assuntos : MATERIAS.reduce(function (todos, m) {
    return todos.concat(cronograma.materias[m].assuntos);
  }, []);
  return { total: lista.length, feitos: lista.filter(function (a) { return a.feito; }).length };
}
function calcularProgresso() {
  const assuntos = contarAssuntos();
  const total = assuntos.total + metas.length;
  const feitos = assuntos.feitos + metas.filter(function (m) { return m.feita; }).length;
  return total ? Math.round(feitos / total * 100) : 0;
}

// ---------- Tempo ----------
// Começo da semana (segunda-feira, 0h). deslocamento -1 = semana passada, 1 = próxima
function inicioDaSemana(deslocamento) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diasDesdeSegunda = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diasDesdeSegunda + 7 * deslocamento);
  return d.getTime();
}
function minutosEstudados(inicio, fim, materia) {
  return sessoes.filter(function (s) {
    return s.inicio >= inicio && s.inicio < fim && (!materia || s.materia === materia);
  }).reduce(function (total, s) { return total + s.minutos; }, 0);
}
function formatarTempo(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return resto + ' min';
  return horas + 'h' + (resto ? ' ' + String(resto).padStart(2, '0') + 'min' : '');
}
function formatarRelogio(milissegundos) {
  const segundos = Math.floor(milissegundos / 1000);
  const h = Math.floor(segundos / 3600);
  const m = String(Math.floor(segundos / 60) % 60).padStart(2, '0');
  const s = String(segundos % 60).padStart(2, '0');
  return (h ? h + ':' : '') + m + ':' + s;
}

// ---------- Cronômetro de estudo ----------
function comecarEstudo(materia) {
  if (sessaoAtual || MATERIAS.indexOf(materia) === -1) return;
  sessaoAtual = { materia: materia, inicio: Date.now() };
  salvarSessoes();
  mostrarCronometro();
  redesenharTelaAtual();
}
function terminarEstudo(contarTempo) {
  if (!sessaoAtual) return;
  const minutos = Math.round((Date.now() - sessaoAtual.inicio) / 60000);
  if (contarTempo && minutos >= 1) {
    sessoes.push({ materia: sessaoAtual.materia, inicio: sessaoAtual.inicio, minutos: minutos });
    mostrarMensagem('Estudo registrado', 'Você estudou ' + formatarTempo(minutos) + ' de ' + sessaoAtual.materia + '.');
  } else if (contarTempo) {
    mostrarMensagem('Estudo não contado', 'O estudo durou menos de 1 minuto.');
  }
  sessaoAtual = null;
  salvarSessoes();
  mostrarCronometro();
  redesenharTelaAtual();
}

// A barra do cronômetro aparece embaixo, em todas as telas do aluno
function mostrarCronometro() {
  const barra = document.getElementById('cronometro');
  const visivel = !!sessaoAtual && document.body.dataset.perfil === 'aluno';
  barra.hidden = !visivel;
  document.body.classList.toggle('com-cronometro', visivel);
  if (visivel) {
    document.getElementById('cronometro-materia').textContent = sessaoAtual.materia;
    document.getElementById('cronometro-tempo').textContent = formatarRelogio(Date.now() - sessaoAtual.inicio);
  }
}
setInterval(function () {
  if (sessaoAtual && !document.getElementById('cronometro').hidden) {
    document.getElementById('cronometro-tempo').textContent = formatarRelogio(Date.now() - sessaoAtual.inicio);
  }
}, 1000);
document.getElementById('cronometro-terminei').addEventListener('click', function () { terminarEstudo(true); });
document.getElementById('cronometro-cancelar').addEventListener('click', function () { terminarEstudo(false); });

function redesenharTelaAtual() {
  if (!document.querySelector('[data-tela="aluno/desempenho"]').hidden) desenharDesempenho();
  if (!document.querySelector('[data-tela="aluno/cronograma"]').hidden) desenharCronograma();
}

// ---------- Painel "Meu desempenho" ----------
function cartao(titulo, numero, detalhe, classe) {
  return '<div class="cartao-numero' + (classe ? ' ' + classe : '') + '"><p class="rotulo">' + titulo + '</p>' +
    '<p class="numero-grande">' + numero + '</p>' + (detalhe ? '<p class="cartao-detalhe">' + detalhe + '</p>' : '') + '</div>';
}

function desenharDesempenho() {
  const assuntos = contarAssuntos();
  const metasCumpridas = metas.filter(function (m) { return m.feita; }).length;
  const estaSemana = minutosEstudados(inicioDaSemana(0), inicioDaSemana(1));
  const semanaPassada = minutosEstudados(inicioDaSemana(-1), inicioDaSemana(0));
  const media = mediaDosQuestionarios();   // arquivo questionarios.js

  let comparacao = 'Nenhum estudo registrado ainda.';
  const diferenca = estaSemana - semanaPassada;
  if (estaSemana || semanaPassada) {
    if (diferenca > 0) comparacao = formatarTempo(diferenca) + ' a mais que na semana passada';
    else if (diferenca < 0) comparacao = formatarTempo(-diferenca) + ' a menos que na semana passada';
    else comparacao = 'Igual à semana passada';
  }

  // Cartões com os números principais (o primeiro tem a barra de progresso)
  const progresso = calcularProgresso();
  let html = '<div class="cartoes">' +
    '<div class="cartao-numero"><p class="rotulo">Seu progresso</p>' +
    '<div class="progresso-linha"><div class="barra barra-progresso" role="progressbar" aria-label="Seu progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progresso + '">' +
    '<i style="width:' + progresso + '%"></i></div><p class="numero-grande">' + progresso + '%</p></div>' +
    '<p class="cartao-detalhe">Assuntos riscados e metas cumpridas</p></div>' +
    cartao('Assuntos estudados', assuntos.feitos, 'de ' + plural(assuntos.total, 'assunto', 'assuntos') + ' no cronograma') +
    cartao('Metas cumpridas', metasCumpridas, 'de ' + plural(metas.length, 'meta', 'metas')) +
    cartao('Estudo nesta semana', formatarTempo(estaSemana), comparacao) +
    (media === null
      ? cartao('Média nos questionários', '—', 'Nenhum questionário feito ainda', 'cartao-largo')
      : cartao('Média nos questionários', media + '%', 'em ' + plural(questionariosFeitos.length, 'questionário', 'questionários'), 'cartao-largo')) +
    '</div>';

  // Começar a estudar
  html += '<section class="bloco"><h2>Começar a estudar</h2>';
  if (sessaoAtual) {
    html += '<p class="sem-assunto">Você está estudando <strong>' + seguro(sessaoAtual.materia) + '</strong>. Toque em "Terminei" na barra de baixo quando acabar.</p>';
  } else {
    html += '<form class="form-estudo" id="form-estudo"><label class="sr" for="estudo-materia">Matéria</label>' +
      '<select id="estudo-materia">' + MATERIAS.map(function (m) { return '<option>' + seguro(m) + '</option>'; }).join('') + '</select>' +
      '<button type="submit" class="botao-acao">Começar a estudar</button></form>';
  }
  html += '</section>';

  // Esta semana × semana passada
  const maior = Math.max(estaSemana, semanaPassada, 1);
  html += '<section class="bloco"><h2>Esta semana × semana passada</h2><div class="comparar">' +
    '<span>Esta semana</span><div class="barra barra-comparar"><i style="width:' + (estaSemana / maior * 100) + '%"></i></div><strong>' + formatarTempo(estaSemana) + '</strong>' +
    '<span>Semana passada</span><div class="barra barra-comparar barra-passada"><i style="width:' + (semanaPassada / maior * 100) + '%"></i></div><strong>' + formatarTempo(semanaPassada) + '</strong>' +
    '</div></section>';

  // Pontos fracos (arquivo perfil.js)
  html += blocoPontosFracos();

  // Progresso por matéria (só as que têm assuntos ou tempo estudado)
  const linhas = MATERIAS.map(function (m) {
    const c = contarAssuntos(m);
    const minutos = minutosEstudados(inicioDaSemana(0), inicioDaSemana(1), m);
    if (!c.total && !minutos) return '';
    const porcentagem = c.total ? Math.round(c.feitos / c.total * 100) : 0;
    return '<li><div class="materia-linha"><strong>' + seguro(m) + '</strong><span>' + porcentagem + '%</span></div>' +
      '<div class="barra" role="progressbar" aria-label="Progresso em ' + seguro(m) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + porcentagem + '"><i style="width:' + porcentagem + '%"></i></div>' +
      '<p class="cartao-detalhe">' + c.feitos + ' de ' + plural(c.total, 'assunto', 'assuntos') + ' · ' + formatarTempo(minutos) + ' nesta semana</p></li>';
  }).join('');
  html += '<section class="bloco"><h2>Por matéria</h2>' +
    (linhas ? '<ul class="por-materia">' + linhas + '</ul>' : '<p class="sem-assunto">Cadastre assuntos no Cronograma para ver o progresso de cada matéria.</p>') +
    '</section>';

  document.getElementById('painel-desempenho').innerHTML = html;
}

document.getElementById('painel-desempenho').addEventListener('submit', function (evento) {
  evento.preventDefault();
  comecarEstudo(document.getElementById('estudo-materia').value);
});
