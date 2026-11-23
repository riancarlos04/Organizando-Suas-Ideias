// =========================================================
// Função que roda no servidor da Vercel (não no celular).
// Cuida de cadastro, login e verificação de sessão.
//
// Configurar na Vercel (Settings → Environment Variables):
//   SUPABASE_URL              = URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY = chave service_role do Supabase (nunca vai ao navegador)
//   AUTH_JWT_SECRET            = texto aleatório longo, inventado, para assinar a sessão
// =========================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const VALIDADE_SESSAO = '30d';
const PAPEIS_PERMITIDOS_NO_CADASTRO = ['aluno', 'professor'];

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function textoLimpo(valor, limite) {
  return String(valor || '').slice(0, limite).trim();
}

async function cadastrar(dados, res) {
  const usuario = textoLimpo(dados.usuario, 50).toLowerCase();
  const nome = textoLimpo(dados.nome, 100);
  const senha = String(dados.senha || '');
  const papel = PAPEIS_PERMITIDOS_NO_CADASTRO.indexOf(dados.papel) !== -1 ? dados.papel : null;

  if (!usuario || !nome || senha.length < 4 || !papel) {
    res.status(400).json({ erro: 'Preencha nome, usuário e uma senha com pelo menos 4 letras ou números.' });
    return;
  }

  const db = supabase();
  const { data: existente } = await db.from('usuarios').select('id').eq('usuario', usuario).maybeSingle();
  if (existente) {
    res.status(409).json({ erro: 'Esse nome de usuário já existe. Escolha outro.' });
    return;
  }

  const senha_hash = bcrypt.hashSync(senha, 10);
  const { error } = await db.from('usuarios').insert({ usuario: usuario, nome: nome, senha_hash: senha_hash, papel: papel });
  if (error) {
    console.error('Erro ao cadastrar:', error);
    res.status(500).json({ erro: 'Não foi possível cadastrar agora. Tente de novo.' });
    return;
  }
  res.status(200).json({ ok: true, status: 'pendente' });
}

async function login(dados, res) {
  const usuario = textoLimpo(dados.usuario, 50).toLowerCase();
  const senha = String(dados.senha || '');
  if (!usuario || !senha) {
    res.status(400).json({ erro: 'Digite usuário e senha.' });
    return;
  }

  const db = supabase();
  const { data: conta } = await db.from('usuarios').select('*').eq('usuario', usuario).maybeSingle();
  const senhaCorreta = conta && bcrypt.compareSync(senha, conta.senha_hash);
  if (!senhaCorreta) {
    res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    return;
  }
  if (conta.status === 'pendente') {
    res.status(401).json({ erro: 'Seu cadastro ainda não foi aprovado pela escola.', motivo: 'aguardando_aprovacao' });
    return;
  }
  if (conta.status === 'rejeitado') {
    res.status(401).json({ erro: 'Seu cadastro não foi aprovado. Fale com a escola.', motivo: 'cadastro_rejeitado' });
    return;
  }

  const token = jwt.sign({ sub: conta.id, papel: conta.papel, nome: conta.nome, criador: !!conta.criador }, process.env.AUTH_JWT_SECRET, { expiresIn: VALIDADE_SESSAO });
  res.status(200).json({ token: token, papel: conta.papel, nome: conta.nome, usuario_id: conta.id, criador: !!conta.criador });
}

function sessao(req, res) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.indexOf('Bearer ') === 0 ? cabecalho.slice(7) : '';
  if (!token) {
    res.status(401).json({ erro: 'Sem sessão.' });
    return;
  }
  try {
    const dados = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    res.status(200).json({ papel: dados.papel, nome: dados.nome, usuario_id: dados.sub, criador: !!dados.criador });
  } catch (erro) {
    res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' });
  }
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

  const dados = req.body || {};
  try {
    if (dados.acao === 'cadastrar') { await cadastrar(dados, res); return; }
    if (dados.acao === 'login') { await login(dados, res); return; }
    if (dados.acao === 'sessao') { sessao(req, res); return; }
    res.status(400).json({ erro: 'Pedido desconhecido.' });
  } catch (erro) {
    console.error('Falha em auth:', erro);
    res.status(500).json({ erro: 'Algo deu errado. Tente de novo.' });
  }
};
