/**
 * Onde a fonte fala numa posição nossa — e o que nós dizemos ali.
 *
 * Uso:
 *   node scripts/medir-fidelidade.ts            (só a conta)
 *   node scripts/medir-fidelidade.ts --pares    (a folha, fonte e nosso lado a lado)
 *
 * ## O problema que este script mede
 *
 * Os lances do repertório vêm dos cursos; o **porquê** de cada lance também
 * vinha, e até 6/9/2026 era jogado fora na importação. Medido então: de 103
 * telas comentadas, 4 carregavam o argumento da fonte. Este script é o que
 * torna esse número conferível em vez de opinião, e o que vai dizer, no
 * Avançado, se o erro voltou.
 *
 * ## O casamento é por FEN, nunca por slug
 *
 * `fontes.json` não serve de chave: os slugs dele são por **capítulo de
 * origem** e não batem com os nossos — `peao-rei` não é `philidor`, e
 * `alapin-brancas`, `alapin-pretas`, `dragao-acelerado`, `rossolimo` e
 * `sicilianas-sidelines` caem todos no nosso `siciliana`. A chave são as
 * **4 primeiras partes da FEN** (posição, vez, roques, en passant), sem os
 * contadores de lance: assim a transposição casa de graça, que é justamente o
 * que os cursos mais fazem — metade das anotações do Grigoryan é a palavra
 * "Transposition".
 *
 * ## Os dois lados
 *
 * O nosso lado é `content/repertorio/*.pgn`, o revisado. O lado da fonte é
 * `content/repertorio/rascunhos-anotados/`, que está **fora do Git** e volta
 * com `npm run repertorio:importar`. Sem ele o script acha zero — e é o
 * `.gitignore` funcionando, não um defeito.
 *
 * A mesma posição aparece em vários arquivos nossos, e só um deles pode ter o
 * comentário: dentro do grupo, o nó que **tem** texto ganha. Sem isso a conta
 * de "já comentados" sai baixa por acidente de ordem de leitura.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { RAIZ } from "./env-local.ts";
import { lerPgns, type LancePgn } from "../lib/repertorio/pgn.ts";

type No = {
  chave: string;
  san: string;
  numero: string;
  comentario: string | null;
  arquivo: string;
  caminho: string;
};

/** As 4 primeiras partes da FEN: posição, vez, roques, en passant. Sem contadores. */
const chaveFen = (fen: string): string => fen.split(" ").slice(0, 4).join(" ");

function andar(
  lances: LancePgn[],
  tabuleiro: Chess,
  arquivo: string,
  caminho: string[],
  saida: No[],
): void {
  const partida = new Chess(tabuleiro.fen());
  for (const lance of lances) {
    for (const variacao of lance.variacoes) {
      andar(variacao, new Chess(partida.fen()), arquivo, [...caminho], saida);
    }
    let jogado;
    try {
      jogado = partida.move(lance.san);
    } catch {
      return;
    }
    if (!jogado) return;
    const numero = `${Math.ceil(partida.moveNumber() - (jogado.color === "w" ? 0 : 1))}${
      jogado.color === "w" ? "." : "..."
    }`;
    const agora = [...caminho, jogado.san];
    saida.push({
      chave: chaveFen(partida.fen()),
      san: jogado.san,
      numero,
      comentario: lance.comentario,
      arquivo,
      caminho: agora.join(" "),
    });
    caminho.push(jogado.san);
  }
}

function colher(pasta: string, arquivos: string[]): No[] {
  const saida: No[] = [];
  for (const nome of arquivos) {
    for (const jogo of lerPgns(readFileSync(path.join(pasta, nome), "utf8"))) {
      andar(jogo.lances, new Chess(), nome, [], saida);
    }
  }
  return saida;
}

const nosso = path.join(RAIZ, "content", "repertorio");
const anotado = path.join(nosso, "rascunhos-anotados");

const nossos = colher(
  nosso,
  readdirSync(nosso).filter((n) => n.endsWith(".pgn")),
);
const fontes = colher(
  anotado,
  readdirSync(anotado).filter((n) => n.endsWith(".pgn")),
);

const porChave = new Map<string, No[]>();
for (const no of fontes) {
  if (!no.comentario) continue;
  const lista = porChave.get(no.chave) ?? [];
  lista.push(no);
  porChave.set(no.chave, lista);
}

// Agrupa por posição, e dentro do grupo prefere o nó que TEM comentário: a
// mesma posição aparece em vários arquivos nossos, e só um deles pode falar.
const nossosPorChave = new Map<string, No>();
for (const no of nossos) {
  const antes = nossosPorChave.get(no.chave);
  if (!antes || (!antes.comentario && no.comentario)) nossosPorChave.set(no.chave, no);
}

const vistos = new Set(nossosPorChave.keys());
const pares: Array<{ nosso: No; fonte: No[] }> = [];
for (const [chave, no] of nossosPorChave) {
  const achado = porChave.get(chave);
  if (achado) pares.push({ nosso: no, fonte: achado });
}

const nossosComentados = nossos.filter((n) => n.comentario).length;
const posicoesNossas = vistos.size;
const comCometario = pares.filter((p) => p.nosso.comentario).length;

console.log(
  [
    `posições distintas nas nossas 42 linhas: ${posicoesNossas}`,
    `comentários nossos (contando repetição entre linhas): ${nossosComentados}`,
    `explicações nas fontes: ${fontes.filter((f) => f.comentario).length}`,
    `pontos em que a fonte fala numa posição nossa: ${pares.length}`,
    `  destes, já com comentário nosso: ${comCometario}`,
    `  ociosos (a fonte fala, nós calados): ${pares.length - comCometario}`,
  ].join("\n"),
);

const RELATORIO = process.argv.includes("--pares");
if (!RELATORIO) process.exit(0);

const linhas: string[] = ["# Os pontos em que a fonte fala nas nossas linhas", ""];
for (const par of pares) {
  const arq = par.nosso.arquivo.replace(/\.pgn$/, "");
  linhas.push(`## ${arq} — ${par.nosso.numero}${par.nosso.san}  (${par.nosso.caminho})`);
  for (const f of par.fonte) linhas.push(`FONTE (${f.arquivo}): ${f.comentario}`);
  linhas.push(`NOSSO: ${par.nosso.comentario ?? "— (sem comentário aqui)"}`);
  linhas.push("");
}
console.log("\n" + linhas.join("\n"));
