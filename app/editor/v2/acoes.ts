"use server";

import { exigirEditor } from "@/lib/editor/acesso";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { conferirAulaV2, podePublicarV2, type ConferenciaV2 } from "@/lib/editor-v2/gate";
import { frasesDoImpactoV2 } from "@/lib/editor-v2/impacto-publicacao";
import { aulaIdV2Schema } from "@/lib/editor-v2/modelo";
import { publicationIdSchema } from "@/lib/editor-v2/publicacoes";
import { desativarV2, prepararPublicacaoV2, publicacoesDaAulaV2, publicarAulaV2, reativarPublicacaoV2, recuperarTransacaoV2 } from "@/lib/editor-v2/publicar";
import { documentoV2Existe, gravarDocumentoV2, guardarSnapshotAntesDeRefazerV2, idsDeDocumentosV2, lerDocumentoV2 } from "@/lib/editor-v2/rascunhos";
import { prepararNovaAula, type PedidoDeNovaAulaV2 } from "@/lib/editor-v2/nova-aula";
import { indiceDeAulas, lerPacote } from "@/lib/finais/conteudo";
import { lessonIdSchema } from "@/lib/lesson/schema";

export async function salvarDocumentoV2(aula: string, texto: string, baseHash: string | null) {
  await exigirEditor();
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false as const, erro: "o navegador enviou um documento quebrado" }; }
  return gravarDocumentoV2(aula, cru, baseHash);
}

export async function guardarSnapshotDeRefazerV2(aula: string, texto: string, treinoId: string) {
  await exigirEditor();
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false as const, erro: "o navegador enviou uma cópia quebrada" }; }
  return guardarSnapshotAntesDeRefazerV2(aula, cru, treinoId);
}

export type ResultadoDoConferirV2 =
  | { ok: false; erro: string }
  | {
      ok: true;
      conferencia: ConferenciaV2;
      /** O documento em disco depois da passada A — a certificação pode ter mudado. */
      documento: { texto: string; hash: string } | null;
      publicar: { pode: boolean; motivo: string | null };
    };

/**
 * O botão Conferir (§19.3).
 *
 * Julga **o que está em disco**, e não o que o navegador manda: a tela só habilita o botão
 * com a aula salva. Se a aula nunca foi salva no formato v2, o documento adaptado da aula
 * v1 é gravado primeiro — é o mesmo que a tela mostra ao abrir.
 */
export async function conferirAulaV2Acao(aula: string): Promise<ResultadoDoConferirV2> {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success) return { ok: false, erro: "id de aula inválido" };
  // Uma publicação interrompida é resolvida antes de qualquer julgamento (§20.1).
  recuperarTransacaoV2(aula);
  const pacoteV1 = !documentoV2Existe(aula) && lessonIdSchema.safeParse(aula).success ? lerPacote(aula) : null;
  const documentoInicial = pacoteV1 ? adaptarLessonV1(pacoteV1.lesson, pacoteV1.positions) : undefined;
  try {
    const conferencia = await conferirAulaV2(aula, { documentoInicial });
    const lido = lerDocumentoV2(aula);
    const publicar = await podePublicarV2(aula);
    return { ok: true, conferencia, documento: lido ? { texto: lido.texto, hash: lido.hash } : null, publicar: { pode: publicar.pode, motivo: publicar.motivo } };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "a conferência falhou" };
  }
}

/**
 * Quantos alunos têm progresso nesta aula — a parte do impacto que mora no banco.
 *
 * `null` quando o banco não responde: o impacto do conteúdo continua valendo, e a tela diz
 * que a contagem faltou em vez de dizer "nenhum aluno".
 */
