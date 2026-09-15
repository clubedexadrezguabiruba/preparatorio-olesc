import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { lerIndiceDoRating, puzzlePorId } from "./banco.ts";
import { conferirSolucao } from "./conferir.ts";
import { aposPuzzle, INICIO } from "./glicko2.ts";
import type { PuzzleServido } from "./puzzles.ts";
import { escolherPorRating } from "./rating-escolher.ts";
import type { EstadoDoRating, LinhaDoIndice, RespostaDoRating } from "./rating.ts";

export type { EstadoDoRating, RespostaDoRating } from "./rating.ts";

/**
 * O servidor do modo "tática com rating": servir o problema e julgar a resposta.
 *
 * ## Por que não é `gravarTentativa`
 *
 * Nos outros modos a tentativa é uma linha solta: o servidor julga e anota. Aqui
 * a resposta mexe num **estado** — o rating, a sequência, o problema seguinte —
 * e dois pedidos iguais não podem mexer duas vezes. Então há duas regras que
 * `gravar.ts` não tem, e que moram aqui:
 *
 * 1. **O problema é do servidor.** Ele sorteia e grava em
 *    `rating_tatica.puzzle_pendente`; o navegador só pode responder àquele. Um
 *    F5 traz o mesmo problema, e o aluno não foge de um difícil nem escolhe um
 *    fácil mandando outro id.
 * 2. **A resposta é aceita uma vez só.** Ver `responderRating`.
 *
 * Como em `gravar.ts`, o `aluno` chega **já conferido** — a server action o tira
 * de `perfilAtual()`, nunca do corpo da chamada — e quem escreve é a chave de
 * serviço, que ignora a RLS. E, como lá, isto é função e não a própria action
 * para `scripts/verificar-tatica-rating.ts` provar a corrente contra o banco.
 *
 * ## O risco conhecido, aceito
 *
 * A solução está no JSON público do tema, como documentam `gravar.ts` e
 * `conferir.ts`: um aluno determinado abre o arquivo e copia. Aqui ele ainda
 * precisaria achar o id pendente em 147 mil. O que sobra contra isso é o
 * `tempo_ms`, que aqui nem vem do navegador: é medido pelo servidor, de
 * `pendente_desde` até a resposta.
 */

/** Meia hora, como em `gravar.ts`: acima disso é aba esquecida, não problema pensado. */
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

/** Quantos lances uma resposta pode ter. O maior puzzle do recorte tem menos de 20. */
const LANCES_MAXIMOS = 40;

type LinhaDoRating = {
  aluno: string;
  rating: number;
  rd: number;
  volatilidade: number;
  sequencia: number;
  melhor_sequencia: number;
  rating_maximo: number;
  resolvidos: number;
  puzzle_pendente: string | null;
  tema_pendente: string | null;
  pendente_desde: string | null;
};

export type Servido = { readonly puzzle: PuzzleServido; readonly estado: EstadoDoRating };

export type Opcoes = {
  /** Um número em [0, 1). O servidor usa `Math.random`; o script, também. */
  readonly sorteio?: () => number;
  /** O relógio, em ms. Existe para o script provar a medida do tempo. */
  readonly agora?: () => number;
};

const COLUNAS =
  "aluno, rating, rd, volatilidade, sequencia, melhor_sequencia, rating_maximo, resolvidos, puzzle_pendente, tema_pendente, pendente_desde";

type Cliente = ReturnType<typeof criarClienteAdmin>;

function estadoDe(linha: LinhaDoRating): EstadoDoRating {
  return {
    rating: linha.rating,
    sequencia: linha.sequencia,
    melhorSequencia: linha.melhor_sequencia,
    ratingMaximo: linha.rating_maximo,
    resolvidos: linha.resolvidos,
  };
}

