"use server";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { contarSoAlunos, contasDasLinhas } from "@/lib/curso/so-alunos";
import { exigirEditor } from "@/lib/editor/acesso";
import { guardarSnapshotAntesDeMigrarV1, prepararMigracaoV1, type PreparoDaMigracaoV1 } from "@/lib/editor-v2/migrar-v1";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { conferirAulaV2, podePublicarV2, type ConferenciaV2 } from "@/lib/editor-v2/gate";
import { frasesDoImpactoV2 } from "@/lib/editor-v2/impacto-publicacao";
import { aulaIdV2Schema, aulaV2Schema, revisaoDaFenV2Schema } from "@/lib/editor-v2/modelo";
import { adicionarPosicaoAoAcervo, type AdicaoAoAcervoV2, type PedidoDePosicaoNoAcervoV2 } from "@/lib/editor-v2/acervo-em-disco";
import { buscarPgnDoLichess } from "@/lib/editor-v2/lichess-url";

/**
 * §13.2 (fatia 10): busca o PGN do Lichess pelo endereço que o professor colou. O servidor só aceita
 * partida, capítulo e estudo públicos, e monta o endereço oficial da API — ver `lichess-url.ts`.
 */
export async function buscarPgnDoLichessAcao(colado: string): Promise<{ ok: true; pgn: string; bytes: number; descricao: string } | { ok: false; mensagem: string }> {
  await exigirEditor();
  const resposta = await buscarPgnDoLichess(String(colado ?? "").slice(0, 500));
  if (!resposta.ok) return resposta;
  const e = resposta.endereco;
  const descricao = e.tipo === "estudo" ? `estudo ${e.estudoId}` : e.tipo === "capitulo" ? `capítulo ${e.capituloId} do estudo ${e.estudoId}` : `partida ${e.partidaId}`;
  return { ok: true, pgn: resposta.pgn, bytes: resposta.bytes, descricao };
}
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
 * **Os alunos distintos das duas tabelas** (D6 da fatia 8), e **só contas de aluno** (decisão do
 * Doug, 13/9: a conta de professor que testou a aula não entra): `finais_progresso` é a escada da
 * aula v1, `avaliacoes_progresso` a da v2, por revisão. Até a fatia 8 só a v1 era lida, e
 * uma aula nascida no v2 (a extra) dizia "nenhum aluno" com aluno jogando.
 *
 * `null` quando o banco não responde: o impacto do conteúdo continua valendo, e a tela diz
 * que a contagem faltou em vez de dizer "nenhum aluno".
 */
async function alunosComProgresso(aula: string): Promise<number | null> {
  try {
    const { criarClienteAdmin } = await import("@/lib/supabase/admin");
    const admin = criarClienteAdmin();
    const [v1, v2] = await Promise.all([
      admin.from("finais_progresso").select("aluno").eq("aula", aula),
      admin.from("avaliacoes_progresso").select("aluno").eq("aula", aula),
    ]);
    if (v1.error || v2.error) return null;
    const linhas = [...(v1.data ?? []), ...(v2.data ?? [])] as Array<{ aluno: string }>;
    if (linhas.length === 0) return 0;
    const perfis = await admin.from("perfis").select("id, papel").in("id", contasDasLinhas(linhas));
    if (perfis.error) return null;
    const papeis = new Map((perfis.data ?? []).map((p) => [p.id as string, p.papel as string]));
    return contarSoAlunos(linhas, papeis).alunos;
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

/**
 * A aula v1 publicada, em texto, e as posições dela — a origem da conversão (§20.3). O texto é
 * lido em bytes do arquivo de `content/lessons/`, que a conversão nunca escreve.
 */
function origemV1(aula: string) {
  if (!lessonIdSchema.safeParse(aula).success) return null;
  const arquivo = path.join(process.cwd(), "content", "lessons", `${aula}.json`);
  if (!existsSync(arquivo)) return null;
  const pacote = lerPacote(aula);
  return pacote ? { texto: readFileSync(arquivo, "utf8"), ...pacote } : null;
}

export type PreparoDaConversaoNaTelaV2 =
  | { ok: false; motivo: string }
  | { ok: true; preparo: PreparoDaMigracaoV1 };

/** O diff da conversão, calculado sobre o documento que está na tela (§20.3). */
export async function prepararConversaoV1Acao(aula: string, texto: string): Promise<PreparoDaConversaoNaTelaV2> {
  await exigirEditor();
  const origem = origemV1(aula);
  if (!origem) return { ok: false, motivo: "esta aula não tem arquivo no formato antigo" };
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false, motivo: "o navegador enviou um documento quebrado" }; }
  const validado = aulaV2Schema.safeParse(cru);
  if (!validado.success || validado.data.id !== aula) return { ok: false, motivo: "o documento não é desta aula" };
  return { ok: true, preparo: prepararMigracaoV1(origem.lesson, origem.texto, origem.positions, validado.data) };
}

/** Guarda o snapshot `antes-de-migrar` — só depois dele a tela aplica a conversão. */
export async function guardarSnapshotDeMigracaoV1Acao(aula: string, texto: string) {
  await exigirEditor();
  const origem = origemV1(aula);
  if (!origem) return { ok: false as const, erro: "esta aula não tem arquivo no formato antigo" };
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false as const, erro: "o navegador enviou um documento quebrado" }; }
  const validado = aulaV2Schema.safeParse(cru);
  if (!validado.success || validado.data.id !== aula) return { ok: false as const, erro: "o documento não é desta aula" };
  return guardarSnapshotAntesDeMigrarV1(aula, origem.texto, validado.data);
}

export type CriacaoDeAulaV2 =
  | { ok: true; id: string }
  | { ok: false; campo: "titulo" | "nivel" | "classe" | "id" | "disco"; mensagem: string };

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

/**
 * "Adicionar ao acervo" (§17.1, fatia 10): a posição nova de uma prática vira arquivo candidato em
 * `content/positions/`, com o resultado do cache da tablebase e a proveniência que o
 * `validate:content` exige. As regras moram em `acervo-em-disco.ts`.
 */
export async function adicionarAoAcervoV2Acao(pedidoEmTexto: string): Promise<AdicaoAoAcervoV2> {
  await exigirEditor();
  let pedido: PedidoDePosicaoNoAcervoV2;
  try { pedido = JSON.parse(pedidoEmTexto) as PedidoDePosicaoNoAcervoV2; } catch { return { ok: false, campo: "posicao", mensagem: "o navegador enviou um pedido quebrado" }; }
  if (!aulaIdV2Schema.safeParse(pedido.aulaId).success) return { ok: false, campo: "posicao", mensagem: "id de aula inválido" };
  const revisao = revisaoDaFenV2Schema.safeParse(pedido.revisao);
  if (!revisao.success) return { ok: false, campo: "origem", mensagem: "a revisão de proveniência veio incompleta — diga de onde a posição veio" };
  return adicionarPosicaoAoAcervo({ ...pedido, revisao: revisao.data });
}
