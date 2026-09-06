import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ProgressoDaLinha } from "@/lib/repertorio/treino";

/**
 * A leitura do progresso do repertório, num lugar só.
 *
 * Três telas fazem a mesma pergunta — o painel, a lista de aberturas e a página
 * da abertura. Três consultas escritas em três arquivos seriam três chances de
 * o painel dizer 18 e a lista dizer 17, com o aluno olhando as duas.
 *
 * Quem filtra por aluno é a **RLS**, não este código: a política de
 * `repertorio_progresso` só deixa passar as linhas de quem está logado (e todas,
 * se for o professor). O parâmetro `aluno` existe para o relatório escolher
 * *qual* aluno olhar, e não para proteger nada — se ele fosse a proteção,
 * apagá-lo não mudaria nada na tela e mudaria tudo na segurança.
 *
 * **Sem paginação de propósito.** São 42 linhas no Base, uma por aluno, contra
 * o corte de 1.000 do PostgREST. Quando o Avançado dobrar isso, ainda sobra
 * folga de vinte vezes.
 */

type LinhaDaTabela = {
  linha: string;
  acertos_seguidos: number;
  tentativas: number;
  erros: number;
  aprendida_em: string | null;
  ultima_em: string | null;
  degrau: number;
  revisar_em: string | null;
};

/** O progresso por id de linha. Linha que o aluno nunca abriu não aparece. */
export async function progressoDoRepertorio(
  aluno?: string,
): Promise<Map<string, ProgressoDaLinha>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("repertorio_progresso")
    .select(
      "linha, acertos_seguidos, tentativas, erros, aprendida_em, ultima_em, degrau, revisar_em",
    );
  if (aluno) consulta = consulta.eq("aluno", aluno);

  const { data } = await consulta;
  const mapa = new Map<string, ProgressoDaLinha>();

  for (const l of (data ?? []) as LinhaDaTabela[]) {
    mapa.set(l.linha, {
      acertosSeguidos: l.acertos_seguidos,
      tentativas: l.tentativas,
      erros: l.erros,
      aprendidaEm: l.aprendida_em,
      ultimaEm: l.ultima_em,
      degrau: l.degrau,
      revisarEm: l.revisar_em,
    });
  }

  return mapa;
}