async function lerLinha(db: Cliente, aluno: string): Promise<LinhaDoRating | null> {
  const { data, error } = await db.from("rating_tatica").select(COLUNAS).eq("aluno", aluno).maybeSingle();
  if (error) throw new Error(error.message);
  return data as LinhaDoRating | null;
}

/**
 * Todos os ids que o aluno já viu, em qualquer modo e em qualquer tema.
 *
 * É a regra de `puzzlesJaVistos()` (`lib/tatica/progresso.ts`) — "não repete
 * nada que o aluno já viu, em qualquer modo", decisão do Doug de 15/9 —, com
 * duas diferenças que o caminho daqui exige: roda com a chave de serviço,
 * filtrando o aluno à mão (o script não tem cookie de sessão), e **pagina**. A
 * API do Supabase devolve no máximo 1.000 linhas por consulta, e um aluno que
 * treina 2 h por dia passa disso em dois meses: sem a paginação, o problema
 * visto há dois meses voltaria como novo.
 */
async function idsJaVistos(db: Cliente, aluno: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await db
      .from("tentativas_puzzle")
      .select("puzzle_id")
      .eq("aluno", aluno)
      .order("id")
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    for (const l of data ?? []) ids.add((l as { puzzle_id: string }).puzzle_id);
    if (!data || data.length < PAGINA) return ids;
  }
}

async function sortear(
  db: Cliente,
  aluno: string,
  rating: number,
  tambemVistos: readonly string[],
  sorteio: () => number,
): Promise<LinhaDoIndice | null> {
  const [indice, vistos] = await Promise.all([lerIndiceDoRating(), idsJaVistos(db, aluno)]);
  for (const id of tambemVistos) vistos.add(id);
  return escolherPorRating(indice, rating, vistos, sorteio);
}

async function carregar(linha: LinhaDoIndice | null): Promise<PuzzleServido | null> {
  if (!linha) return null;
  const puzzle = await puzzlePorId(linha[1], linha[0]);
  return puzzle ? { ...puzzle, origem: linha[1] } : null;
}

/**
 * O problema pendente do aluno — e, se não há, sorteia e grava um.
 *
 * **Idempotente**: chamar de novo não sorteia de novo nem cria segunda linha. É
 * o que a página chama a cada abertura, e é por isso que recarregar traz o mesmo
 * problema.
 *
 * 1. Cria a linha inicial (400/350/0,06) com `upsert ignoreDuplicates` — a
 *    segunda chamada não sobrescreve nada.
 * 2. Sem pendente, sorteia e grava com `update … where puzzle_pendente is null`:
 *    duas abas abertas ao mesmo tempo sorteiam cada uma, e só uma gravação casa.
 *    A volta seguinte relê e devolve a que ficou.
 * 3. Pendente que sumiu do disco (o recorte foi refeito): limpa e sorteia de novo.
 */
export async function garantirPendente(aluno: string, opcoes: Opcoes = {}): Promise<Servido | { erro: string }> {
  const sorteio = opcoes.sorteio ?? Math.random;
  const agora = opcoes.agora ?? Date.now;
  const db = criarClienteAdmin();

  const { error: erroAoCriar } = await db
    .from("rating_tatica")
    .upsert(
      { aluno, rating: INICIO.rating, rd: INICIO.rd, volatilidade: INICIO.volatilidade, rating_maximo: INICIO.rating },
      { onConflict: "aluno", ignoreDuplicates: true },
    );
  if (erroAoCriar) return { erro: erroAoCriar.message };

  // Três voltas bastam: uma para sortear, uma para reler o que ficou, e uma de
  // folga para o pendente que sumiu do disco.
  for (let volta = 0; volta < 3; volta++) {
    const linha = await lerLinha(db, aluno);
    if (!linha) return { erro: "a linha do rating não foi criada" };

    if (linha.puzzle_pendente && linha.tema_pendente) {
      const puzzle = await puzzlePorId(linha.tema_pendente, linha.puzzle_pendente);
      if (puzzle) return { puzzle: { ...puzzle, origem: linha.tema_pendente }, estado: estadoDe(linha) };

      const { error } = await db
        .from("rating_tatica")
        .update({ puzzle_pendente: null, tema_pendente: null, pendente_desde: null })
        .eq("aluno", aluno)
        .eq("puzzle_pendente", linha.puzzle_pendente);
      if (error) return { erro: error.message };
      continue;
    }

    const escolhido = await sortear(db, aluno, linha.rating, [], sorteio);
    if (!escolhido) return { erro: "você já viu todos os problemas do banco" };

    const { error } = await db
      .from("rating_tatica")
      .update({
        puzzle_pendente: escolhido[0],
        tema_pendente: escolhido[1],
        pendente_desde: new Date(agora()).toISOString(),
      })
      .eq("aluno", aluno)
      .is("puzzle_pendente", null);
    if (error) return { erro: error.message };
  }

  return { erro: "não deu para servir um problema" };
}

