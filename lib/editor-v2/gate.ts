/**
 * O botão **Conferir** do Editor v2 — especificação §19.3, plano final §13.
 *
 * ## As duas passadas, como no v1, e o que muda
 *
 * O v1 (`lib/editor/gate.ts`) roda `validate-content.ts` duas vezes: `--write` gera os
 * derivados, a passada limpa julga o que foi gravado. O v2 mantém o contrato e o faz dentro
 * do processo, porque o documento v2 não é lido por aquele script:
 *
 * - **Passada A** renova **só** `treino.certificacao` — resultado, evidência da tablebase por
 *   pergunta e o alvo que ela descreve —, consultando a rede se faltar cache, e grava por
 *   `gravarDocumentoV2` com o `baseHash` do que leu. É a única escrita da conferência.
 * - **Passada B** relê o disco, **sem rede**, e prova duas coisas antes de julgar: que o
 *   documento é exatamente o que A gravou, e que, tirada a certificação, ele é byte a byte
 *   o que A leu. Plano §8: "o gate pode renovar evidências calculadas, mas nunca alterar
 *   respostas, feedback ou linhas autorais". Treino personalizado incluído.
 *
 * ## O verde é de um manifesto, não de um arquivo
 *
 * Plano §13: "publicação vincula o resultado verde ao manifesto completo de dependências,
 * não apenas ao hash da aula". O manifesto é o hash de: a aula, cada posição que ela usa, o
 * alvo de cada certificação, a entrada do cache de cada posição certificada e a versão dos
 * juízes. `podePublicarV2` recalcula tudo isso de novo e compara — mexer na posição em
 * `content/positions/` depois de conferir apaga o Publicar tanto quanto mexer na aula.
 *
 * ## A trava
 *
 * A mesma do v1 (`travarConferencia`): uma conferência por vez no repositório, v1 ou v2.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { goalMovesOf, normalizeFen, Tablebase, type TbEntry } from "../../scripts/tablebase.ts";
import { pieceCount } from "../chess/fen.ts";
import { destravarConferencia, travarConferencia } from "../editor/gate.ts";
import { editorLigado } from "../editor/local.ts";
import { caminhoDeAula, escreverAtomico, lerConteudo, serializar } from "../editor/rascunhos.ts";
import { positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua, type Regua } from "../lesson/voz.ts";
import { VERSAO_JUIZ_PRATICA_V2, VERSAO_JUIZ_TREINO_V2 } from "./avaliacao.ts";
import { alvoDaCertificacaoV2, contarProblemasV2, problemasParaPublicarV2, type ContagemDaConferenciaV2 } from "./conferencia.ts";
import { hashCanonico, jsonCanonico } from "./hash.ts";
import { aulaIdV2Schema, type AulaV2, type ProblemaV2 } from "./modelo.ts";
import { idsDePosicoesDaAulaV2 } from "./pacote.ts";
import { fenDaQuestaoDoTreino } from "./propriedade-treino.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

/** Sobe quando a conferência muda de regra: todo verde antigo deixa de valer. */
export const VERSAO_CONFERENCIA_V2 = 1;

const PASTA_GATE_V2 = path.join(".editor", "gate", "v2");

export type ConferenciaV2 = {
  aula: string;
  em: string;
  verde: boolean;
  contagem: ContagemDaConferenciaV2;
  problemas: ProblemaV2[];
  /** O hash do manifesto julgado. `null` quando não ficou verde. */
  manifestoHash: string | null;
  tablebase: { consultadas: number; doCache: number; pelaRede: number };
  /** Quantos treinos tiveram a certificação renovada na passada A. */
  certificacoesRenovadas: number;
  /** A conferência nem chegou a julgar: trava, conflito, aula ausente, autoria alterada. */
  impedimento?: string;
};

