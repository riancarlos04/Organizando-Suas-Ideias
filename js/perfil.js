// =========================================================
// Personalização e pontos fracos (Etapa 7)
// - Cadastro rápido do aluno (nome, nível de ensino, objetivo,
//   nível de conhecimento e tempo para estudar)
// - O perfil vai junto nos pedidos à IA, para ela adaptar a explicação
// - Pontos fracos: erros nos questionários + assuntos mais pesquisados
// Tudo fica guardado só no aparelho.
// =========================================================

const OPCOES_NIVEL_ENSINO = [
  ['6ano', '6º ano'], ['7ano', '7º ano'], ['8ano', '8º ano'], ['9ano', '9º ano'],
  ['medio', 'Ensino médio'], ['tecnico', 'Ensino técnico'], ['superior', 'Ensino superior'],
  ['concurso', 'Concurso ou vestibular']
];

// ---------- Guardar e carregar ----------
let perfilAluno = null;   // { nome, nivelEnsino, objetivo, conhecimento, tempo }
let pesquisas = [];       // { assunto, materia, data }
try {
  perfilAluno = JSON.parse(localStorage.getItem('perfil-aluno'));
  const guardadas = JSON.parse(localStorage.getItem('pesquisas'));
  if (Array.isArray(guardadas)) pesquisas = guardadas;
} catch (erro) {}

function salvarPerfil() {
  try { localStorage.setItem('perfil-aluno', JSON.stringify(perfilAluno)); } catch (erro) {}
}
function temPerfilAluno() {
  return !!(perfilAluno && perfilAluno.nivelEnsino);
}

// O que vai para a IA. "nivelEscolhido" é o nível marcado no próprio formulário.
function perfilParaIA(nivelEscolhido) {
  const p = perfilAluno || {};
  return {
    nivelEnsino: nivelEscolhido || p.nivelEnsino,
    conhecimento: p.conhecimento,
    objetivo: p.objetivo,
    tempo: p.tempo
  };
}

// Cada resumo ou questionário pedido conta como uma pesquisa
function registrarPesquisa(assunto, materia) {
  if (!assunto) return;
  pesquisas.push({ assunto: assunto, materia: materia || '', data: dataDeHoje() });
  pesquisas = pesquisas.slice(-200);
  try { localStorage.setItem('pesquisas', JSON.stringify(pesquisas)); } catch (erro) {}
}

// ---------- Saudação ----------
function atualizarSaudacao() {
  const nome = perfilAluno && perfilAluno.nome;
  document.getElementById('saudacao-aluno').textContent = 'Olá, ' + (nome || 'estudante') + '!';
}

// ---------- Tela "Meu perfil" (também é o cadastro rápido) ----------
document.querySelectorAll('.seletor-nivel').forEach(function (seletor) {
  seletor.innerHTML = (seletor.id === 'perfil-nivel' ? '<option value="">Escolha</option>' : '') +
    OPCOES_NIVEL_ENSINO.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
});

function marcarOpcao(nome, valor) {
  document.querySelectorAll('input[name="' + nome + '"]').forEach(function (r) { r.checked = r.value === valor; });
}

function desenharPerfil() {
  const primeiraVez = !temPerfilAluno();
  document.getElementById('perfil-titulo').textContent = primeiraVez ? 'Vamos começar!' : 'Meu perfil';
  document.getElementById('perfil-explica').textContent = primeiraVez
    ? 'Responda rapidinho para o app explicar do jeito certo para você. Dá para mudar depois em "Meu perfil".'
    : 'O app usa estas respostas para adaptar os resumos e os questionários.';
  document.getElementById('botao-perfil').textContent = primeiraVez ? 'Começar' : 'Salvar';
  const p = perfilAluno || {};
  document.getElementById('perfil-nome').value = p.nome || '';
  document.getElementById('perfil-nivel').value = p.nivelEnsino || '';
  marcarOpcao('perfil-objetivo', p.objetivo);
  marcarOpcao('perfil-conhecimento', p.conhecimento);
  marcarOpcao('perfil-tempo', p.tempo);
}

