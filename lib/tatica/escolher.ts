import "server-only";
import { amostraDeTemas, faixaMaisFacil, puzzlesDoTema } from "./banco.ts";
import type { PuzzleServido } from "./puzzles.ts";
import {
  candidatosDeAquecimento,
  emOrdemDeRating,
  misturar,
  semRepetidos,
  sortear,
  vagasParaErrados,
  type Etapa,
} from "./serie.ts";

/**
 * A escolha dos puzzles de uma rodada — o que a página do tema serve.
 *
 * Morava dentro de `app/tatica/[tema]/page.tsx`. Saiu de lá na F2 por um
 * motivo só: a regra "os errados voltam na prova" precisa de prova contra o
 * banco de verdade (`scripts/verificar-tatica.ts`), e uma função dentro de uma
 * página do Next não é alcançável de um script. A página continua decidindo
 * **quando** chamar; o **como** mora aqui.
 *
 * ## A prova, em três fatias
 *
 * 1. Primeiro os puzzles que o aluno **errou neste tema** e ainda não levou à
 *    prova — até metade das vagas (`vagasParaErrados`). Eles são repetidos de
 *    propósito, e por isso não passam por `sortear`, que exclui o já visto.
 * 2. Depois metade do que sobrou com puzzles novos do tema.
 * 3. E o resto de até três temas que o aluno já viu, misturados — reconhecer o
 *    motivo sem que ninguém diga o nome é o que acontece na partida.
 *
 * Tudo fora de ordem no fim (`misturar`), e sem id repetido: o braço de "fim
 * do banco" de `sortear` pode devolver um puzzle que já entrou pela fatia 1.
 */
export async function escolherPuzzles({
  tag,
  etapa,
  faltam,
  semente,
  jaVistos,
  outrosTemas,
  errados,
}: {
  tag: string;
  etapa: Etapa;
  faltam: number;
  semente: string;
  jaVistos: ReadonlySet<string>;
  outrosTemas: string[];
  /** Ids errados neste tema que a prova deve servir primeiro. Só a prova lê. */
  errados: readonly string[];
}): Promise<PuzzleServido[]> {
  if (etapa === "aquecimento") {
    const candidatos = candidatosDeAquecimento(await faixaMaisFacil(tag));
    return emOrdemDeRating(sortear(candidatos, faltam, semente, jaVistos)).map((p) => ({
      ...p,
      origem: tag,
    }));
  }

  if (etapa === "serie") {
    return emOrdemDeRating(sortear(await puzzlesDoTema(tag), faltam, semente, jaVistos)).map(
      (p) => ({ ...p, origem: tag }),
    );
  }

  const doDisco = await puzzlesDoTema(tag);

  // Fatia 1: os errados. Aquecimento e série só servem do arquivo do próprio
  // tema, então a origem deles é sempre a tag.
  const erradosSet = new Set(errados);
  const repetir = misturar(
    doDisco.filter((p) => erradosSet.has(p.id)),
    `${semente}:errados`,
  )
    .slice(0, vagasParaErrados(faltam, errados.length))
    .map((p) => ({ ...p, origem: tag }));

  const restantes = faltam - repetir.length;

  // Três temas anteriores, e não todos: cada um custa a leitura de um arquivo,
  // e a prova tem poucas vagas para dividir.
  const anteriores = outrosTemas.slice(0, 3);
  const quantosDaqui = anteriores.length ? Math.ceil(restantes / 2) : restantes;

  const doTema = sortear(doDisco, quantosDaqui, semente, jaVistos).map((p) => ({
    ...p,
    origem: tag,
  }));

  const deOutros = anteriores.length
    ? sortear(
        await amostraDeTemas(anteriores),
        restantes - doTema.length,
        `${semente}:mistura`,
        jaVistos,
      ).map((p) => ({
        ...p,
        // A origem é o tema de onde o arquivo veio. Sem ela, o servidor
        // procuraria a solução no arquivo do tema atual e recusaria a
        // tentativa como "puzzle desconhecido".
        origem: anteriores.find((t) => p.temas.includes(t)) ?? anteriores[0],
      }))
    : [];

  return misturar(semRepetidos([...repetir, ...doTema, ...deOutros]), semente);
}
