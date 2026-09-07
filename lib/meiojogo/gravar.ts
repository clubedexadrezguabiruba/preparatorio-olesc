import "server-only";
import { createHash } from "node:crypto";
import { hojeNoBrasil } from "../curso/calendario.ts";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { dicaPorId } from "./conteudo.ts";
import type { ItemDeAplicacao, ItemDeReconhecimento } from "./dicas.ts";
import { casasAceitas } from "./tentativa.ts";

/**
 * A gravação de uma resposta do treino de meio-jogo.
 *
 * ## O navegador manda a casa, nunca o acerto
 *
 * É a regra de `lib/tatica/gravar.ts:30-40`, e aqui ela pesa mais: o conteúdo
 * do treino é servido ao navegador — tem de ser, para a tela responder no
 * instante do toque —, então a `resposta` de cada item viaja junto. Com um
 * `acertou` vindo de fora, "acertei os 24" seria uma chamada de rede a
 * escrever, e o relatório que o professor lê antes de escalar o time viraria
 * ficção.
 *
 * O juiz é o mesmo dos outros dois lugares: `casasAceitas` chama
 * `respostaDaTarefa`, que é o que o gate de conteúdo usou para conferir a
 * resposta escrita no arquivo. Um juiz, três lugares.
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
  /** O id do item no conteúdo (`m12-d2-a`, `m12-d4`). */
  item: string;
  /** A casa tocada (`d5`) ou a letra da alternativa (`a`). */
  resposta: string;
  /** 0 nenhum · 1 convite · 2 realce · 3 solução vista. */
  apoio: number;
  tempoMs: number;
};

export type Resultado = { acertou: boolean } | { erro: string };

/** Meia hora, como na tática: acima disso é aba esquecida aberta. */
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

const CASA = /^[a-h][1-8]$/;

/**
 * A impressão digital do item — as oito primeiras casas do sha256 sobre o que
 * define a resposta.
 *
 * Só entra o que, mudando, torna as respostas incomparáveis: a posição, o lado,
 * a tarefa e as casas aceitas; na aplicação, a pergunta e as opções com o
 * gabarito. Corrigir uma vírgula da legenda **não** invalida o histórico, e é
 * por isso que a legenda fica de fora.
 */
function versaoDoItem(item: ItemDeReconhecimento | ItemDeAplicacao): string {
  const material =
    "usa" in item
      ? ["a", item.usa, item.pergunta, ...item.opcoes.map((o) => `${o.certa ? 1 : 0}:${o.texto}`)]
      : ["r", item.fen, item.lado, item.tarefa, [...item.resposta].sort().join(",")];
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

  const reconhecimento = treino.reconhecimento.find((i) => i.id === itemId);
  const aplicacao = treino.aplicacao.id === itemId ? treino.aplicacao : null;
  if (!reconhecimento && !aplicacao) return { erro: "item desconhecido" };

  let acertou: boolean;
  let conceito: string;
  let habilidade: "reconhecimento" | "aplicacao";
  let nivel: "fato" | "curado";
  let versao: string;

  if (reconhecimento) {
    if (!CASA.test(resposta)) return { erro: "resposta malformada" };
    acertou = casasAceitas(reconhecimento).includes(resposta);
    conceito = reconhecimento.tarefa;
    habilidade = "reconhecimento";
    nivel = "fato";
    versao = versaoDoItem(reconhecimento);
  } else if (aplicacao) {
    // A letra que o aluno viu na tela, e não um índice: é ela que o professor
    // lê no relatório, e é por ela que se procura padrão numa alternativa
    // errada escolhida por metade da turma.
    const escolhida = resposta.charCodeAt(0) - 97;
    const opcao = aplicacao.opcoes[escolhida];
    if (resposta.length !== 1 || !opcao) return { erro: "resposta malformada" };
    acertou = opcao.certa;
    // O conceito é o do item do degrau 3, cuja posição a aplicação reusa: a
    // fila de revisão agrupa por traço, e o degrau 4 treina o mesmo traço com
    // uma pergunta mais funda.
    conceito = treino.reconhecimento[2].tarefa;
    habilidade = "aplicacao";
    nivel = "curado";
    versao = versaoDoItem(aplicacao);
  } else {
    return { erro: "item desconhecido" };
  }

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
