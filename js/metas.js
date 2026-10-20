// =========================================================
// Metas (Etapa 3)
// O aluno escreve suas metas, com prazo se quiser, e marca
// quando cumprir. Aí aparece a mensagem de parabéns.
// =========================================================

// ---------- Guardar e carregar ----------
function carregarMetas() {
  try {
    const dados = JSON.parse(localStorage.getItem('metas'));
    if (Array.isArray(dados)) return dados;
  } catch (erro) {}
  return [];
}
function salvarMetas() {
  try { localStorage.setItem('metas', JSON.stringify(metas)); } catch (erro) {}
}

let metas = carregarMetas();

// ---------- Datas ----------
// Datas ficam guardadas como texto "2026-10-25" (ano-mês-dia)
function dataDeHoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function formatarData(texto) {
  const partes = texto.split('-');
  return partes[2] + '/' + partes[1];
}
function seloDoPrazo(meta) {
  if (!meta.prazo || meta.feita) return '';
  const data = dataDeHoje();
  if (meta.prazo < data) return '<span class="selo selo-atrasada">Atrasada · era até ' + formatarData(meta.prazo) + '</span>';
  if (meta.prazo === data) return '<span class="selo selo-hoje">Termina hoje</span>';
  return '<span class="selo">Até ' + formatarData(meta.prazo) + '</span>';
}

// Metas não cumpridas, as de prazo mais próximo primeiro
function metasPendentes() {
  return metas.filter(function (m) { return !m.feita; }).sort(function (a, b) {
    return (a.prazo || '9999').localeCompare(b.prazo || '9999');
  });
}

// Uma meta na lista
function itemDeMeta(meta) {
  const id = 'meta-' + meta.id;
  return '<li class="meta' + (meta.feita ? ' meta-feita' : '') + '">' +
    '<input type="checkbox" id="' + id + '" data-meta="' + meta.id + '"' + (meta.feita ? ' checked' : '') + '>' +
    '<label for="' + id + '"><span class="meta-texto' + (meta.feita ? ' feito' : '') + '">' + seguro(meta.texto) + '</span>' + seloDoPrazo(meta) + '</label>' +
    '<button type="button" class="remover" data-remover-meta="' + meta.id + '" aria-label="Remover meta: ' + seguro(meta.texto) + '">×</button>' +
    '</li>';
}

// ---------- Tela "Minhas metas" ----------
function desenharMetas() {
  const pendentes = metasPendentes();
  const cumpridas = metas.filter(function (m) { return m.feita; });
  let html = '<h2>Para cumprir</h2>';
  if (pendentes.length) {
    html += '<ul class="lista-metas">' + pendentes.map(itemDeMeta).join('') + '</ul>';
  } else {
    html += '<p class="sem-assunto">Nenhuma meta pendente. Escreva uma meta acima.</p>';
  }
  if (cumpridas.length) {
    html += '<h2>Cumpridas</h2><ul class="lista-metas">' + cumpridas.map(itemDeMeta).join('') + '</ul>';
  }
  document.getElementById('lista-metas').innerHTML = html;
}

// ---------- Mensagem na parte de baixo da tela (parabéns, estudo registrado...) ----------
let tempoParabens = null;
function mostrarMensagem(titulo, texto) {
  const caixa = document.getElementById('parabens');
  document.getElementById('parabens-titulo').textContent = titulo;
  document.getElementById('parabens-texto').textContent = texto;
  caixa.hidden = false;
  clearTimeout(tempoParabens);
  tempoParabens = setTimeout(function () { caixa.hidden = true; }, 4000);
}
document.getElementById('parabens').addEventListener('click', function () {
  this.hidden = true;
});

// ---------- Cliques e digitação ----------
const listaMetas = document.getElementById('lista-metas');

// Marcar meta como cumprida
listaMetas.addEventListener('change', function (evento) {
  const caixa = evento.target;
  if (!caixa.dataset.meta) return;
  const meta = metas.find(function (m) { return m.id === caixa.dataset.meta; });
  if (!meta) return;
  meta.feita = caixa.checked;
  salvarMetas();
  desenharMetas();
  atualizarProgresso();
  if (meta.feita) mostrarMensagem('Parabéns!', 'Você cumpriu sua meta: ' + meta.texto);
  focar(caixa.id);
});

listaMetas.addEventListener('click', function (evento) {
  const alvo = evento.target.closest('[data-remover-meta]');
  if (!alvo) return;
  metas = metas.filter(function (m) { return m.id !== alvo.dataset.removerMeta; });
  salvarMetas();
  desenharMetas();
  atualizarProgresso();
  focar('meta-texto');
});

// Prazo é opcional: o campo de data só aparece se o aluno marcar "Tem prazo"
const marcaPrazo = document.getElementById('meta-tem-prazo');
const campoPrazo = document.getElementById('meta-prazo');
marcaPrazo.addEventListener('change', function () {
  campoPrazo.hidden = !marcaPrazo.checked;
  campoPrazo.min = dataDeHoje();
  if (marcaPrazo.checked && !campoPrazo.value) campoPrazo.value = dataDeHoje();
});

document.getElementById('form-meta').addEventListener('submit', function (evento) {
  evento.preventDefault();
  const campoTexto = document.getElementById('meta-texto');
  const texto = campoTexto.value.trim();
  if (!texto) return;
  metas.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    texto: texto,
    prazo: marcaPrazo.checked && campoPrazo.value ? campoPrazo.value : null,
    feita: false
  });
  salvarMetas();
  campoTexto.value = '';
  marcaPrazo.checked = false;
  campoPrazo.hidden = true;
  campoPrazo.value = '';
  desenharMetas();
  atualizarProgresso();
  campoTexto.focus();
});
