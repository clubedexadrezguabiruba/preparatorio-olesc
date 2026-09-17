/**
 * A amostra para medir a precisão das etiquetas — em texto, sem imagem.
 *
 * Uso:
 *   node scripts/auditar-etiquetas.ts [--tsv dados/etiquetas-nossas.tsv] [--linhas N] [--por-tag 40]
 *                                     [--semente rodada3] [--tags desperado,pillsburysMate]
 *
 * `--semente` troca o sorteio: uma regra calibrada numa amostra tem de ser
 * medida em outra. `--tags` grava só os arquivos dessas tags.
 *
 * Para cada tag auditada, sorteia (por hash do id, então é reprodutível) até 40
 * puzzles de 1000 a 2100 que a levam e grava `dados/auditoria/<tag>.txt`: a
 * definição, e para cada puzzle a linha em notação, a posição antes do primeiro
 * lance de quem resolve e a posição final, em ASCII e FEN. Quem confere lê o
 * texto e responde SIM ou NÃO por puzzle; o resultado vai para
 * `docs/TATICA-PADROES.md`.
 *
 * As tags auditadas são as 11 do Lichess que entram no currículo (as que têm
 * validador, já depois dele — lidas do arquivo lateral), as nossas, e os
 * `dovetailMate` que só existem porque o detector de Cozio os acrescentou.
 */

import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { chaveDe } from "../lib/tatica/chave.ts";
import { lerEtiquetasNossas, lerLinha, type Bruto } from "./puzzles-lichess.ts";

