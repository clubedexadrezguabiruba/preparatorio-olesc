/**
 * O leitor do curso de abertura contra o estudo v1.5 real, pelos dois caminhos — §13.3.9 e a parada
 * medível da F2 do plano do curso (16/9/2026).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lerPgnsDoEstudo } from "../repertorio/pgn.ts";
import {
  categoriaDoTitulo, codigoDoCapitulo, comentarioDoRepertorio, comNomeDoCapitulo, lanceEscrito, lerComentario, lerCursoDeAbertura, lerMarcadores, secaoDoTexto,
  type LanceDoEstudo, type LeituraDoCurso,
} from "./curso-de-abertura.ts";

const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");
const LOCAL = readFileSync("e2e/fixtures/francesa-v15-pgn-local.pgn", "utf8");
const leituras: Array<[string, string, LeituraDoCurso]> = [
  ["link do Lichess", LICHESS, lerCursoDeAbertura(LICHESS, "brancas")],
  ["PGN local", LOCAL, lerCursoDeAbertura(LOCAL, "brancas")],
];
const capitulo = (leitura: LeituraDoCurso, codigo: string) => leitura.capitulos.find((c) => c.codigo === codigo)!;

for (const [caminho, texto, leitura] of leituras) {
  test(`${caminho}: 38 capítulos viram 5 aulas, cada capítulo na do seu bloco`, () => {
    assert.equal(leitura.capitulos.length, 38);
    assert.deepEqual(leitura.aulas.A.capitulos, ["00", "A00", "A01"]);
    assert.deepEqual(leitura.aulas.B.capitulos, ["B03", "B04", "B05", "B05A", "B05B", "B06", "B07", "B08", "B09"]);
    assert.deepEqual(leitura.aulas.C.capitulos, ["C10", "C11", "C12", "C13"]);
    assert.deepEqual(leitura.aulas.D.capitulos, ["D17"], "D18 e D19 não têm partida");
    assert.deepEqual(leitura.aulas.EF.capitulos, ["E20", "E21", "F23"]);
  });

  test(`${caminho}: o move trainer de cada aula é o dos capítulos que ele copia`, () => {
    assert.deepEqual(leitura.aulas.A.treinadores, ["E22A", "E22B"]);
    assert.deepEqual(leitura.aulas.B.treinadores, ["E22C", "E22D", "E22E", "E22F", "E22G", "E22H", "E22I"]);
    assert.deepEqual(leitura.aulas.C.treinadores, ["E22J", "E22K", "E22L", "E22M", "E22N", "E22O"]);
    assert.deepEqual(leitura.aulas.D.treinadores, [], "regra 18: a partida modelo não tem move trainer");
    assert.equal(leitura.aulas.EF.treinadores.length, 16, "E+F treina todas, fechando na árvore completa");
  });

  test(`${caminho}: 27 perguntas, 25 com lance a jogar`, () => {
    const soma = (aula: string, campo: "perguntas" | "paradas") =>
      leitura.capitulos.filter((c) => c.aula === aula).reduce((n, c) => n + (campo === "perguntas" ? c.perguntas : c.paradas.length), 0);
    assert.deepEqual(["A", "B", "C", "EF"].map((a) => soma(a, "perguntas")), [2, 9, 4, 12]);
    assert.deepEqual(["A", "B", "C", "EF"].map((a) => soma(a, "paradas")), [2, 8, 3, 12], "B03 e C13 não têm lance nosso depois da pergunta");
    const b05a = capitulo(leitura, "B05A");
    const [parada] = b05a.paradas;
    // `lanceEscrito` escreve na língua do aluno (Doug, 17/9/2026): o bispo não muda, o cavalo sim.
    assert.equal(lanceEscrito(b05a.percursos[parada.percurso].lances[parada.resposta]), "6.Be4");
    assert.equal(parada.texto, "Qual lance de bispo ataca a dama e fecha sua saída?");
    const b05b = capitulo(leitura, "B05B");
    assert.equal(lanceEscrito(b05b.percursos[0].lances[b05b.paradas[0].resposta]), "18.Cxa7#", "pergunta no nosso lance: a parada é o lance nosso seguinte");
  });

  test(`${caminho}: B09 aceita 5.dxc5 e 5.Cf3 como «também vale»`, () => {
    const [parada] = capitulo(leitura, "B09").paradas;
    assert.deepEqual(parada.alternativas.map(lanceEscrito), ["5.dxc5", "5.Cf3"]);
    assert.deepEqual(parada.erros, []);
  });

  test(`${caminho}: os ramos que ensinam, com o título do CASO e a ordem dos números`, () => {
    const ramos = (codigo: string) => capitulo(leitura, codigo).percursos.filter((p) => p.tipo === "ramo");
    assert.equal(ramos("B08").length, 4);
    assert.deepEqual(ramos("B08").map((r) => r.caso), [2, 3, 4, 5]);
    assert.equal(ramos("B08")[2].titulo, "Caso 4 — cavalo em f6 cedo");
    assert.equal(ramos("B09").length, 1);
    assert.equal(ramos("C12").length, 2, "o (10...a6 11.a3) sem texto não é ramo que ensina");
    assert.deepEqual(ramos("C13").map((r) => r.titulo), ["Regra 2", "Regra 3"]);
    // A spec (§13.3.9) diz 8; o PGN tem 7 variações em E20, todas comentadas — ver o diário de 16/9.
    assert.equal(ramos("E20").length, 7);
  });

  test(`${caminho}: 16 capítulos de move trainer → 19 caminhos distintos, 12 completos, com categoria`, () => {
    assert.equal(leitura.capitulos.filter((c) => c.papel === "treinador").length, 16);
    assert.equal(leitura.linhas.length, 19);
    assert.equal(leitura.linhas.filter((l) => l.completa).length, 12);
    assert.ok(leitura.linhas.every((l) => l.categoria !== null));
    assert.deepEqual(leitura.linhas.map((l) => l.ordem), leitura.linhas.map((_, i) => i + 1));
    assert.equal(leitura.linhas[0].chave, "e2e4 e7e6 d2d4 d7d5 f1d3", "E22A, só a arma, é linha própria");
  });

  test(`${caminho}: os avisos do relatório`, () => {
    const codigos = leitura.avisos.map((a) => `${a.codigo}${a.capitulo ? `@${a.capitulo}` : ""}`);
    // B03 e C13 são perguntas de reflexão (sem lance nosso para jogar): não avisam desde 17/9/2026.
    for (const esperado of ["PERGUNTA_NO_LANCE_NOSSO@B05B", "CAPITULO_VAZIO@D18", "CAPITULO_VAZIO@D19"]) {
      assert.ok(codigos.includes(esperado), `${esperado} em ${codigos.join(" ")}`);
    }
    // Os 4 lances sem comentário (1.e4, 11.Nf3, 12.Qxf3, 11.a3) não avisam: comentário é opcional (Doug, 17/9/2026).
    assert.equal(codigos.filter((c) => c.startsWith("LANCE_MUDO")).length, 0);
    assert.equal(codigos.filter((c) => c.startsWith("MARCADOR_DESCONHECIDO")).length, 4, "ARMA, ARMADILHA PRINCIPAL, ARMADILHA AVANÇADA, SE ESQUECER — um aviso por marcador");
    assert.ok(codigos.filter((c) => c.startsWith("FRASE_DE_BASTIDOR")).length >= 6, "«curso atual» ×6 e «draft antigo»");
  });

  test(`${caminho}: nenhum símbolo se perde na leitura`, () => {
    let lidos = 0;
    const andar = (lance: LanceDoEstudo): void => {
      lidos += lance.nags.length;
      lance.filhos.forEach(andar);
    };
    for (const c of leitura.capitulos) c.arvore.filhos.forEach(andar);
    const naFonte = lerPgnsDoEstudo(texto).reduce((n, partida) => {
      const contar = (lances: typeof partida.lances): number => lances.reduce((m, l) => m + l.nags.length + l.variacoes.reduce((k, v) => k + contar(v), 0), 0);
      return n + contar(partida.lances);
    }, 0);
    assert.equal(lidos, naFonte);
  });
}

test("os dois caminhos dão o mesmo curso; só o Lichess perde o comentário final de B09 e C12", () => {
  const [[, , lichess], [, , local]] = leituras;
  assert.deepEqual(lichess.linhas.map((l) => l.chave), local.linhas.map((l) => l.chave));
  for (const codigo of ["B09", "C12"]) {
    const rotulos = (l: LeituraDoCurso) => lerComentario(capitulo(l, codigo).percursos[0].lances.at(-1)!.comentario).falas.map((f) => f.rotulo ?? "");
    assert.ok(!rotulos(lichess).includes("Resumo"), `${codigo}: o export do Lichess não traz o [RESUMO] final`);
    assert.ok(rotulos(local).includes("Resumo"), `${codigo}: o arquivo local traz`);
  }
  assert.equal(capitulo(local, "D17").partidaModelo?.brancas, "Vachier-Lagrave, Maxime", "as tags Model* do arquivo local viram o cabeçalho");
  assert.equal(lichess.avisos.filter((a) => a.codigo === "ORIENTACAO_IGNORADA").length, 1);
});

test("o código vem do ChapterName ou do par White/Black, e o 00 não se perde", () => {
  assert.deepEqual(codigoDoCapitulo({ ChapterName: "00 - Conhecendo a Francesa" }), { codigo: "00", titulo: "Conhecendo a Francesa" });
  assert.deepEqual(codigoDoCapitulo({ White: "B05A", Black: "Armadilha principal" }), { codigo: "B05A", titulo: "Armadilha principal" });
  assert.equal(codigoDoCapitulo({ White: "Carlsen", Black: "Nepo" }), null);
  const [primeira] = lerPgnsDoEstudo(LOCAL);
  assert.equal(comNomeDoCapitulo(primeira).tags.ChapterName, "00 - Conhecendo a Francesa: avançar, trocar ou proteger");
});

test("marcadores: rótulos acumulados, pergunta, pausa manual e desenho fora da fala", () => {
  assert.deepEqual(lerMarcadores("[GOLPE] [PUNICAO] Sim. Primeiro o xeque."), [{ marcador: "PUNICAO", rotulos: ["GOLPE", "PUNICAO"], texto: "Sim. Primeiro o xeque." }]);
  const lido = lerComentario("Antes. [NAO FUNCIONA] [PERGUNTA] A dama saiu? [TRAIN] x [RESUMO] Guarde. [REFERENCIA] nota [%csl Ge4]");
  assert.deepEqual(lido.perguntas, ["A dama saiu?"]);
  assert.deepEqual(lido.falas, [{ texto: "Antes.", pausaManual: false }, { texto: "Guarde.", rotulo: "Resumo", pausaManual: true }]);
  assert.deepEqual(lido.referencias, ["nota"]);
  assert.deepEqual(lerComentario("[ARMADILHA PRINCIPAL] Be4.").desconhecidos, ["ARMADILHA PRINCIPAL"]);
});

test("categoria pelo rótulo do título", () => {
  assert.equal(categoriaDoTitulo("Move Trainer — Quando o golpe não funciona"), "nao-funciona");
  assert.equal(categoriaDoTitulo("Move Trainer — ...Ne5: desvio ...Be7"), "desvio");
  assert.equal(categoriaDoTitulo("Move Trainer — Linha mais difícil: ...Ne5 e ...a6"), "linha-critica");
  assert.equal(categoriaDoTitulo("Move Trainer — Árvore completa"), "arvore");
});

test("[SECAO] é a capa do capítulo: não vira fala, não é desconhecido, não vai ao repertório (feedback do aluno, 17/9/2026)", () => {
  const lido = lerComentario("[SECAO] Nossa arma: 3.Bd3 | o bispo protege e4 [OBJETIVO] Entender 3.Bd3. A ideia é simples.");
  assert.deepEqual(lido.secoes, ["Nossa arma: 3.Bd3 | o bispo protege e4"]);
  assert.deepEqual(lido.desconhecidos, []);
  assert.deepEqual(lido.falas.map((f) => f.texto), []);
  assert.deepEqual(lido.objetivos, ["Entender 3.Bd3. A ideia é simples."]);
  assert.equal(comentarioDoRepertorio("[SECAO] Capa | sub Texto do lance."), "");
  assert.equal(comentarioDoRepertorio("Texto do lance. [SECAO] Capa"), "Texto do lance.");
  assert.deepEqual(secaoDoTexto("Nossa arma: 3.Bd3 | o bispo protege e4"), { titulo: "Nossa arma: 3.Bd3", subtitulo: "o bispo protege e4" });
  assert.deepEqual(secaoDoTexto("Laboratório"), { titulo: "Laboratório" });

  const comCapa = LOCAL.replace("{[OBJETIVO] Entender a ideia da Defesa Francesa", "{[SECAO] Conheça a Francesa | a ideia principal [OBJETIVO] Entender a ideia da Defesa Francesa");
  const leitura = lerCursoDeAbertura(comCapa, "brancas");
  assert.deepEqual(capitulo(leitura, "00").secao, { titulo: "Conheça a Francesa", subtitulo: "a ideia principal" });
  assert.equal(capitulo(leitura, "A00").secao, undefined);
  assert.equal(leitura.avisos.filter((a) => /SECAO/.test(a.mensagem)).length, 0);
});
