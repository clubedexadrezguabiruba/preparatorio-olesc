/**
 * Renomear, duplicar e excluir capítulo — §8.4.
 *
 * O que se prova aqui é a conta, não o clique: quais ids a cópia recebe, o que
 * a exclusão leva junto, quem ela se recusa a apagar sem ordem do professor, e
 * se tudo volta com um Desfazer. O menu e o diálogo são teste de tela.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Position } from "../lesson/schema.ts";
import {
  aplicarDuplicacaoDeCapitulo,
  aplicarExclusaoDeCapitulo,
  calcularExclusaoDeCapitulo,
  prepararDuplicacaoDeCapitulo,
} from "./capitulo.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2, type AulaV2 } from "./modelo.ts";

const positions: Record<string, Position> = {};

/** Rei e peão em e2 contra rei em e8. */
const FEN = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";

/**
 * A aula de ensaio.
 *
 * ```
 * analise-a (FEN crua)
 *   raiz
 *    ├─ a1  e2e4  ← comentário, desenho, narração, treino e a filha começam aqui
 *    │   └─ a2  e8e7  ← o quadro da introdução mostra este
 *    └─ a3  e1d2
 * analise-b  começa em a1  →  capítulo «Daqui em diante»
 * ```
 */
function aulaDeEnsaio(): AulaV2 {
  return {
    schemaVersion: 2,
    id: "EX-CAPITULO",
    titulo: "Ensaio dos capítulos",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [],
    excecoes: [],
    analises: [
      {
        id: "analise-a",
        inicio: { tipo: "fen", fen: FEN },
        origemPgn: { tags: { Event: "Estudo do Doug" }, naoReconhecidos: [] },
        raizId: "no-a-0",
        nos: {
          "no-a-0": { id: "no-a-0", filhos: ["no-a-1", "no-a-3"] },
          "no-a-1": { id: "no-a-1", uci: "e2e4", filhos: ["no-a-2"], comentario: "O avanço duplo.", nags: [5], desenhos: { arrows: [{ de: "e2", para: "e4", cor: "verde" }] } },
          "no-a-2": { id: "no-a-2", uci: "e8e7", filhos: [] },
          "no-a-3": { id: "no-a-3", uci: "e1d2", filhos: [] },
        },
      },
      {
        id: "analise-b",
        inicio: { tipo: "referencia", origem: { analiseId: "analise-a", nodeId: "no-a-1" } },
        raizId: "no-b-0",
        nos: { "no-b-0": { id: "no-b-0", filhos: [] } },
      },
    ],
    introducoes: [{
      id: "introducao-a",
      titulo: "Antes de começar",
      quadros: [{ id: "quadro-1", texto: "Repare no peão.", posicao: { tipo: "referencia", origem: { analiseId: "analise-a", nodeId: "no-a-2" } } }],
    }],
    capitulos: [
      {
        id: "capitulo-a",
        titulo: "O peão anda",
        analiseId: "analise-a",
        inicioNodeId: "no-a-0",
        caminho: ["no-a-1", "no-a-2"],
        orientacao: "white",
        narracoes: [{ id: "narracao-a1", nodeId: "no-a-1", texto: "Duas casas de uma vez.", pausa: "temporizada" }],
      },
      {
        id: "capitulo-b",
        titulo: "Daqui em diante",
        analiseId: "analise-b",
        inicioNodeId: "no-b-0",
        caminho: [],
        orientacao: "black",
        narracoes: [],
      },
    ],
    treinos: [{
      id: "treino-a",
      titulo: "Treino do peão",
      perfil: "linha-autoral",
      inicio: { analiseId: "analise-a", nodeId: "no-a-1" },
      ladoAluno: "white",
      objetivo: "Empurrar o peão.",
      questoes: [{
        id: "questao-1",
        posicao: { analiseId: "analise-a", nodeId: "no-a-1" },
        respostas: [{ id: "resposta-1", moves: ["e8e7"], julgamento: "correta", feedback: "Isso.", efeito: { tipo: "repete" } }],
      }],
      defensor: { politica: "deterministica" },
      termino: { tipo: "objetivo" },
      propriedade: "independente",
      fonte: "atual",
      obrigatorio: true,
      revisaoAvaliacao: "confirmada",
    }],
    praticas: [],
    fluxo: [
      { id: "etapa-introducao", tipo: "introducao", entidadeId: "introducao-a" },
      { id: "etapa-a", tipo: "capitulo", entidadeId: "capitulo-a" },
      { id: "etapa-b", tipo: "capitulo", entidadeId: "capitulo-b" },
      { id: "etapa-treino", tipo: "treino", entidadeId: "treino-a" },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Renomear
 * ------------------------------------------------------------------ */

test("renomear com nome vazio não apaga o nome anterior", () => {
  const aula = aulaDeEnsaio();
  const depois = executarComando(aula, { tipo: "RENOMEAR_CAPITULO", capituloId: "capitulo-a", titulo: "   " }, positions);
  assert.equal(depois.capitulos[0].titulo, "O peão anda");

  const renomeado = executarComando(aula, { tipo: "RENOMEAR_CAPITULO", capituloId: "capitulo-a", titulo: " Oposição distante " }, positions);
  assert.equal(renomeado.capitulos[0].titulo, "Oposição distante", "o nome novo entra sem os espaços das pontas");
});

/* ------------------------------------------------------------------ *
 * Duplicar
 * ------------------------------------------------------------------ */

test("preparar a duplicação não toca na aula e decide todos os ids de uma vez", () => {
  const aula = aulaDeEnsaio();
  const antes = JSON.stringify(aula);
  const preparo = prepararDuplicacaoDeCapitulo(aula, { capituloId: "capitulo-a" }, positions);
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  assert.equal(JSON.stringify(aula), antes, "calcular é ler");
  assert.equal(preparo.novo.titulo, "O peão anda (cópia)");
  assert.equal(preparo.novo.analiseId, "analise-o-peao-anda-copia");
  assert.deepEqual(Object.keys(preparo.novo.nos).sort(), ["no-a-0", "no-a-1", "no-a-2", "no-a-3"]);
  assert.equal(preparo.novo.nos["no-a-0"], "no-o-peao-anda-copia-0", "a raiz é o nó 0: o mapa segue a descida, não a ordem das chaves");
  assert.equal(preparo.novo.nos["no-a-1"], "no-o-peao-anda-copia-1");
});

test("a cópia é independente: ids novos, conteúdo igual, percurso e narração remapeados", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararDuplicacaoDeCapitulo(aula, { capituloId: "capitulo-a", nome: "O peão anda de novo" }, positions);
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;
  const resultado = aplicarDuplicacaoDeCapitulo(aula, preparo.novo);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  const copia = resultado.aula.analises.find((a) => a.id === preparo.novo.analiseId)!;
  const capitulo = resultado.aula.capitulos.find((c) => c.id === preparo.novo.capituloId)!;

  assert.equal(Object.keys(copia.nos).length, 4);
  assert.deepEqual(copia.inicio, { tipo: "fen", fen: FEN }, "o chão da origem já era próprio, e a cópia o herda igual");
  assert.deepEqual(copia.origemPgn?.tags, { Event: "Estudo do Doug" }, "a atribuição acompanha a cópia");

  const a1 = copia.nos[preparo.novo.nos["no-a-1"]];
  assert.equal(a1.comentario, "O avanço duplo.");
  assert.deepEqual(a1.nags, [5]);
  assert.deepEqual(a1.desenhos, { arrows: [{ de: "e2", para: "e4", cor: "verde" }] });
  assert.deepEqual(a1.filhos, [preparo.novo.nos["no-a-2"]], "os filhos apontam para os ids novos, e não para os antigos");

  assert.deepEqual(capitulo.caminho, [preparo.novo.nos["no-a-1"], preparo.novo.nos["no-a-2"]]);
  assert.equal(capitulo.narracoes[0].id, "narracao-o-peao-anda-de-novo-1");
  assert.equal(capitulo.narracoes[0].nodeId, preparo.novo.nos["no-a-1"]);
  assert.equal(capitulo.narracoes[0].texto, "Duas casas de uma vez.");

  assert.deepEqual(
    resultado.aula.fluxo.map((e) => e.entidadeId),
    ["introducao-a", "capitulo-a", preparo.novo.capituloId, "capitulo-b", "treino-a"],
    "a cópia entra logo depois do original, e o fluxo continua sendo a única ordem",
  );
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true);
});

test("duplicar um capítulo que começava numa referência materializa a FEN e encerra a dependência", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararDuplicacaoDeCapitulo(aula, { capituloId: "capitulo-b", nome: "Cópia independente" }, positions);
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;
  assert.equal(preparo.novo.fenMaterializada, "4k3/8/8/8/4P3/8/8/4K3 b - - 0 1", "a posição depois de 1. e4, guardada como chão próprio");

  const resultado = aplicarDuplicacaoDeCapitulo(aula, preparo.novo);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;
  const copia = resultado.aula.analises.find((a) => a.id === preparo.novo.analiseId)!;
  assert.equal(copia.inicio.tipo, "fen", "uma cópia que continuasse referenciando não seria independente de nada");
});

