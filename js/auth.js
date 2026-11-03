// =========================================================
// Login, cadastro e sessão (Etapa 10a)
// - Aluno e professor entram com usuário + senha.
// - Todo cadastro novo fica pendente até um admin aprovar.
// - Se a conta for de admin, as duas telas de entrada (aluno
//   e professor) mandam para o painel do admin.
// A sessão fica guardada no aparelho como um token (JWT).
// =========================================================

let sessaoAtual = null;     // null (deslogado) ou { papel, nome, usuario_id }
let sessaoCarregada = false; // true depois da 1ª verificação (sucesso ou falha)

function tokenSalvo() {
  return ler('sessao-token');
}

// Verifica a sessão uma vez, ao abrir o app. Nunca trava a tela por erro de rede.
async function carregarSessao() {
  const token = tokenSalvo();
  if (!token) {
    sessaoAtual = null;
    sessaoCarregada = true;
    return;
  }
  try {
    const resposta = await fetch('api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ acao: 'sessao' })
    });
    if (resposta.ok) {
      sessaoAtual = await resposta.json();
    } else {
      guardar('sessao-token', '');
      sessaoAtual = null;
    }
  } catch (erro) {
    // Sem internet: trata como deslogado por agora, sem apagar o token salvo.
    sessaoAtual = null;
  }
  sessaoCarregada = true;
}

function estaLogado(papel) {
  return !!(sessaoAtual && sessaoAtual.papel === papel);
}
function ehAdmin() {
  return !!(sessaoAtual && sessaoAtual.papel === 'admin');
}

function encerrarSessao() {
  guardar('sessao-token', '');
  sessaoAtual = null;
  location.hash = '#/inicio';
}

// ---------- Cadastro ----------
async function cadastrar(papel, dados, aviso, sucesso) {
  aviso.hidden = true;
  sucesso.hidden = true;
  try {
    const resposta = await fetch('api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'cadastrar', papel: papel, usuario: dados.usuario, nome: dados.nome, senha: dados.senha })
    });
    const json = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      aviso.textContent = json.erro || 'Não foi possível cadastrar agora.';
      aviso.hidden = false;
      return;
    }
    sucesso.hidden = false;
  } catch (erro) {
    aviso.textContent = 'Não deu para falar com o servidor. Confira a internet.';
    aviso.hidden = false;
  }
}

function configurarCadastro(papel, idForm, idNome, idUsuario, idSenha, idConfirmar, idAviso, idSucesso) {
  document.getElementById(idForm).addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const nome = document.getElementById(idNome).value.trim();
    const usuario = document.getElementById(idUsuario).value.trim();
    const senha = document.getElementById(idSenha).value;
    const confirmar = document.getElementById(idConfirmar).value;
    const aviso = document.getElementById(idAviso);
    const sucesso = document.getElementById(idSucesso);
    if (senha !== confirmar) {
      sucesso.hidden = true;
      aviso.textContent = 'As senhas digitadas são diferentes.';
      aviso.hidden = false;
      return;
    }
    const botao = this.querySelector('button[type="submit"]');
    botao.disabled = true;
    await cadastrar(papel, { nome: nome, usuario: usuario, senha: senha }, aviso, sucesso);
    botao.disabled = false;
    if (!sucesso.hidden) this.reset();
  });
}

// ---------- Login ----------
async function entrar(papel, usuario, senha, aviso, avisoPendente) {
  aviso.hidden = true;
  avisoPendente.hidden = true;
  try {
    const resposta = await fetch('api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'login', usuario: usuario, senha: senha })
    });
    const json = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      if (json.motivo === 'aguardando_aprovacao') { avisoPendente.hidden = false; }
      else { aviso.textContent = json.erro || 'Não foi possível entrar agora.'; aviso.hidden = false; }
      return false;
    }
    // Quem é admin entra no painel admin, mesmo tendo digitado na tela de aluno/professor
    if (json.papel !== 'admin' && json.papel !== papel) {
      aviso.textContent = 'Essa conta não é de ' + (papel === 'aluno' ? 'aluno' : 'professor') + '.';
      aviso.hidden = false;
      return false;
    }
    guardar('sessao-token', json.token);
    sessaoAtual = { papel: json.papel, nome: json.nome };
    location.hash = json.papel === 'admin' ? '#/admin' : '#/' + papel;
    return true;
  } catch (erro) {
    aviso.textContent = 'Não deu para falar com o servidor. Confira a internet.';
    aviso.hidden = false;
    return false;
  }
}

function configurarEntrada(papel, idForm, idUsuario, idSenha, idAviso, idAvisoPendente) {
  document.getElementById(idForm).addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const usuario = document.getElementById(idUsuario).value.trim();
    const senha = document.getElementById(idSenha).value;
    const aviso = document.getElementById(idAviso);
    const avisoPendente = document.getElementById(idAvisoPendente);
    const botao = this.querySelector('button[type="submit"]');
    botao.disabled = true;
    await entrar(papel, usuario, senha, aviso, avisoPendente);
    botao.disabled = false;
  });
}

configurarEntrada('aluno', 'form-entrar-aluno', 'entrar-aluno-usuario', 'entrar-aluno-senha', 'erro-entrar-aluno', 'pendente-entrar-aluno');
configurarCadastro('aluno', 'form-cadastro-aluno', 'cadastro-aluno-nome', 'cadastro-aluno-usuario', 'cadastro-aluno-senha', 'cadastro-aluno-confirmar', 'erro-cadastro-aluno', 'sucesso-cadastro-aluno');
configurarEntrada('professor', 'form-entrar-professor', 'entrar-professor-usuario', 'entrar-professor-senha', 'erro-entrar-professor', 'pendente-entrar-professor');
configurarCadastro('professor', 'form-cadastro-professor', 'cadastro-professor-nome', 'cadastro-professor-usuario', 'cadastro-professor-senha', 'cadastro-professor-confirmar', 'erro-cadastro-professor', 'sucesso-cadastro-professor');

document.querySelectorAll('[data-sair]').forEach(function (botao) {
  botao.addEventListener('click', encerrarSessao);
});
