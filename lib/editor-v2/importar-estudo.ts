/**
 * Importar um **estudo do Lichess** com os modos de cada capítulo — especificação §13, fatia 10 (10E).
 *
 * ## O que o Lichess exporta, e o que não (conferido em `lila/modules/study/PgnDump.scala` e no estudo
 * real do Doug, `hf09xMzS`, exportado em 14/9/2026)
 *
 * - **Vem:** `StudyName`, `ChapterName`, `ChapterURL`, `Annotator`, `Orientation` (com
 *   `orientation=true`), `FEN`, variantes, comentários, `%cal`/`%csl`, e **só um modo**:
 *   `[ChapterMode "gamebook"]` (lição interativa).
 * - **Não vem:** "Pratique com o computador", "Ocultar próximos lances", e as dicas e textos de desvio
 *   que o autor escreve dentro da lição interativa. Isso vai para as perdas, antes de aplicar.
 *
 * ## Para onde cada capítulo vai — a pista, e o professor decide
 *
 * **O nome do capítulo vem primeiro** (pedido do Doug, 16/9/2026): ele escreve o modo no nome —
 * "00 - Introdução da aula", "02 - AULA EXPLICADA", "04 - TREINO GUIADO 1", "08 - PRÁTICA LIVRE". Com
 * mais de uma palavra no nome, manda a que aparece primeiro. Se o nome pede o que o capítulo não pode
 * virar (treino sem lances), valem as pistas abaixo, e a frase da pista diz por quê.
 *
 * | Palavra no nome (sem acento, maiúscula ou não) | Sugestão |
 * |---|---|
 * | introdução, apresentação, introduction | **Introdução** |
 * | aula, lição, explicação, lesson | **Capítulo** (sem lances: posição parada) |
 * | treino, exercício, training, exercise | **Treino** |
 * | prática, pratique, practice | **Prática** |
 *
 * Sem palavra no nome, as pistas do Lichess:
 *
 * | Pista | Sugestão |
 * |---|---|
 * | sem lances, antes do primeiro capítulo com lances | **Introdução** (um quadro) |
 * | `ChapterMode "gamebook"` | **Treino** |
 * | `White` ou `Black` = "Engine", sem lances | **Prática** |
 * | o resto | **Capítulo** |
 *
 * ## O treino que nasce da lição interativa
 *
 * A linha principal vira as perguntas — os lances do lado do aluno com o comentário como feedback, os
 * do outro lado como defesa com o próprio texto (derivação de `treinos.ts`, a mesma de "Criar treino
 * daqui"). Depois o treino fica **independente** (a cópia operacional é materializada) e ganha o que
 * a derivação não sabe: as variantes do lance do aluno.
 *
 * - variante com `#`, `!` ou `!!` → resposta **correta** (se termina em mate, encerra ali);
 * - variante com `?`, `??` ou `?!` → **erro nomeado** (catálogo), com o comentário como mensagem, e o
 *   aluno tenta de novo;
 * - variante sem símbolo e sem mate → vira erro **e fica marcada para revisar** — símbolo só sugere
 *   (§16.1), e ausência de símbolo sugere menos ainda;
 * - variante aceita que continua depois do primeiro lance → a continuação é perda anunciada.
 *
 * A análise do treino fica na aula (sem capítulo), com os comentários e variantes originais: é a
 * origem histórica, e é onde a proveniência da posição é registrada.
 */
import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { lerPgnsDoEstudo, type PartidaPgn } from "../repertorio/pgn.ts";
import { indiceAntesDaPratica } from "./fluxo.ts";
import { comoId, idsDaAulaV2 } from "./ids.ts";
import { enderecoDaOrigem, enderecosDaAula, importarJogo, prosaEDesenhos, type JogoImportado } from "./importar-pgn.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import type { AnaliseV2, AulaV2, CapituloV2, IntroducaoV2, RevisaoDaFenV2, TreinoV2 } from "./modelo.ts";
import { sanEmPortugues } from "../repertorio/treino.ts";
import { tornarTreinoIndependente } from "./propriedade-treino.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";

export type DestinoNoEstudo = "introducao" | "capitulo" | "treino" | "pratica" | "fora";

export type CapituloDoEstudo = {
  numero: number;
  titulo: string;
  fen: string;
  lado: "white" | "black";
  modo: "analise" | "gamebook";
  lances: number;
  variantes: number;
  comentarios: number;
  sugerido: DestinoNoEstudo;
  possiveis: DestinoNoEstudo[];
  /** Por que a sugestão é essa, em uma frase. */
  pista: string;
  perdas: string[];
  jogo: JogoImportado;
  /** Capítulo sem lances com posição válida: o capítulo de posição parada que ele vira, se escolhido. */
  parado: { analise: AnaliseV2; capitulo: CapituloV2 } | null;
  partida: PartidaPgn;
};

