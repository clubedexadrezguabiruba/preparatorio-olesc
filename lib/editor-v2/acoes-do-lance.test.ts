/**
 * As ações que nascem de um lance selecionado — §8.3 (as três contextuais) e
 * §11.3 (o menu do botão direito e do `•••`).
 *
 * A prova que interessa aqui é a diferença entre as três: uma **aponta**, outra
 * **referencia a posição**, a terceira **materializa**. Se as três fizessem a
 * mesma coisa, os testes abaixo continuariam passando um a um — por isso cada um
 * confere justamente o que distingue a sua da vizinha.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Position } from "../lesson/schema.ts";
import {
  acoesDoLance,
  aplicarComecarDaqui,
  aplicarCorte,
  aplicarDuplicarIndependente,
  aplicarMostrarVariante,
  calcularCorte,
  orientacaoDaFen,
  prepararComecarDaqui,
  prepararDuplicarIndependente,
  prepararMostrarVariante,
} from "./acoes-do-lance.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2, type AulaV2 } from "./modelo.ts";

const positions: Record<string, Position> = {};
const FEN = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";

/**
 * ```
 * raiz
 *  ├─ a1  e2e4   (principal)
 *  │   ├─ a2  e8e7   (principal)
 *  │   │   └─ a4  e4e5
 *  │   └─ a3  e8d7   (variante irmã de a2)
 *  └─ a5  e1d2   (variante irmã de a1)
 * ```
 */
function aulaDeEnsaio(): AulaV2 {
  return {
    schemaVersion: 2,
    id: "EX-LANCE",
    titulo: "Ensaio das ações do lance",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [],
    excecoes: [],
    analises: [{
      id: "analise-a",
      inicio: { tipo: "fen", fen: FEN },
      origemPgn: { tags: { Event: "Estudo do Doug" }, naoReconhecidos: [] },
      raizId: "no-a-0",
      nos: {
        "no-a-0": { id: "no-a-0", filhos: ["no-a-1", "no-a-5"] },
        "no-a-1": { id: "no-a-1", uci: "e2e4", filhos: ["no-a-2", "no-a-3"], comentario: "O avanço duplo." },
        "no-a-2": { id: "no-a-2", uci: "e8e7", filhos: ["no-a-4"] },
        "no-a-3": { id: "no-a-3", uci: "e8d7", filhos: [], desenhos: { highlights: [{ casa: "d7", cor: "vermelho" }] } },
        "no-a-4": { id: "no-a-4", uci: "e4e5", filhos: [], comentario: "E segue." },
        "no-a-5": { id: "no-a-5", uci: "e1d2", filhos: [] },
      },
    }],
    introducoes: [],
    capitulos: [{
      id: "capitulo-a",
      titulo: "O peão anda",
      analiseId: "analise-a",
      inicioNodeId: "no-a-0",
      caminho: ["no-a-1", "no-a-2", "no-a-4"],
      orientacao: "white",
      narracoes: [
        { id: "narracao-1", nodeId: "no-a-1", texto: "Duas casas.", pausa: "temporizada" },
        { id: "narracao-4", nodeId: "no-a-4", texto: "E mais uma.", pausa: "temporizada" },
      ],
    }],
    treinos: [],
    praticas: [],
    fluxo: [{ id: "etapa-a", tipo: "capitulo", entidadeId: "capitulo-a" }],
  };
}

const pedido = (nodeId: string, nome: string) => ({
  analiseId: "analise-a",
  nodeId,
  nome,
  orientacao: "white" as const,
  depoisDoCapituloId: "capitulo-a",
});

/* ------------------------------------------------------------------ *
 * 1. Mostrar esta variante na aula
 * ------------------------------------------------------------------ */

test("mostrar a variante cria capítulo que aponta para o percurso, sem copiar lance nenhum", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararMostrarVariante(aula, pedido("no-a-3", "A resposta com Rd7"));
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  assert.equal(preparo.novo.analiseId, "analise-a", "a análise é a que já existe");
  assert.deepEqual(preparo.novo.caminho, ["no-a-1", "no-a-3"]);

  const resultado = aplicarMostrarVariante(aula, preparo.novo);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  assert.equal(resultado.aula.analises.length, 1, "nenhuma análise nova: o percurso é o mesmo material");
  assert.equal(Object.keys(resultado.aula.analises[0].nos).length, 6, "nenhum lance copiado");
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true);
});