document.getElementById('form-perfil').addEventListener('submit', function (evento) {
  evento.preventDefault();
  const primeiraVez = !temPerfilAluno();
  perfilAluno = {
    nome: document.getElementById('perfil-nome').value.trim(),
    nivelEnsino: document.getElementById('perfil-nivel').value,
    objetivo: valorMarcado('perfil-objetivo'),
    conhecimento: valorMarcado('perfil-conhecimento'),
    tempo: valorMarcado('perfil-tempo')
  };
  salvarPerfil();
  // O nível dos formulários de resumo e questionário passa a seguir o perfil
  document.getElementById('resumo-nivel').value = perfilAluno.nivelEnsino;
  document.getElementById('q-ensino').value = perfilAluno.nivelEnsino;
  if (primeiraVez) location.hash = '#/aluno';
  else mostrarMensagem('Perfil salvo', 'Os próximos resumos e questionários vão seguir suas respostas.');
});

// Formulários de resumo e questionário começam no nível do perfil
function preencherNivelDosFormularios() {
  if (!temPerfilAluno()) return;
  ['resumo-nivel', 'q-ensino'].forEach(function (id) {
    const seletor = document.getElementById(id);
    if (!seletor.dataset.mexido) seletor.value = perfilAluno.nivelEnsino;
  });
}
['resumo-nivel', 'q-ensino'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', function () { this.dataset.mexido = 'sim'; });
});

// ---------- Pontos fracos (aparece no "Meu desempenho") ----------
// Conta pontos por matéria e por tema: cada erro vale 2, cada pesquisa vale 1.
function calcularPontosFracos() {
  const porMateria = {};
  const porTema = {};      // chave: matéria + tema
  function somar(materia, tema, pontos) {
    if (materia) porMateria[materia] = (porMateria[materia] || 0) + pontos;
    const chave = (materia || '') + '|' + tema;
    if (!porTema[chave]) porTema[chave] = { materia: materia || '', tema: tema, pontos: 0, erros: 0 };
    porTema[chave].pontos += pontos;
    return porTema[chave];
  }
  questionariosFeitos.forEach(function (q) {
    q.questoes.forEach(function (questao) {
      if (!questao.certa) somar(q.materia, questao.tema || q.assunto, 2).erros++;
    });
  });
  pesquisas.forEach(function (p) { somar(p.materia, p.assunto, 1); });

  const temas = Object.keys(porTema).map(function (k) { return porTema[k]; })
    .filter(function (t) { return t.erros > 0 || t.pontos >= 2; })
    .sort(function (a, b) { return b.pontos - a.pontos; });
  const materias = Object.keys(porMateria).sort(function (a, b) { return porMateria[b] - porMateria[a]; });
  const materia = materias.length ? materias[0] : '';
  const temaPrincipal = temas.filter(function (t) { return !materia || t.materia === materia; })[0] || temas[0];
  return { materia: materia, tema: temaPrincipal, temas: temas.slice(0, 3) };
}

function blocoPontosFracos() {
  const fracos = calcularPontosFracos();
  let html = '<section class="bloco"><h2>Pontos fracos</h2>';
  if (!fracos.tema) {
    return html + '<p class="sem-assunto">Faça questionários para o app descobrir em que você tem mais dificuldade.</p></section>';
  }
  // Frase do slide de Millena e Vanusa
  const onde = fracos.materia
    ? seguro(fracos.materia) + (fracos.tema.tema && fracos.tema.materia === fracos.materia ? ', especialmente em ' + seguro(fracos.tema.tema.toLowerCase()) : '')
    : seguro(fracos.tema.tema);
  html += '<div class="ponto-fraco"><p>Você apresenta maior dificuldade em <strong>' + onde + '</strong>. Que tal revisar esse conteúdo?</p>' +
    '<button type="button" class="botao-acao" data-revisar-tema="' + seguro(fracos.tema.tema) + '" data-materia="' + seguro(fracos.tema.materia) + '">Revisar com um resumo</button></div>';
  if (fracos.temas.length > 1) {
    html += '<p class="rotulo">Temas que mais precisam de atenção</p><ul class="temas">' + fracos.temas.map(function (t) {
      return '<li><span>' + seguro(t.tema) + (t.materia ? ' <small>· ' + seguro(t.materia) + '</small>' : '') + '</span>' +
        '<small>' + (t.erros ? plural(t.erros, 'erro', 'erros') : 'muito pesquisado') + '</small></li>';
    }).join('') + '</ul>';
  }
  return html + '</section>';
}

document.getElementById('painel-desempenho').addEventListener('click', function (evento) {
  const alvo = evento.target.closest('[data-revisar-tema]');
  if (!alvo) return;
  document.getElementById('resumo-assunto').value = alvo.dataset.revisarTema;
  document.getElementById('resumo-materia').value = alvo.dataset.materia;
  location.hash = '#/aluno/resumos';
});