export type LeituraDoEstudo = {
  capitulos: CapituloDoEstudo[];
  estudo: { nome?: string; autor?: string; link?: string };
  /** O que o Lichess não exporta — dito uma vez para o arquivo inteiro. */
  perdasGerais: string[];
};

const semNumero = (titulo: string) => titulo.replace(/^\s*\d+\s*[-–—.]\s*/, "").trim() || titulo;

const ROTULO_DO_DESTINO: Record<Exclude<DestinoNoEstudo, "fora">, string> = { introducao: "introdução", capitulo: "aula", treino: "treino", pratica: "prática" };

/** As palavras que o professor usa no nome do capítulo para dizer o que ele é. Sem acento: o nome é comparado sem acento. */
const PALAVRAS_DO_NOME: [Exclude<DestinoNoEstudo, "fora">, RegExp][] = [
  ["introducao", /\b(introducao|apresentacao|introduction)\b/g],
  ["capitulo", /\b(aula|licao|explicacao|lesson)\b/g],
  ["treino", /\b(treino|treinos|exercicio|exercicios|training|exercise|exercises)\b/g],
  ["pratica", /\b(pratica|praticas|pratique|practice)\b/g],
];

/** O modo que o nome do capítulo declara — a palavra que aparece primeiro —, ou nada. */
export function destinoPeloNome(nome: string): Exclude<DestinoNoEstudo, "fora"> | null {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let achado: { destino: Exclude<DestinoNoEstudo, "fora">; indice: number } | null = null;
  for (const [destino, palavras] of PALAVRAS_DO_NOME) {
    for (const casamento of limpo.matchAll(palavras)) {
      if (!achado || casamento.index < achado.indice) achado = { destino, indice: casamento.index };
    }
  }
  return achado?.destino ?? null;
}

/**
 * O capítulo sem lances como capítulo de posição parada: o texto fica como comentário da posição e
 * como narração que espera o "Continuar" — o mesmo arranjo de "Mudar para capítulo" num quadro
 * (`mudar-modo.ts`). Os ids seguem os de `importarJogo`, na mesma reserva.
 */
function capituloParado(partida: PartidaPgn, titulo: string, numero: number, fen: string, idsUsados: Set<string>): CapituloDoEstudo["parado"] {
  try { new Chess(fen); } catch { return null; }
  const ocupado = (candidato: string) => [candidato, `analise-${candidato}`, `capitulo-${candidato}`, `no-${candidato}-0`].some((id) => idsUsados.has(id));
  let sufixo = comoId(partida.tags.ChapterName ?? titulo, `jogo-${numero}`);
  while (ocupado(sufixo)) sufixo = `${sufixo}-${numero}`;
  idsUsados.add(sufixo);
  const raizId = `no-${sufixo}-0`;
  const { desenhos } = prosaEDesenhos(partida.intro ?? "");
  const texto = textoComParagrafos(partida.intro);
  const analise: AnaliseV2 = {
    id: `analise-${sufixo}`,
    inicio: { tipo: "fen", fen },
    origemPgn: { tags: partida.tags, ...(partida.resultado ? { resultado: partida.resultado } : {}), naoReconhecidos: partida.naoReconhecidos },
    raizId,
    nos: { [raizId]: { id: raizId, filhos: [], ...(texto ? { comentario: texto } : {}), ...(desenhos ? { desenhos } : {}) } },
  };
  const capitulo: CapituloV2 = {
    id: `capitulo-${sufixo}`,
    titulo,
    analiseId: analise.id,
    inicioNodeId: raizId,
    caminho: [],
    orientacao: new Chess(fen).turn() === "w" ? "white" : "black",
    // Sem lance para tocar, a narração temporizada passaria sozinha: o aluno lê e clica em Continuar.
    narracoes: texto ? [{ id: `narracao-${raizId}`, nodeId: raizId, texto, pausa: "manual" }] : [],
  };
  return { analise, capitulo };
}

