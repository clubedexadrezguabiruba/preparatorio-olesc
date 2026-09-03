import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { puzzlePorId } from "./banco.ts";
import { conferirSolucao } from "./conferir.ts";
import { ETAPAS, type Etapa } from "./serie.ts";

/** O que o navegador manda: o que foi **jogado**, nunca um "acertei". */
export type Tentativa = {
  puzzleId: string;
  /** O tema em que o aluno estava — é ele que conta no progresso. */
  tema: string;
  /** O tema por cujo arquivo o puzzle foi servido. Na prova, os dois diferem. */
  origem: string;
  modo: Etapa;
  /** Os lances do aluno, em UCI, na primeira tentativa deste puzzle. */
  lances: string[];
  tempoMs: number;
};

export type Resultado = { acertou: boolean } | { erro: string };

/** Meia hora. Acima disso é aba esquecida aberta, não puzzle pensado. */
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

/**
 * Confere a tentativa contra o banco e grava a linha.
 *
 * ## O acerto é derivado aqui, e não recebido
 *
 * O parâmetro é `lances`, e não `acertou`. É a diferença entre um servidor que
 * julga e um que anota o que lhe disseram: com um campo booleano vindo do
 * navegador, "resolvi 300 puzzles" seria uma chamada de rede a escrever, e o
 * relatório que decide a escalação do time viraria ficção.
 *
 * A conferência é a mesma função que o tabuleiro do aluno usou para dizer
 * "certo" na tela (`lib/tatica/conferir.ts`) — um juiz só, dois lugares.
 *
 * ## Quem escreve é a chave de serviço
 *
 * `tentativas_puzzle` não tem política de `insert` para ninguém (ver
 * `0001_fundacao.sql`): nem o aluno logado nem o anônimo gravam ali. A única
 * chave que passa é a de serviço, que roda só no servidor — e que **ignora
 * toda a RLS**. Ela não sabe quem pediu e não vai perguntar; por isso o `aluno`
 * chega aqui **já conferido** pela server action, tirado do cookie de sessão, e
 * nunca de um id que veio no corpo da chamada.
 *
 * ## Por que isto não é a própria server action
 *
 * Porque uma server action só existe dentro de uma requisição do Next, e o que
 * precisa de prova é justamente o que está aqui: ler o arquivo do puzzle do
 * disco, julgar a linha, gravar. `scripts/verificar-tatica.ts` chama esta
 * função contra o banco de verdade. O que fica de fora do script é a casca —
 * `perfilAtual()` —, e essa a `verificar-rls.ts` já cobre por outro lado.
 *
 * ## O que isto não resolve
 *
 * Os puzzles são servidos ao navegador — é assim que eles chegam ao celular, e
 * no Lichess é igual. Um aluno determinado abre o JSON do tema e copia a
 * solução. Contra isso sobra o `tempo_ms`, que fica gravado ao lado: trinta
 * puzzles a dois segundos cada aparecem no relatório do professor como o que
 * são.
 */
export async function gravarTentativa(aluno: string, tentativa: Tentativa): Promise<Resultado> {
  const { puzzleId, tema, origem, modo, lances, tempoMs } = tentativa;

  if (!ETAPAS.includes(modo)) return { erro: "modo desconhecido" };
  if (typeof puzzleId !== "string" || typeof tema !== "string" || typeof origem !== "string") {
    return { erro: "tentativa malformada" };
  }
  if (!Array.isArray(lances) || lances.some((l) => typeof l !== "string")) {
    return { erro: "tentativa malformada" };
  }

  const puzzle = await puzzlePorId(origem, puzzleId);
  // Puzzle que não existe naquele tema: ou o recorte mudou embaixo de uma aba
  // aberta, ou alguém inventou o id. Nos dois casos, não vira linha no banco.
  if (!puzzle) return { erro: "puzzle desconhecido" };

  const acertou = conferirSolucao(puzzle, lances);

  const { error } = await criarClienteAdmin().from("tentativas_puzzle").insert({
    aluno,
    puzzle_id: puzzle.id,
    tema,
    acertou,
    tempo_ms: Math.min(Math.max(0, Math.round(tempoMs) || 0), TEMPO_MAXIMO_MS),
    modo,
  });

  if (error) return { erro: error.message };
  return { acertou };
}
