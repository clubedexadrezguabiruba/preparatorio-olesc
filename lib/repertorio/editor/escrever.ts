import type { AnaliseV2, AulaV2 } from "../../editor-v2/modelo.ts";
import { FEN_INICIAL_PADRAO } from "../../editor-v2/modelo.ts";
import type { LancePgn, PartidaPgn } from "../pgn.ts";
import { cascaDoArquivo, numeroDoJogo, partidaDaAnalise, type CascaDoArquivo, type FormasDosNags } from "./adaptar.ts";

/**
 * O escritor do repertório — um **emendador**, não um reimpressor.
 *
 * §14 do plano final proíbe misturar reimpressão em massa com implementação, e o
 * motivo é prático: os onze `.pgn` foram escritos à mão, com quebras de linha no meio
 * dos comentários, preâmbulo de `;` contando a história de cada poda, NAG escrito às
 * vezes `!?` e às vezes `$5`. Reimprimir tudo a cada edição faria o diff de uma
 * vírgula corrigida mostrar o arquivo inteiro, e ninguém revisaria.
 *
 * Então gravar reescreve **só os jogos tocados**. O preâmbulo, os jogos intactos e o
 * que fica entre eles saem byte a byte do texto original, pelos intervalos de
 * `lerPgnsComIntervalos`.
 *
 * ## O jogo reescrito: semântica igual, texto no estilo do arquivo
 *
 * - tags na ordem em que estavam, valores verbatim;
 * - comentário verbatim, com as quebras de linha, e o `[%plano]` dentro dele;
 * - NAG na forma em que estava (`!?` colado ou `$5` solto); NAG novo sai colado se é
 *   um dos seis símbolos da interface;
 * - comentário que vinha depois de `)` volta colado ao lance — o leitor já o tinha
 *   juntado ali, então o sentido é o mesmo;
 * - `%cal`/`%csl` a partir de `no.desenhos`.
 *
 * O aceite é forte: `expandir` do jogo reescrito é igual a `expandir` do original
 * (linhas, ids, avisos e problemas) — ver `escrever.test.ts`.
 *
 * ## O que é recusado em vez de escrito errado
 *
 * O leitor tem limites que o escritor não pode esconder: tag com aspas (a varredura lê
 * o valor até a primeira `"`), comentário com `}` (fecha o comentário no meio) e chave
 * de tag fora de `\w+`. Nesses casos não há texto que releia igual, e a gravação não
 * acontece.
 */

export type JogoEscrito = { texto: string; problemas: string[] };

/** Como o número do lance aparece: `12.` antes das brancas, `12...` antes das pretas. */
function numeracao(fen: string): (ply: number) => { brancas: boolean; numero: number } {
  const [, vez = "w", , , , lance = "1"] = fen.split(" ");
  const comecaNasPretas = vez === "b";
  const primeiro = Number(lance) || 1;
  return (ply) => {
    const total = ply + (comecaNasPretas ? 1 : 0);
    return { brancas: total % 2 === 0, numero: primeiro + Math.floor(total / 2) };
  };
}

type Parte = { texto: string; tipo: "numero" | "lance" | "nag" | "comentario" | "abre" | "fecha" | "resultado" };

function problemasDoTexto(partida: PartidaPgn): string[] {
  const problemas: string[] = [];
  for (const [chave, valor] of Object.entries(partida.tags)) {
    if (!/^\w+$/.test(chave)) problemas.push(`a tag "${chave}" tem um nome que o PGN não aceita (só letras, números e _)`);
    if (valor.includes('"')) problemas.push(`a tag [${chave}] tem aspas duplas, e o leitor do repertório corta o valor nelas — troque por aspas simples`);
    if (/[\r\n]/.test(valor)) problemas.push(`a tag [${chave}] tem quebra de linha, e uma tag ocupa uma linha só`);
  }
  const conferir = (comentario: string | null, onde: string): void => {
    if (comentario?.includes("}")) problemas.push(`o comentário ${onde} tem "}", que fecha o comentário no meio do texto — tire a chave`);
  };
  conferir(partida.intro, "do início do jogo");
  const andar = (lances: LancePgn[]): void => {
    for (const lance of lances) {
      conferir(lance.comentario, `do lance ${lance.san}`);
      lance.variacoes.forEach(andar);
    }
  };
  andar(partida.lances);
  return problemas;
}

/** Os lances de uma linha, a partir do meio-lance `ply`, como partes de texto. */
function partesDosLances(
  lances: LancePgn[],
  ply: number,
  forcarNumero: boolean,
  lugar: ReturnType<typeof numeracao>,
  partes: Parte[],
): void {
  let precisaNumero = forcarNumero;
  for (const [i, lance] of lances.entries()) {
    const { brancas, numero } = lugar(ply + i);
    if (brancas) partes.push({ texto: `${numero}.`, tipo: "numero" });
    else if (precisaNumero) partes.push({ texto: `${numero}...`, tipo: "numero" });
    precisaNumero = false;

    const colado = lance.nags.find((n) => !n.startsWith("$"));
    partes.push({ texto: `${lance.san}${colado ?? ""}`, tipo: "lance" });
    for (const nag of lance.nags) if (nag !== colado) partes.push({ texto: nag, tipo: "nag" });

    if (lance.comentario) {
      partes.push({ texto: `{${lance.comentario}}`, tipo: "comentario" });
      precisaNumero = true;
    }
    for (const variacao of lance.variacoes) {
      partes.push({ texto: "(", tipo: "abre" });
      partesDosLances(variacao, ply + i, true, lugar, partes);
      partes.push({ texto: ")", tipo: "fecha" });
      precisaNumero = true;
    }
  }
}

