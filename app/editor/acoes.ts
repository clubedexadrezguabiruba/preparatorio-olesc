"use server";

import { refresh } from "next/cache";
import { conferir, podePublicar, publicar, ultimaConferencia, type Conferencia } from "@/lib/editor/gate";
import { exigirEditor } from "@/lib/editor/acesso";
import {
  abrirRascunhoDeAula,
  gravarAutosave,
  gravarRascunhoDeAula,
  type Gravacao,
} from "@/lib/editor/rascunhos";
import { lessonSchema } from "@/lib/lesson/schema";
import { falasDaAula, lerRegua, reprovacoes, type Reprovacao } from "@/lib/lesson/voz";

/**
 * As ações do modo editor. Toda escrita do editor passa por aqui, e por mais
 * nada — não há `route.ts` nenhuma.
 *
 * **A primeira linha de cada uma é `await exigirEditor()`**, pelo mesmo motivo
 * escrito em `app/professor/acoes.ts:34`: daqui para baixo se escreve em disco,
 * e o disco não sabe quem pediu nem vai perguntar. Uma Server Action é
 * alcançável por POST direto, sem passar pela tela (a doc do Next diz isso em
 * `01-app/02-guides/server-actions.md`) — então a conferência é aqui dentro,
 * nunca "a página só renderiza para o professor".
 *
 * As ações **devolvem** erro em vez de lançar, no molde de
 * `EstadoDoCadastro` (`app/professor/acoes.ts:14`): erro de gravação é coisa
 * que a tela mostra em português ao lado do que o Doug está escrevendo, não uma
 * tela vermelha de exceção que perde o texto dele.
 */

export type Salvamento = Gravacao & {
  /** O que a régua de `docs/VOZ-DO-CURSO.md` reprova. Aviso, nunca impedimento. */
  voz: Reprovacao[];
};

/**
 * Grava o rascunho da aula.
 *
 * `cru` chega como **texto**, e não como objeto, de propósito: o que vai ao
 * disco tem de ser exatamente o que a tela tem na mão, com a mesma ordem de
 * chaves. Serializar no cliente e serializar aqui de novo seriam dois
 * formatadores sobre o mesmo arquivo — e o `git diff` da aula deixaria de
 * dizer o que o professor mudou.
 */
export async function salvarAula(
  aula: string,
  cruEmTexto: string,
  baseHash: string | null,
  sobrescrever = false,
): Promise<Salvamento> {
  await exigirEditor();

  let cru: unknown;
  try {
    cru = JSON.parse(cruEmTexto);
  } catch {
    return { ok: false, erro: "o editor mandou um JSON quebrado — recarregue a página", voz: [] };
  }

  const gravacao = gravarRascunhoDeAula(aula, cru, baseHash, { sobrescrever });
  return { ...gravacao, voz: gravacao.ok ? vozDe(cru) : [] };
}

/**
 * A régua editorial, cobrada no salvamento e não só no CI.
 *
 * Hoje quem pega fala longa demais ou palavra de bastidor é `lib/lesson/voz.ts`
 * rodando no teste — ou seja, o Doug só descobre depois de commitar. Cobrar
 * aqui é o contrário: o contador vermelho aparece no lugar da fala, enquanto
 * ele ainda está com ela na cabeça. **Nunca impede o salvamento**: a régua é
 * editorial, e a última palavra é dele.
 */
function vozDe(cru: unknown): Reprovacao[] {
  const julgada = lessonSchema.safeParse(cru);
  if (!julgada.success) return [];
  try {
    return reprovacoes(falasDaAula(julgada.data), lerRegua());
  } catch {
    // A régua mora num documento; se ele sumir, o teste da voz grita alto. Aqui
    // não é o lugar de derrubar o salvamento do professor por causa disso.
    return [];
  }
}

/** O autosave: aceita o que o schema recusa, porque é recuperação de sessão. */
export async function salvarAutosave(aula: string, estadoEmTexto: string): Promise<void> {
  await exigirEditor();
  let estado: unknown;
  try {
    estado = JSON.parse(estadoEmTexto);
  } catch {
    return;
  }
  gravarAutosave(aula, estado);
}

/** Reabre o rascunho do disco — a resposta ao "o arquivo mudou fora do editor". */
export async function recarregarAula(aula: string): Promise<{ texto: string; hash: string } | null> {
  await exigirEditor();
  return abrirRascunhoDeAula(aula);
}

export type Conferida = {
  conferencia: Conferencia;
  /** O rascunho depois da passada A, que reescreve os derivados. */
  texto: string | null;
  hash: string | null;
};

/**
 * O botão "Conferir": as duas passadas do gate, e o rascunho de volta.
 *
 * O texto volta junto porque a passada A **reescreve o arquivo** — é ali que a
 * etapa 3 de verdade nasce. Sem devolvê-lo, a tela continuaria com a versão de
 * antes na mão e a próxima gravação acusaria conflito consigo mesma.
 */
export async function conferirAula(aula: string): Promise<Conferida> {
  await exigirEditor();
  const conferencia = await conferir(aula);
  const recarregado = abrirRascunhoDeAula(aula);
  refresh();
  return {
    conferencia,
    texto: recarregado?.texto ?? null,
    hash: recarregado?.hash ?? null,
  };
}

/** "Publicar no curso": o gate julga de novo, limpo, e promove por cópia de bytes. */
export async function publicarAula(aula: string) {
  await exigirEditor();
  const resultado = await publicar(aula);
  refresh();
  return resultado;
}

/** O que a tela precisa saber ao abrir: já conferiu? pode publicar? */
export async function estadoDaConferencia(aula: string) {
  await exigirEditor();
  return { ultima: ultimaConferencia(aula), publicar: podePublicar(aula) };
}
