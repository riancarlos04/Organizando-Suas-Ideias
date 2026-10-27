// =========================================================
// Organizando Seus Conhecimentos — navegação entre as telas
// O endereço depois do "#" diz qual tela mostrar.
// Exemplos: #/inicio, #/aluno, #/professor, #/aluno/resumos
// =========================================================

// Itens do menu que ainda não funcionam: em qual etapa cada um será construído
const EM_BREVE = {
  'professor/atividade': { titulo: 'Criar atividade', etapa: 'Etapa 8' },
  'professor/prova':     { titulo: 'Criar prova', etapa: 'Etapa 9' },
  'professor/plano':     { titulo: 'Plano de aula', etapa: 'Etapa 9' },
  'professor/reforco':   { titulo: 'Reforço', etapa: 'Etapa 10' },
  'professor/notas':     { titulo: 'Notas e dificuldades', etapa: 'Etapa 10' }
};

// Guarda informações no próprio aparelho (não vai para nenhum servidor)
function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch (erro) {}
}
function ler(chave) {
  try { return localStorage.getItem(chave); } catch (erro) { return null; }
}

// ---------- Menu lateral (gaveta) ----------
const botaoAbrir = document.getElementById('abrir-menu');
const gaveta = document.getElementById('gaveta');
const fundoGaveta = document.getElementById('fundo-gaveta');

function abrirMenu() {
  gaveta.hidden = false;
  fundoGaveta.hidden = false;
  botaoAbrir.setAttribute('aria-expanded', 'true');
  document.getElementById('fechar-menu').focus();
}
function fecharMenu() {
  if (gaveta.hidden) return;
  gaveta.hidden = true;
  fundoGaveta.hidden = true;
  botaoAbrir.setAttribute('aria-expanded', 'false');
  botaoAbrir.focus();
}
botaoAbrir.addEventListener('click', abrirMenu);
document.getElementById('fechar-menu').addEventListener('click', fecharMenu);
fundoGaveta.addEventListener('click', fecharMenu);
document.addEventListener('keydown', function (evento) {
  if (evento.key === 'Escape') fecharMenu();
});

// ---------- Troca de tela ----------
function mostrarTela() {
  const rota = location.hash.replace('#/', '');

  // Sem endereço: volta para o último perfil usado (aluno ou professor)
  if (rota === '') {
    location.replace('#/' + (ler('perfil') || 'inicio'));
    return;
  }

  // Descobre o perfil pela primeira parte do endereço (aluno/... ou professor/...)
  const perfil = rota.split('/')[0];
  const temPerfil = perfil === 'aluno' || perfil === 'professor';

  let tela = rota;
  const pagina = EM_BREVE[rota];
  if (pagina) {
    tela = 'em-breve';
    document.getElementById('em-breve-titulo').textContent = pagina.titulo;
    document.getElementById('em-breve-etapa').textContent = pagina.etapa;
    document.getElementById('em-breve-voltar').href = '#/' + perfil;
  }
  if (!document.querySelector('[data-tela="' + tela + '"]')) tela = 'inicio';

  // Mostra só a tela certa e esconde as outras
  document.querySelectorAll('[data-tela]').forEach(function (secao) {
    secao.hidden = secao.dataset.tela !== tela;
  });

  // Topo e menu lateral mudam conforme o perfil
  if (temPerfil && tela !== 'inicio') {
    guardar('perfil', perfil);
    document.body.dataset.perfil = perfil;
  } else {
    delete document.body.dataset.perfil;
  }
  botaoAbrir.hidden = !document.body.dataset.perfil;
  document.querySelectorAll('[data-menu]').forEach(function (parte) {
    parte.hidden = parte.dataset.menu !== document.body.dataset.perfil;
  });

  // Destaca no menu o item da tela atual
  document.querySelectorAll('.menu-lateral a').forEach(function (link) {
    if (link.getAttribute('href') === '#/' + rota) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  fecharMenu();

  // Telas que precisam ser montadas na hora (ficam em outros arquivos)
  if (tela === 'aluno/cronograma') desenharCronograma();
  if (tela === 'aluno/metas') desenharMetas();
  if (tela === 'aluno/desempenho') desenharDesempenho();
  if (tela === 'aluno/resumos') desenharResumos();
  if (tela === 'aluno/questionarios') desenharQuestionarios();
  mostrarCronometro();

  // Leva o leitor de tela e o foco para o título da tela nova
  const titulo = document.querySelector('[data-tela="' + tela + '"] h1');
  if (titulo) titulo.focus();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', mostrarTela);
mostrarTela();

// ---------- Deixa o site funcionar como app (PWA) ----------
// Só funciona quando o site está publicado (https), não abrindo o arquivo direto.
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
