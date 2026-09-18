/**
 * A aula v2 publicada, como o aluno a toca — especificação §15.1, §18 e §20; plano final §16.
 *
 * ## Um player só
 *
 * Decisão do Doug (13/9/2026): o aluno **segue o fluxo**, no mesmo `LessonPlayer`. Este
 * arquivo não toca nada: ele traduz cada etapa do `fluxo` para a entrada de um componente que
 * já existe e já é o do aluno —
 *
 * - introdução → `IntroStage`, quadro a quadro;
 * - capítulo → `ObjectiveStage`, pela mesma tradução da prévia (`previa.ts`), com a pausa
 *   extra, a pausa manual, o desenho de cada fala e o retorno das comparações;
 * - treino → `TreeStage`, pela mesma tradução da prévia do treino (`treino-jogavel.ts`);
 * - prática → `PracticeStage`.
 *
 * A ordem é **só** a do `fluxo` (§18). Reordenar o fluxo reordena a aula do aluno.
 *
 * ## O que não atravessa
 *
 * O resultado vai do servidor para o navegador como props. Por isso ele leva só o que o
 * aluno vê: nada de comentário privado de análise (§12), nada de receita, proveniência ou
 * catálogo inteiro — só as frases e posições de cada etapa.
 *
 * ## E na língua do aluno
 *
 * Esta é também a fronteira da notação (Doug, 17/9/2026): o que sai daqui já saiu em
 * português. Ver `naLinguaDoAluno`, no fim do arquivo.
 */
import type { Position } from "../lesson/schema.ts";
import { mapaDaAnalise, quadroDoNo } from "./arvore.ts";
import type { Linha } from "../repertorio/linhas.ts";
import { textoEmPortugues } from "../repertorio/treino.ts";
import type { AulaV2, DesenhoV2 } from "./modelo.ts";
import type { PacoteV2 } from "./pacote.ts";
import { posicoesDoPacoteV2 } from "./pacote.ts";
import { previaDaAula } from "./previa.ts";
import { creditosDaAula } from "./proveniencia.ts";
import { treinoJogavel, type TreinoJogavel } from "./treino-jogavel.ts";

/** Um quadro da introdução na forma do `IntroStage`, com a FEN resolvida (e título e lance, fatia 10). */
export type PassoDaIntroducaoDoAlunoV2 = { fala: string; fen: string; titulo?: string; lance?: string; arrows?: [string, string][]; highlights?: string[] };

/**
 * Os quadros de uma introdução como o aluno os recebe. É **a mesma função** para o aluno e para a
 * prévia do editor (§15.1: um runtime só) — extraída de `etapasDoAlunoV2` na fatia 10.
 */
export function passosDaIntroducao(aula: AulaV2, introducao: AulaV2["introducoes"][number], positions: Record<string, Position>): PassoDaIntroducaoDoAlunoV2[] {
  return introducao.quadros.map((quadro) => ({
    fala: quadro.texto,
    fen: quadro.posicao.tipo === "fen" ? quadro.posicao.fen : quadroDoNo(aula, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId, positions).fen,
    ...(quadro.titulo ? { titulo: quadro.titulo } : {}),
    ...(quadro.lance ? { lance: quadro.lance } : {}),
    ...desenhoCurto(quadro.desenhos),
  }));
}

export type PassoDoCapituloDoAlunoV2 = {
  fala: string;
  lance?: string;
  espera?: number;
  desenhos?: DesenhoV2;
  /** Os símbolos do lance que levou a esta posição. */
  nags?: number[];
  pausaManual: boolean;
  /** O rótulo da fala, quando o estudo a marcou (§13.3.5). */
  rotulo?: string;
  /** A fita voltando um lance até o ponto de escolha (18/9/2026) — ver `PassoDaPrevia.recuo`. */
  recuo?: true;
  /** Alternativas que o capítulo vai comparar a partir desta posição. */
  opcoes?: string[];
  /** A alternativa apontada depois que a fita voltou. */
  opcaoRevista?: string;
  /**
   * A pergunta deste passo (curso de abertura, 18/9/2026): a `chave` de uma das `paradas` da etapa.
   * O tabuleiro para aqui e o aluno joga; o passo seguinte é o lance-resposta.
   */
  parada?: string;
};