async function alunosComProgresso(aula: string): Promise<number | null> {
  try {
    const { criarClienteAdmin } = await import("@/lib/supabase/admin");
    const { count, error } = await criarClienteAdmin().from("finais_progresso").select("aluno", { count: "exact", head: true }).eq("aula", aula);
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}

export type PreparoDaPublicacaoNaTelaV2 =
  | { ok: false; motivo: string }
  | { ok: true; impactoHash: string; publicationId: string; frases: string[]; mesmoConteudo: boolean };

/** O impacto, antes de publicar (§20.1). O hash volta no clique de publicar. */
export async function prepararPublicacaoV2Acao(aula: string): Promise<PreparoDaPublicacaoNaTelaV2> {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success) return { ok: false, motivo: "id de aula inválido" };
  const preparo = await prepararPublicacaoV2(aula);
  if (!preparo.ok) return preparo;
  const comProgresso = await alunosComProgresso(aula);
  return {
    ok: true,
    impactoHash: preparo.impactoHash,
    publicationId: preparo.publicationId,
    frases: frasesDoImpactoV2(preparo.impacto, { comProgresso }),
    mesmoConteudo: preparo.impacto.mesmoConteudo,
  };
}

/**
 * Publicar (§20.1). Separado de salvar, conferir, commit, push e deploy.
 * O servidor confere de novo a conferência verde e o impacto que o professor viu.
 */
export async function publicarAulaV2Acao(aula: string, impactoHash: string) {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success || typeof impactoHash !== "string") return { ok: false as const, motivo: "pedido inválido" };
  return publicarAulaV2(aula, { impactoHash });
}

/** As publicações guardadas desta aula, para "Mais opções". */
export async function publicacoesDaAulaV2Acao(aula: string) {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success) return [];
  return publicacoesDaAulaV2(aula);
}

export async function reativarPublicacaoV2Acao(aula: string, publicationId: string) {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success || !publicationIdSchema.safeParse(publicationId).success) return { ok: false as const, motivo: "pedido inválido" };
  return reativarPublicacaoV2(aula, publicationId);
}

export async function desativarV2Acao(aula: string) {
  await exigirEditor();
  if (!aulaIdV2Schema.safeParse(aula).success) return { ok: false as const, motivo: "pedido inválido" };
  return desativarV2(aula);
}

export type CriacaoDeAulaV2 =
  | { ok: true; id: string }
  | { ok: false; campo: "titulo" | "nivel" | "id" | "disco"; mensagem: string };

/**
 * "Nova aula" — §5.2.
 *
 * ## Por que a conferência de id acontece **aqui**, e não só na tela
 *
 * A tela mostra o identificador que o título gera e avisa quando ele colide,
 * mas a lista de ids ocupados mora no disco do servidor: aulas publicadas,
 * rascunhos v1 e documentos v2. Uma Server Action é alcançável por POST direto,
 * sem passar pela tela (a doc do Next diz isso em
 * `01-app/02-guides/server-actions.md`) — então quem decide é esta função, com a
 * lista de verdade na mão, e não o formulário.
 *
 * ## A criação é uma transação, e o arquivo nasce validado
 *
 * `gravarDocumentoV2` valida o documento antes de escrever e escreve
 * atomicamente, sob o mesmo lock do autosave. Ou existe uma aula v2 válida em
 * disco, ou não existe arquivo nenhum — §5.2: "cancelar não cria arquivo".
 */
export async function criarAulaV2(pedidoEmTexto: string): Promise<CriacaoDeAulaV2> {
  await exigirEditor();

  let pedido: PedidoDeNovaAulaV2;
  try {
    pedido = JSON.parse(pedidoEmTexto) as PedidoDeNovaAulaV2;
  } catch {
    return { ok: false, campo: "disco", mensagem: "o navegador enviou um formulário quebrado — recarregue a página" };
  }

  const ocupados = new Set<string>([...indiceDeAulas().map((aula) => aula.id), ...idsDeDocumentosV2()]);
  const preparo = prepararNovaAula(pedido, ocupados);
  if (!preparo.ok) return preparo;

  // Corrida entre duas abas: `prepararNovaAula` leu a lista há um instante, e o
  // que impede a segunda de sobrescrever a primeira é esta conferência colada na
  // escrita — não a leitura de antes.
  if (documentoV2Existe(preparo.aula.id)) {
    return { ok: false, campo: "titulo", mensagem: `já existe uma aula com o identificador «${preparo.aula.id}»; mude o título` };
  }

  const gravacao = gravarDocumentoV2(preparo.aula.id, preparo.aula, null);
  if (!gravacao.ok) return { ok: false, campo: "disco", mensagem: gravacao.erro };
  return { ok: true, id: preparo.aula.id };
}
