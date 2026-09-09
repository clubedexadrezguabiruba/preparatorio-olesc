import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { lerPacote } from "./conteudo.ts";
import { depoisDaPassada, zerada, type ProgressoDaEscada } from "./escada.ts";
import {
  ETAPAS_DE_AULA,
  rejulgarPratica,
  rejulgarRevisao,
  type EtapaDeAula,
} from "./rejulgar.ts";

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
  /**
   * Qual posição foi jogada. **Obrigatório em `revisao`**, ignorado nas outras.
   *
   * Uma aula tem até duas posições de revisão, e `lances` não se reconstrói
   * sem saber de qual FEN a partida saiu. É também o que impede a chamada de
   * virar "joguei qualquer posição e revisei a aula": o servidor confere a
   * posição contra a lista da aula antes de rejulgar.
   */
  posicaoId?: string;
};

export type ResultadoDeAula =
  | {
      sucesso: boolean;
      /** Onde a aula ficou na escada. Ausente quando a passada não a moveu. */
      escada?: ProgressoDaEscada;
    }
  | { erro: string };

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
  const { aula, etapa, lances, tempoMs, posicaoId } = tentativa;

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
  if (etapa === "revisao") {
    if (typeof posicaoId !== "string") return { erro: "revisão sem posição" };
    const posicao = pacote.positions[posicaoId];
    // Posição que a aula não referencia: nem chegou a ser carregada, então
    // nem existe para esta aula. Não vira linha.
    if (!posicao) return { erro: "posição desconhecida" };
    julgamento = rejulgarRevisao(pacote.lesson, posicao, lances);
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
    // Nula fora da revisão: ali a posição é a da aula, e está no arquivo.
    posicao: etapa === "revisao" ? posicaoId : null,
  });

  if (error) return { erro: error.message };

  const escada = await subirAEscada(aluno, pacote.lesson.id, julgamento.sucesso);
  return { sucesso: julgamento.sucesso, ...(escada ? { escada } : {}) };
}

/**
 * A passada move a escada — ler onde a aula estava, aplicar a regra, gravar.
 *
 * **Roda depois do `insert`, e a ordem importa.** `tentativas_aula` é o log e
 * nunca sofre `update`; `finais_progresso` é o estado derivado dele. Se a
 * escada falhar, a tentativa já está registrada e o professor a vê — o
 * contrário (escada gravada sem a tentativa que a justifica) seria um degrau
 * sem prova por trás.
 *
 * Por isso ela também **não** derruba a chamada: um erro aqui devolve `null` e
 * o aluno recebe o veredito da partida, que é o que ele está esperando na tela.
 * O degrau perdido se recupera na passada seguinte; um erro vermelho depois de
 * um mate bem dado, não.
 *
 * A leitura e a escrita são duas idas ao banco, sem transação, e isso é aceito:
 * duas partidas simultâneas do mesmo aluno na mesma aula precisariam de duas
 * abas jogando ao mesmo tempo, e o pior caso é uma tentativa não contada — nunca
 * um degrau a mais.
 */
async function subirAEscada(
  aluno: string,
  aula: string,
  venceu: boolean,
): Promise<ProgressoDaEscada | null> {
  const admin = criarClienteAdmin();
  const { data: atual, error: erroAoLer } = await admin
    .from("finais_progresso")
    .select("tentativas, erros, aprendida_em, ultima_em, degrau, revisar_em")
    .eq("aluno", aluno)
    .eq("aula", aula)
    .maybeSingle();

  if (erroAoLer) return null;

  const anterior: ProgressoDaEscada = atual
    ? {
        tentativas: atual.tentativas,
        erros: atual.erros,
        aprendidaEm: atual.aprendida_em,
        ultimaEm: atual.ultima_em,
        degrau: atual.degrau,
        revisarEm: atual.revisar_em,
      }
    : zerada();

  const progresso = depoisDaPassada(anterior, venceu, new Date().toISOString());

  const { error } = await admin.from("finais_progresso").upsert(
    {
      aluno,
      aula,
      tentativas: progresso.tentativas,
      erros: progresso.erros,
      aprendida_em: progresso.aprendidaEm,
      ultima_em: progresso.ultimaEm,
      degrau: progresso.degrau,
      revisar_em: progresso.revisarEm,
    },
    { onConflict: "aluno,aula" },
  );

  return error ? null : progresso;
}