/**
 * Uma pergunta jogada dentro da etapa de capítulo. Leva o que a etapa de treino levava — a revisão, o
 * treino jogável, os símbolos e a escada de ajuda —, e a `chave` é a da árvore na store do player:
 * `${etapa.id}#${treinoId}`.
 */
export type ParadaDoCapituloDoAlunoV2 = {
  chave: string;
  entidadeId: string;
  revisao: string;
  jogavel: TreinoJogavel;
  simbolos?: Record<string, number>;
  ajudaNoErro?: true;
};

export type EtapaDoAlunoV2 =
  | {
      id: string;
      tipo: "introducao";
      rotulo: string;
      /** A capa de seção (curso de abertura), mostrada antes do primeiro quadro. */
      secao?: { titulo: string; subtitulo?: string };
      /** Na forma do `IntroStage`: cada quadro com a FEN já resolvida. */
      passos: PassoDaIntroducaoDoAlunoV2[];
    }
  | {
      id: string;
      tipo: "capitulo";
      rotulo: string;
      titulo: string;
      /** A capa de seção (curso de abertura, `[SECAO]`), mostrada antes da primeira fala. */
      secao?: { titulo: string; subtitulo?: string };
      resumo: string;
      fen: string;
      orientacao: "white" | "black";
      passos: PassoDoCapituloDoAlunoV2[];
      /** As perguntas que o aluno joga dentro desta etapa, na ordem em que aparecem. */
      paradas?: ParadaDoCapituloDoAlunoV2[];
    }
  | {
      id: string;
      tipo: "treino";
      rotulo: string;
      entidadeId: string;
      revisao: string;
      perfil: "final-certificado" | "linha-autoral";
      jogavel: TreinoJogavel;
      /** Parada do curso de abertura (§18.1): o aluno joga o lance da pergunta, sem confete. */
      parada?: true;
      /**
       * Curso de abertura: o símbolo de qualidade (`$1`…`$6`) de cada lance que o estudo marcou, pela
       * chave `posição sem contadores|uci` (`chaveDoSimbolo`). O treino desenha o do lance que o
       * adversário joga sozinho e o do acerto do aluno (feedback do aluno, 17/9/2026).
       */
      simbolos?: Record<string, number>;
      /** Curso de abertura: a escada de ajuda no erro (`lib/lesson/ajuda-no-erro.ts`). */
      ajudaNoErro?: true;
    }
  | {
      id: string;
      tipo: "pratica";
      rotulo: string;
      entidadeId: string;
      revisao: string;
      positionId: string;
      fen: string;
      lado: "white" | "black";
      goal: "win" | "draw";
      engine: { skill: number; moveTimeMs: number };
    }
  | {
      id: string;
      tipo: "treinador";
      rotulo: string;
      entidadeId: string;
      titulo: string;
      cor: "brancas" | "pretas";
      abertura: string;
      /** Na ordem em que o aluno as recebe. As linhas em si vêm do repertório compilado, no servidor. */
      linhaIds: string[];
      /**
       * As linhas, lidas do repertório compilado pela página no servidor (`comLinhasDosTreinadores`).
       * Ausentes: o player mostra o aviso de que o move trainer não pôde ser montado.
       */
      linhas?: Linha[];
    };

export type AulaDoAlunoV2 = {
  id: string;
  titulo: string;
  publicationId: string;
  orientacao: "white" | "black";
  etapas: EtapaDoAlunoV2[];
  /**
   * As linhas de crédito que o professor pediu para mostrar (§19.1, fatia 10): "Posição: Dvoretsky,
   * Manual de Finais". Só a frase atravessa — a revisão inteira fica no pacote.
   */
  creditos?: string[];
};

/** O desenho v2 na forma curta do v1 — a do `IntroStage`. A cor não atravessa (ver o diário). */
function desenhoCurto(desenho: DesenhoV2 | undefined): { arrows?: [string, string][]; highlights?: string[] } {
  const arrows = (desenho?.arrows ?? []).map((seta) => (Array.isArray(seta) ? seta : [seta.de, seta.para]) as [string, string]);
  const highlights = (desenho?.highlights ?? []).map((casa) => (typeof casa === "string" ? casa : casa.casa));
  return { ...(arrows.length ? { arrows } : {}), ...(highlights.length ? { highlights } : {}) };
}

