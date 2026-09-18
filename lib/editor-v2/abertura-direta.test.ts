/**
 * A trava da regra do Doug de 18/9/2026 (`AGENTS.md`, "Aula de abertura é direta"), para **todo**
 * curso de abertura — os que estão no ar e os que vierem. Ela lê cada estudo de
 * `content/repertorio/rascunhos/estudo-<cor>-<abertura>.pgn` (curso novo entra sozinho, pelo nome do
 * arquivo), monta as aulas em memória e confere; e confere também o que está **publicado** em
 * `content/aulas-v2/AB-*`, que é o que o aluno abre.
 *
 * - sem mapa, sem "Encontre o lance", sem etapa "— depois de", "— se", "— resumo" ou "Caso N";
 * - nenhuma etapa aponta para pergunta (`papel: "parada"`) nem para ramo: os dois ficam dentro da
 *   etapa do capítulo, cada um numa etapa só;
 * - o passo da pergunta é seguido do lance-resposta, e a volta da fita cai na posição da escolha;
 * - todo capítulo chamado "Golpe" ou "Armadilha" tem medida de +2 ou mais registrada em
 *   `content/repertorio/medidas-dos-golpes.json` (Stockfish 18, profundidade 22, no fim da linha
 *   principal). Abaixo disso, o nome é "Imprecisão".
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { AulaV2 } from "./modelo.ts";
import { planejarCursoDeAbertura } from "./planejar-curso.ts";
import { previaDaAula } from "./previa.ts";

const RASCUNHOS = "content/repertorio/rascunhos";
const PUBLICADAS = "content/aulas-v2";
const MEDIDAS = "content/repertorio/medidas-dos-golpes.json";

const ESTUDOS = readdirSync(RASCUNHOS)
  .map((nome) => /^estudo-(brancas|pretas)-([a-z0-9-]+)\.pgn$/.exec(nome))
  .filter((achado): achado is RegExpExecArray => achado !== null)
  .map((achado) => ({ arquivo: achado[0], cor: achado[1] as "brancas" | "pretas", abertura: achado[2] }));

const planejadas: Array<{ estudo: string; aula: AulaV2 }> = ESTUDOS.flatMap((e) =>
  planejarCursoDeAbertura(readFileSync(path.join(RASCUNHOS, e.arquivo), "utf8"), { cor: e.cor, abertura: e.abertura, nomeDaAbertura: e.abertura, agora: new Date("2026-09-18T00:00:00Z") })
    .aulas.map(({ aula }) => ({ estudo: e.arquivo, aula })));

function publicadas(): Array<{ estudo: string; aula: AulaV2 }> {
  if (!existsSync(PUBLICADAS)) return [];
  return readdirSync(PUBLICADAS).filter((id) => id.startsWith("AB-")).flatMap((id) => {
    const ativa = path.join(PUBLICADAS, id, "ativa.json");
    if (!existsSync(ativa)) return [];
    const { publicationId } = JSON.parse(readFileSync(ativa, "utf8")) as { publicationId: string };
    const pacote = JSON.parse(readFileSync(path.join(PUBLICADAS, id, "publicacoes", `${publicationId}.json`), "utf8")) as { aula: AulaV2 };
    return [{ estudo: `publicada ${publicationId}`, aula: pacote.aula }];
  });
}

const TITULO_PROIBIDO = / — (depois de |se |resumo)|^Caso \d|Encontre o lance|^(As respostas das|Três respostas)/i;
const tituloDaEtapa = (aula: AulaV2, etapa: AulaV2["fluxo"][number]) =>
  aula.capitulos.find((c) => c.id === etapa.entidadeId)?.titulo
  ?? aula.introducoes.find((i) => i.id === etapa.entidadeId)?.titulo
  ?? aula.treinos.find((t) => t.id === etapa.entidadeId)?.titulo
  ?? "";

function conferirAula(origem: string, aula: AulaV2) {
  const onde = `${aula.id} (${origem})`;
  for (const etapa of aula.fluxo) {
    assert.doesNotMatch(tituloDaEtapa(aula, etapa), TITULO_PROIBIDO, `${onde}: o menu "Etapas" não tem mapa, trecho nem "Encontre o lance"`);
    assert.ok(!(etapa.tipo === "treino" && aula.treinos.find((t) => t.id === etapa.entidadeId)?.papel === "parada"), `${onde}: a pergunta ${etapa.entidadeId} é etapa própria`);
    assert.doesNotMatch(etapa.entidadeId, /-ramo-/, `${onde}: o ramo ${etapa.entidadeId} é etapa própria`);
  }
  // Cada pergunta e cada ramo aparece em exatamente uma etapa.
  const paradas = aula.fluxo.flatMap((e) => e.paradas ?? []);
  assert.equal(new Set(paradas).size, paradas.length, `${onde}: pergunta repetida entre etapas`);
  assert.deepEqual([...paradas].sort(), aula.treinos.filter((t) => t.papel === "parada").map((t) => t.id).sort(), `${onde}: toda pergunta está numa etapa`);
  const ramos = aula.fluxo.flatMap((e) => e.comparacoes ?? []);
  assert.equal(new Set(ramos).size, ramos.length, `${onde}: ramo repetido entre etapas`);
  for (const capitulo of aula.capitulos.filter((c) => /-ramo-/.test(c.id))) assert.ok(ramos.includes(capitulo.id), `${onde}: o ramo ${capitulo.id} não é tocado`);

  for (const trecho of previaDaAula(aula, {}).trechos) {
    trecho.passos.forEach((passo, i) => {
      if (passo.parada) {
        const treino = aula.treinos.find((t) => t.id === passo.parada)!;
        const certa = treino.questoes[0].respostas.find((r) => r.julgamento === "correta")!.moves[0];
        assert.equal(trecho.passos[i + 1]?.lance, certa, `${onde}: a pergunta ${treino.id} não é seguida do lance-resposta`);
      }
      if (passo.retorno) {
        const antes = trecho.passos[i - 1];
        if (antes?.recuo) assert.equal(antes.nodeId, passo.nodeId, `${onde}: a fita não voltou à posição da escolha («${passo.fala}»)`);
        const analise = aula.analises.find((a) => a.nos[passo.nodeId])!;
        assert.ok(analise.nos[passo.nodeId].filhos.includes(trecho.passos[i + 1]?.nodeId ?? ""), `${onde}: depois de «${passo.fala}» a linha não sai do ponto de escolha`);
      }
    });
  }
}

test("todo estudo de curso de abertura monta aulas diretas (Doug, 18/9/2026)", () => {
  assert.ok(ESTUDOS.length >= 3, "os três cursos no ar: Escocesa, Francesa e Siciliana");
  for (const { estudo, aula } of planejadas) conferirAula(estudo, aula);
});

test("toda aula de abertura publicada é direta — o que o aluno abre (Doug, 18/9/2026)", () => {
  const lista = publicadas();
  assert.ok(lista.length >= 15, `as 15 aulas AB- publicadas; achei ${lista.length}`);
  for (const { estudo, aula } of lista) conferirAula(estudo, aula);
});

test("Golpe e Armadilha só com +2 ou mais medidos no Stockfish; abaixo disso, Imprecisão (Doug, 18/9/2026)", () => {
  const medidas = JSON.parse(readFileSync(MEDIDAS, "utf8")) as { capitulos: Array<{ estudo: string; titulo: string; nota: string; valor: number }> };
  const doEstudo = (estudo: string, titulo: string) => medidas.capitulos.find((m) => m.estudo === estudo && m.titulo === titulo);
  let golpes = 0;
  for (const { estudo, aula } of planejadas) {
    for (const etapa of aula.fluxo) {
      const titulo = aula.capitulos.find((c) => c.id === etapa.entidadeId)?.titulo ?? "";
      if (!/^(Golpe|Armadilha)\b/i.test(titulo)) continue;
      golpes += 1;
      const medida = doEstudo(estudo, titulo);
      assert.ok(medida, `${estudo}: «${titulo}» não tem medida registrada em ${MEDIDAS}`);
      assert.ok(medida.valor >= 2, `${estudo}: «${titulo}» mede ${medida.nota}; abaixo de +2 o nome é "Imprecisão"`);
    }
  }
  assert.ok(golpes > 0);
});
