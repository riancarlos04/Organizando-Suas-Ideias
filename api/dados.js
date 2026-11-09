// =========================================================
// Função que roda no servidor da Vercel (não no celular).
// Guarda os dados de estudo do aluno e do professor no Supabase,
// para sincronizar entre aparelhos (Etapa 10b).
//
// Usa as mesmas variáveis de api/auth.js:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_JWT_SECRET
// =========================================================

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Qualquer conta logada pode usar (aluno, professor ou admin).
// O usuario_id SEMPRE vem do token validado aqui, nunca do corpo do pedido.
function sessaoValida(req) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.indexOf('Bearer ') === 0 ? cabecalho.slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.AUTH_JWT_SECRET);
  } catch (erro) {
    return null;
  }
}

function textoOuNulo(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}
function idTexto(valor) {
  return String(valor || '').trim();
}

// ---------- Cronograma (documento único por aluno) ----------
const cronogramaRecurso = {
  async obter(db, usuarioId) {
    const { data, error } = await db.from('cronograma').select('materias').eq('usuario_id', usuarioId).maybeSingle();
    if (error) throw error;
    return { materias: (data && data.materias) || {} };
  },
  async salvar(db, usuarioId, dados) {
    const { error } = await db.from('cronograma')
      .upsert({ usuario_id: usuarioId, materias: dados.materias || {}, atualizado_em: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  }
};

// ---------- Metas (coleção) ----------
const metasRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('metas').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { metas: data.map(linhaParaMeta) };
  },
  async criar(db, usuarioId, dados) {
    const meta = dados.meta || {};
    const { error } = await db.from('metas').insert({
      id: idTexto(meta.id), usuario_id: usuarioId, texto: String(meta.texto || '').slice(0, 120), prazo: meta.prazo || null, feita: !!meta.feita
    });
    if (error) throw error;
    return { ok: true };
  },
  async atualizar(db, usuarioId, dados) {
    const { error } = await db.from('metas').update({ feita: !!dados.feita }).eq('id', idTexto(dados.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  },
  async remover(db, usuarioId, dados) {
    const { error } = await db.from('metas').delete().eq('id', idTexto(dados.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  }
};
function linhaParaMeta(l) { return { id: l.id, texto: l.texto, prazo: l.prazo, feita: l.feita }; }

// ---------- Resumos (coleção) ----------
const resumosRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('resumos').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { resumos: data.map(linhaParaResumo) };
  },
  async criar(db, usuarioId, dados) {
    const r = dados.resumo || {};
    const { error } = await db.from('resumos').insert({
      id: idTexto(r.id), usuario_id: usuarioId, assunto: textoOuNulo(r.assunto), materia: textoOuNulo(r.materia),
      tipo: textoOuNulo(r.tipo), texto: String(r.texto || ''), pedido: r.pedido || null, data: r.data || new Date().toISOString().slice(0, 10)
    });
    if (error) throw error;
    return { ok: true };
  },
  async remover(db, usuarioId, dados) {
    const { error } = await db.from('resumos').delete().eq('id', idTexto(dados.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  }
};
function linhaParaResumo(l) {
  return { id: l.id, assunto: l.assunto, materia: l.materia, tipo: l.tipo, texto: l.texto, pedido: l.pedido, data: l.data };
}

// ---------- Questionários (coleção + documento único "em andamento") ----------
const questionariosRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('questionarios_feitos').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { questionarios: data.map(linhaParaQuestionario) };
  },
  async criar(db, usuarioId, dados) {
    const q = dados.questionario || {};
    const { error } = await db.from('questionarios_feitos').insert({
      id: idTexto(q.id), usuario_id: usuarioId, assunto: textoOuNulo(q.assunto), materia: textoOuNulo(q.materia),
      nivel: textoOuNulo(q.nivel), gabarito: textoOuNulo(q.gabarito), total: q.total || 0, acertos: q.acertos || 0,
      em_branco: q.emBranco || 0, porcentagem: q.porcentagem || 0, questoes: q.questoes || [], data: q.data || new Date().toISOString().slice(0, 10)
    });
    if (error) throw error;
    return { ok: true };
  },
  async remover(db, usuarioId, dados) {
    const { error } = await db.from('questionarios_feitos').delete().eq('id', idTexto(dados.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  },
  async obterEmAndamento(db, usuarioId) {
    const { data, error } = await db.from('questionario_em_andamento').select('dados').eq('usuario_id', usuarioId).maybeSingle();
    if (error) throw error;
    return { emAndamento: (data && data.dados) || null };
  },
  async salvarEmAndamento(db, usuarioId, dados) {
    const { error } = await db.from('questionario_em_andamento')
      .upsert({ usuario_id: usuarioId, dados: dados.emAndamento || {}, atualizado_em: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  },
  async removerEmAndamento(db, usuarioId) {
    const { error } = await db.from('questionario_em_andamento').delete().eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  }
};
function linhaParaQuestionario(l) {
  return {
    id: l.id, assunto: l.assunto, materia: l.materia, nivel: l.nivel, gabarito: l.gabarito, data: l.data,
    total: l.total, acertos: l.acertos, emBranco: l.em_branco, porcentagem: l.porcentagem, questoes: l.questoes
  };
}

// ---------- Perfil educacional (documento único por aluno) ----------
const perfilRecurso = {
  async obter(db, usuarioId) {
    const { data, error } = await db.from('perfil_aluno').select('*').eq('usuario_id', usuarioId).maybeSingle();
    if (error) throw error;
    return { perfil: data ? { nivelEnsino: data.nivel_ensino, objetivo: data.objetivo, conhecimento: data.conhecimento, tempo: data.tempo } : null };
  },
  async salvar(db, usuarioId, dados) {
    const p = dados.perfil || {};
    const { error } = await db.from('perfil_aluno').upsert({
      usuario_id: usuarioId, nivel_ensino: textoOuNulo(p.nivelEnsino), objetivo: textoOuNulo(p.objetivo),
      conhecimento: textoOuNulo(p.conhecimento), tempo: textoOuNulo(p.tempo), atualizado_em: new Date().toISOString()
    });
    if (error) throw error;
    return { ok: true };
  }
};

// ---------- Pesquisas (coleção, cortada em 200) ----------
const pesquisasRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('pesquisas').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { pesquisas: data.map(function (l) { return { assunto: l.assunto, materia: l.materia, data: l.data }; }) };
  },
  async registrar(db, usuarioId, dados) {
    const { error } = await db.from('pesquisas').insert({
      usuario_id: usuarioId, assunto: textoOuNulo(dados.assunto), materia: textoOuNulo(dados.materia), data: dados.data || new Date().toISOString().slice(0, 10)
    });
    if (error) throw error;
    // Mantém só as 200 mais recentes.
    const { data: antigas, error: erroListar } = await db.from('pesquisas').select('id').eq('usuario_id', usuarioId).order('criado_em', { ascending: false }).range(200, 10000);
    if (!erroListar && antigas && antigas.length) {
      await db.from('pesquisas').delete().in('id', antigas.map(function (l) { return l.id; }));
    }
    return { ok: true };
  }
};

// ---------- Atividades e provas do professor (coleção) ----------
const atividadesRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('atividades').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { atividades: data.map(linhaParaAtividade) };
  },
  async criar(db, usuarioId, dados) {
    const a = dados.atividade || {};
    const { error } = await db.from('atividades').insert(atividadeParaLinha(a, usuarioId));
    if (error) throw error;
    return { ok: true };
  },
  async atualizar(db, usuarioId, dados) {
    const a = dados.atividade || {};
    const linha = atividadeParaLinha(a, usuarioId);
    delete linha.usuario_id;
    linha.atualizado_em = new Date().toISOString();
    const { error } = await db.from('atividades').update(linha).eq('id', idTexto(a.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  },
  async remover(db, usuarioId, dados) {
    const { error } = await db.from('atividades').delete().eq('id', idTexto(dados.id)).eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  }
};
function atividadeParaLinha(a, usuarioId) {
  return {
    id: idTexto(a.id), usuario_id: usuarioId, titulo: textoOuNulo(a.titulo), materia: textoOuNulo(a.materia),
    ano: textoOuNulo(a.ano), assunto: textoOuNulo(a.assunto), nivel: textoOuNulo(a.nivel), material: textoOuNulo(a.material),
    turma: textoOuNulo(a.turma), valor_total: a.valorTotal || null, versoes: !!a.versoes, versao_b: a.versaoB || null,
    questoes: a.questoes || [], data: a.data || new Date().toISOString().slice(0, 10)
  };
}
function linhaParaAtividade(l) {
  return {
    id: l.id, titulo: l.titulo, materia: l.materia, ano: l.ano, assunto: l.assunto, nivel: l.nivel,
    material: l.material, turma: l.turma, valorTotal: l.valor_total, versoes: l.versoes, versaoB: l.versao_b,
    questoes: l.questoes, data: l.data
  };
}

// ---------- Sessões de estudo (coleção + documento único "em andamento") ----------
const sessoesRecurso = {
  async listar(db, usuarioId) {
    const { data, error } = await db.from('sessoes_estudo').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: true });
    if (error) throw error;
    return { sessoes: data.map(function (l) { return { materia: l.materia, inicio: new Date(l.inicio).getTime(), minutos: l.minutos }; }) };
  },
  async criar(db, usuarioId, dados) {
    const s = dados.sessao || {};
    const { error } = await db.from('sessoes_estudo').insert({
      usuario_id: usuarioId, materia: textoOuNulo(s.materia), inicio: new Date(s.inicio || Date.now()).toISOString(), minutos: s.minutos || 0
    });
    if (error) throw error;
    return { ok: true };
  },
  async obterEmAndamento(db, usuarioId) {
    const { data, error } = await db.from('sessao_em_andamento').select('*').eq('usuario_id', usuarioId).maybeSingle();
    if (error) throw error;
    return { emAndamento: data ? { materia: data.materia, inicio: new Date(data.inicio).getTime() } : null };
  },
  async salvarEmAndamento(db, usuarioId, dados) {
    const s = dados.emAndamento || {};
    const { error } = await db.from('sessao_em_andamento')
      .upsert({ usuario_id: usuarioId, materia: textoOuNulo(s.materia), inicio: new Date(s.inicio || Date.now()).toISOString() });
    if (error) throw error;
    return { ok: true };
  },
  async removerEmAndamento(db, usuarioId) {
    const { error } = await db.from('sessao_em_andamento').delete().eq('usuario_id', usuarioId);
    if (error) throw error;
    return { ok: true };
  }
};

const RECURSOS = {
  cronograma: cronogramaRecurso,
  metas: metasRecurso,
  resumos: resumosRecurso,
  questionarios: questionariosRecurso,
  perfil: perfilRecurso,
  pesquisas: pesquisasRecurso,
  atividades: atividadesRecurso,
  sessoes: sessoesRecurso
};

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Use POST.' });
    return;
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.AUTH_JWT_SECRET) {
    res.status(500).json({ erro: 'O login ainda não foi configurado na Vercel.' });
    return;
  }

  const sessao = sessaoValida(req);
  if (!sessao) {
    res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' });
    return;
  }

  const dados = req.body || {};
  const recurso = RECURSOS[dados.recurso];
  const acao = recurso && recurso[dados.acao];
  if (typeof acao !== 'function') {
    res.status(400).json({ erro: 'Pedido desconhecido.' });
    return;
  }

  try {
    const resultado = await acao(supabase(), sessao.sub, dados);
    res.status(200).json(resultado);
  } catch (erro) {
    console.error('Falha em dados:', erro);
    res.status(500).json({ erro: 'Não foi possível completar essa ação. Tente de novo.' });
  }
};