/**
 * Julga a resposta ao problema pendente, move o rating e serve o próximo.
 *
 * ## A ordem é a trava contra a corrida
 *
 * 1. Lê a linha, julga os lances com `conferirSolucao`, calcula o Glicko-2 e o
 *    tempo (`agora − pendente_desde`, com teto de 30 min) e sorteia o próximo.
 * 2. **Primeiro** o `update` do rating, com
 *    `where aluno = X and puzzle_pendente = P` e `.select()`.
 * 3. Voltou zero linhas: outro pedido já respondeu P. Recusa, sem gravar nada.
 * 4. **Só então** a linha de `tentativas_puzzle`.
 *
 * Dois pedidos iguais em paralelo (duplo clique, reenvio depois de rede ruim)
 * leem o mesmo estado e calculam o mesmo resultado — mas o Postgres faz o
 * segundo `update` esperar o primeiro e reavaliar o `where` na linha nova, onde
 * `puzzle_pendente` já é o próximo. Só um grava, e só um insere a tentativa.
 * Inserir primeiro inverteria isso: as duas tentativas entrariam antes de a
 * trava recusar a segunda.
 *
 * ## O reenvio devolve a mesma resposta
 *
 * Se a resposta se perdeu na rede e o navegador reenvia, o pendente já é outro.
 * Em vez de só recusar, a função procura a tentativa já gravada daquele problema
 * e devolve o resultado dela — é o que deixa o botão "Tentar de novo" seguro.
 */
