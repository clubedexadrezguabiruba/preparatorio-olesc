import assert from "node:assert/strict";
import test from "node:test";
import { fimDoTreinador } from "./fim-do-treinador.ts";

/**
 * O botão do fim do move trainer da aula — defeito medido em 18/9/2026, na aula A da Francesa:
 * quando o move trainer é a última etapa, "Terminar o move trainer" marcava a etapa e não levava a
 * lugar nenhum. Dois cliques, mesma URL, mesmo botão; a saída era um link cinza de 16 px no canto.
 */

test("com etapa seguinte, o botão leva a ela, com o rótulo dela", () => {
  assert.deepEqual(fimDoTreinador({ proxima: "Continuar", feita: false }), { acao: "etapa", rotulo: "Continuar" });
  assert.deepEqual(fimDoTreinador({ proxima: "Continuar", feita: true }), { acao: "etapa", rotulo: "Continuar" });
});

test("última etapa, ainda não feita: o clique conclui a aula (e a comemoração acontece aqui)", () => {
  assert.deepEqual(fimDoTreinador({ proxima: null, feita: false }), { acao: "concluir", rotulo: "Terminar a aula" });
});

test("última etapa, já feita: o botão tem saída — era aqui que ele não levava a lugar nenhum", () => {
  assert.deepEqual(fimDoTreinador({ proxima: null, feita: true }), { acao: "sair", rotulo: "Voltar às aulas" });
});
