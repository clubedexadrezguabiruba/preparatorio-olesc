import "server-only";
import { createHash } from "node:crypto";
import { hojeNoBrasil } from "../curso/calendario.ts";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { dicaPorId } from "./conteudo.ts";
import type { ItemDeLance } from "./dicas.ts";
import { lancesDoItem } from "./tentativa.ts";

/**
 * A gravação de uma resposta do treino de meio-jogo.
 *
 * ## O navegador manda o lance, nunca o acerto
 *
 * É a regra de `lib/tatica/gravar.ts:30-40`, e aqui ela pesa mais: o conteúdo
 * do treino é servido ao navegador — tem de ser, para a tela responder no
 * instante do toque —, então os lances aceitos de cada item viajam junto. Com
 * um `acertou` vindo de fora, "acertei os 24" seria uma chamada de rede a
 * escrever, e o relatório que o professor lê antes de escalar o time viraria
 * ficção.
 *
 * O juiz é o mesmo dos outros dois lugares: `lancesDoItem` chama
 * `lancesQueAplicam`, que é o que o gate de conteúdo usou para conferir os
 * lances escritos no arquivo. Um juiz, três lugares.
 *
 * ## O que o servidor deriva, e por quê cada um
 *
 * `tentativa` e `inedita` **não** vêm do navegador, embora só ele pareça
 * saber: os dois se recuperam do próprio histórico, e derivá-los aqui é o que
 * impede que cinco cliques até acertar cheguem ao relatório como cinco
 * exercícios — ou como um. `versao` é a impressão digital do item: um
 * enunciado corrigido no meio do piloto deixa de se comparar com o de antes, e
 * sem essa coluna as duas metades entram na mesma porcentagem.
 */

/** O que o navegador manda: o que foi **respondido**, e o que só ele sabe. */
export type RespostaDoTreino = {
  dica: string;
  /** O id do item no conteúdo (`m9-a`). */
  item: string;
  /** O lance jogado, em UCI (`f1d1`, e `e7e8q` quando promove). */
  resposta: string;
  /** 0 nenhum · 1 convite · 2 realce · 3 solução vista. */
  apoio: number;
  tempoMs: number;
};

export type Resultado = { acertou: boolean } | { erro: string };

/** Meia hora, como na tática: acima disso é aba esquecida aberta. */
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

const LANCE = /^[a-h][1-8][a-h][1-8][nbrq]?$/;

/**
 * A impressão digital do item — as oito primeiras casas do sha256 sobre o que
 * define a resposta.
 *
 * Só entra o que, mudando, torna as respostas incomparáveis: a posição, o lado,
 * a tarefa e **os lances aceitos**. Corrigir uma vírgula da legenda **não**
 * invalida o histórico, e é por isso que a legenda fica de fora.
 *
 * Os lances entraram no lugar das casas quando o exercício deixou de ser
 * clique: um item que ganhou um segundo lance aceito passou a perguntar outra
 * coisa, e comparar as respostas de antes com as de depois somaria dois
 * exercícios diferentes na mesma porcentagem.
 */
function versaoDoItem(item: ItemDeLance): string {
  const material = [
    "l",
    item.fen,
    item.lado,
    item.tarefa,
    [...item.lancesAceitos].sort().join(","),
  ];
  return createHash("sha256").update(material.join(" ")).digest("hex").slice(0, 8);
}

export async function gravarTreino(aluno: string, dado: RespostaDoTreino): Promise<Resultado> {
  const { dica: dicaId, item: itemId, resposta } = dado;
  if (typeof dicaId !== "string" || typeof itemId !== "string" || typeof resposta !== "string") {
    return { erro: "tentativa malformada" };
  }

  const dica = dicaPorId(dicaId);
  const treino = dica?.treino;
  // Dica sem treino, ou id inventado: não vira linha. Sem isto, esta função
  // seria "escreva qualquer texto na tabela de tentativas".
  if (!treino) return { erro: "dica sem treino" };

  const item = treino.exercicios.find((i) => i.id === itemId);
  if (!item) return { erro: "item desconhecido" };

  if (!LANCE.test(resposta)) return { erro: "resposta malformada" };

  // `habilidade` continua com os dois valores do `check` da migration 0006, e o
  // exercício de lance grava `aplicacao`: jogar o lance do tema é aplicar o
  // conceito, e chamá-lo de reconhecimento seria escrever no relatório do
  // professor o que o Bloco 4 mediu e o Doug recusou — que clicar na casa prova
  // que o aluno usa a coluna aberta.
  const acertou = lancesDoItem(item).includes(resposta);
  const conceito = item.tarefa;
  const habilidade: "reconhecimento" | "aplicacao" = "aplicacao";
  const nivel: "fato" | "curado" = "fato";
  const versao = versaoDoItem(item);

  const supabase = criarClienteAdmin();

  // Uma consulta só para as duas colunas derivadas. São poucas linhas por
  // aluno e item — o teto é quantas vezes ele respondeu aquele exercício.
  const { data: anteriores, error: erroDeLeitura } = await supabase
    .from("tentativa_meiojogo")
    .select("criada_em")
    .eq("aluno", aluno)
    .eq("item", itemId);
  if (erroDeLeitura) return { erro: erroDeLeitura.message };

  const hoje = hojeNoBrasil();
  const dias = (anteriores ?? []).map((linha) => hojeNoBrasil(new Date(linha.criada_em)));
  const tentativa = dias.filter((dia) => dia === hoje).length + 1;
  // Inédita é sobre **dia**, e não sobre tentativa: as três respostas de hoje
  // são a mesma primeira vez. É esta coluna que a revisão espaçada do Bloco 6
  // vai ler, e ela não se recalcula depois.
  const inedita = !dias.some((dia) => dia < hoje);

  const { error } = await supabase.from("tentativa_meiojogo").insert({
    aluno,
    dica: dicaId,
    item: itemId,
    conceito,
    habilidade,
    nivel_evidencia: nivel,
    versao,
    resposta,
    acertou,
    tentativa,
    apoio: Math.min(Math.max(0, Math.round(dado.apoio) || 0), 3),
    inedita,
    tempo_ms: Math.min(Math.max(0, Math.round(dado.tempoMs) || 0), TEMPO_MAXIMO_MS),
  });

  if (error) return { erro: error.message };
  return { acertou };
}
