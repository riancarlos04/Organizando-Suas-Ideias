// =========================================================
// Função que roda no servidor da Vercel (não no celular).
// Painel do administrador: aprova ou rejeita cadastros de
// alunos e professores. Só funciona com a sessão de um admin.
//
// Usa as mesmas variáveis de api/auth.js:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_JWT_SECRET
// =========================================================

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function sessaoAdmin(req) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.indexOf('Bearer ') === 0 ? cabecalho.slice(7) : '';
  if (!token) return null;
  try {
    const dados = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    return dados.papel === 'admin' ? dados : null;
  } catch (erro) {
    return null;
  }
}

async function listarPendentes(res) {
  const db = supabase();
  const { data, error } = await db.from('usuarios')
    .select('id, usuario, nome, papel, criado_em')
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true });
  if (error) {
    console.error('Erro ao listar pendentes:', error);
    res.status(500).json({ erro: 'Não foi possível buscar os cadastros agora.' });
    return;
  }
  res.status(200).json({ pendentes: data });
}

async function definirStatus(dados, status, adminId, res) {
  const usuarioId = String(dados.usuario_id || '');
  if (!usuarioId) {
    res.status(400).json({ erro: 'Cadastro não informado.' });
    return;
  }
  const db = supabase();
  const atualizacao = { status: status };
  if (status === 'aprovado') {
    atualizacao.aprovado_em = new Date().toISOString();
    atualizacao.aprovado_por = adminId;
    if (dados.criador === true) atualizacao.criador = true;
  }
  const { error } = await db.from('usuarios').update(atualizacao).eq('id', usuarioId);
  if (error) {
    console.error('Erro ao atualizar cadastro:', error);
    res.status(500).json({ erro: 'Não foi possível atualizar esse cadastro.' });
    return;
  }
  res.status(200).json({ ok: true });
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Use POST.' });
    return;
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.AUTH_JWT_SECRET) {
    res.status(500).json({ erro: 'O login ainda não foi configurado na Vercel.' });
    return;
  }

  const admin = sessaoAdmin(req);
  if (!admin) {
    res.status(401).json({ erro: 'Essa área é só para administradores.' });
    return;
  }

  const dados = req.body || {};
  try {
    if (dados.acao === 'listar-pendentes') { await listarPendentes(res); return; }
    if (dados.acao === 'aprovar') { await definirStatus(dados, 'aprovado', admin.sub, res); return; }
    if (dados.acao === 'rejeitar') { await definirStatus(dados, 'rejeitado', admin.sub, res); return; }
    res.status(400).json({ erro: 'Pedido desconhecido.' });
  } catch (erro) {
    console.error('Falha em admin:', erro);
    res.status(500).json({ erro: 'Algo deu errado. Tente de novo.' });
  }
};
