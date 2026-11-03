// =========================================================
// Conversa com a IA (usada por Resumos, Questionários e pela
// área do professor).
// A chave da OpenAI fica no servidor (arquivo api/ia.js), nunca aqui.
// Quem usa a IA precisa estar logado (Etapa 10): o token da
// sessão vai em todo pedido.
// =========================================================

function tokenParaApi() {
  return ler('sessao-token') || '';
}

// Manda um pedido para a IA. Devolve { texto } ou { dados }.
async function pedirIA(pedido) {
  if (location.protocol === 'file:') {
    throw new Error('A IA só funciona no site publicado na Vercel.');
  }
  let resposta;
  try {
    resposta = await fetch('api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenParaApi() },
      body: JSON.stringify(pedido)
    });
  } catch (erro) {
    throw new Error('Não deu para falar com a IA. Confira a internet. A IA só funciona no site publicado na Vercel.');
  }

  let json = {};
  try { json = await resposta.json(); } catch (erro) {}

  if (resposta.status === 401) {
    encerrarSessao();
    throw new Error(json.erro || 'Sua sessão expirou. Entre de novo.');
  }
  if (!resposta.ok || (!json.texto && !json.dados)) {
    throw new Error(json.erro || 'A IA não respondeu. A IA só funciona no site publicado na Vercel.');
  }
  return json;
}

// Pedidos da área do professor usam o mesmo pedido e o mesmo token da sessão.
async function pedirIAProfessor(pedido) {
  return pedirIA(pedido);
}
