import assert from "node:assert/strict";
import test from "node:test";
import { todasAsPaginas } from "./paginar.ts";

/** Um banco de mentira que se comporta como a API: nunca devolve mais de 1.000 linhas. */
function banco(total: number) {
  const linhas = Array.from({ length: total }, (_, i) => i);
  let consultas = 0;
  const pagina = async (de: number, ate: number) => {
    consultas++;
    return { data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null };
  };
  return { pagina, consultas: () => consultas };
}

test("1.005 linhas voltam 1.005, e não as 1.000 de uma consulta só", async () => {
  const b = banco(1005);
  const lidas = await todasAsPaginas(b.pagina);
  assert.equal(lidas.length, 1005);
  assert.deepEqual(lidas.slice(-2), [1003, 1004], "as mais novas, que eram as que sumiam");
  assert.equal(b.consultas(), 2);
});

test("múltiplo exato de 1.000: uma consulta a mais, vazia, e para", async () => {
  const b = banco(2000);
  assert.equal((await todasAsPaginas(b.pagina)).length, 2000);
  assert.equal(b.consultas(), 3);
});

test("zero linhas e poucas linhas: uma consulta só", async () => {
  assert.deepEqual(await todasAsPaginas(banco(0).pagina), []);
  const b = banco(12);
  assert.equal((await todasAsPaginas(b.pagina)).length, 12);
  assert.equal(b.consultas(), 1);
});

test("erro da API vira erro, e não lista pela metade", async () => {
  await assert.rejects(
    todasAsPaginas(async () => ({ data: null, error: { message: "permission denied" } })),
    /permission denied/,
  );
});
