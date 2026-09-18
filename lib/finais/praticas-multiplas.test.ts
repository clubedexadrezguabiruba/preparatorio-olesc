import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function aulaAtiva(id: string) {
  const ativa = JSON.parse(readFileSync(`content/aulas-v2/${id}/ativa.json`, "utf8")) as { publicationId: string };
  return JSON.parse(readFileSync(`content/aulas-v2/${id}/publicacoes/${ativa.publicationId}.json`, "utf8")) as {
    aula: { fluxo: Array<{ tipo: string }> };
  };
}

test("Afogamento e Mate da escada chegam à última prática", () => {
  for (const id of ["N0-STALEMATE", "N0-LADDER"]) {
    const fluxo = aulaAtiva(id).aula.fluxo;
    assert.ok(fluxo.filter((etapa) => etapa.tipo === "pratica").length >= 2, `${id} tem práticas consecutivas`);
    assert.equal(fluxo.at(-1)?.tipo, "pratica", `${id} termina numa prática que conclui a aula`);
  }

  const player = readFileSync("components/lesson/LessonPlayer.tsx", "utf8");
  assert.match(player, /<PracticeStage[\s\S]*?onFinish=\{proxima \? \(\) => goToStage\(proxima\.id\) : undefined\}[\s\S]*?saida=\{saida\}[\s\S]*?\/>/, "a prática intermediária avança depois da vitória e a última mantém a saída");
});
