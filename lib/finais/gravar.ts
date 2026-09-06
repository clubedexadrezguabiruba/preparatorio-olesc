import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { lerPacote } from "./conteudo.ts";
import { ETAPAS_DE_AULA, rejulgarPratica, rejulgarSolo, type EtapaDeAula } from "./rejulgar.ts";

/** O que o navegador manda: o que foi **jogado**, nunca um "dominei". */
export type TentativaDeAula = {
  /** O id da aula em `content/lessons/` (`N0-R-MATE`). */
  aula: string;
  etapa: EtapaDeAula;
  /**
   * Na etapa sem ajuda, os lances **do aluno**, inclusive os recusados. Na
   * prática, os **dos dois lados** — sem os do computador a partida não se
   * reconstrói, e é a partida inteira que decide o desfecho.
   */
  lances: string[];
  tempoMs: number;
};

export type ResultadoDeAula = { sucesso: boolean } | { erro: string };

/**
 * Uma hora. A tática corta em meia (`lib/tatica/gravar.ts`), e aqui o dobro:
 * lá o relógio mede **um** puzzle, aqui mede uma partida de final inteira
 * contra o computador, com uma criança pensando entre os lances. Acima de uma
 * hora é aba esquecida aberta, não final jogado.
 */
const TEMPO_MAXIMO_MS = 60 * 60 * 1000;

/**
 * Confere a tentativa contra o arquivo da aula e grava a linha.
 *
 * ## O que esta função acrescenta ao `rejulgar.ts`
 *
 * Só as duas pontas: **ler a aula do disco** pelo caminho que o servidor usa, e
 * **escrever com a chave de serviço**. O julgamento inteiro é
 * `lib/finais/rejulgar.ts`, que é puro e tem teste — a mesma divisão que separa
 * `lib/tatica/conferir.ts` de `lib/tatica/gravar.ts`.
 *
 * ## Quem escreve é a chave de serviço
 *
 * `tentativas_aula` não tem política de `insert` para ninguém (ver
 * `0004_finais.sql`): nem o aluno logado nem o anônimo gravam ali. A única
 * chave que passa é a de serviço, que roda só no servidor — e que **ignora toda
 * a RLS**. Ela não sabe quem pediu e não vai perguntar; por isso o `aluno`
 * chega aqui **já conferido** pela server action, tirado do cookie de sessão, e
 * nunca de um id que veio no corpo da chamada.
 *
 * ## Rascunho também grava, e é de propósito
 *
 * Não há aqui nenhuma pergunta sobre `status: "published"` ou sobre a trilha. A
 * aula em rascunho é justamente a que o Doug está revisando no celular, e é
 * dessa revisão que sai o número de horas por aula que dimensiona as fases
 * seguintes. Quem decide o que **conta** para o aluno é a trilha
 * (`lib/finais/trilha.ts`, B4), lendo estas linhas; barrar a gravação aqui
 * apagaria a medição sem proteger nada.
 */
export async function gravarTentativaDeAula(
  aluno: string,
  tentativa: TentativaDeAula,
): Promise<ResultadoDeAula> {
  const { aula, etapa, lances, tempoMs } = tentativa;

  if (typeof aula !== "string" || !ETAPAS_DE_AULA.includes(etapa)) {
    return { erro: "etapa desconhecida" };
  }
  if (!Array.isArray(lances) || lances.some((l) => typeof l !== "string")) {
    return { erro: "tentativa malformada" };
  }

  // Aula que não existe: ou o `content/` mudou embaixo de uma aba aberta, ou
  // alguém inventou o id na chamada. Nos dois casos, não vira linha no banco.
  const pacote = lerPacote(aula);
  if (!pacote) return { erro: "aula desconhecida" };

  let julgamento;
  if (etapa === "solo") {
    julgamento = rejulgarSolo(pacote.lesson, lances);
  } else {
    const pratica = pacote.lesson.stages.practice;
    const posicao = pratica ? pacote.positions[pratica.positionId] : undefined;
    // `lerPacote` já teria lançado se a posição referenciada não existisse;
    // a pergunta aqui é a outra, e é comum: a aula tem etapa 5?
    if (!posicao) return { erro: "a aula não tem prática" };
    julgamento = rejulgarPratica(pacote.lesson, posicao, lances);
  }

  if ("erro" in julgamento) return { erro: julgamento.erro };

  const { error } = await criarClienteAdmin().from("tentativas_aula").insert({
    aluno,
    aula: pacote.lesson.id,
    etapa,
    sucesso: julgamento.sucesso,
    lances,
    tempo_ms: Math.min(Math.max(0, Math.round(tempoMs) || 0), TEMPO_MAXIMO_MS),
  });

  if (error) return { erro: error.message };
  return { sucesso: julgamento.sucesso };
}
