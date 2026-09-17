import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { todasAsPaginas } from "@/lib/supabase/paginar";
import { lerIndiceDoRating } from "@/lib/tatica/banco";
import { temasDaTentativa } from "@/lib/tatica/rating-historico";
import { faltaNoTema, grauDaMedida, medidaDoTema, type Grau, type MedidaDoTema, type TentativaDoTema } from "./grau.ts";

/**
 * O grau de cada tema de tática, lido do banco e do acervo (17/9/2026).
 *
 * Duas leituras que já existem, e nenhuma tabela nova:
 *
 * - **`tentativas_puzzle` inteira do aluno**, paginada (`todasAsPaginas` — a API para em 1.000 linhas
 *   sem avisar), em todos os modos. Cada tentativa pertence aos temas que o problema traz
 *   (`temasDaTentativa`: os gravados na 0014, ou o arquivo de onde veio);
 * - **`rating-indice.json`**, que já mora em memória para o modo rating: dá o rating de cada puzzle
 *   (o peso) e, por tema, o quartil de cima (o que conta como "difícil" naquele tema).
 *
 * Quem filtra o aluno é a RLS do cliente de sessão, como em `lib/tatica/progresso.ts`: o aluno só lê
 * as linhas dele.
 */

export type GrauDoTema = { readonly grau: Grau; readonly medida: MedidaDoTema; readonly falta: string | null };

type Acervo = { rating: ReadonlyMap<string, number>; dificil: ReadonlyMap<string, number>; dificilGeral: number };

let acervoEmMemoria: Promise<Acervo> | null = null;

/**
 * O rating por id e o limiar de "difícil" por tema — o 3.º quartil do acervo daquele arquivo.
 * Medido em 17/9/2026: entre 1184 (blindSwineMate) e 1966 (underPromotion); 1780 no acervo todo.
 */
function acervo(): Promise<Acervo> {
  acervoEmMemoria ??= lerIndiceDoRating().then(
    (linhas) => {
      const rating = new Map<string, number>();
      const porOrigem = new Map<string, number[]>();
      for (const [id, origem, r] of linhas) {
        rating.set(id, r);
        const lista = porOrigem.get(origem) ?? [];
        lista.push(r);
        porOrigem.set(origem, lista);
      }
      const quartil = (valores: number[]) => {
        const ordenados = [...valores].sort((a, b) => a - b);
        return ordenados[Math.floor((ordenados.length - 1) * 0.75)] ?? 1780;
      };
      const dificil = new Map([...porOrigem].map(([origem, valores]) => [origem, quartil(valores)]));
      return { rating, dificil, dificilGeral: quartil(linhas.map((l) => l[2])) };
    },
    (erro) => {
      acervoEmMemoria = null;
      throw erro;
    },
  );
  return acervoEmMemoria;
}

type LinhaCrua = {
  puzzle_id: string;
  tema: string;
  origem: string | null;
  temas: string[] | null;
  acertou: boolean;
  criada_em: string;
};

/** O grau de todos os temas em que o aluno tem ao menos uma tentativa. */
export async function grausDosTemas(aluno: string): Promise<Map<string, GrauDoTema>> {
  const cliente = await criarClienteServidor();
  const [linhas, { rating, dificil, dificilGeral }] = await Promise.all([
    todasAsPaginas<LinhaCrua>((de, ate) =>
      cliente
        .from("tentativas_puzzle")
        .select("puzzle_id, tema, origem, temas, acertou, criada_em")
        .eq("aluno", aluno)
        .order("criada_em")
        .order("id")
        .range(de, ate),
    ),
    acervo(),
  ]);

  const porTema = new Map<string, TentativaDoTema[]>();
  for (const linha of linhas) {
    const tentativa: TentativaDoTema = {
      acertou: linha.acertou,
      rating: rating.get(linha.puzzle_id) ?? null,
      criadaEm: linha.criada_em,
    };
    for (const tag of temasDaTentativa(linha.origem ?? linha.tema, linha.temas)) {
      const lista = porTema.get(tag) ?? [];
      lista.push(tentativa);
      porTema.set(tag, lista);
    }
  }

  const graus = new Map<string, GrauDoTema>();
  for (const [tag, tentativas] of porTema) {
    const medida = medidaDoTema(tentativas, { dificil: dificil.get(tag) ?? dificilGeral });
    graus.set(tag, { grau: grauDaMedida(medida), medida, falta: faltaNoTema(medida) });
  }
  return graus;
}
