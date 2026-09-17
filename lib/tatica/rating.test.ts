import assert from "node:assert/strict";
import test from "node:test";
import { formatarDelta, respostaProtegida, type RespostaDoRating } from "./rating.ts";

test("exceção no servidor vira falhaDoServidor, e não promessa rejeitada (que a tela lê como 'Sem conexão')", async () => {
  let registrada: unknown = null;
  const resposta = await respostaProtegida(
    async () => {
      throw new Error("connection terminated");
    },
    (erro) => (registrada = erro),
  );
  assert.deepEqual(resposta, { erro: "o servidor não conseguiu conferir", falhaDoServidor: true });
  assert.match(String(registrada), /connection terminated/, "e a exceção vai para o log do servidor");
});

test("resposta normal e recusa passam intactas", async () => {
  const recusa: RespostaDoRating = { erro: "este não é o problema pendente" };
  assert.deepEqual(await respostaProtegida(async () => recusa), recusa);
});

test("o delta como a tela escreve", () => {
  assert.equal(formatarDelta(8), "+8");
  assert.equal(formatarDelta(-12), "−12");
  assert.equal(formatarDelta(0), "±0");
});