export async function responderRating(
  aluno: string,
  puzzleId: string,
  lances: readonly string[],
  opcoes: Opcoes = {},
): Promise<RespostaDoRating> {
  const sorteio = opcoes.sorteio ?? Math.random;
  const agora = opcoes.agora ?? Date.now;

  if (typeof puzzleId !== "string" || !Array.isArray(lances) || lances.length > LANCES_MAXIMOS) {
    return { erro: "resposta malformada" };
  }
  if (lances.some((l) => typeof l !== "string" || l.length > 5)) return { erro: "resposta malformada" };

  const db = criarClienteAdmin();
  const linha = await lerLinha(db, aluno);
  if (!linha) return { erro: "nenhum problema pendente" };

  if (linha.puzzle_pendente !== puzzleId || !linha.tema_pendente || !linha.pendente_desde) {
    return (await respostaJaGravada(db, aluno, puzzleId, linha)) ?? { erro: "este não é o problema pendente" };
  }

  const origem = linha.tema_pendente;
  const puzzle = await puzzlePorId(origem, puzzleId);
  // O recorte mudou embaixo de uma aba aberta: nada é gravado, e a página, ao
  // recarregar, troca o pendente (`garantirPendente`, passo 3).
  if (!puzzle) return { erro: "o problema pendente não existe mais" };

  const acertou = conferirSolucao(puzzle, lances);
  const depois = aposPuzzle(linha, puzzle.rating, acertou);
  const sequencia = acertou ? linha.sequencia + 1 : 0;
  const melhorSequencia = Math.max(linha.melhor_sequencia, sequencia);
  const decorrido = agora() - Date.parse(linha.pendente_desde);
  const tempoMs = Math.min(Math.max(0, Math.round(decorrido) || 0), TEMPO_MAXIMO_MS);

  const proximoNoIndice = await sortear(db, aluno, depois.rating, [puzzleId], sorteio);

  const { data: atualizadas, error: erroNoRating } = await db
    .from("rating_tatica")
    .update({
      rating: depois.rating,
      rd: depois.rd,
      volatilidade: depois.volatilidade,
      sequencia,
      melhor_sequencia: melhorSequencia,
      rating_maximo: Math.max(linha.rating_maximo, depois.rating),
      resolvidos: linha.resolvidos + 1,
      puzzle_pendente: proximoNoIndice?.[0] ?? null,
      tema_pendente: proximoNoIndice?.[1] ?? null,
      pendente_desde: proximoNoIndice ? new Date(agora()).toISOString() : null,
      atualizado_em: new Date(agora()).toISOString(),
    })
    .eq("aluno", aluno)
    .eq("puzzle_pendente", puzzleId)
    .select("aluno");

  if (erroNoRating) return { erro: erroNoRating.message };
  if (!atualizadas || atualizadas.length === 0) {
    return (await respostaJaGravada(db, aluno, puzzleId, null)) ?? { erro: "este problema já foi respondido" };
  }

  const { error: erroNaTentativa } = await db.from("tentativas_puzzle").insert({
    aluno,
    puzzle_id: puzzle.id,
    tema: origem,
    origem,
    acertou,
    tempo_ms: tempoMs,
    modo: "rating",
    rating_antes: linha.rating,
    rating_depois: depois.rating,
    rd_depois: depois.rd,
  });

  return {
    acertou,
    delta: depois.delta,
    rating: depois.rating,
    sequencia,
    melhorSequencia,
    solucao: puzzle.lances,
    proximo: await carregar(proximoNoIndice),
    // O rating já andou e o próximo já está pendente: recusar agora deixaria o
    // aluno preso num problema que o servidor não aceita mais. Segue, e avisa.
    aviso: erroNaTentativa ? `o histórico não gravou esta tentativa (${erroNaTentativa.message})` : null,
  };
}

/**
 * A resposta que já foi aceita para `puzzleId`, reconstruída da tentativa — ou
 * `null` se não há. `linha` é o estado atual, quando já foi lido.
 */
async function respostaJaGravada(
  db: Cliente,
  aluno: string,
  puzzleId: string,
  linha: LinhaDoRating | null,
): Promise<RespostaDoRating | null> {
  const { data } = await db
    .from("tentativas_puzzle")
    .select("origem, acertou, rating_antes, rating_depois")
    .eq("aluno", aluno)
    .eq("puzzle_id", puzzleId)
    .eq("modo", "rating")
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const gravada = data as { origem: string; acertou: boolean; rating_antes: number; rating_depois: number } | null;
  if (!gravada || gravada.rating_antes === null || gravada.rating_depois === null) return null;

  const atual = linha ?? (await lerLinha(db, aluno));
  const puzzle = await puzzlePorId(gravada.origem, puzzleId);
  const proximo =
    atual?.puzzle_pendente && atual.tema_pendente ? await carregar([atual.puzzle_pendente, atual.tema_pendente, 0]) : null;

  return {
    acertou: gravada.acertou,
    delta: Math.round(gravada.rating_depois) - Math.round(gravada.rating_antes),
    rating: gravada.rating_depois,
    sequencia: atual?.sequencia ?? 0,
    melhorSequencia: atual?.melhor_sequencia ?? 0,
    solucao: puzzle?.lances ?? [],
    proximo,
    aviso: null,
  };
}