test("promover outra variante a principal depois não muda o percurso escolhido", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararMostrarVariante(aula, pedido("no-a-3", "A resposta com Rd7"));
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;
  const comCapitulo = executarComando(aula, { tipo: "MOSTRAR_VARIANTE", novo: preparo.novo }, positions);

  const depois = executarComando(comCapitulo, { tipo: "PROMOVER_VARIANTE", analiseId: "analise-a", parentId: "no-a-1", nodeId: "no-a-3" }, positions);
  const capitulo = depois.capitulos.find((c) => c.id === preparo.novo.capituloId)!;
  assert.deepEqual(capitulo.caminho, ["no-a-1", "no-a-3"], "o percurso é uma lista de ids, e não «a linha principal de agora»");
  assert.deepEqual(depois.analises[0].nos["no-a-1"].filhos, ["no-a-3", "no-a-2"], "a ordem dos irmãos mudou, e os ids não");
});

test("a posição inicial não é uma variante para mostrar", () => {
  const preparo = prepararMostrarVariante(aulaDeEnsaio(), pedido("no-a-0", "Qualquer nome"));
  assert.equal(preparo.ok, false);
  if (preparo.ok) return;
  assert.equal(preparo.campo, "lance");
});

test("nome vazio é recusado apontando o campo, e não apaga o resto do formulário", () => {
  const preparo = prepararMostrarVariante(aulaDeEnsaio(), pedido("no-a-3", "   "));
  assert.equal(preparo.ok, false);
  if (preparo.ok) return;
  assert.equal(preparo.campo, "nome");
});

/* ------------------------------------------------------------------ *
 * 2. Começar desta posição
 * ------------------------------------------------------------------ */

test("começar desta posição cria análise nova que referencia a posição, com continuação vazia", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararComecarDaqui(aula, pedido("no-a-2", "Daqui em diante"));
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  const resultado = aplicarComecarDaqui(aula, preparo.novo);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  const nova = resultado.aula.analises.find((a) => a.id === preparo.novo.analiseId)!;
  assert.deepEqual(nova.inicio, { tipo: "referencia", origem: { analiseId: "analise-a", nodeId: "no-a-2" } });
  assert.deepEqual(Object.keys(nova.nos), [preparo.novo.raizId], "a dependência é da posição inicial, não da linha inteira da origem");
  assert.deepEqual(nova.nos[preparo.novo.raizId].filhos, []);

  assert.deepEqual(
    resultado.aula.fluxo.map((e) => e.entidadeId),
    ["capitulo-a", preparo.novo.capituloId],
    "a etapa entra depois do capítulo atual",
  );
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true);
});

/* ------------------------------------------------------------------ *
 * 3. Duplicar como independente
 * ------------------------------------------------------------------ */

test("duplicar como independente materializa a FEN, copia a subárvore e larga o lance de entrada", () => {
  const aula = aulaDeEnsaio();
  const preparo = prepararDuplicarIndependente(
    aula,
    { ...pedido("no-a-1", "O peão em e4"), narracoesDoCapituloId: "capitulo-a" },
    positions,
  );
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  assert.equal(preparo.novo.fen, "4k3/8/8/8/4P3/8/8/4K3 b - - 0 1");
  assert.deepEqual(Object.keys(preparo.novo.nos).sort(), ["no-a-1", "no-a-2", "no-a-3", "no-a-4"], "a subárvore a partir do lance, e só ela");

  const resultado = aplicarDuplicarIndependente(aula, preparo.novo);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  const copia = resultado.aula.analises.find((a) => a.id === preparo.novo.analiseId)!;
  const raiz = copia.nos[copia.raizId];
  assert.equal(raiz.uci, undefined, "o lance de entrada virou o chão: a raiz não carrega lance");
  assert.equal(raiz.comentario, "O avanço duplo.", "o comentário é da posição, e a posição é a mesma");
  assert.deepEqual(copia.inicio, { tipo: "fen", fen: "4k3/8/8/8/4P3/8/8/4K3 b - - 0 1" });
  assert.deepEqual(copia.origemPgn?.tags, { Event: "Estudo do Doug" }, "atribuição conservada");
  assert.deepEqual(
    copia.nos[preparo.novo.nos["no-a-3"]].desenhos,
    { highlights: [{ casa: "d7", cor: "vermelho" }] },
  );

  const capitulo = resultado.aula.capitulos.find((c) => c.id === preparo.novo.capituloId)!;
  assert.deepEqual(capitulo.caminho, [preparo.novo.nos["no-a-2"], preparo.novo.nos["no-a-4"]], "o percurso da cópia é a linha principal dela");
  assert.deepEqual(
    capitulo.narracoes.map((n) => [n.nodeId, n.texto]),
    [[preparo.novo.nos["no-a-1"], "Duas casas."], [preparo.novo.nos["no-a-4"], "E mais uma."]],
    "as narrações dos nós copiados vêm junto, com ids novos",
  );
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true);

  // A prova de que a cópia é mesmo independente: mexer no original não a alcança.
  const comOriginalMudado = executarComando(resultado.aula, { tipo: "EDITAR_COMENTARIO", analiseId: "analise-a", nodeId: "no-a-1", comentario: "Outra coisa." }, positions);
  assert.equal(comOriginalMudado.analises.find((a) => a.id === copia.id)!.nos[copia.raizId].comentario, "O avanço duplo.");
});