export const DEFINICOES: Record<string, string> = {
  operaMate:
    "Mate da ópera: rei na borda; a torre dá o mate colada ao rei, ao longo da borda, defendida por um bispo; das fugas, no máximo uma fechada por peça que não é essa torre nem bispo.",
  pillsburysMate:
    "Mate de Pillsbury: rei no canto ou colado nele, na última fileira; a torre dá o mate pela coluna do rei, de longe (duas casas ou mais); um bispo, pela diagonal, tira uma fuga que a torre não tira; das fugas, no máximo uma fechada por outra peça.",
  epauletteMate:
    "Mate das dragonas: dama (ou torre) dá xeque em linha reta, de duas casas ou mais; as duas casas coladas ao rei, dos dois lados da linha do xeque, estão tapadas por peças do próprio rei; no máximo duas fugas fechadas por peças que não dão o xeque (como no Praticar do Lichess, com cavalo e bispo).",
  swallowstailMate:
    "Mate de Guéridon (swallow's tail): a dama colada ao rei, apoiada, dá o mate; as duas casas na diagonal atrás do rei (do lado oposto à dama) estão tapadas por peças do próprio rei.",
  morphysMate:
    "Mate de Morphy: rei na borda; o bispo dá o mate com o próprio lance, de longe (duas casas ou mais); torre (ou torres) prende o rei; das fugas, no máximo uma fechada por peça que não é o bispo nem torre.",
  cornerMate:
    "Mate do canto: rei no canto; o cavalo dá o mate; torre ou dama fecha a linha vizinha.",
  triangleMate:
    "Mate do triângulo: dama e torre, na mesma fileira ou coluna e a uma casa do rei, formam um triângulo em volta dele; a dama dá o mate apoiada pela torre.",
  blindSwineMate:
    "Mate dos porcos cegos: rei na sua última fileira; a peça que dá o mate e outra torre ou dama estão as duas na fileira logo à frente dele (a 7ª contra as pretas).",
  killBoxMate:
    "Mate da caixa: torre (ou dama) colada ao rei em linha reta dá xeque, apoiada por uma dama a dois passos dela na diagonal; as duas fecham um quadrado 3×3 com o rei dentro.",
  vukovicMate:
    "Mate de Vuković: torre e cavalo juntos; a torre dá o mate colada ao rei, apoiada por uma terceira peça (rei, peão...), e o cavalo tira as casas de fuga.",
  balestraMate:
    "Mate da balestra: o bispo dá o mate de longe (duas casas ou mais), com o próprio lance e sozinho no xeque, e a dama fecha as fugas restantes — só com bispo e dama já é mate.",
  damianoMate:
    "Mate de Damiano: rei na 1ª/8ª fileira; a dama dá o mate colada ao rei na diagonal da frente; uma peça do rei logo à frente dele; a dama apoiada por um peão duas casas à frente do rei ou por um bispo.",
  lolliMate:
    "Mate de Lolli: rei na 1ª/8ª fileira; a dama dá o mate logo à frente do rei, apoiada por um peão na diagonal atrás dela.",
  anderssenMate:
    "Mate de Anderssen: rei na 1ª/8ª fileira; torre ou dama dá o mate colada ao rei ao longo da fileira, apoiada por um peão logo à frente do rei.",
  pawnMate:
    "Mate de peão: um peão que acabou de andar (sem promover, sem xeque descoberto) dá o mate; há ao menos um peão do rei colado a ele.",
  suffocationMate:
    "Mate da asfixia: o cavalo dá o mate; as casas vazias em volta do rei (ao menos uma) são cobertas só por bispos; as ocupadas são peças do próprio rei; e o mate é só de cavalo e bispo (tirando as outras peças do atacante, continua mate).",
  grecoMate:
    "Mate de Greco: rei no canto; torre ou dama dá o mate pela COLUNA da borda, de duas casas ou mais; a casa diagonal de dentro está tapada por peça do rei; a outra casa da fileira do rei está vazia e coberta por um bispo.",
  maxLangeMate:
    "Mate de Max Lange: rei na borda; a dama dá o mate colada na diagonal, apoiada por um bispo colado nela; esse bispo tira uma fuga que a dama não alcança porque uma peça do rei está no meio (figura: rei h7, peões g7 e h6, dama g8, bispo f7 tirando g6).",
  blackburneMate:
    "Mate de Blackburne: rei na 1ª/8ª fileira; um bispo dá o mate; só bispos e cavalos fazem a rede, e os dois bispos e ao menos um cavalo são necessários — tirar qualquer um deles desfaz o mate.",
  retiMate:
    "Mate de Réti: rei fora da borda, com três ou mais casas em volta tapadas por peças dele; um bispo colado dá o mate, apoiado por torre ou dama em linha reta; todas as outras fugas são fechadas por esse bispo ou por quem o apoia, e nenhuma outra peça do atacante encosta no rei.",
  legalMate:
    "Mate de Légal: um cavalo dá o mate; um bispo do atacante colado ao rei em linha reta, defendido pelo outro cavalo; só peças menores cobrem as casas.",
  "dovetailMate-cozio":
    "Mate de Cozio (entra como cauda de andorinha): a dama dá o mate colada na diagonal, do lado da borda, com o rei fora da borda; as duas casas do lado oposto à dama tapadas por peças do rei; as outras casas vizinhas vazias.",
  greekGift:
    "Sacrifício grego: contra o rei rocado em g8/h8 (g1/h1), o 1º lance de quem resolve é Bxh7+ (Bxh2+) e a resposta é tomar o bispo (rei ou cavalo) ou fugir para h8 (h1); no 2º ou 3º lance, sem capturar, o cavalo salta para g5 (g4) ou a dama chega a h5 (h4); tudo o que quem resolve captura depois cai nas colunas f, g ou h; a linha termina em mate ou colhendo perto do rei.",
  counterCheck:
    "Contra-xeque: quem resolve começa em xeque e o 1º lance dele, sem mexer o rei, tapa ou captura dando xeque — e esse contra-xeque é a ideia do puzzle, não uma troca de passagem.",
  desperado:
    "Desperado: há peças penduradas dos dois lados desde o começo. O adversário acaba de deixar uma peça de quem resolve perdida; no 1º lance, em vez de salvá-la, ela captura uma peça de menos valor e é tomada; quem resolve não retoma na mesma casa; e depois colhe uma peça dele de valor 3 ou mais que já estava pendurada, com a peça que já a atacava antes do 1º lance. A linha não termina em mate. A ideia do puzzle tem de ser vender caro a peça perdida, e não outra tática.",
};