export type OpcoesDoGateV2 = {
  raiz?: string;
  env?: NodeJS.ProcessEnv;
  /** Permite rede na passada A. Os testes passam `false`. */
  rede?: boolean;
  regua?: Regua;
  /** A aula adaptada, para quando o documento ainda não está em disco. */
  documentoInicial?: AulaV2;
};

/** Todas as posições de `content/positions/`, pelo id. */
export function lerPosicoesDoConteudoV2(raiz = process.cwd()): Record<string, Position> {
  const pasta = path.join(raiz, "content", "positions");
  const porId: Record<string, Position> = {};
  const varrer = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const cheio = path.join(dir, entrada.name);
      if (entrada.isDirectory()) varrer(cheio);
      else if (entrada.name.endsWith(".json")) {
        const posicao = positionSchema.parse(JSON.parse(readFileSync(cheio, "utf8")));
        porId[posicao.id] = posicao;
      }
    }
  };
  varrer(pasta);
  return porId;
}

const pastaDoCache = (raiz: string) => path.join(raiz, "content", "tablebase-cache");

/** O resultado que a tablebase certifica, quando o documento ainda não o diz. */
function resultadoPadrao(treino: AulaV2["treinos"][number], positions: Record<string, Position>): "win" | "draw" {
  const posicao = treino.certificacao ? positions[treino.certificacao.positionId] : undefined;
  return posicao?.expectedResult === "draw" ? "draw" : "win";
}

/**
 * Passada A, sem disco: a certificação de cada final certificado, recalculada.
 *
 * Só `certificacao` muda. Uma posição fora do alcance da tablebase, ou uma consulta que
 * falhou, deixa o treino `indisponivel` — e a regra de publicação o barra, em vez de ele
 * sair "confirmado" sem prova.
 */
export async function renovarCertificacoesV2(
  aula: AulaV2,
  positions: Record<string, Position>,
  consultar: (fen: string) => Promise<TbEntry>,
): Promise<{ aula: AulaV2; renovadas: number }> {
  let renovadas = 0;
  const treinos: AulaV2["treinos"] = [];
  for (const treino of aula.treinos) {
    if (treino.perfil !== "final-certificado" || !treino.certificacao) {
      treinos.push(treino);
      continue;
    }
    const resultado = treino.certificacao.resultado ?? resultadoPadrao(treino, positions);
    const evidencias: NonNullable<NonNullable<AulaV2["treinos"][number]["certificacao"]>["evidencias"]> = {};
    let indisponivel = false;
    for (const questao of treino.questoes) {
      const fen = fenDaQuestaoDoTreino(aula, treino, questao, positions);
      if (pieceCount(fen) > 7) {
        indisponivel = true;
        continue;
      }
      try {
        evidencias[questao.id] = { fen, winningMoves: goalMovesOf(await consultar(fen), resultado) };
      } catch {
        indisponivel = true;
      }
    }
    const comResultado = { ...treino, certificacao: { ...treino.certificacao, resultado } };
    const alvoHash = alvoDaCertificacaoV2(aula, comResultado, positions);
    const certificacao = indisponivel
      ? { ...treino.certificacao, estado: "indisponivel" as const, resultado, alvoHash }
      : { ...treino.certificacao, estado: "confirmada" as const, resultado, alvoHash, evidencias };
    treinos.push({ ...treino, certificacao });
    renovadas += 1;
  }
  return { aula: { ...aula, treinos }, renovadas };
}

/** O documento sem nenhuma certificação — o que a passada B exige que não tenha mudado. */
export function semCertificacao(aula: AulaV2): unknown {
  return {
    ...aula,
    treinos: aula.treinos.map((treino) => {
      const copia: Partial<AulaV2["treinos"][number]> = { ...treino };
      delete copia.certificacao;
      return copia;
    }),
  };
}

