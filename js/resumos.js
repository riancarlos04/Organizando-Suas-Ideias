// =========================================================
// Resumos inteligentes com IA (Etapa 5)
// O aluno escreve um assunto e/ou cola um texto, escolhe o
// tipo de resumo e a IA escreve. Ele decide se guarda ou não.
// Abrir ou gerar um resumo com matéria inicia o cronômetro.
// =========================================================

const TIPOS_RESUMO = {
  curto: 'Resumo curto',
  detalhado: 'Resumo detalhado',
  conceitos: 'Principais conceitos',
  palavras: 'Palavras-chave',
  simples: 'Explicação simplificada',
  exemplos: 'Exemplos práticos'
};

// ---------- Guardar e carregar ----------
let resumosGuardados = [];
try {
  const dados = JSON.parse(localStorage.getItem('resumos'));
  if (Array.isArray(dados)) resumosGuardados = dados;
} catch (erro) {}
function salvarResumos() {
  try { localStorage.setItem('resumos', JSON.stringify(resumosGuardados)); } catch (erro) {}
}

let resumoAberto = null;   // resumo mostrado na tela agora
let ultimoPedido = null;   // para tentar de novo depois de digitar o código

// ---------- Conversa com a IA (usada também nas próximas etapas) ----------
// A chave da OpenAI fica no servidor (arquivo api/ia.js), nunca aqui.
async function pedirIA(dados) {
  if (location.protocol === 'file:') {
    throw new Error('A IA só funciona no site publicado na Vercel.');
  }
  const codigo = ler('codigo-escola');
  if (!codigo) {
    const erro = new Error('Digite o código da escola para usar a IA.');
    erro.precisaCodigo = true;
    throw erro;
  }

  let resposta;
  try {
    resposta = await fetch('api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Codigo-Escola': codigo },
      body: JSON.stringify(dados)
    });
  } catch (erro) {
    throw new Error('Não deu para falar com a IA. Confira a internet. A IA só funciona no site publicado na Vercel.');
  }

  let json = {};
  try { json = await resposta.json(); } catch (erro) {}
  if (resposta.status === 401) {
    guardar('codigo-escola', '');
    const erro = new Error('Código da escola incorreto. Digite de novo.');
    erro.precisaCodigo = true;
    throw erro;
  }
  if (!resposta.ok || !json.texto) {
    throw new Error(json.erro || 'A IA não respondeu. A IA só funciona no site publicado na Vercel.');
  }
  return json.texto;
}

