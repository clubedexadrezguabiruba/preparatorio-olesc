import assert from "node:assert/strict";
import test from "node:test";
import { criarDespachante } from "./registro.ts";
import { focoEmControle } from "./foco.ts";

const elemento = (dentroDeBotao: boolean) => ({ closest: (seletor: string) => (dentroDeBotao && seletor.includes("button") ? {} : null) });

test("Espaço no capítulo: com o foco no botão quem age é o navegador, sem clique duplo (17/9/2026)", () => {
  const despachante = criarDespachante();
  let continuou = 0;
  // A ação do capítulo, com a guarda: devolver false deixa o Espaço para o botão.
  let foco: ReturnType<typeof elemento> | null = null;
  despachante.registrar("aluno-continuar", () => {
    if (focoEmControle(foco)) return false;
    continuou += 1;
  });
  let impedido = 0;
  const espaco = () => despachante.despachar({ key: " ", preventDefault: () => { impedido += 1; } });

  assert.equal(espaco(), "aluno-continuar");
  assert.equal(continuou, 1);
  assert.equal(impedido, 1, "sem foco em controle, o atalho age e segura a rolagem da página");

  foco = elemento(true);
  assert.equal(espaco(), null, "com o botão focado, o atalho não age");
  assert.equal(continuou, 1);
  assert.equal(impedido, 1, "e não impede o clique nativo do botão");

  foco = elemento(false);
  espaco();
  assert.equal(continuou, 2);
  assert.equal(focoEmControle(null), false);
});