/** Os rótulos da trilha: os nomes de sempre quando há um de cada, o título quando há vários. */
function rotuloDe(aula: AulaV2, tipo: AulaV2["fluxo"][number]["tipo"], titulo: string): string {
  const quantos = aula.fluxo.filter((etapa) => etapa.tipo === tipo).length;
  const padrao = { introducao: "Apresentação", capitulo: "Aula", treino: "Treino", pratica: "Prática real", treinador: "Treinador de lances" }[tipo];
  return quantos > 1 ? titulo : padrao;
}

/**
 * Parada do curso de abertura: a pergunta vem sozinha, e a dica só depois de um lance errado —
 * mostrada de entrada, ela entregava a resposta antes de o aluno pensar (Doug, 17/9/2026).
 */
function dicaSoNoErro(jogavel: TreinoJogavel, treino: AulaV2["treinos"][number]): TreinoJogavel {
  const dica = treino.questoes[0]?.dica;
  if (!dica) return jogavel;
  const nodes = Object.fromEntries(Object.entries(jogavel.tree.nodes).map(([id, node]) => [id, { ...node, hint: undefined }]));
  const erro = `Ainda não. Dica: ${dica}`;
  return {
    ...jogavel,
    tree: { ...jogavel.tree, nodes },
    lesson: { ...jogavel.lesson, fallbacks: { ...jogavel.lesson.fallbacks, winningOffMethod: erro, losesWin: erro } },
  };
}

/** A chave de um lance em `simbolos`: a posição de antes, sem os contadores, e o lance. */
export const chaveDoSimbolo = (fenAntes: string, uci: string) => `${fenAntes.split(" ").slice(0, 4).join(" ")}|${uci}`;

/** Os seis símbolos de qualidade de todos os lances das análises da aula, pela posição e pelo lance. */
export function simbolosDaAula(aula: AulaV2, positions: Record<string, Position>): Record<string, number> {
  const simbolos: Record<string, number> = {};
  for (const analise of aula.analises) {
    let quadros: ReturnType<typeof mapaDaAnalise>["quadros"];
    try {
      quadros = mapaDaAnalise(aula, analise.id, positions).quadros;
    } catch {
      continue; // posição inicial que o pacote não resolve: a aula acusa noutro lugar
    }
    for (const [paiId, pai] of Object.entries(analise.nos)) {
      for (const filhoId of pai.filhos) {
        const filho = analise.nos[filhoId];
        const nag = filho.nags?.find((n) => n >= 1 && n <= 6);
        if (!filho.uci || nag === undefined || !quadros[paiId]) continue;
        const chave = chaveDoSimbolo(quadros[paiId].fen, filho.uci);
        if (!(chave in simbolos)) simbolos[chave] = nag;
      }
    }
  }
  return simbolos;
}

