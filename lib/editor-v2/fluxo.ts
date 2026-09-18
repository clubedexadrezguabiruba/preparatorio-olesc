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

/**
 * O fluxo sem estes capítulos: sai a etapa de cada um, e sai também a menção dele no `comparacoes`
 * de outra etapa — a variante que some do cadastro não pode continuar sendo tocada (18/9/2026).
 */
export function fluxoSemCapitulos(fluxo: Etapa[], ids: Iterable<string>): Etapa[] {
  const fora = new Set(ids);
  let solto = fluxo;
  for (const id of fora) solto = soltarVariantes(solto, id);
  return solto
    .filter((etapa) => !(etapa.tipo === "capitulo" && fora.has(etapa.entidadeId)))
    .map((etapa) => {
      if (!etapa.comparacoes?.some((id) => fora.has(id))) return etapa;
      const { comparacoes, ...resto } = etapa;
      const ficam = comparacoes.filter((id) => !fora.has(id));
      return ficam.length ? { ...resto, comparacoes: ficam } : resto;
    });
}

/**
 * A etapa deste capítulo larga as variantes que tocava: cada uma ganha etapa própria logo depois.
 * É o que acontece quando a mãe sai do fluxo (excluída, ou virou quadro ou treino) — sem isto a
 * variante ficaria no cadastro sem lugar na aula, e a fala que o professor escreveu nela, perdida.
 */
export function soltarVariantes(fluxo: Etapa[], capituloId: string): Etapa[] {
  const indice = fluxo.findIndex((etapa) => etapa.tipo === "capitulo" && etapa.entidadeId === capituloId);
  const mae = fluxo[indice];
  if (!mae?.comparacoes?.length) return fluxo;
  const usados = new Set(fluxo.map((etapa) => etapa.id));
  const livre = (base: string) => { let id = base; for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`; usados.add(id); return id; };
  const { comparacoes, ...semElas } = mae;
  const soltas = comparacoes.map((id) => ({ id: livre(`etapa-${id}`), tipo: "capitulo" as const, entidadeId: id }));
  return [...fluxo.slice(0, indice), semElas, ...soltas, ...fluxo.slice(indice + 1)];
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
    fluxo: fluxoSemTreino(aula.fluxo, treinoId),
  };
}

/**
 * O fluxo sem este treino: sai a etapa dele e sai a menção nas `paradas` de um capítulo — a pergunta
 * que some do cadastro não pode continuar sendo feita dentro da etapa (18/9/2026).
 */
export function fluxoSemTreino(fluxo: Etapa[], treinoId: string): Etapa[] {
  return fluxo
    .filter((etapa) => !(etapa.tipo === "treino" && etapa.entidadeId === treinoId))
    .map((etapa) => {
      if (!etapa.paradas?.includes(treinoId)) return etapa;
      const { paradas, ...resto } = etapa;
      const ficam = paradas.filter((id) => id !== treinoId);
      return ficam.length ? { ...resto, paradas: ficam } : resto;
    });
}

const ROTULO_DO_TIPO: Record<Etapa["tipo"], string> = { introducao: "Introdução", capitulo: "Capítulo", treino: "Treino", pratica: "Prática", treinador: "Treinador de lances" };

/** O nome da entidade de uma etapa, como o professor a escreveu. */
export function nomeDaEtapa(aula: AulaV2, etapa: Etapa): string {
  const entidade =
    etapa.tipo === "introducao" ? aula.introducoes.find((item) => item.id === etapa.entidadeId)
      : etapa.tipo === "capitulo" ? aula.capitulos.find((item) => item.id === etapa.entidadeId)
        : etapa.tipo === "treino" ? aula.treinos.find((item) => item.id === etapa.entidadeId)
          : etapa.tipo === "treinador" ? aula.treinadores?.find((item) => item.id === etapa.entidadeId)
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
    // As perguntas jogadas dentro do capítulo não têm etapa: o nome diz quantas são.
    const perguntas = etapa.paradas?.length ?? 0;
    const nome = `${nomeDaEtapa(aula, etapa)}${perguntas ? ` (${perguntas} ${perguntas === 1 ? "pergunta" : "perguntas"} dentro)` : ""}`;
    return { etapa, rotulo: ROTULO_DO_TIPO[etapa.tipo], nome, lugar };
  });
}
