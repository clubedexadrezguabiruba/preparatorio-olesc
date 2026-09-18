/**
 * A trava da regra do Doug de 18/9/2026 (`AGENTS.md`, "Duas opções ficam no mesmo capítulo, e a fita
 * volta"): as 11 aulas de finais, montadas **em memória** a partir de `content/finais/estudos-aula/`
 * — sem banco, sem acervo e sem publicar —, não podem ter etapa "Comparação:" no menu, e cada variante
 * tocada na hora tem de voltar exatamente à posição da escolha.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { montarQuadros } from "../lesson/roteiro.ts";
import { mapaDaAnalise } from "./arvore.ts";
import { executarComando } from "./comandos.ts";
import { lerEstudo, planejarEstudo } from "./importar-estudo.ts";
import type { AulaV2, RevisaoDaFenV2 } from "./modelo.ts";
import { percursoDoCapitulo, previaDaAula } from "./previa.ts";

const PASTA = "content/finais/estudos-aula";
const revisao: RevisaoDaFenV2 = { origem: "estudo-lichess", autor: "clubexadrezguabiruba", obra: "finais", fenRevisada: "x", revisadoEm: "2026-09-18T12:00:00.000Z", professor: "Doug", mostrarCredito: false, direitoDosTextos: true };

function montar(id: string): AulaV2 {
  const leitura = lerEstudo(readFileSync(`${PASTA}/${id}.pgn`, "utf8"));
  const vazia: AulaV2 = {
    schemaVersion: 2, id, titulo: id,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };
  const plano = planejarEstudo(vazia, leitura, { destinos: {}, revisao }, {});
  assert.ok(plano.ok, `${id}: ${!plano.ok ? plano.mensagem : ""}`);
  return executarComando(vazia, { tipo: "IMPORTAR_ESTUDO", plano: plano.plano }, {});
}

const AULAS = readdirSync(PASTA).filter((nome) => nome.endsWith(".pgn")).map((nome) => nome.replace(/\.pgn$/, "")).sort();

test("as 11 aulas de finais: nenhuma etapa «Comparação:», e cada variante marcada continua no cadastro", () => {
  assert.equal(AULAS.length, 11);
  const contagem: string[] = [];
  let variantes = 0;
  for (const id of AULAS) {
    const aula = montar(id);
    const titulo = (etapa: AulaV2["fluxo"][number]) => aula.capitulos.find((c) => c.id === etapa.entidadeId)?.titulo ?? "";
    const comparacoes = aula.fluxo.filter((etapa) => etapa.tipo === "capitulo" && titulo(etapa).startsWith("Comparação:"));
    assert.deepEqual(comparacoes.map(titulo), [], `${id}: o menu "Etapas" não pode ter item de comparação`);
    const tocadas = aula.fluxo.flatMap((etapa) => etapa.comparacoes ?? []);
    const doCadastro = aula.capitulos.filter((c) => c.titulo.startsWith("Comparação:")).map((c) => c.id);
    assert.deepEqual([...tocadas].sort(), [...doCadastro].sort(), `${id}: toda variante do cadastro é tocada por uma etapa, e só uma vez`);
    variantes += doCadastro.length;
    contagem.push(`${id} ${doCadastro.length}`);
  }
  console.log(`variantes tocadas na hora: ${variantes} (${contagem.join(", ")})`);
});

test("as 11 aulas de finais: toda volta da fita termina na posição exata da escolha, um lance por passo", () => {
  let voltas = 0;
  let recuos = 0;
  let lancesDasVariantes = 0;
  for (const id of AULAS) {
    const aula = montar(id);
    for (const etapa of aula.fluxo) {
      if (!etapa.comparacoes?.length) continue;
      const capitulo = aula.capitulos.find((c) => c.id === etapa.entidadeId)!;
      const trecho = previaDaAula(aula, {}).trechos.find((t) => t.capituloId === capitulo.id)!;
      const mapa = mapaDaAnalise(aula, capitulo.analiseId, {});
      const quadros = montarQuadros(trecho.fen, trecho.passos);
      const fen = (nodeId: string) => mapa.quadros[nodeId].fen;
      trecho.passos.forEach((passo, i) => {
        // Cada passo — de ida ou de volta — mostra a posição do nó dele.
        assert.equal(quadros[i].fen, fen(passo.nodeId), `${id} «${capitulo.titulo}», passo ${i + 1}`);
        if (passo.retorno) {
          voltas += 1;
          assert.ok(trecho.passos[i - 1]?.recuo, `${id} «${capitulo.titulo}»: o retorno ${i + 1} vem depois da fita voltar`);
        }
        if (passo.recuo) recuos += 1;
      });
      // Nada do começo comum se repete: cada nó da linha principal entra jogando uma vez só.
      const principal = percursoDoCapitulo(capitulo);
      const jogados = trecho.passos.filter((p) => p.lance && principal.includes(p.nodeId)).map((p) => p.nodeId);
      assert.equal(new Set(jogados).size, jogados.length, `${id} «${capitulo.titulo}»: um lance da linha principal foi jogado duas vezes`);
      // Todo lance fora da linha principal é de variante, e a fita tem de desfazê-lo uma vez.
      lancesDasVariantes += trecho.passos.filter((p) => p.lance && !principal.includes(p.nodeId)).length;
    }
  }
  console.log(`voltas: ${voltas}; passos de recuo: ${recuos}; lances de variante jogados: ${lancesDasVariantes}`);
  assert.ok(voltas > 0);
  assert.equal(recuos, lancesDasVariantes, "a fita volta exatamente os lances que as variantes jogaram");
});