// Transforma o texto da IA (## títulos, - listas, **negrito**) em HTML seguro
function textoParaHtml(texto) {
  function negrito(trecho) { return trecho.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  let html = '';
  let dentroDaLista = false;
  seguro(texto).split('\n').forEach(function (linha) {
    const t = linha.trim();
    if (/^[-*•] /.test(t)) {
      if (!dentroDaLista) { html += '<ul>'; dentroDaLista = true; }
      html += '<li>' + negrito(t.slice(2)) + '</li>';
      return;
    }
    if (dentroDaLista) { html += '</ul>'; dentroDaLista = false; }
    if (!t) return;
    if (/^#{1,6} /.test(t)) html += '<h3>' + negrito(t.replace(/^#+ /, '')) + '</h3>';
    else html += '<p>' + negrito(t) + '</p>';
  });
  if (dentroDaLista) html += '</ul>';
  return html;
}

// ---------- Desenhar a tela ----------
function formatarDia(texto) {
  const p = texto.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function desenharResumoAberto() {
  const area = document.getElementById('resumo-resultado');
  if (!resumoAberto) { area.innerHTML = ''; return; }
  const r = resumoAberto;
  const jaGuardado = resumosGuardados.some(function (g) { return g.id === r.id; });
  area.innerHTML = '<article class="resumo">' +
    '<p class="rotulo">' + TIPOS_RESUMO[r.tipo] + (r.materia ? ' · ' + seguro(r.materia) : '') + '</p>' +
    '<h2>' + seguro(r.assunto || 'Texto colado') + '</h2>' +
    '<div class="resumo-texto">' + textoParaHtml(r.texto) + '</div>' +
    '<p class="aviso-ia">Resumo feito por IA. Confira com o livro ou com o professor.</p>' +
    '<div class="resumo-botoes">' +
    (jaGuardado
      ? '<button type="button" class="botao-acao" data-fechar-resumo>Fechar</button>'
      : '<button type="button" class="botao-acao" data-guardar-resumo>Guardar resumo</button>' +
        '<button type="button" class="botao-secundario" data-fechar-resumo>Descartar</button>') +
    '</div></article>';
}

function desenharListaResumos() {
  const lista = document.getElementById('lista-resumos');
  if (!resumosGuardados.length) {
    lista.innerHTML = '<p class="sem-assunto">Nenhum resumo guardado ainda.</p>';
    return;
  }
  lista.innerHTML = '<ul class="lista-resumos">' + resumosGuardados.slice().reverse().map(function (r) {
    return '<li><button type="button" class="abrir-resumo" data-abrir-resumo="' + r.id + '">' +
      '<strong>' + seguro(r.assunto || 'Texto colado') + '</strong>' +
      '<span>' + TIPOS_RESUMO[r.tipo] + (r.materia ? ' · ' + seguro(r.materia) : '') + ' · ' + formatarDia(r.data) + '</span></button>' +
      '<button type="button" class="remover" data-remover-resumo="' + r.id + '" aria-label="Remover resumo: ' + seguro(r.assunto || 'Texto colado') + '">×</button></li>';
  }).join('') + '</ul>';
}

function desenharResumos() {
  desenharResumoAberto();
  desenharListaResumos();
}

function mostrarErroResumo(mensagem) {
  document.getElementById('resumo-resultado').innerHTML = '<p class="erro">' + seguro(mensagem) + '</p>';
}

// Abrir um resumo com matéria inicia o cronômetro (arquivo progresso.js)
function iniciarCronometroDoResumo(resumo) {
  if (resumo.materia && !sessaoAtual) comecarEstudo(resumo.materia);
}

// ---------- Gerar resumo ----------
async function gerarResumo(dados) {
  const botao = document.getElementById('botao-gerar');
  botao.disabled = true;
  botao.textContent = 'Gerando resumo…';
  resumoAberto = null;
  document.getElementById('resumo-resultado').innerHTML = '<p class="carregando">A IA está escrevendo o resumo…</p>';
  try {
    const texto = await pedirIA(dados);
    resumoAberto = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      assunto: dados.assunto,
      materia: dados.materia,
      tipo: dados.tipo,
      texto: texto,
      data: dataDeHoje()
    };
    desenharResumoAberto();
    iniciarCronometroDoResumo(resumoAberto);
  } catch (erro) {
    if (erro.precisaCodigo) {
      ultimoPedido = dados;
      document.getElementById('form-codigo').hidden = false;
      document.getElementById('codigo-escola').focus();
    }
    mostrarErroResumo(erro.message);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Gerar resumo';
  }
}

// Lista de matérias no formulário
document.getElementById('resumo-materia').innerHTML = '<option value="">Nenhuma</option>' +
  MATERIAS.map(function (m) { return '<option>' + seguro(m) + '</option>'; }).join('');

document.getElementById('form-resumo').addEventListener('submit', function (evento) {
  evento.preventDefault();
  const dados = {
    tarefa: 'resumo',
    assunto: document.getElementById('resumo-assunto').value.trim(),
    materia: document.getElementById('resumo-materia').value,
    texto: document.getElementById('resumo-texto').value.trim(),
    tipo: document.querySelector('input[name="tipo-resumo"]:checked').value
  };
  if (!dados.assunto && !dados.texto) {
    mostrarErroResumo('Escreva um assunto ou cole um texto para resumir.');
    document.getElementById('resumo-assunto').focus();
    return;
  }
  gerarResumo(dados);
});

// Código da escola
document.getElementById('form-codigo').addEventListener('submit', function (evento) {
  evento.preventDefault();
  const campo = document.getElementById('codigo-escola');
  if (!campo.value.trim()) return;
  guardar('codigo-escola', campo.value.trim());
  campo.value = '';
  document.getElementById('form-codigo').hidden = true;
  if (ultimoPedido) gerarResumo(ultimoPedido);
});

// Guardar, descartar, abrir e remover
document.getElementById('tela-resumos').addEventListener('click', function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  if (alvo.hasAttribute('data-guardar-resumo')) {
    resumosGuardados.push(resumoAberto);
    salvarResumos();
    resumoAberto = null;
    desenharResumos();
    mostrarMensagem('Resumo guardado', 'Ele está em "Meus resumos".');
  } else if (alvo.hasAttribute('data-fechar-resumo')) {
    resumoAberto = null;
    desenharResumoAberto();
  } else if (alvo.dataset.abrirResumo) {
    resumoAberto = resumosGuardados.find(function (r) { return r.id === alvo.dataset.abrirResumo; });
    desenharResumoAberto();
    iniciarCronometroDoResumo(resumoAberto);
    document.getElementById('resumo-resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (alvo.dataset.removerResumo) {
    resumosGuardados = resumosGuardados.filter(function (r) { return r.id !== alvo.dataset.removerResumo; });
    if (resumoAberto && resumoAberto.id === alvo.dataset.removerResumo) resumoAberto = null;
    salvarResumos();
    desenharResumos();
  }
});

// Enter na barra de busca da tela inicial: pede um resumo desse assunto
campoBusca.addEventListener('keydown', function (evento) {
  if (evento.key !== 'Enter' || !campoBusca.value.trim()) return;
  document.getElementById('resumo-assunto').value = campoBusca.value.trim();
  campoBusca.value = '';
  mostrarResultados();
  location.hash = '#/aluno/resumos';
});