/* ------------------------------------------------------------------ *
 * Excluir a partir daqui, e substituir continuação
 * ------------------------------------------------------------------ */

test("excluir a partir daqui leva o lance e a continuação dele; substituir deixa o lance", () => {
  const aula = aulaDeEnsaio();

  const exclusao = calcularCorte(aula, { analiseId: "analise-a", nodeId: "no-a-2", tipo: "excluir-daqui", lance: "1… Re7" }, positions);
  assert.equal(exclusao.ok, true);
  if (!exclusao.ok) return;
  assert.deepEqual(exclusao.plano.impacto.nosRemovidos.sort(), ["no-a-2", "no-a-4"]);

  const substituicao = calcularCorte(aula, { analiseId: "analise-a", nodeId: "no-a-2", tipo: "substituir-continuacao", lance: "1… Re7" }, positions);
  assert.equal(substituicao.ok, true);
  if (!substituicao.ok) return;
  assert.deepEqual(substituicao.plano.impacto.nosRemovidos, ["no-a-4"], "o lance fica; o que vinha depois dele sai");
});

test("o corte conta comentários e narrações perdidos, e corta o percurso do capítulo", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularCorte(aula, { analiseId: "analise-a", nodeId: "no-a-2", tipo: "excluir-daqui", lance: "1… Re7" }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;
  assert.equal(calculo.plano.impacto.comentariosRemovidos, 1);
  assert.deepEqual(calculo.plano.impacto.narracoesRemovidas.map((n) => n.texto), ["E mais uma."]);
  assert.deepEqual(calculo.plano.impacto.capitulosAfetados, [{ id: "capitulo-a", titulo: "O peão anda", percursoCortado: true, inicioReiniciado: false }]);

  const resultado = aplicarCorte(aula, calculo.plano);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) return;

  const capitulo = resultado.aula.capitulos[0];
  assert.deepEqual(capitulo.caminho, ["no-a-1"], "o percurso para no lance anterior ao que caiu");
  assert.deepEqual(capitulo.narracoes.map((n) => n.id), ["narracao-1"]);
  assert.deepEqual(resultado.aula.analises[0].nos["no-a-1"].filhos, ["no-a-3"], "o irmão continua lá");
  assert.equal(validarAulaV2(resultado.aula, positions).ok, true);
});

test("a posição inicial não pode ser excluída, e a recusa diz o que fazer em vez disso", () => {
  const calculo = calcularCorte(aulaDeEnsaio(), { analiseId: "analise-a", nodeId: "no-a-0", tipo: "excluir-daqui" }, positions);
  assert.equal(calculo.ok, false);
  if (calculo.ok) return;
  assert.match(calculo.mensagem, /Trocar a posição inicial/);
});