/** O texto de um comentário do estudo com os parágrafos intactos, sem as diretivas. */
export function textoComParagrafos(bruto: string | null): string {
  if (!bruto) return "";
  return bruto.replace(/\[%[^\]]*\]/g, " ").split(/\n/).map((linha) => linha.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function lerEstudo(texto: string, idsDaAula: ReadonlySet<string> = new Set()): LeituraDoEstudo {
  const partidas = lerPgnsDoEstudo(texto);
  const idsUsados = new Set(idsDaAula);
  let primeiroComLances = partidas.findIndex((partida) => partida.lances.length > 0);
  if (primeiroComLances < 0) primeiroComLances = partidas.length;

  const capitulos = partidas.map((partida, indice): CapituloDoEstudo => {
    const numero = indice + 1;
    const jogo = importarJogo(partida, numero, idsUsados);
    const fen = partida.tags.FEN?.trim() || new Chess().fen();
    const orientacao = partida.tags.Orientation?.toLowerCase();
    const aluno = /aluno/i.test(partida.tags.Black ?? "") ? "black" : /aluno/i.test(partida.tags.White ?? "") ? "white" : undefined;
    const lado = orientacao === "black" || orientacao === "white" ? orientacao : aluno ?? (fen.split(" ")[1] === "b" ? "black" : "white");
    const modo = partida.tags.ChapterMode === "gamebook" ? "gamebook" : "analise";
    const contraMaquina = /engine|stockfish|computador/i.test(`${partida.tags.White ?? ""} ${partida.tags.Black ?? ""}`);
    const temLances = partida.lances.length > 0 && jogo.recusa === null;
    const parado = jogo.recusa?.codigo === "JOGO_SEM_LANCES" && partida.lances.length === 0
      ? capituloParado(partida, jogo.titulo, numero, fen, idsUsados)
      : null;

    const possiveis: DestinoNoEstudo[] = [];
    if (!jogo.recusa || jogo.recusa.codigo === "JOGO_SEM_LANCES") possiveis.push("introducao");
    if (temLances || parado) possiveis.push("capitulo");
    if (temLances) possiveis.push("treino");
    if (!jogo.recusa || jogo.recusa.codigo === "JOGO_SEM_LANCES") possiveis.push("pratica");
    possiveis.push("fora");

    let sugerido: DestinoNoEstudo;
    let pista: string;
    if (modo === "gamebook" && temLances) { sugerido = "treino"; pista = "é uma lição interativa no Lichess"; }
    else if (contraMaquina && !temLances && possiveis.includes("pratica")) { sugerido = "pratica"; pista = "o adversário é o computador"; }
    else if (!temLances && indice < primeiroComLances && possiveis.includes("introducao")) { sugerido = "introducao"; pista = "não tem lances e vem antes dos capítulos"; }
    else if (temLances) { sugerido = "capitulo"; pista = "tem lances para mostrar"; }
    else if (possiveis.includes("introducao")) { sugerido = "introducao"; pista = "não tem lances"; }
    else { sugerido = "fora"; pista = jogo.recusa?.mensagem ?? "não pôde ser lido"; }

    // O nome que o professor deu vence as pistas; quando pede o impossível, a pista fica e diz por quê.
    const peloNome = destinoPeloNome(partida.tags.ChapterName ?? "");
    if (peloNome && possiveis.includes(peloNome)) {
      const parada = peloNome === "capitulo" && !temLances;
      pista = parada ? `o nome diz «aula» — sem lances, a posição fica parada`
        : peloNome === sugerido || sugerido === "fora" ? `o nome diz «${ROTULO_DO_DESTINO[peloNome]}»`
        : `o nome diz «${ROTULO_DO_DESTINO[peloNome]}»; sem o nome, seria ${ROTULO_DO_DESTINO[sugerido]} (${pista})`;
      sugerido = peloNome;
    } else if (peloNome && sugerido !== "fora") {
      pista = `o nome diz «${ROTULO_DO_DESTINO[peloNome]}», mas ${peloNome === "treino" && !temLances ? "um treino sem lances não tem o que cobrar" : "não dá"}: ${pista}`;
    }

    const perdas = jogo.perdas.map((perda) => perda.mensagem);
    if (modo === "gamebook") perdas.push("as dicas e os textos de desvio da lição interativa não vêm na exportação do Lichess — escreva-os na autoria do treino");
    if (contraMaquina) perdas.push("o modo \"praticar contra o computador\" do Lichess não vem na exportação; a pista foi o nome do adversário");
    if (partida.lances.length === 0 && textoComParagrafos(partida.intro)) perdas.push("na prática, o texto do capítulo não tem lugar (a prática desta versão não mostra texto próprio)");

    return {
      numero, titulo: semNumero(jogo.titulo), fen, lado, modo,
      lances: jogo.lances, variantes: jogo.variantes, comentarios: jogo.comentarios,
      sugerido, possiveis, pista, perdas, jogo, parado, partida,
    };
  });

  const primeira = partidas[0]?.tags ?? {};
  const autor = primeira.Annotator?.replace(/^https?:\/\/lichess\.org\/@\//, "").trim();
  const link = primeira.ChapterURL?.replace(/\/[A-Za-z0-9]{8}$/, "");
  return {
    capitulos,
    estudo: { ...(primeira.StudyName ? { nome: primeira.StudyName.replace(/_/g, " ") } : {}), ...(autor ? { autor } : {}), ...(link ? { link } : {}) },
    perdasGerais: capitulos.some((c) => c.partida.tags.ChapterURL)
      ? ["o Lichess não exporta o modo \"ocultar próximos lances\" nem o relógio de estudo; se o estudo os usa, ajuste depois"]
      : [],
  };
}

/** `resultado`: o que o `[Result]` do capítulo declara ("1/2-1/2" = empate); sem ele, o professor declara na janela. */
export type PraticaDoEstudo = { numero: number; titulo: string; fen: string; lado: "white" | "black"; resultado?: "win" | "draw" };

/** O resultado que o capítulo declara no `[Result]`: "1/2-1/2" é empate, "1-0"/"0-1" é vitória, "*" não diz nada (18/9/2026). */
function resultadoDeclarado(c: CapituloDoEstudo): "win" | "draw" | undefined {
  const r = c.partida.tags.Result?.trim();
  return r === "1/2-1/2" ? "draw" : r === "1-0" || r === "0-1" ? "win" : undefined;
}

/** O que foi decidido na janela, pronto para o comando `IMPORTAR_ESTUDO` — tudo com ids. */
export type PlanoDoEstudoV2 = {
  analises: AnaliseV2[];
  capitulos: CapituloV2[];
  treinos: TreinoV2[];
  erros: NonNullable<AulaV2["catalogo"]>["erros"];
  introducao?: IntroducaoV2;
  /** As etapas novas, na ordem do estudo, sem a da introdução. Entram antes da prática. */
  etapas: AulaV2["fluxo"];
  /** Marcadas para o professor revisar (variante sem símbolo que virou erro, por exemplo). */
  avisos: string[];
  /**
   * As práticas escolhidas, na ordem do estudo: cada posição ainda precisa entrar no acervo
   * (servidor) antes do comando. Várias desde 15/9/2026 (trava 9).
   */
  praticas: PraticaDoEstudo[];
};

export type EscolhasDoEstudo = { destinos: Record<number, DestinoNoEstudo>; revisao?: RevisaoDaFenV2 };

const SIMBOLO = { certo: new Set(["!", "!!", "$1", "$3"]), errado: new Set(["?", "??", "?!", "$2", "$4", "$6"]) };

/** Os símbolos de lance (`!`, `?`, `!!`, `??`, `!?`, `?!`) — os que dizem que a variante foi escolhida para ser mostrada. */
const NAGS_DE_LANCE = new Set([1, 2, 3, 4, 5, 6]);
const GRAFIA_DO_NAG: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

/**
 * As variantes de um capítulo-aula como **capítulos de comparação** (18/9/2026).
 *
 * A aula de finais mostra o lance que ganha e, ao lado, o que perde. No estudo, o que perde é a
 * variante (`1. Kd6! (1. Ke6? …)`); sem isto a importação levava só a linha principal e a variante
 * ficava invisível para o aluno. Cada variante que o professor marcou — com símbolo ou comentário —
 * vira um capítulo que percorre a mesma análise da raiz até ela, e a prévia (`previa.ts`) reconhece a
 * bifurcação e diz "Voltamos a…". É o mesmo capítulo que "Mostrar esta variante na aula" cria
 * (`prepararMostrarVariante`), agora feito pela importação.
 *
 * Só as falas **da variante** entram: o começo comum já foi narrado no capítulo de antes. Variante
 * dentro de variante vira capítulo também, logo depois da mãe, e compara com ela.
 */
export function capitulosDasVariantes(analise: AnaliseV2, capitulo: CapituloV2, usados: Set<string>): CapituloV2[] {
  const livre = (base: string) => { let id = base; for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`; usados.add(id); return id; };
  const base = capitulo.id.replace(/^capitulo-/, "");
  const sans = sansDoPercurso(analise);
  const novos: CapituloV2[] = [];

  const descer = (mae: CapituloV2, desde: number) => {
    const percurso = [mae.inicioNodeId, ...mae.caminho];
    for (let i = desde; i < percurso.length; i += 1) {
      const pai = analise.nos[percurso[i]];
      for (const filhoId of pai?.filhos ?? []) {
        if (filhoId === percurso[i + 1]) continue;
        const linha = [filhoId];
        for (let no = analise.nos[filhoId]; no?.filhos.length; no = analise.nos[no.filhos[0]]) linha.push(no.filhos[0]);
        const primeiro = analise.nos[filhoId];
        const marcada = (primeiro?.nags ?? []).some((n) => NAGS_DE_LANCE.has(n)) || linha.some((id) => analise.nos[id]?.comentario);
        if (!primeiro?.uci || !marcada) continue;
        const simbolo = (primeiro.nags ?? []).map((n) => GRAFIA_DO_NAG[n]).find(Boolean) ?? "";
        const id = livre(`capitulo-${base}-variante`);
        const variante: CapituloV2 = {
          id,
          titulo: `Comparação: ${sans[filhoId] ?? "a outra escolha"}${simbolo}`,
          analiseId: analise.id,
          inicioNodeId: mae.inicioNodeId,
          caminho: [...percurso.slice(1, i + 1), ...linha],
          orientacao: mae.orientacao,
          narracoes: linha.flatMap((noId) => {
            const no = analise.nos[noId];
            return no?.comentario ? [{ id: livre(`narracao-${id.replace(/^capitulo-/, "")}-${noId}`), nodeId: noId, texto: no.comentario, pausa: "temporizada" as const }] : [];
          }),
        };
        novos.push(variante);
        // A variante dentro desta começa depois da bifurcação; antes dela, as irmãs já são da mãe.
        descer(variante, i + 1);
      }
    }
  };
  descer(capitulo, 0);
  return novos;
}

/** "1. Re6", "1... Re8" de cada nó da análise, pela posição de partida dela — em português, que é o que o aluno lê. */
function sansDoPercurso(analise: AnaliseV2): Record<string, string> {
  if (analise.inicio.tipo !== "fen") return {};
  const sans: Record<string, string> = {};
  const andar = (noId: string, fen: string) => {
    for (const filhoId of analise.nos[noId]?.filhos ?? []) {
      const filho = analise.nos[filhoId];
      if (!filho?.uci) continue;
      try {
        const jogo = new Chess(fen);
        const [, vez, , , , numero] = fen.split(" ");
        const lance = jogo.move({ from: filho.uci.slice(0, 2), to: filho.uci.slice(2, 4), promotion: filho.uci.slice(4) || undefined });
        sans[filhoId] = `${numero}${vez === "w" ? "." : "..."} ${sanEmPortugues(lance.san)}`;
        andar(filhoId, jogo.fen());
      } catch { /* lance ilegal: a importação já recusou antes */ }
    }
  };
  andar(analise.raizId, analise.inicio.fen);
  return sans;
}

function primeiraFrase(texto: string): string {
  const frase = texto.split(/(?<=[.!?])\s/)[0]?.trim() ?? texto;
  return frase.length > 48 ? `${frase.slice(0, 45).trim()}…` : frase;
}

/**
 * Monta o plano. **Não toca na aula.** Recusa com frase quando o que foi escolhido não cabe.
 */
export function planejarEstudo(aula: AulaV2, leitura: LeituraDoEstudo, escolhas: EscolhasDoEstudo, positions: Record<string, Position>):
  | { ok: true; plano: PlanoDoEstudoV2 }
  | { ok: false; mensagem: string } {
  const destino = (c: CapituloDoEstudo) => escolhas.destinos[c.numero] ?? c.sugerido;
  const escolhidos = leitura.capitulos.filter((c) => destino(c) !== "fora");
  if (!escolhidos.length) return { ok: false, mensagem: "nenhum capítulo do estudo foi escolhido para entrar" };
  for (const c of escolhidos) if (!c.possiveis.includes(destino(c))) return { ok: false, mensagem: `«${c.titulo}» não pode virar ${destino(c)}: ${c.pista}` };
  // Nenhuma, uma ou várias práticas (trava 9, 15/9/2026): as do estudo somam às que a aula já tem.
  const praticas = escolhidos.filter((c) => destino(c) === "pratica");

  // "Já importado" é o endereço do capítulo, e não o id: ver `enderecoDaOrigem` (15/9/2026).
  const jaNaAula = enderecosDaAula(aula);
  const repetido = escolhidos.find((c) => jaNaAula.has(enderecoDaOrigem((c.jogo.analise ?? c.parado?.analise)?.origemPgn?.tags) ?? ""));
  if (repetido) return { ok: false, mensagem: `«${repetido.titulo}» já está nesta aula — este estudo parece já ter sido importado. Nada foi aplicado.` };

  const usados = idsDaAulaV2(aula);
  for (const c of escolhidos) {
    const proprio = c.jogo.analise && c.jogo.capitulo ? { analise: c.jogo.analise, capitulo: c.jogo.capitulo } : c.parado;
    if (!proprio) continue;
    for (const id of [proprio.analise.id, proprio.capitulo.id, `etapa-${proprio.capitulo.id}`]) {
      if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}" — este estudo parece já ter sido importado. Nada foi aplicado.` };
    }
  }

  const comRevisao = (analise: AnaliseV2): AnaliseV2 => (escolhas.revisao && analise.inicio.tipo === "fen"
    ? { ...analise, inicio: { ...analise.inicio, revisao: { ...escolhas.revisao, fenRevisada: analise.inicio.fen } } }
    : analise);

  const analises: AnaliseV2[] = [];
  const capitulos: CapituloV2[] = [];
  const etapas: AulaV2["fluxo"] = [];
  const avisos: string[] = [];
  const erros: PlanoDoEstudoV2["erros"] = [];
  const treinos: TreinoV2[] = [];

  // Os capítulos entram primeiro, para a introdução poder apontar a posição deles.
  const idsReservados = new Set([...usados, ...leitura.capitulos.flatMap((c) => [c.jogo.capitulo?.id, c.parado?.capitulo.id].filter((id): id is string => Boolean(id)))]);
  const comparacoes = new Map<string, string[]>();
  for (const c of escolhidos.filter((item) => destino(item) === "capitulo")) {
    // Sem lances, o capítulo é a posição parada (16/9/2026): "AULA DIAGNÓSTICO - Como você começaria?".
    const { analise, capitulo } = c.jogo.analise ? { analise: c.jogo.analise, capitulo: c.jogo.capitulo! } : c.parado!;
    analises.push(comRevisao(analise));
    const principal = { ...capitulo, titulo: c.titulo, orientacao: c.lado };
    capitulos.push(principal);
    const variantes = capitulosDasVariantes(analise, principal, idsReservados);
    capitulos.push(...variantes);
    comparacoes.set(principal.id, variantes.map((v) => v.id));
  }

  // Treinos: derivados num rascunho da aula, e então independentes e completados.
  let rascunho: AulaV2 = { ...aula, analises: [...aula.analises, ...analises], capitulos: [...aula.capitulos, ...capitulos] };
  for (const c of escolhidos.filter((item) => destino(item) === "treino")) {
    const analise = comRevisao(c.jogo.analise!);
    const temporario = { ...c.jogo.capitulo!, orientacao: c.lado };
    rascunho = { ...rascunho, analises: [...rascunho.analises, analise], capitulos: [...rascunho.capitulos, temporario], fluxo: [...rascunho.fluxo, { id: `etapa-${temporario.id}`, tipo: "capitulo", entidadeId: temporario.id }] };
    const objetivo = textoComParagrafos(c.partida.intro) || `Jogue a linha de «${c.titulo}».`;
    const preparo = prepararTreinosDaqui(rascunho, { capituloId: temporario.id, nodeId: temporario.inicioNodeId, titulo: c.titulo, objetivo, lado: c.lado, colocacao: "fim-da-aula", obrigatorio: true }, positions);
    if (!preparo.ok) return { ok: false, mensagem: `o treino «${c.titulo}» não pôde ser montado: ${preparo.mensagem}` };
    rascunho = aplicarTreinosPreparados(rascunho, preparo.preparo);
    const treinoId = preparo.preparo.treinos[0].id;
    rascunho = tornarTreinoIndependente(rascunho, treinoId, positions);
    const completado = completarTreino(rascunho.treinos.find((t) => t.id === treinoId)!, analise, c, erros, avisos, new Set([...idsDaAulaV2(rascunho), ...erros.map((e) => e.id)]));
    const resultado = resultadoDeclarado(c);
    treinos.push({ ...completado, introducao: objetivo, ...(resultado ? { resultado } : {}) });
    analises.push(analise);
    etapas.push({ id: preparo.preparo.etapas[0].id, tipo: "treino", entidadeId: treinoId });
    // O capítulo temporário sai: a aula do estudo tem treino, não um capítulo repetido.
    rascunho = { ...rascunho, capitulos: rascunho.capitulos.filter((item) => item.id !== temporario.id), fluxo: rascunho.fluxo.filter((etapa) => etapa.entidadeId !== temporario.id) };
  }

  // A ordem das etapas segue a do estudo.
  const ordem = new Map(escolhidos.map((c, i) => [c.jogo.capitulo?.id ?? c.parado?.capitulo.id ?? `#${c.numero}`, i]));
  // As comparações vêm logo depois do capítulo delas, na ordem da árvore.
  for (const [principalId, variantes] of comparacoes) variantes.forEach((id, k) => ordem.set(id, (ordem.get(principalId) ?? 0) + (k + 1) / 1000));
  for (const capitulo of capitulos) etapas.push({ id: `etapa-${capitulo.id}`, tipo: "capitulo", entidadeId: capitulo.id });
  const posicaoNoEstudo = (etapa: AulaV2["fluxo"][number]) => {
    if (etapa.tipo === "capitulo") return ordem.get(etapa.entidadeId) ?? 0;
    const treino = treinos.find((t) => t.id === etapa.entidadeId);
    return ordem.get(treino?.origem?.capituloId ?? "") ?? 0;
  };
  etapas.sort((a, b) => posicaoNoEstudo(a) - posicaoNoEstudo(b));

  // Introdução: um quadro por capítulo escolhido, com a posição apontando o capítulo que tem a mesma.
  const quadros = escolhidos.filter((c) => destino(c) === "introducao").map((c) => {
    // Capítulo com lances que virou quadro: os lances ficam guardados na aula, sem capítulo, e o quadro
    // aponta para eles. Sem isto, "Mudar para capítulo" depois não teria o que trazer de volta (15/9/2026).
    if (!aula.introducoes.length && c.lances > 0 && c.jogo.analise) {
      const propria = comRevisao(c.jogo.analise);
      analises.push(propria);
      const { desenhos } = prosaEDesenhos(c.partida.intro ?? "");
      return {
        id: `quadro-${c.jogo.capitulo?.id.replace(/^capitulo-/, "") ?? `estudo-${c.numero}`}`,
        titulo: c.titulo,
        texto: textoComParagrafos(c.partida.intro) || c.titulo,
        posicao: { tipo: "referencia" as const, origem: { analiseId: propria.id, nodeId: propria.raizId } },
        ...(desenhos ? { desenhos } : {}),
      };
    }
    const mesma = capitulos.find((capitulo) => {
      const analise = analises.find((a) => a.id === capitulo.analiseId);
      return analise?.inicio.tipo === "fen" && analise.inicio.fen.split(" ").slice(0, 4).join(" ") === c.fen.split(" ").slice(0, 4).join(" ");
    });
    const { desenhos } = prosaEDesenhos(c.partida.intro ?? "");
    return {
      id: `quadro-${c.jogo.capitulo?.id.replace(/^capitulo-/, "") ?? `estudo-${c.numero}`}`,
      titulo: c.titulo,
      texto: textoComParagrafos(c.partida.intro) || c.titulo,
      posicao: mesma ? { tipo: "referencia" as const, origem: { analiseId: mesma.analiseId, nodeId: mesma.inicioNodeId } } : { tipo: "fen" as const, fen: c.fen },
      ...(desenhos ? { desenhos } : {}),
    };
  });
  const introducao = quadros.length && !aula.introducoes.length
    ? { id: `introducao-${quadros[0].id.replace(/^quadro-/, "")}`, titulo: "Introdução", quadros }
    : undefined;
  if (quadros.length && aula.introducoes.length) avisos.push("a aula já tem introdução: os quadros do estudo não entraram — acrescente-os à mão");

  const praticasDoPlano = praticas.map((c) => { const resultado = resultadoDeclarado(c); return { numero: c.numero, titulo: c.titulo, fen: c.fen, lado: c.lado, ...(resultado ? { resultado } : {}) }; });
  return { ok: true, plano: { analises, capitulos, treinos, erros, etapas, avisos, ...(introducao ? { introducao } : {}), praticas: praticasDoPlano } };
}

