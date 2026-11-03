// =========================================================
// Painel do administrador (Etapa 10a)
// Lista cadastros de alunos e professores aguardando aprovação
// e deixa aprovar ou rejeitar cada um.
// =========================================================

async function pedirAdmin(pedido) {
  const resposta = await fetch('api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenParaApi() },
    body: JSON.stringify(pedido)
  });
  const json = await resposta.json().catch(function () { return {}; });
  if (resposta.status === 401) {
    encerrarSessao();
    throw new Error(json.erro || 'Sua sessão expirou. Entre de novo.');
  }
  if (!resposta.ok) throw new Error(json.erro || 'Não foi possível completar essa ação.');
  return json;
}

const NOMES_DO_PAPEL = { aluno: 'Aluno', professor: 'Professor' };

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function linhaPendente(u) {
  return '<li class="pendente-linha">' +
    '<div><strong>' + seguro(u.nome) + '</strong> <span class="rotulo">' + NOMES_DO_PAPEL[u.papel] + '</span></div>' +
    '<p>Usuário: ' + seguro(u.usuario) + ' · Cadastrado em ' + formatarDataHora(u.criado_em) + '</p>' +
    '<div class="resumo-botoes">' +
    '<button type="button" class="botao-acao" data-aprovar="' + seguro(u.id) + '">Aprovar</button>' +
    '<button type="button" class="botao-secundario" data-rejeitar="' + seguro(u.id) + '">Rejeitar</button>' +
    '</div></li>';
}

async function desenharAdmin() {
  const area = document.getElementById('painel-admin');
  area.innerHTML = '<p class="carregando">Carregando cadastros…</p>';
  try {
    const resposta = await pedirAdmin({ acao: 'listar-pendentes' });
    const pendentes = resposta.pendentes || [];
    area.innerHTML = pendentes.length
      ? '<ul class="lista-pendentes">' + pendentes.map(linhaPendente).join('') + '</ul>'
      : '<p class="sem-assunto">Nenhum cadastro esperando aprovação.</p>';
  } catch (erro) {
    area.innerHTML = '<p class="erro">' + seguro(erro.message) + '</p>';
  }
}

document.getElementById('painel-admin').addEventListener('click', async function (evento) {
  const alvo = evento.target.closest('button');
  if (!alvo) return;
  const acao = alvo.hasAttribute('data-aprovar') ? 'aprovar' : alvo.hasAttribute('data-rejeitar') ? 'rejeitar' : null;
  if (!acao) return;
  const usuarioId = alvo.dataset.aprovar || alvo.dataset.rejeitar;
  alvo.disabled = true;
  try {
    await pedirAdmin({ acao: acao, usuario_id: usuarioId });
    desenharAdmin();
  } catch (erro) {
    alvo.disabled = false;
    mostrarMensagem('Não foi possível', erro.message);
  }
});
