/**
 * A ordem da aula — especificação §18, fatia 10.
 *
 * O `fluxo` é a única ordem: introdução, capítulos, treinos e prática, cada etapa com id estável.
 * Mover uma etapa muda só o `fluxo`; nenhuma entidade muda de id, e a revisão da avaliação não
 * muda (§10: "reordenação não invalida domínio").
 */
import type { AulaV2 } from "./modelo.ts";

type Etapa = AulaV2["fluxo"][number];

/** Onde entra uma etapa nova que não disse onde: antes da primeira prática, ou no fim. */
export function indiceAntesDaPratica(fluxo: Etapa[]): number {
  const pratica = fluxo.findIndex((etapa) => etapa.tipo === "pratica");
  return pratica < 0 ? fluxo.length : pratica;
}

/** Move a etapa para a posição `para` (0 = primeira). Mesma posição não é edição. */
export function moverEtapa(aula: AulaV2, etapaId: string, para: number): AulaV2 {
  const de = aula.fluxo.findIndex((etapa) => etapa.id === etapaId);
  if (de < 0) throw new Error("esta etapa não está mais na aula");
  if (!Number.isInteger(para) || para < 0 || para >= aula.fluxo.length) throw new Error("o destino da etapa não existe");
  if (para === de) return aula;
  const fluxo = [...aula.fluxo];
  const [etapa] = fluxo.splice(de, 1);
  fluxo.splice(para, 0, etapa);
  return { ...aula, fluxo };
}

/**
 * Exclui um treino e a etapa dele (§8.4 pede o mesmo cuidado dos capítulos: pelo `•••`, com
 * confirmação e Desfazer). Nada mais depende de um treino dentro da aula.
 */
export function excluirTreino(aula: AulaV2, treinoId: string): AulaV2 {
  if (!aula.treinos.some((treino) => treino.id === treinoId)) return aula;
  return {
    ...aula,
    treinos: aula.treinos.filter((treino) => treino.id !== treinoId),
    fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "treino" && etapa.entidadeId === treinoId)),
  };
}

const ROTULO_DO_TIPO: Record<Etapa["tipo"], string> = { introducao: "Introdução", capitulo: "Capítulo", treino: "Treino", pratica: "Prática" };

/** O nome da entidade de uma etapa, como o professor a escreveu. */
export function nomeDaEtapa(aula: AulaV2, etapa: Etapa): string {
  const entidade =
    etapa.tipo === "introducao" ? aula.introducoes.find((item) => item.id === etapa.entidadeId)
      : etapa.tipo === "capitulo" ? aula.capitulos.find((item) => item.id === etapa.entidadeId)
        : etapa.tipo === "treino" ? aula.treinos.find((item) => item.id === etapa.entidadeId)
          : aula.praticas.find((item) => item.id === etapa.entidadeId);
  return entidade?.titulo ?? "(parte que não existe mais)";
}

/** As linhas da "Ordem da aula": tipo, nome e a frase humana do lugar (§18: "após capítulo"). */
export function etapasNaOrdem(aula: AulaV2): Array<{ etapa: Etapa; rotulo: string; nome: string; lugar: string }> {
  return aula.fluxo.map((etapa, indice) => {
    const anterior = indice > 0 ? aula.fluxo[indice - 1] : null;
    const capituloAntes = [...aula.fluxo.slice(0, indice)].reverse().find((item) => item.tipo === "capitulo");
    const lugar = !anterior
      ? "abre a aula"
      : capituloAntes
        ? `depois do capítulo «${nomeDaEtapa(aula, capituloAntes)}»`
        : `depois ${anterior.tipo === "introducao" ? "da introdução" : `de «${nomeDaEtapa(aula, anterior)}»`}`;
    return { etapa, rotulo: ROTULO_DO_TIPO[etapa.tipo], nome: nomeDaEtapa(aula, etapa), lugar };
  });
}
