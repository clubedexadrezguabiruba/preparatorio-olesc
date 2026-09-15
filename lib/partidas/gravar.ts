import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { carregarPartida } from "./carregar.ts";
import { situacaoDaPartida, type LinhaDeMomento } from "./concluir.ts";
import { julgarResposta, type Resposta } from "./momentos.ts";

/**
 * Grava um lance jogado num momento de decisão, no molde de `lib/tatica/gravar.ts`.
 *
 * ## O navegador manda o lance; o servidor julga
 *
 * O parâmetro é `uci`, nunca `acertou`. O veredito sai de {@link julgarResposta},
 * a mesma função que o tabuleiro usou para reagir na tela — um juiz só, dois
 * lugares. E "concluída" é derivada das linhas gravadas (`concluir.ts`), nunca
 * recebida.
 *
 * ## Quem escreve é a chave de serviço
 *
 * `tentativa_partida_momento` não tem política de insert (ver `0011_partidas.sql`).
 * A chave de serviço ignora a RLS, então o `aluno` chega aqui **já conferido**
 * pela server action, tirado do cookie de sessão.
 */

export type LanceJogado = {
  partida: string;
  /** O `n` do momento. */
  momento: number;
  uci: string;
  /** 1 + quantos erros o aluno já cometeu neste momento, nesta série. */
  tentativa: number;
  /** 0 nenhuma · 1 texto de ajuda · 2 casa de origem · 3 lance revelado. */
  apoio: number;
  tempoMs: number;
};

export type Gravado = { resposta: Resposta; concluida: boolean } | { erro: string };

const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

export async function gravarLance(aluno: string, lance: LanceJogado, verRascunho: boolean): Promise<Gravado> {
  const { partida: slug, momento: n, uci, tentativa, apoio, tempoMs } = lance ?? ({} as LanceJogado);
  if (
    typeof slug !== "string" ||
    typeof uci !== "string" ||
    !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci) ||
    !Number.isInteger(n) ||
    !Number.isInteger(tentativa) ||
    tentativa < 1 ||
    !Number.isInteger(apoio) ||
    apoio < 0 ||
    apoio > 3
  ) {
    return { erro: "lance malformado" };
  }

  // Partida em rascunho só grava para quem pode vê-la: o aluno não a abre, e um
  // POST direto não vira linha de um conteúdo que ele não tem.
  const partida = await carregarPartida(slug, verRascunho);
  const momento = partida?.momentos.find((m) => m.n === n);
  if (!partida || !momento) return { erro: "momento desconhecido" };

  const resposta = julgarResposta(momento, uci);
  const admin = criarClienteAdmin();
  const { error } = await admin.from("tentativa_partida_momento").insert({
    aluno,
    partida: partida.slug,
    momento: momento.n,
    versao: momento.versao,
    resposta_uci: uci,
    acertou: resposta === "certo",
    boa: resposta === "boa",
    tentativa: Math.min(tentativa, 100),
    apoio,
    tempo_ms: Math.min(Math.max(0, Math.round(tempoMs) || 0), TEMPO_MAXIMO_MS),
  });
  if (error) return { erro: error.message };

  if (resposta !== "certo") return { resposta, concluida: false };

  const { data, error: erroLeitura } = await admin
    .from("tentativa_partida_momento")
    .select("momento, versao, acertou, tentativa, apoio")
    .eq("aluno", aluno)
    .eq("partida", partida.slug)
    .eq("acertou", true);
  if (erroLeitura) return { resposta, concluida: false };
  return {
    resposta,
    concluida: situacaoDaPartida(partida.momentos, (data ?? []) as LinhaDeMomento[]).concluida,
  };
}