test("Desfazer tira a cópia inteira e Refazer devolve os mesmos ids", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararDuplicacaoDeCapitulo(aula, { capituloId: "capitulo-a" }, positions);
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "DUPLICAR_CAPITULO", novo: preparo.novo }, positions));
  const depois = historico.presente;

  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula);
  historico = refazer(historico);
  assert.deepEqual(historico.presente, depois, "o Refazer repete o mapa de ids, e não um cálculo novo");
});

/* ------------------------------------------------------------------ *
 * Excluir
 * ------------------------------------------------------------------ */

test("excluir só o capítulo não leva a análise, e avisa que ela fica sem capítulo", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: false }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  assert.equal(calculo.plano.impacto.narracoesRemovidas, 1);
  assert.equal(calculo.plano.impacto.nosRemovidos, 0, "sem a análise, nenhum lance se perde");
  assert.equal(calculo.plano.impacto.analiseFicaOrfa, true);
  assert.deepEqual(calculo.plano.impacto.dependentes, [], "ninguém quebra: os lances continuam todos lá");

  const resultado = aplicarExclusaoDeCapitulo(aula, calculo.plano);
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  assert.equal(resultado.aula.capitulos.some((c) => c.id === "capitulo-a"), false);
  assert.equal(resultado.aula.analises.some((a) => a.id === "analise-a"), true, "§8.4: excluir capítulo não exclui a análise");
  assert.equal(resultado.aula.fluxo.some((e) => e.entidadeId === "capitulo-a"), false, "a etapa sai junto");
});