test("o corte bloqueia quando alguém de fora depende do que ia sumir, e nomeia quem é", () => {
  const aula = aulaDeEnsaio();
  aula.analises.push({
    id: "analise-b",
    inicio: { tipo: "referencia", origem: { analiseId: "analise-a", nodeId: "no-a-4" } },
    raizId: "no-b-0",
    nos: { "no-b-0": { id: "no-b-0", filhos: [] } },
  });
  aula.capitulos.push({ id: "capitulo-b", titulo: "Daqui em diante", analiseId: "analise-b", inicioNodeId: "no-b-0", caminho: [], orientacao: "white", narracoes: [] });
  aula.fluxo.push({ id: "etapa-b", tipo: "capitulo", entidadeId: "capitulo-b" });

  const calculo = calcularCorte(aula, { analiseId: "analise-a", nodeId: "no-a-2", tipo: "excluir-daqui", lance: "1… Re7" }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;
  assert.deepEqual(calculo.plano.impacto.dependentes.map((d) => [d.tipo, d.nome, d.motivo]), [["analise", "Daqui em diante", "começa num lance que esta exclusão apaga"]]);

  const semEscolha = aplicarCorte(aula, calculo.plano);
  assert.equal(semEscolha.ok, false);

  const comEscolha = aplicarCorte(aula, calculo.plano, { "analise-b": "materializar" });
  assert.equal(comEscolha.ok, true, comEscolha.ok ? "" : comEscolha.mensagem);
  if (!comEscolha.ok) return;
  assert.deepEqual(comEscolha.aula.analises.find((a) => a.id === "analise-b")!.inicio, { tipo: "fen", fen: "8/4k3/8/4P3/8/8/8/4K3 b - - 0 2" }, "a posição depois de 1. e4 Re7 2. e5, guardada antes de o nó sumir");
  assert.equal(validarAulaV2(comEscolha.aula, positions).ok, true);
});

test("o corte inteiro volta com um Desfazer, e o Refazer repete o mesmo plano", () => {
  const aula = aulaDeEnsaio();
  const calculo = calcularCorte(aula, { analiseId: "analise-a", nodeId: "no-a-1", tipo: "substituir-continuacao", lance: "1. e4" }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "CORTAR", plano: calculo.plano }, positions));
  assert.deepEqual(Object.keys(historico.presente.analises[0].nos).sort(), ["no-a-0", "no-a-1", "no-a-5"]);
  const depois = historico.presente;

  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula);
  historico = refazer(historico);
  assert.deepEqual(historico.presente, depois);
});

/* ------------------------------------------------------------------ *
 * O menu
 * ------------------------------------------------------------------ */

test("o menu oferece as onze ações de §11.3, e o que não dá vem desabilitado com motivo", () => {
  const analise = aulaDeEnsaio().analises[0];
  const noLance = acoesDoLance(analise, "no-a-3");
  assert.deepEqual(noLance.map((a) => a.id), [
    "principal", "comentar", "simbolo", "variante", "mostrar-variante",
    "comecar-daqui", "duplicar-independente", "treino", "copiar-pgn",
    "substituir-continuacao", "excluir-daqui",
  ]);

  const porId = new Map(noLance.map((a) => [a.id, a]));
  assert.equal(porId.get("principal")!.disponivel, true, "no-a-3 é a variante irmã de no-a-2");
  assert.equal(porId.get("substituir-continuacao")!.disponivel, false, "no-a-3 não tem continuação");
  assert.match(porId.get("substituir-continuacao")!.motivo!, /jogue no tabuleiro/);
  assert.equal(porId.get("treino")!.disponivel, false);
  assert.match(porId.get("treino")!.motivo!, /editor de treinos/);
});

test("§16: o menu habilita criar treino quando o capítulo confirma que há trecho", () => {
  const analise = aulaDeEnsaio().analises[0];
  const porId = new Map(acoesDoLance(analise, "no-a-1", { disponivel: true }).map((acao) => [acao.id, acao]));
  assert.deepEqual(porId.get("treino"), { id: "treino", rotulo: "Criar treino daqui", disponivel: true });
});

test("na posição inicial o menu desabilita o que não é de lance, e diz por quê", () => {
  const porId = new Map(acoesDoLance(aulaDeEnsaio().analises[0], "no-a-0").map((a) => [a.id, a]));
  assert.equal(porId.get("simbolo")!.disponivel, false);
  assert.match(porId.get("simbolo")!.motivo!, /não é um lance/);
  assert.equal(porId.get("excluir-daqui")!.disponivel, false);
  assert.match(porId.get("excluir-daqui")!.motivo!, /Trocar a posição inicial/);
  assert.equal(porId.get("mostrar-variante")!.disponivel, false);
  assert.equal(porId.get("comecar-daqui")!.disponivel, true, "começar da posição inicial é legítimo");
});

test("o lance que já é a linha principal não oferece «tornar linha principal»", () => {
  const porId = new Map(acoesDoLance(aulaDeEnsaio().analises[0], "no-a-1").map((a) => [a.id, a]));
  assert.equal(porId.get("principal")!.disponivel, false);
  assert.match(porId.get("principal")!.motivo!, /já é a linha principal/);
});

test("a orientação do capítulo novo é a do lado que joga naquela posição", () => {
  assert.equal(orientacaoDaFen("4k3/8/8/8/4P3/8/8/4K3 b - - 0 1"), "black");
  assert.equal(orientacaoDaFen(FEN), "white");
  assert.equal(orientacaoDaFen("isto não é uma FEN"), "white", "sem posição legível, o padrão não inventa lado");
});