export function etapasDoAlunoV2(aula: AulaV2, positions: Record<string, Position>, revisoes: PacoteV2["revisoes"]): EtapaDoAlunoV2[] {
  const doCurso = aula.id.startsWith("AB-");
  let simbolos: Record<string, number> | null = null;
  const simbolosDoCurso = () => (simbolos ??= simbolosDaAula(aula, positions));
  const trechos = new Map(previaDaAula(aula, positions).trechos.map((trecho) => [trecho.capituloId, trecho]));
  const etapas: EtapaDoAlunoV2[] = [];
  for (const etapa of aula.fluxo) {
    if (etapa.tipo === "introducao") {
      const introducao = aula.introducoes.find((item) => item.id === etapa.entidadeId);
      if (!introducao) continue;
      etapas.push({
        id: etapa.id,
        tipo: "introducao",
        rotulo: rotuloDe(aula, "introducao", introducao.titulo),
        ...(introducao.secao ? { secao: introducao.secao } : {}),
        passos: passosDaIntroducao(aula, introducao, positions),
      });
    } else if (etapa.tipo === "capitulo") {
      const capitulo = aula.capitulos.find((item) => item.id === etapa.entidadeId);
      const trecho = capitulo ? trechos.get(capitulo.id) : undefined;
      if (!capitulo || !trecho || !trecho.passos.length) continue;
      // A pergunta sem revisão publicada não se joga: o passo fica só com a fala.
      const paradas: ParadaDoCapituloDoAlunoV2[] = (etapa.paradas ?? []).flatMap((treinoId) => {
        const treino = aula.treinos.find((item) => item.id === treinoId);
        const revisao = revisoes[treinoId];
        if (!treino || !revisao) return [];
        return [{
          chave: `${etapa.id}#${treinoId}`,
          entidadeId: treinoId,
          revisao: revisao.revisao,
          jogavel: dicaSoNoErro(treinoJogavel(aula, treinoId, positions), treino),
          ...(doCurso ? { simbolos: simbolosDoCurso(), ajudaNoErro: true as const } : {}),
        }];
      });
      const chaveDa = new Map(paradas.map((parada) => [parada.entidadeId, parada.chave]));
      etapas.push({
        id: etapa.id,
        tipo: "capitulo",
        rotulo: rotuloDe(aula, "capitulo", capitulo.titulo),
        titulo: capitulo.titulo,
        ...(capitulo.secao ? { secao: capitulo.secao } : {}),
        resumo: capitulo.resumo ?? "",
        fen: trecho.fen,
        orientacao: trecho.orientacao,
        passos: trecho.passos.map((passo) => ({
          fala: passo.fala,
          ...(passo.lance ? { lance: passo.lance } : {}),
          ...(passo.esperaMs ? { espera: passo.esperaMs } : {}),
          ...(passo.desenhos ? { desenhos: passo.desenhos } : {}),
          ...(passo.nags ? { nags: passo.nags } : {}),
          pausaManual: passo.pausaManual,
          ...(passo.rotulo ? { rotulo: passo.rotulo } : {}),
          ...(passo.recuo ? { recuo: true as const } : {}),
          ...(passo.opcoes ? { opcoes: passo.opcoes } : {}),
          ...(passo.opcaoRevista ? { opcaoRevista: passo.opcaoRevista } : {}),
          ...(passo.parada && chaveDa.has(passo.parada) ? { parada: chaveDa.get(passo.parada)! } : {}),
        })),
        ...(paradas.length ? { paradas } : {}),
      });
    } else if (etapa.tipo === "treino") {
      const treino = aula.treinos.find((item) => item.id === etapa.entidadeId);
      const revisao = revisoes[etapa.entidadeId];
      if (!treino || !revisao) continue;
      etapas.push({
        id: etapa.id,
        tipo: "treino",
        rotulo: rotuloDe(aula, "treino", treino.titulo),
        entidadeId: treino.id,
        revisao: revisao.revisao,
        perfil: treino.perfil,
        jogavel: treino.papel === "parada" ? dicaSoNoErro(treinoJogavel(aula, treino.id, positions), treino) : treinoJogavel(aula, treino.id, positions),
        ...(treino.papel === "parada" ? { parada: true as const } : {}),
        ...(doCurso ? { simbolos: simbolosDoCurso(), ajudaNoErro: true as const } : {}),
      });
    } else if (etapa.tipo === "treinador") {
      const treinador = aula.treinadores?.find((item) => item.id === etapa.entidadeId);
      if (!treinador) continue;
      etapas.push({
        id: etapa.id,
        tipo: "treinador",
        rotulo: rotuloDe(aula, "treinador", treinador.titulo),
        entidadeId: treinador.id,
        titulo: treinador.titulo,
        cor: treinador.cor,
        abertura: treinador.abertura,
        linhaIds: [...treinador.linhaIds],
      });
    } else {
      const pratica = aula.praticas.find((item) => item.id === etapa.entidadeId);
      const revisao = revisoes[etapa.entidadeId];
      const posicao = pratica ? positions[pratica.positionId] : undefined;
      if (!pratica || !revisao || !posicao) continue;
      etapas.push({
        id: etapa.id,
        tipo: "pratica",
        rotulo: rotuloDe(aula, "pratica", pratica.titulo),
        entidadeId: pratica.id,
        revisao: revisao.revisao,
        positionId: pratica.positionId,
        fen: posicao.fen,
        lado: pratica.ladoAluno,
        goal: pratica.objetivo,
        engine: pratica.engine,
      });
    }
  }
  return etapas;
}

