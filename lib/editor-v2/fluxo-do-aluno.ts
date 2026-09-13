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
 */
import type { Position } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import type { AulaV2, DesenhoV2 } from "./modelo.ts";
import type { PacoteV2 } from "./pacote.ts";
import { posicoesDoPacoteV2 } from "./pacote.ts";
import { previaDaAula } from "./previa.ts";
import { treinoJogavel, type TreinoJogavel } from "./treino-jogavel.ts";

export type PassoDoCapituloDoAlunoV2 = {
  fala: string;
  lance?: string;
  espera?: number;
  desenhos?: DesenhoV2;
  pausaManual: boolean;
};

export type EtapaDoAlunoV2 =
  | {
      id: string;
      tipo: "introducao";
      rotulo: string;
      /** Na forma do `IntroStage`: cada quadro com a FEN já resolvida. */
      passos: Array<{ fala: string; fen: string; arrows?: [string, string][]; highlights?: string[] }>;
    }
  | {
      id: string;
      tipo: "capitulo";
      rotulo: string;
      titulo: string;
      resumo: string;
      fen: string;
      orientacao: "white" | "black";
      passos: PassoDoCapituloDoAlunoV2[];
    }
  | {
      id: string;
      tipo: "treino";
      rotulo: string;
      entidadeId: string;
      revisao: string;
      perfil: "final-certificado" | "linha-autoral";
      jogavel: TreinoJogavel;
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
    };

export type AulaDoAlunoV2 = {
  id: string;
  titulo: string;
  publicationId: string;
  orientacao: "white" | "black";
  etapas: EtapaDoAlunoV2[];
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
  const padrao = { introducao: "Apresentação", capitulo: "Aula", treino: "Treino", pratica: "Prática real" }[tipo];
  return quantos > 1 ? titulo : padrao;
}

export function etapasDoAlunoV2(aula: AulaV2, positions: Record<string, Position>, revisoes: PacoteV2["revisoes"]): EtapaDoAlunoV2[] {
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
        passos: introducao.quadros.map((quadro) => ({
          fala: quadro.texto,
          fen: quadro.posicao.tipo === "fen" ? quadro.posicao.fen : quadroDoNo(aula, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId, positions).fen,
          ...desenhoCurto(quadro.desenhos),
        })),
      });
    } else if (etapa.tipo === "capitulo") {
      const capitulo = aula.capitulos.find((item) => item.id === etapa.entidadeId);
      const trecho = capitulo ? trechos.get(capitulo.id) : undefined;
      if (!capitulo || !trecho || !trecho.passos.length) continue;
      etapas.push({
        id: etapa.id,
        tipo: "capitulo",
        rotulo: rotuloDe(aula, "capitulo", capitulo.titulo),
        titulo: capitulo.titulo,
        resumo: capitulo.resumo ?? "",
        fen: trecho.fen,
        orientacao: trecho.orientacao,
        passos: trecho.passos.map((passo) => ({
          fala: passo.fala,
          ...(passo.lance ? { lance: passo.lance } : {}),
          ...(passo.esperaMs ? { espera: passo.esperaMs } : {}),
          ...(passo.desenhos ? { desenhos: passo.desenhos } : {}),
          pausaManual: passo.pausaManual,
        })),
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
        jogavel: treinoJogavel(aula, treino.id, positions),
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

/** O pacote publicado, pronto para o player do aluno. */
export function aulaDoAlunoV2(pacote: PacoteV2): AulaDoAlunoV2 {
  const positions = posicoesDoPacoteV2(pacote);
  return {
    id: pacote.aula.id,
    titulo: pacote.aula.titulo,
    publicationId: pacote.publicationId,
    orientacao: pacote.aula.metadados?.orientacaoPadrao ?? "white",
    etapas: etapasDoAlunoV2(pacote.aula, positions, pacote.revisoes),
  };
}
