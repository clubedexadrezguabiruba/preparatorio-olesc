/**
 * Importar o curso de abertura pela tela — F6 do plano do curso (16/9/2026): criar, reimportar com
 * cópia e diff, e aplicar o PGN gerado com o impacto à vista e o `--check` coerente.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { compilarRepertorio } from "../repertorio/compilar.ts";
import { escreverCompilado, lerFontesDoRepertorio } from "../repertorio/compilar-em-disco.ts";
import { notas } from "../repertorio/conteudo.ts";
import { compiladoCoerente } from "../repertorio/editor/aplicar.ts";
import { conferirMarcasDasFontes } from "../repertorio/marcas-das-fontes.ts";
import { aplicarRepertorioDoCurso, caminhoDoEstudoCru, diffDoCurso, gravarAulasDoCurso, prepararRepertorioDoCurso } from "./importar-curso.ts";
import { planejarCursoDeAbertura } from "./planejar-curso.ts";
import { lerDocumentoV2 } from "./rascunhos.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const OPCOES = { cor: "brancas", abertura: "francesa", nomeDaAbertura: "Francesa 3.Bd3", agora: new Date("2026-09-16T00:00:00Z") } as const;
const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");

function pastaDeTrabalho(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "importar-curso-"));
  mkdirSync(path.join(raiz, "content", "repertorio", "rascunhos"), { recursive: true });
  for (const nome of readdirSync("content/repertorio").filter((n) => n.endsWith(".pgn"))) {
    cpSync(path.join("content/repertorio", nome), path.join(raiz, "content", "repertorio", nome));
  }
  // A Francesa de antes do curso (a linha escrita à mão), fixa: desde 17/9/2026 o repositório já tem
  // o PGN gerado do estudo, e o teste precisa de um repertório em que aplicar o estudo mude algo.
  cpSync("e2e/fixtures/repertorio-brancas-francesa-escrita-a-mao.pgn", path.join(raiz, "content", "repertorio", "brancas-francesa.pgn"));
  const compilacao = compilarRepertorio(lerFontesDoRepertorio(path.join(raiz, "content", "repertorio")), notas());
  assert.deepEqual(compilacao.problemas, []);
  escreverCompilado(path.join(raiz, "public", "repertorio"), compilacao.saida);
  return raiz;
}

test("criar: as 5 aulas nascem como rascunho; importar de novo o mesmo estudo não muda nada", () => {
  const raiz = pastaDeTrabalho();
  try {
    const curso = planejarCursoDeAbertura(LICHESS, OPCOES);
    assert.deepEqual(diffDoCurso(curso, raiz).map((d) => d.situacao), ["nova", "nova", "nova", "nova", "nova"]);
    const gravacao = gravarAulasDoCurso(curso, raiz, ligada);
    assert.ok(gravacao.every((g) => g.ok), JSON.stringify(gravacao));
    assert.equal(lerDocumentoV2("AB-BRANCAS-FRANCESA-B", raiz)?.aula.capitulos.length, curso.aulas[1].aula.capitulos.length);
    assert.deepEqual(diffDoCurso(curso, raiz).map((d) => d.situacao), ["igual", "igual", "igual", "igual", "igual"]);
    assert.ok(gravarAulasDoCurso(curso, raiz, ligada).every((g) => g.situacao === "igual" && !g.copia));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("reimportar um estudo mudado: diff «muda», cópia de segurança antes, e o rascunho novo no lugar", () => {
  const raiz = pastaDeTrabalho();
  try {
    gravarAulasDoCurso(planejarCursoDeAbertura(LICHESS, OPCOES), raiz, ligada);
    const mudado = planejarCursoDeAbertura(LICHESS.replace("Qual lance de bispo ataca a dama e fecha sua saída?", "Qual lance de bispo prende a dama?"), OPCOES);
    const diff = diffDoCurso(mudado, raiz);
    // Só a B: desde 18/9/2026 o treino guiado da E+F não copia comentário do estudo (Doug: sem
    // comentários no treino guiado), e a pergunta da B05A deixou de ser a fala de uma defesa lá.
    assert.deepEqual(diff.map((d) => d.situacao), ["igual", "muda", "igual", "igual", "igual"]);
    const gravacao = gravarAulasDoCurso(mudado, raiz, ligada);
    const b = gravacao.find((g) => g.id === "AB-BRANCAS-FRANCESA-B")!;
    assert.ok(b.ok && b.copia && existsSync(b.copia), "a cópia de segurança existe");
    assert.match(readFileSync(b.copia!, "utf8"), /fecha sua saída/, "a cópia é do rascunho antigo");
    assert.ok(lerDocumentoV2("AB-BRANCAS-FRANCESA-B", raiz)?.texto.includes("prende a dama"));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("o PGN do repertório: do estudo como está (com lances sem comentário), aplica, mostra o que morre e fica coerente", () => {
  const raiz = pastaDeTrabalho();
  try {
    const texto = LICHESS;
    const curso = planejarCursoDeAbertura(texto, OPCOES);
    const preparo = prepararRepertorioDoCurso(curso, "francesa", raiz);
    assert.ok(preparo.ok, JSON.stringify(preparo));
    assert.equal(preparo.impacto.nascem.length, 19);
    assert.deepEqual(preparo.idsQueMorrem, ["brancas-francesa-05eae3b2"], "a linha escrita à mão da Francesa morre, e a tela diz");

    const aplicado = aplicarRepertorioDoCurso(curso, texto, "francesa", preparo.impactoHash, raiz, ligada);
    assert.ok(aplicado.ok, JSON.stringify(aplicado));
    assert.deepEqual(compiladoCoerente(raiz), [], "--check: fonte e compilado coerentes");
    const indice = JSON.parse(readFileSync(path.join(raiz, "public", "repertorio", "index.json"), "utf8")) as Array<{ abertura: string; ids: string[] }>;
    const francesa = indice.find((e) => e.abertura === "francesa")!;
    for (const aula of curso.aulas) for (const id of aula.aula.treinadores?.[0]?.linhaIds ?? []) assert.ok(francesa.ids.includes(id));

    // O estudo cru vira o rascunho da fonte, e a trava dos símbolos passa contra o PGN gerado.
    const estudoCru = caminhoDoEstudoCru(raiz, curso, "francesa");
    assert.ok(existsSync(estudoCru));
    const ler = (pasta: string) => readdirSync(pasta).filter((n) => n.endsWith(".pgn")).map((nome) => ({ nome, texto: readFileSync(path.join(pasta, nome), "utf8") }));
    const conferencia = conferirMarcasDasFontes(ler(path.dirname(estudoCru)), ler(path.join(raiz, "content", "repertorio")));
    assert.deepEqual(conferencia.faltando, []);
    assert.deepEqual(conferencia.irmaoNossoCortado, []);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