/**
 * Os campos que o aluno **lê**. Tudo o que não está aqui é dado, e dado fica em
 * inglês: `lance` e `moves` são UCI que vão ao tabuleiro, `fen` é posição,
 * `positionId` e `entidadeId` são chave. Traduzir um deles quebraria a aula em
 * silêncio, e é por isso que a lista é de permissão e não de proibição.
 *
 * Levantada do texto real das dezesseis aulas publicadas em 17/9/2026: as que
 * hoje carregam lance são `titulo`, `rotulo`, `resumo`, `fala`, `feedback`,
 * `intro`, `winningOffMethod` e `losesWin`, mais o mapa `falasDoDefensor`. As
 * outras entram porque são prosa e podem carregar amanhã — a trava que confere
 * é `notacao-na-aula-do-aluno.test.ts`, que varre a **saída** desta função
 * atrás de um lance inglês em qualquer campo que não seja dado.
 */
const CAMPOS_QUE_O_ALUNO_LE = new Set([
  "titulo", "subtitulo", "rotulo", "resumo", "fala", "feedback", "intro", "hint",
  "dica", "texto", "comentario", "nome", "objetivo", "explicacaoConclusao",
  "winningOffMethod", "losesWin", "methodAlternative",
]);

/** O mapa cujas **chaves** são id e cujos **valores** são fala do professor. */
const MAPAS_DE_FALA = new Set(["falasDoDefensor"]);

/**
 * A aula inteira na língua do aluno — regra do Doug de 17/9/2026.
 *
 * **Aqui, porque aqui é a fronteira.** Deste ponto para baixo o pacote deixa de
 * ser arquivo e vira tela: o cabeçalho, a lista de etapas, a capa de seção, a
 * fala do professor e o "Isso: 5.Cc3." do treino saem todos daqui. Traduzir na
 * fronteira vale para a abertura, para os finais e para a prévia do editor de
 * uma vez só, e vale para a tela que ainda não foi escrita.
 *
 * **O arquivo não muda, e isso é de propósito.** O pacote publicado é selado
 * por SHA-256 no `manifesto`; e o inglês no disco é o que deixa o teste provar
 * que o lance escrito existe no tabuleiro. Ver o cabeçalho de
 * `textoEmPortugues`, que também explica por que o `R` não é traduzido em prosa.
 */
function naLinguaDoAluno<T>(valor: T, campo: string): T {
  if (typeof valor === "string") return (CAMPOS_QUE_O_ALUNO_LE.has(campo) ? textoEmPortugues(valor) : valor) as T;
  if (Array.isArray(valor)) return valor.map((item) => naLinguaDoAluno(item, campo)) as T;
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, dentro]) => [
        chave,
        // Num mapa de fala a chave é id e o valor é prosa: o campo passa a ser o mapa, e não a chave.
        MAPAS_DE_FALA.has(campo) && typeof dentro === "string" ? textoEmPortugues(dentro) : naLinguaDoAluno(dentro, chave),
      ]),
    ) as T;
  }
  return valor;
}

/** O pacote publicado, pronto para o player do aluno. */
export function aulaDoAlunoV2(pacote: PacoteV2): AulaDoAlunoV2 {
  const positions = posicoesDoPacoteV2(pacote);
  return naLinguaDoAluno({
    id: pacote.aula.id,
    titulo: pacote.aula.titulo,
    publicationId: pacote.publicationId,
    orientacao: pacote.aula.metadados?.orientacaoPadrao ?? "white",
    etapas: etapasDoAlunoV2(pacote.aula, positions, pacote.revisoes),
    ...(creditosDaAula(pacote.aula).length ? { creditos: creditosDaAula(pacote.aula) } : {}),
  }, "raiz");
}