test("a análise compartilhada não pode ser levada junto, e a recusa diz por quem", () => {
  const aula = aulaDeEnsaio();
  aula.capitulos.push({ ...aula.capitulos[0], id: "capitulo-a2", titulo: "A mesma partida, outra vista", narracoes: [] });
  aula.fluxo.push({ id: "etapa-a2", tipo: "capitulo", entidadeId: "capitulo-a2" });

  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, false);
  if (calculo.ok) return;
  assert.match(calculo.mensagem, /«A mesma partida, outra vista»/);
});

test("excluir a análise mostra nomes e contagens reais do que vai junto", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;
  const { impacto } = calculo.plano;

  assert.equal(impacto.nosRemovidos, 3, "três lances; a raiz não é lance");
  assert.equal(impacto.comentariosRemovidos, 1);
  assert.equal(impacto.desenhosRemovidos, 1);
  assert.equal(impacto.narracoesRemovidas, 1);
  assert.deepEqual(
    impacto.dependentes.map((d) => [d.tipo, d.nome, d.motivo]),
    [
      ["treino", "Treino do peão", "usa um lance que esta exclusão apaga"],
      ["introducao", "Antes de começar", "tem um quadro que mostra um lance que esta exclusão apaga"],
      ["analise", "Daqui em diante", "começa num lance que esta exclusão apaga"],
    ],
  );
  assert.equal(impacto.dependentes[0].materializacao, null, "um treino não vira independente hoje");
  assert.match(impacto.dependentes[0].motivoSemMaterializar!, /editor de treinos/);
  assert.equal(impacto.dependentes[2].materializacao?.tipo, "analise");
});

test("sem escolha para cada dependente, a exclusão recusa e nada muda", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  const resultado = aplicarExclusaoDeCapitulo(aula, calculo.plano, {});
  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.mensagem, /«Treino do peão»/);
  assert.match(resultado.mensagem, /Nada foi mudado\./);
});

test("remover e materializar são as duas saídas, e as duas acontecem na mesma transação", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  const resultado = aplicarExclusaoDeCapitulo(aula, calculo.plano, {
    "treino-a": "remover",
    "introducao-a": "materializar",
    "analise-b": "materializar",
  });
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;
  const depois = resultado.aula;

  assert.equal(depois.treinos.length, 0, "o treino removido sai inteiro");
  assert.equal(depois.fluxo.some((e) => e.entidadeId === "treino-a"), false, "e a etapa dele sai junto, senão o fluxo fica apontando para o vazio");

  assert.deepEqual(depois.introducoes[0].quadros[0].posicao, { tipo: "fen", fen: "8/4k3/8/8/4P3/8/8/4K3 w - - 1 2" });
  assert.deepEqual(depois.analises.find((a) => a.id === "analise-b")!.inicio, { tipo: "fen", fen: "4k3/8/8/8/4P3/8/8/4K3 b - - 0 1" });

  assert.equal(depois.analises.some((a) => a.id === "analise-a"), false);
  assert.equal(depois.capitulos.some((c) => c.id === "capitulo-a"), false);
  assert.equal(validarAulaV2(depois, positions).ok, true, "a aula continua válida depois do corte");
});

test("remover a análise dependente leva o capítulo dela junto, e a aula continua válida", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  const resultado = aplicarExclusaoDeCapitulo(aula, calculo.plano, {
    "treino-a": "remover",
    "introducao-a": "remover",
    "analise-b": "remover",
  });
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  assert.deepEqual(resultado.aula.capitulos, [], "capitulo-b saiu com a análise-b, e capitulo-a com a exclusão");
  assert.deepEqual(resultado.aula.fluxo, []);
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true, "uma aula sem capítulo continua sendo um rascunho válido");
});

test("a exclusão inteira volta com um Desfazer só", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularExclusaoDeCapitulo(aula, { capituloId: "capitulo-a", excluirAnalise: true }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, {
    tipo: "EXCLUIR_CAPITULO",
    plano: calculo.plano,
    resolucoes: { "treino-a": "remover", "introducao-a": "materializar", "analise-b": "materializar" },
  }, positions));
  const depois = historico.presente;

  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula, "voltam o capítulo, a análise, o treino, o quadro e a filha, juntos");
  historico = refazer(historico);
  assert.deepEqual(historico.presente, depois);
});
