// =========================================================
// Função que roda no servidor da Vercel (não no celular).
// Ela guarda a chave da OpenAI escondida e só aceita pedidos
// de quem tem o código de acesso da escola.
//
// Configurar na Vercel (Settings → Environment Variables):
//   OPENAI_API_KEY = chave da OpenAI (platform.openai.com)
//   CODIGO_ESCOLA  = código que os alunos digitam no app
//   OPENAI_MODELO  = (opcional) modelo da OpenAI a usar
// =========================================================

const MODELO_PADRAO = 'gpt-4o-mini';

// Por enquanto a IA sempre escreve para este público.
// Na Etapa 7 (Personalização) o aluno vai poder escolher o nível.
const PUBLICO = 'alunos do 8º e 9º ano do ensino fundamental de uma escola pública brasileira';

const INSTRUCOES_GERAIS =
  'Você é o assistente de estudos do app "Organizando Seus Conhecimentos", feito para ' + PUBLICO + '. ' +
  'Responda sempre em português do Brasil, com linguagem clara e adequada à idade. ' +
  'Seja correto: se não tiver certeza de uma informação, diga isso. ' +
  'Formate a resposta só com: títulos começando com "## ", listas começando com "- " e destaques entre **asteriscos duplos**. ' +
  'Não use tabelas nem outros formatos. Recuse com educação pedidos que não sejam sobre estudo.';

// ---------- Resumos (Etapa 5) ----------
const TIPOS_DE_RESUMO = {
  curto: 'Faça um resumo curto, com no máximo 5 frases.',
  detalhado: 'Faça um resumo detalhado, organizado em tópicos com subtítulos.',
  conceitos: 'Liste os principais conceitos, cada um com uma explicação de uma ou duas frases.',
  palavras: 'Liste de 8 a 12 palavras-chave, cada uma com uma explicação bem curta.',
  simples: 'Explique de forma bem simples, como para alguém que está vendo o assunto pela primeira vez.',
  exemplos: 'Dê de 3 a 5 exemplos práticos, ligados ao dia a dia dos alunos.'
};

function pedidoDeResumo(dados) {
  const instrucao = TIPOS_DE_RESUMO[dados.tipo];
  const assunto = String(dados.assunto || '').slice(0, 200).trim();
  const texto = String(dados.texto || '').slice(0, 12000).trim();
  if (!instrucao || (!assunto && !texto)) return null;

  let pedido = instrucao + '\n';
  if (dados.materia) pedido += 'Matéria: ' + String(dados.materia).slice(0, 50) + '\n';
  if (assunto) pedido += 'Assunto: ' + assunto + '\n';
  if (texto) {
    pedido += '\nUse somente as informações do texto abaixo, enviado pelo aluno:\n"""\n' + texto + '\n"""';
  } else {
    pedido += '\nO aluno não enviou texto. Faça o resumo com base no que é ensinado na escola sobre esse assunto.';
  }
  return pedido;
}

// Cada "tarefa" monta seu próprio pedido aqui no servidor.
// Assim o app não consegue mandar qualquer pergunta para a IA.
const TAREFAS = {
  resumo: pedidoDeResumo
};

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Use POST.' });
    return;
  }
  if (!process.env.OPENAI_API_KEY || !process.env.CODIGO_ESCOLA) {
    res.status(500).json({ erro: 'A IA ainda não foi configurada na Vercel.' });
    return;
  }
  if (req.headers['x-codigo-escola'] !== process.env.CODIGO_ESCOLA) {
    res.status(401).json({ erro: 'Código da escola incorreto.' });
    return;
  }

  const dados = req.body || {};
  const montarPedido = TAREFAS[dados.tarefa];
  const pedido = montarPedido ? montarPedido(dados) : null;
  if (!pedido) {
    res.status(400).json({ erro: 'Pedido incompleto. Escreva um assunto ou cole um texto.' });
    return;
  }

  try {
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODELO || MODELO_PADRAO,
        messages: [
          { role: 'system', content: INSTRUCOES_GERAIS },
          { role: 'user', content: pedido }
        ],
        max_completion_tokens: 1500
      })
    });
    const json = await resposta.json();
    if (!resposta.ok) {
      console.error('Erro da OpenAI:', json);
      res.status(502).json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' });
      return;
    }
    res.status(200).json({ texto: json.choices[0].message.content });
  } catch (erro) {
    console.error('Falha ao falar com a OpenAI:', erro);
    res.status(502).json({ erro: 'A IA não respondeu agora. Tente de novo em instantes.' });
  }
};