/** As entradas do cache das posições certificadas, sem rede. `null` = não está no cache. */
async function entradasDoCache(aula: AulaV2, positions: Record<string, Position>, raiz: string): Promise<{ entradas: Map<string, TbEntry | null>; tablebase: Tablebase }> {
  const tablebase = new Tablebase(pastaDoCache(raiz), false);
  const entradas = new Map<string, TbEntry | null>();
  for (const treino of aula.treinos) {
    if (treino.perfil !== "final-certificado") continue;
    for (const questao of treino.questoes) {
      let fen: string;
      try {
        fen = fenDaQuestaoDoTreino(aula, treino, questao, positions);
      } catch {
        continue;
      }
      const chave = normalizeFen(fen);
      if (entradas.has(chave) || pieceCount(fen) > 7) continue;
      try {
        entradas.set(chave, await tablebase.lookup(fen));
      } catch {
        entradas.set(chave, null);
      }
    }
  }
  return { entradas, tablebase };
}

/** O manifesto julgado: tudo de que o verde depende. */
export function manifestoDaConferenciaV2(aula: AulaV2, positions: Record<string, Position>, entradas: Map<string, TbEntry | null>): string {
  const alvos: Record<string, string | null> = {};
  for (const treino of aula.treinos) {
    if (treino.perfil !== "final-certificado") continue;
    try {
      alvos[treino.id] = alvoDaCertificacaoV2(aula, treino, positions);
    } catch {
      alvos[treino.id] = null;
    }
  }
  return hashCanonico({
    aula: hashCanonico(aula),
    posicoes: Object.fromEntries(idsDePosicoesDaAulaV2(aula).map((id) => [id, positions[id] ? hashCanonico(positions[id]) : null])),
    alvos,
    cache: Object.fromEntries([...entradas.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fen, entrada]) => [fen, entrada ? hashCanonico(entrada) : null])),
    juizes: { pratica: VERSAO_JUIZ_PRATICA_V2, treino: VERSAO_JUIZ_TREINO_V2, conferencia: VERSAO_CONFERENCIA_V2 },
  });
}

function caminhoDoEstado(id: string, raiz: string): string {
  return caminhoDeAula(id, PASTA_GATE_V2, raiz, aulaIdV2Schema);
}

/** Julga o documento em disco, sem escrever nada. Usado pela passada B e pelo validador. */
export async function julgarDocumentoV2(aula: AulaV2, positions: Record<string, Position>, raiz: string, regua?: Regua) {
  const { entradas, tablebase } = await entradasDoCache(aula, positions, raiz);
  const problemas = problemasParaPublicarV2(aula, {
    positions,
    regua,
    tablebase: (fen, resultado) => {
      const entrada = entradas.get(normalizeFen(fen));
      return entrada ? goalMovesOf(entrada, resultado) : null;
    },
  });
  return { problemas, entradas, tablebase };
}

