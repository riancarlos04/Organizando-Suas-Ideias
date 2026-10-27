// =========================================================
// Conversa com a IA (usada por Resumos, Questionários e,
// depois, pela área do professor).
// A chave da OpenAI fica no servidor (arquivo api/ia.js), nunca aqui.
// Quem usa a IA precisa do código da escola, que fica guardado
// no aparelho depois de digitado uma vez.
// =========================================================

// Abre a janelinha do código da escola e espera o aluno digitar
function pedirCodigoDaEscola(mensagem) {
  const fundo = document.getElementById('dialogo-codigo');
  const formulario = document.getElementById('form-codigo');
  const campo = document.getElementById('codigo-escola');
  document.getElementById('codigo-mensagem').textContent = mensagem;
  fundo.hidden = false;
  campo.value = '';
  campo.focus();

  return new Promise(function (resolver, recusar) {
    function fechar() {
      fundo.hidden = true;
      formulario.removeEventListener('submit', aoSalvar);
      document.getElementById('cancelar-codigo').removeEventListener('click', aoCancelar);
    }
    function aoSalvar(evento) {
      evento.preventDefault();
      const codigo = campo.value.trim();
      if (!codigo) return;
      guardar('codigo-escola', codigo);
      fechar();
      resolver(codigo);
    }
    function aoCancelar() {
      fechar();
      recusar(new Error('Para usar a IA, digite o código da escola.'));
    }
    formulario.addEventListener('submit', aoSalvar);
    document.getElementById('cancelar-codigo').addEventListener('click', aoCancelar);
  });
}

// Manda um pedido para a IA. Devolve { texto } ou { dados }.
async function pedirIA(pedido) {
  if (location.protocol === 'file:') {
    throw new Error('A IA só funciona no site publicado na Vercel.');
  }
  let codigo = ler('codigo-escola');
  if (!codigo) codigo = await pedirCodigoDaEscola('Peça o código ao professor. Ele fica guardado neste aparelho.');

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let resposta;
    try {
      resposta = await fetch('api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Codigo-Escola': codigo },
        body: JSON.stringify(pedido)
      });
    } catch (erro) {
      throw new Error('Não deu para falar com a IA. Confira a internet. A IA só funciona no site publicado na Vercel.');
    }

    let json = {};
    try { json = await resposta.json(); } catch (erro) {}

    // Código errado: pede de novo uma vez
    if (resposta.status === 401 && tentativa === 0) {
      guardar('codigo-escola', '');
      codigo = await pedirCodigoDaEscola('Código incorreto. Digite de novo.');
      continue;
    }
    if (!resposta.ok || (!json.texto && !json.dados)) {
      throw new Error(json.erro || 'A IA não respondeu. A IA só funciona no site publicado na Vercel.');
    }
    return json;
  }
  throw new Error('Código da escola incorreto.');
}