const LICHESS = [
  "operaMate",
  "pillsburysMate",
  "swallowstailMate",
  "morphysMate",
  "cornerMate",
  "triangleMate",
  "blindSwineMate",
  "vukovicMate",
  "balestraMate",
];

function ascii(fen: string): string {
  return new Chess(fen).ascii();
}

function descrever(p: Bruto): string {
  const jogo = new Chess(p.fen);
  const erro = jogo.move({ from: p.lances[0].slice(0, 2), to: p.lances[0].slice(2, 4), promotion: p.lances[0][4] });
  const antes = jogo.fen();
  const cor = jogo.turn() === "w" ? "brancas" : "pretas";
  const san: string[] = [];
  for (const uci of p.lances.slice(1)) {
    san.push(jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san);
  }
  return [
    `### ${p.id} (rating ${p.rating}) — quem resolve joga de ${cor}`,
    `Lance do adversário antes: ${erro.san}`,
    `Solução: ${san.join(" ")}`,
    `Antes do 1º lance de quem resolve (${antes}):`,
    ascii(antes),
    `Posição final (${jogo.fen()})${jogo.isCheckmate() ? " — mate" : ""}:`,
    ascii(jogo.fen()),
  ].join("\n");
}

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const argv = process.argv.slice(2);
const opcao = (nome: string) => (argv.includes(nome) ? argv[argv.indexOf(nome) + 1] : undefined);
const tsv = path.join(RAIZ, opcao("--tsv") ?? "dados/etiquetas-nossas.tsv");
const maxLinhas = Number(opcao("--linhas") ?? Infinity);
const porTag = Number(opcao("--por-tag") ?? 40);
const semente = opcao("--semente") ?? "auditoria";
const soTags = opcao("--tags")?.split(",");
const nossas = lerEtiquetasNossas(tsv);

/** tag -> candidatos com a chave de sorteio; guarda só os `porTag` menores. */
const baldes = new Map<string, { chave: number; p: Bruto }[]>();
const guardar = (tag: string, p: Bruto) => {
  const lista = baldes.get(tag) ?? [];
  lista.push({ chave: chaveDe(`${semente}:${p.id}`), p });
  if (lista.length > porTag * 4) {
    lista.sort((a, b) => a.chave - b.chave);
    lista.length = porTag;
  }
  baldes.set(tag, lista);
};

const leitor = createInterface({
  input: createReadStream(path.join(RAIZ, "dados/lichess_db_puzzle.csv"), { encoding: "utf8" }),
  crlfDelay: Infinity,
});
let linhas = 0;
for await (const linha of leitor) {
  if (++linhas > maxLinhas) break;
  const p = lerLinha(linha, 1000, 2100);
  if (!p) continue;
  // A tag que o arquivo lateral governa sai dele (já validada); as outras, do CSV.
  for (const tag of LICHESS) if (!nossas.governa.has(tag) && p.temas.includes(tag)) guardar(tag, p);
  const deles = nossas.porId.get(p.id) ?? [];
  for (const tag of deles) {
    if (tag === "dovetailMate") {
      if (!p.temas.includes("dovetailMate")) guardar("dovetailMate-cozio", p);
    } else guardar(tag, p);
  }
}

const pasta = path.join(RAIZ, "dados/auditoria");
mkdirSync(pasta, { recursive: true });
for (const [tag, definicao] of Object.entries(DEFINICOES)) {
  if (soTags && !soTags.includes(tag)) continue;
  const lista = (baldes.get(tag) ?? []).sort((a, b) => a.chave - b.chave).slice(0, porTag);
  const texto = [
    `# ${tag} — ${lista.length} puzzles`,
    "",
    `Definição: ${definicao}`,
    "",
    "Maiúsculas são brancas, minúsculas pretas. A 8ª fileira está no alto.",
    "",
    ...lista.map((x) => descrever(x.p) + "\n"),
  ].join("\n");
  writeFileSync(path.join(pasta, `${tag}.txt`), texto, "utf8");
  console.log(`${tag.padEnd(22)} ${lista.length}`);
}