export async function conferirAulaV2(id: string, opcoes: OpcoesDoGateV2 = {}): Promise<ConferenciaV2> {
  const { raiz = process.cwd(), env = process.env, rede = true, documentoInicial } = opcoes;
  if (!editorLigado(env)) throw new Error("o editor está desligado — nenhuma conferência daqui");
  const em = new Date().toISOString();
  const vazia = (impedimento: string): ConferenciaV2 => ({
    aula: id, em, verde: false, contagem: { erros: 0, avisos: 0, podePublicar: false }, problemas: [], manifestoHash: null,
    tablebase: { consultadas: 0, doCache: 0, pelaRede: 0 }, certificacoesRenovadas: 0, impedimento,
  });

  const trava = travarConferencia(raiz);
  if (!trava.ok) return vazia(trava.motivo);
  try {
    const regua = opcoes.regua ?? lerRegua(raiz);
    const positions = lerPosicoesDoConteudoV2(raiz);

    // ---- passada A ------------------------------------------------------------------
    let lido = lerDocumentoV2(id, raiz);
    if (!lido && documentoInicial) {
      const primeira = gravarDocumentoV2(id, documentoInicial, null, raiz, env);
      if (!primeira.ok) return vazia(`não foi possível guardar a aula antes de conferir: ${primeira.erro}`);
      lido = lerDocumentoV2(id, raiz);
    }
    if (!lido) return vazia("esta aula não tem documento v2 em disco");
    const tablebaseA = new Tablebase(pastaDoCache(raiz), rede);
    const { aula: renovada, renovadas } = await renovarCertificacoesV2(lido.aula, positions, (fen) => tablebaseA.lookup(fen));
    if (jsonCanonico(renovada) !== jsonCanonico(lido.aula)) {
      const gravado = gravarDocumentoV2(id, renovada, lido.hash, raiz, env);
      if (!gravado.ok) return vazia(`a certificação não foi gravada: ${gravado.erro}`);
    }

    // ---- passada B ------------------------------------------------------------------
    const relido = lerDocumentoV2(id, raiz);
    if (!relido || jsonCanonico(relido.aula) !== jsonCanonico(renovada)) {
      return vazia("a aula mudou durante a conferência — confira de novo");
    }
    if (jsonCanonico(semCertificacao(relido.aula)) !== jsonCanonico(semCertificacao(lido.aula))) {
      // Não deveria acontecer nunca; se acontecer, é defeito do gate, e ele não se absolve.
      return vazia("a conferência alterou algo além da certificação — nada foi publicado; avise quem mantém o editor");
    }
    const { problemas, entradas, tablebase } = await julgarDocumentoV2(relido.aula, positions, raiz, regua);
    const contagem = contarProblemasV2(problemas);
    const conferencia: ConferenciaV2 = {
      aula: id,
      em,
      verde: contagem.podePublicar,
      contagem,
      problemas,
      manifestoHash: contagem.podePublicar ? manifestoDaConferenciaV2(relido.aula, positions, entradas) : null,
      tablebase: {
        consultadas: tablebaseA.usedFiles().size,
        doCache: tablebaseA.hits + tablebase.hits,
        pelaRede: tablebaseA.fetched,
      },
      certificacoesRenovadas: renovadas,
    };
    escreverAtomico(caminhoDoEstado(id, raiz), serializar(conferencia));
    return conferencia;
  } finally {
    destravarConferencia(raiz);
  }
}

export function ultimaConferenciaV2(id: string, raiz = process.cwd()): ConferenciaV2 | null {
  const conteudo = lerConteudo(caminhoDoEstado(id, raiz));
  if (!conteudo) return null;
  try {
    return JSON.parse(conteudo.texto) as ConferenciaV2;
  } catch {
    return null;
  }
}

/**
 * O Publicar pode acender?
 *
 * A última conferência ficou verde **e** o manifesto de agora é o que ela julgou. Não
 * consulta a rede: se o cache sumiu, o manifesto muda e a resposta é "confira de novo".
 */
export async function podePublicarV2(id: string, raiz = process.cwd()): Promise<{ pode: boolean; motivo: string | null; manifestoHash: string | null }> {
  const ultima = ultimaConferenciaV2(id, raiz);
  if (!ultima) return { pode: false, motivo: "esta aula ainda não foi conferida", manifestoHash: null };
  if (!ultima.verde || !ultima.manifestoHash) return { pode: false, motivo: "a última conferência encontrou o que impede publicar", manifestoHash: null };
  let documento;
  try {
    documento = lerDocumentoV2(id, raiz);
  } catch {
    return { pode: false, motivo: "o documento da aula não pôde ser lido", manifestoHash: null };
  }
  if (!documento) return { pode: false, motivo: "a aula não tem documento v2 em disco", manifestoHash: null };
  const positions = lerPosicoesDoConteudoV2(raiz);
  const { entradas } = await entradasDoCache(documento.aula, positions, raiz);
  const agora = manifestoDaConferenciaV2(documento.aula, positions, entradas);
  if (agora !== ultima.manifestoHash) return { pode: false, motivo: "a aula ou uma posição dela mudou depois da conferência — confira de novo", manifestoHash: null };
  return { pode: true, motivo: null, manifestoHash: agora };
}