/**
 * Junta as partes em linhas de até 80 colunas, como o autor escreveu.
 *
 * Três regras de estilo dos onze arquivos: o comentário nunca começa linha nova (ele
 * vem colado ao lance, e as quebras dele são as do autor), parêntese não leva espaço
 * do lado de dentro, e o número do lance não fica sozinho no fim da linha.
 */
function embrulhar(partes: Parte[], largura = 80): string {
  let saida = "";
  let coluna = 0;
  let anterior: Parte | null = null;
  for (const parte of partes) {
    const primeiraLinha = parte.texto.split("\n")[0];
    const semEspaco = anterior === null || anterior.tipo === "abre" || parte.tipo === "fecha";
    const cabe = coluna + (semEspaco ? 0 : 1) + primeiraLinha.length <= largura;
    const inquebravel = parte.tipo === "comentario" || parte.tipo === "fecha" || anterior?.tipo === "abre" || anterior?.tipo === "numero";
    if (anterior !== null && !cabe && !inquebravel) {
      saida += "\n";
      coluna = 0;
    } else if (!semEspaco) {
      saida += " ";
      coluna += 1;
    }
    saida += parte.texto;
    const quebra = parte.texto.lastIndexOf("\n");
    coluna = quebra >= 0 ? parte.texto.length - quebra - 1 : coluna + parte.texto.length;
    anterior = parte;
  }
  return saida;
}

/** Um jogo inteiro em texto — sem a quebra de linha final, que é do separador. */
export function escreverPartida(partida: PartidaPgn): JogoEscrito {
  const problemas = problemasDoTexto(partida);
  const tags = Object.entries(partida.tags).map(([chave, valor]) => `[${chave} "${valor}"]`);
  const partes: Parte[] = [];
  if (partida.intro) partes.push({ texto: `{${partida.intro}}`, tipo: "comentario" });
  const fen = partida.tags.FEN?.trim() || FEN_INICIAL_PADRAO;
  partesDosLances(partida.lances, 0, Boolean(partida.intro), numeracao(fen), partes);
  partes.push({ texto: partida.resultado ?? "*", tipo: "resultado" });
  const corpo = embrulhar(partes);
  return { texto: tags.length > 0 ? `${tags.join("\n")}\n\n${corpo}` : corpo, problemas };
}

/** A análise de um jogo, em texto. */
export function escreverJogo(analise: AnaliseV2, formas?: FormasDosNags): JogoEscrito {
  const { partida, problemas } = partidaDaAnalise(analise, formas);
  const escrito = escreverPartida(partida);
  return { texto: escrito.texto, problemas: [...problemas, ...escrito.problemas] };
}

export type ArquivoEscrito = { texto: string; problemas: string[] };

/**
 * O arquivo com os jogos tocados reescritos e o resto copiado do original.
 *
 * `tocados` são ids de análise (`analise-j2`). Uma análise da casca que não existia no
 * original (jogo novo) entra no fim, depois do último jogo. Tirar um jogo do meio não é
 * suportado: os ids dos seguintes são a posição deles no arquivo.
 */
export function escreverArquivo(
  original: string,
  casca: AulaV2,
  tocados: ReadonlySet<string>,
  /**
   * Os intervalos e as formas do original, quando quem chama já os tem. A tela abre a casca
   * uma vez e escreve a cada edição: reler o arquivo inteiro a cada tecla confirmada custava
   * mais que a própria reescrita (medido na 8D, Siciliana).
   */
  lido: Pick<CascaDoArquivo, "intervalos" | "formas"> = cascaDoArquivo("original", original),
): ArquivoEscrito {
  const { intervalos, formas } = lido;
  const problemas: string[] = [];
  const porId = new Map(casca.analises.map((a) => [a.id, a]));

  const trechos: string[] = [];
  // Arquivo sem jogo nenhum (a abertura que acabou de nascer): tudo é preâmbulo, e o
  // jogo novo entra depois dele.
  let cursor = intervalos.jogos.length === 0 ? original.length : 0;
  if (intervalos.jogos.length === 0) trechos.push(original);
  for (const [i, jogo] of intervalos.jogos.entries()) {
    const id = `analise-j${i + 1}`;
    trechos.push(original.slice(cursor, jogo.inicio));
    const analise = porId.get(id);
    if (!analise) {
      problemas.push(`o jogo ${i + 1} sumiu da edição — tirar um jogo do arquivo não é suportado`);
      trechos.push(original.slice(jogo.inicio, jogo.fim));
    } else if (tocados.has(id)) {
      const escrito = escreverJogo(analise, formas);
      problemas.push(...escrito.problemas.map((p) => `jogo ${i + 1}: ${p}`));
      trechos.push(escrito.texto);
    } else {
      trechos.push(original.slice(jogo.inicio, jogo.fim));
    }
    cursor = jogo.fim;
  }

  const novos = casca.analises.filter((a) => {
    const n = numeroDoJogo(a.id);
    return tocados.has(a.id) && (n === null || n > intervalos.jogos.length);
  });
  const rabo = original.slice(cursor);
  for (const analise of novos) {
    const escrito = escreverJogo(analise);
    problemas.push(...escrito.problemas.map((p) => `jogo novo: ${p}`));
    const antes = trechos.join("");
    trechos.push(antes === "" || antes.endsWith("\n\n") ? "" : antes.endsWith("\n") ? "\n" : "\n\n", escrito.texto);
  }
  trechos.push(novos.length > 0 && !rabo.endsWith("\n") ? `${rabo}\n` : rabo);

  return { texto: trechos.join(""), problemas };
}
