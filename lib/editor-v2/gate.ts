/**
 * O botão **Conferir** do Editor v2 — especificação §19.3, plano final §13.
 *
 * ## Uma passada só, desde 15/9/2026
 *
 * Até 15/9 o Conferir tinha duas passadas: a **A** renovava a certificação da tablebase no
 * documento (e era a única escrita da conferência), e a **B** relia o disco e julgava. A
 * tablebase deixou de ser consultada (travas 2 e 3 de `docs/TRILHA-FINAIS.md`): não há mais o
 * que renovar, e a conferência **não escreve no documento**. Ela lê, julga e guarda o
 * resultado em `.editor/gate/v2/`. Plano §8 continua valendo, agora por construção: a
 * conferência nunca altera respostas, feedback ou linhas autorais, porque não altera nada.
 *
 * O único caso em que o documento é gravado é o da aula que ainda não tem documento v2 em
 * disco (`documentoInicial`): ela é guardada **como está** antes de ser julgada.
 *
 * ## O verde é de um manifesto, não de um arquivo
 *
 * Plano §13: "publicação vincula o resultado verde ao manifesto completo de dependências,
 * não apenas ao hash da aula". O manifesto é o hash de: a aula, cada posição que ela usa e a
 * versão dos juízes. `podePublicarV2` recalcula tudo isso de novo e compara — mexer na posição
 * em `content/positions/` depois de conferir apaga o Publicar tanto quanto mexer na aula.
 *
 * ## A trava
 *
 * A mesma do v1 (`travarConferencia`): uma conferência por vez no repositório, v1 ou v2.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { destravarConferencia, travarConferencia } from "../editor/gate.ts";
import { editorLigado } from "../editor/local.ts";
import { caminhoDeAula, escreverAtomico, lerConteudo, serializar } from "../editor/rascunhos.ts";
import { positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua, type Regua } from "../lesson/voz.ts";
import { idsDoRepertorioCompilado } from "../repertorio/ids-compilados.ts";
import { VERSAO_JUIZ_PRATICA_V2, VERSAO_JUIZ_TREINO_V2 } from "./avaliacao.ts";
import { contarProblemasV2, problemasParaPublicarV2, type ContagemDaConferenciaV2 } from "./conferencia.ts";
import { hashCanonico } from "./hash.ts";
import { aulaIdV2Schema, type AulaV2, type ProblemaV2 } from "./modelo.ts";
import { idsDePosicoesDaAulaV2 } from "./pacote.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

/**
 * Sobe quando a conferência muda de regra: todo verde antigo deixa de valer. Foi a 2 em
 * 15/9/2026, quando as travas de tablebase, prática e procedência saíram.
 */
export const VERSAO_CONFERENCIA_V2 = 2;

const PASTA_GATE_V2 = path.join(".editor", "gate", "v2");

export type ConferenciaV2 = {
  aula: string;
  em: string;
  verde: boolean;
  contagem: ContagemDaConferenciaV2;
  problemas: ProblemaV2[];
  /** O hash do manifesto julgado. `null` quando não ficou verde. */
  manifestoHash: string | null;
  /** A conferência nem chegou a julgar: trava, aula ausente. */
  impedimento?: string;
};

export type OpcoesDoGateV2 = {
  raiz?: string;
  env?: NodeJS.ProcessEnv;
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

/** O manifesto julgado: tudo de que o verde depende. */
export function manifestoDaConferenciaV2(aula: AulaV2, positions: Record<string, Position>): string {
  return hashCanonico({
    aula: hashCanonico(aula),
    posicoes: Object.fromEntries(idsDePosicoesDaAulaV2(aula).map((id) => [id, positions[id] ? hashCanonico(positions[id]) : null])),
    juizes: { pratica: VERSAO_JUIZ_PRATICA_V2, treino: VERSAO_JUIZ_TREINO_V2, conferencia: VERSAO_CONFERENCIA_V2 },
  });
}

function caminhoDoEstado(id: string, raiz: string): string {
  return caminhoDeAula(id, PASTA_GATE_V2, raiz, aulaIdV2Schema);
}

/** Julga o documento em disco, sem escrever nada. Usado pelo Conferir e pelo validador. */
export function julgarDocumentoV2(aula: AulaV2, positions: Record<string, Position>, regua?: Regua, raiz = process.cwd()): ProblemaV2[] {
  // O repertório compilado só é lido quando a aula tem move trainer (§18.1).
  const linhasDoRepertorio = aula.treinadores?.length ? idsDoRepertorioCompilado(raiz) : undefined;
  return problemasParaPublicarV2(aula, { positions, regua, ...(linhasDoRepertorio ? { linhasDoRepertorio } : {}) });
}

export async function conferirAulaV2(id: string, opcoes: OpcoesDoGateV2 = {}): Promise<ConferenciaV2> {
  const { raiz = process.cwd(), env = process.env, documentoInicial } = opcoes;
  if (!editorLigado(env)) throw new Error("o editor está desligado — nenhuma conferência daqui");
  const em = new Date().toISOString();
  const vazia = (impedimento: string): ConferenciaV2 => ({
    aula: id, em, verde: false, contagem: { erros: 0, avisos: 0, podePublicar: false }, problemas: [], manifestoHash: null, impedimento,
  });

  const trava = travarConferencia(raiz);
  if (!trava.ok) return vazia(trava.motivo);
  try {
    const regua = opcoes.regua ?? lerRegua(raiz);
    const positions = lerPosicoesDoConteudoV2(raiz);

    let lido = lerDocumentoV2(id, raiz);
    if (!lido && documentoInicial) {
      const primeira = gravarDocumentoV2(id, documentoInicial, null, raiz, env);
      if (!primeira.ok) return vazia(`não foi possível guardar a aula antes de conferir: ${primeira.erro}`);
      lido = lerDocumentoV2(id, raiz);
    }
    if (!lido) return vazia("esta aula não tem documento v2 em disco");

    const problemas = julgarDocumentoV2(lido.aula, positions, regua, raiz);
    const contagem = contarProblemasV2(problemas);
    const conferencia: ConferenciaV2 = {
      aula: id,
      em,
      verde: contagem.podePublicar,
      contagem,
      problemas,
      manifestoHash: contagem.podePublicar ? manifestoDaConferenciaV2(lido.aula, positions) : null,
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
 * A última conferência ficou verde **e** o manifesto de agora é o que ela julgou.
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
  const agora = manifestoDaConferenciaV2(documento.aula, positions);
  if (agora !== ultima.manifestoHash) return { pode: false, motivo: "a aula ou uma posição dela mudou depois da conferência — confira de novo", manifestoHash: null };
  return { pode: true, motivo: null, manifestoHash: agora };
}