/**
 * As variantes do lance do aluno viram respostas; o texto do lance do defensor vira o texto da defesa.
 * Serve também a "Mudar para treino" (`mudar-modo.ts`): um capítulo que vira treino ganha as mesmas respostas.
 */
export function completarTreino(treino: TreinoV2, analise: AnaliseV2, c: Pick<CapituloDoEstudo, "titulo" | "perdas">, erros: PlanoDoEstudoV2["erros"], avisos: string[], usados: Set<string>): TreinoV2 {
  const livre = (base: string) => { let id = base; for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`; usados.add(id); return id; };
  // As variantes vêm da análise já importada: UCI, legalidade conferida, símbolo e comentário no nó.

  const questoes = treino.questoes.map((questao) => {
    const pai = analise.nos[questao.posicao.nodeId];
    const principal = questao.respostas[0];
    const filhos = pai.filhos.map((id) => analise.nos[id]);
    const respostas = [...questao.respostas];
    for (const filho of filhos) {
      if (!filho.uci || principal.moves.includes(filho.uci)) continue;
      const jogo = new Chess(treino.copia?.questoes[questao.id]?.fen ?? "");
      let mate = false;
      try { jogo.move({ from: filho.uci.slice(0, 2), to: filho.uci.slice(2, 4), promotion: filho.uci.slice(4) || undefined }); mate = jogo.isCheckmate(); } catch { continue; }
      const simbolos = (filho.nags ?? []).map((n) => `$${n}`);
      const certo = mate || simbolos.some((s) => SIMBOLO.certo.has(s));
      const errado = simbolos.some((s) => SIMBOLO.errado.has(s));
      // A frase de reserva de uma variante aceita **não elogia**: "Boa, também funciona." era elogio
      // vazio injetado por código, invisível para quem lê o PGN, e a `VOZ-DO-CURSO` §2 o proíbe com
      // todas as letras — "o que substitui o elogio é dizer o que o lance conseguiu". Aqui o código
      // não sabe o que o lance conseguiu; então ele diz o fato, e cala (decisão do Doug, 18/9/2026).
      const texto = filho.comentario ?? (certo ? "Este lance também chega lá." : "Este lance não é o da lição. Tente de novo.");
      const san = (() => { try { return new Chess(treino.copia?.questoes[questao.id]?.fen ?? "").move({ from: filho.uci.slice(0, 2), to: filho.uci.slice(2, 4), promotion: filho.uci.slice(4) || undefined }).san; } catch { return filho.uci; } })();
      if (certo && !errado) {
        if (filho.filhos.length) c.perdas.push(`a continuação depois de ${san} (resposta aceita no treino «${c.titulo}») não entrou: o treino aceita o lance e encerra ali — revise`);
        respostas.push({ id: livre(`resposta-${filho.id}`), moves: [filho.uci], julgamento: "correta", feedback: texto, efeito: mate ? { tipo: "encerra", condicao: "mate" } : { tipo: "repete" } });
        if (!mate) avisos.push(`no treino «${c.titulo}», ${san} está marcado como certo mas não termina a lição: entrou como "repete" — revise`);
      } else {
        const erroId = livre(`erro-${filho.id}`);
        erros.push({ id: erroId, nome: primeiraFrase(texto), julgamento: simbolos.some((s) => s === "$4") ? "perde-resultado" : "fora-do-metodo", texto });
        respostas.push({ id: livre(`resposta-${filho.id}`), moves: [filho.uci], julgamento: "erro", feedback: texto, erroId, efeito: { tipo: "repete" } });
        if (!errado) avisos.push(`no treino «${c.titulo}», ${san} não tem símbolo no estudo e entrou como erro — confira`);
      }
    }
    // O texto do lance do defensor, quando o estudo o escreveu.
    const respostasComTexto = respostas.map((resposta) => {
      if (resposta !== principal || resposta.efeito.tipo !== "avanca") return resposta;
      const noDoAluno = pai.filhos.map((id) => analise.nos[id]).find((no) => no.uci === resposta.moves[0]);
      return {
        ...resposta,
        efeito: {
          ...resposta.efeito,
          defesas: resposta.efeito.defesas.map((defesa) => {
            const noDaDefesa = noDoAluno?.filhos.map((id) => analise.nos[id]).find((no) => no.uci === defesa.move);
            return noDaDefesa?.comentario ? { ...defesa, texto: noDaDefesa.comentario } : defesa;
          }),
        },
      };
    });
    return { ...questao, respostas: respostasComTexto };
  });

  const ultima = questoes.at(-1)?.respostas[0];
  const precisaConclusao = ultima?.efeito.tipo === "encerra" && ultima.efeito.condicao === "objetivo-autoral";
  return {
    ...treino,
    questoes,
    ...(precisaConclusao && !treino.explicacaoConclusao ? { explicacaoConclusao: ultima!.feedback } : {}),
  };
}

/** O catálogo da aula com os erros nomeados novos no fim; sem erro novo, o catálogo fica como estava. */
export function comErrosNoCatalogo(aula: AulaV2, erros: PlanoDoEstudoV2["erros"]): AulaV2["catalogo"] {
  if (!erros.length) return aula.catalogo;
  return { ...(aula.catalogo ?? { erros: [], mensagensPadrao: { vitoriaForaDoMetodo: "Este lance funciona, mas não é o caminho ensinado.", perdeResultado: "Este lance perde o resultado que a posição permitia.", alternativaDoMetodo: "Boa alternativa. Continue pela linha ensinada." } }), erros: [...(aula.catalogo?.erros ?? []), ...erros] };
}

export function aplicarPlanoDoEstudo(aula: AulaV2, plano: PlanoDoEstudoV2, praticas: AulaV2["praticas"] = [], registrosDasPraticas: AulaV2["proveniencia"] = []): AulaV2 {
  const usados = idsDaAulaV2(aula);
  const novos = [...plano.analises.map((a) => a.id), ...plano.capitulos.map((c) => c.id), ...plano.treinos.map((t) => t.id), ...plano.etapas.map((e) => e.id), ...(plano.introducao ? [plano.introducao.id] : [])];
  const repetido = novos.find((id) => usados.has(id));
  if (repetido) throw new Error(`a aula já tem uma parte chamada "${repetido}" — este estudo parece já ter sido importado. Nada foi aplicado.`);
  const repetida = praticas.find((pratica) => usados.has(pratica.id));
  if (repetida) throw new Error(`a aula já tem uma prática chamada "${repetida.id}". Nada foi aplicado.`);

  const antes = indiceAntesDaPratica(aula.fluxo);
  const fluxo = [
    ...(plano.introducao ? [{ id: `etapa-${plano.introducao.id}`, tipo: "introducao" as const, entidadeId: plano.introducao.id }] : []),
    ...aula.fluxo.slice(0, antes),
    ...plano.etapas,
    ...aula.fluxo.slice(antes),
    ...praticas.map((pratica) => ({ id: `etapa-${pratica.id}`, tipo: "pratica" as const, entidadeId: pratica.id })),
  ];
  const catalogo = comErrosNoCatalogo(aula, plano.erros);
  const nova: AulaV2 = {
    ...aula,
    ...(catalogo ? { catalogo } : {}),
    proveniencia: [...aula.proveniencia, ...registrosDasPraticas.filter((registro, i, todos) => !aula.proveniencia.some((p) => p.positionId === registro.positionId) && todos.findIndex((r) => r.positionId === registro.positionId) === i)],
    analises: [...aula.analises, ...plano.analises],
    introducoes: plano.introducao ? [...aula.introducoes, plano.introducao] : aula.introducoes,
    capitulos: [...aula.capitulos, ...plano.capitulos],
    treinos: [...aula.treinos, ...plano.treinos],
    praticas: [...aula.praticas, ...praticas],
    fluxo,
  };
  const excedidos = problemasDeLimiteV2(nova);
  if (excedidos.length) throw new Error(`com este estudo a aula passa do que o editor aguenta: ${excedidos.map((p) => p.mensagem).join("; ")}. Nada foi aplicado.`);
  return nova;
}
