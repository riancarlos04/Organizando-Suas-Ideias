// =========================================================
// Aviso para instalar o app (PWA), uma vez após o 1º login.
// - Android/Chrome: captura o evento do navegador e mostra um
//   botão "Instalar" que abre a janela nativa.
// - iOS/Safari: não existe esse evento, então mostra o passo a
//   passo manual (Compartilhar → Adicionar à Tela de Início).
// - Se já está instalado (modo standalone), nunca mostra nada.
// =========================================================

// O navegador pode disparar isso antes do login terminar; guardamos
// para usar depois, quando o banner for mostrado.
let eventoInstalarSalvo = null;
window.addEventListener('beforeinstallprompt', function (evento) {
  evento.preventDefault();
  eventoInstalarSalvo = evento;
});

function appJaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPad recente se identifica como Mac
}

function fecharAvisoInstalar() {
  document.getElementById('instalar').hidden = true;
  guardar('viu-aviso-instalar', 'sim');
}

function mostrarAvisoInstalar() {
  if (appJaInstalado() || ler('viu-aviso-instalar')) return;

  const caixa = document.getElementById('instalar');
  const mensagem = document.getElementById('instalar-mensagem');
  const botao = document.getElementById('instalar-botao');

  if (ehIOS()) {
    mensagem.textContent = 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".';
    botao.hidden = true;
  } else if (eventoInstalarSalvo) {
    mensagem.textContent = 'Acesse mais rápido, direto da tela inicial do seu aparelho.';
    botao.hidden = false;
  } else {
    // Sem o evento do navegador (ex.: já dispensado antes, ou navegador sem suporte): não insiste.
    return;
  }
  caixa.hidden = false;
}

document.getElementById('instalar-botao').addEventListener('click', async function () {
  if (!eventoInstalarSalvo) return;
  eventoInstalarSalvo.prompt();
  await eventoInstalarSalvo.userChoice;
  eventoInstalarSalvo = null;
  fecharAvisoInstalar();
});
document.getElementById('instalar-fechar').addEventListener('click', fecharAvisoInstalar);
