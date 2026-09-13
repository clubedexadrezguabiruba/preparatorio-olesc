/**
 * Grava uma etapa jogada de uma aula v2 — especificação §20.2, plano final §10.
 *
 * ## A ordem das perguntas
 *
 * 1. **A forma** do que chegou pela rede.
 * 2. **O snapshot**: a publicação que o aluno diz ter jogado, e nunca a ativa. Se ela não está
 *    no servidor, a tentativa é **guardada** e o aluno é mandado reabrir — julgá-la contra a
 *    aula nova seria julgar outra tarefa.
 * 3. **A etapa** existe no fluxo daquela publicação, com a entidade e o tipo declarados.
 * 4. **A revisão** enviada é a da entidade naquele snapshot.
 * 5. **O rejulgamento**, com o mesmo juiz da tela.
 * 6. **A linha**, idempotente pelo `tentativa_id`: o retry encontra a primeira e devolve o
 *    mesmo veredito, sem segundo degrau.
 * 7. **O domínio**: só a prática move a escada, e só quando a revisão jogada é a **ativa**.
 *    Uma aba antiga termina e grava contra o snapshot dela, sem conceder domínio da revisão
 *    nova (§10). Treino registra e não concede (plano §10: "concluir treino com ajuda não
 *    concede automaticamente o domínio").
 *
 * ## Por que o banco entra por fora
 *
 * Para a decisão caber no `node --test`. O banco de verdade é
 * `gravar-v2-banco.ts`, e a corrente inteira contra ele é `scripts/verificar-finais.ts`.
 */
import type { PacoteV2 } from "../editor-v2/pacote.ts";
import { publicationIdSchema } from "../editor-v2/publicacoes.ts";
import { depoisDaPassada, zerada, type ProgressoDaEscada } from "./escada.ts";
import type { Rejulgamento } from "./rejulgar.ts";
import { rejulgarPraticaV2, rejulgarTreinoV2 } from "./rejulgar-v2.ts";
import type { ContaDaTentativaV2, ResultadoDeAulaV2, TentativaDeAulaV2 } from "./tentativa-v2.ts";

export type LinhaDeTentativaV2 = {
  aluno: string;
  aula: string;
  etapa: "pratica" | "treino";
  sucesso: boolean;
  lances: string[];
  tempo_ms: number;
  posicao: null;
  tentativa_id: string;
  publication_id: string;
  entidade_id: string;
  assessment_revision: string;
  tentativa_numero: number;
  politica_defensor: "deterministica" | "fixa" | null;
  ajuda: boolean | null;
};

export type ChaveDaEscadaV2 = { aluno: string; aula: string; entidadeId: string; assessmentRevision: string };

export type BancoDasTentativasV2 = {
  /** `inserida: false` quando o `tentativa_id` já estava lá. */
  inserirTentativa: (linha: LinhaDeTentativaV2) => Promise<{ inserida: boolean } | { erro: string }>;
  guardarSemSnapshot: (linha: { aluno: string; aula: string; publication_id: string; tentativa_id: string; corpo: TentativaDeAulaV2 }) => Promise<void>;
  lerEscada: (chave: ChaveDaEscadaV2) => Promise<ProgressoDaEscada | null | { erro: string }>;
  gravarEscada: (chave: ChaveDaEscadaV2, progresso: ProgressoDaEscada) => Promise<boolean>;
};

export type ConteudoDasTentativasV2 = {
  publicacao: (aula: string, publicationId: string) => PacoteV2 | null;
  ativo: (aula: string) => PacoteV2 | null;
};

/** Uma hora, como a prática v1 (`gravar.ts`): acima disso é aba esquecida, não final jogado. */
const TEMPO_MAXIMO_MS = 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formaValida(t: TentativaDeAulaV2): string | null {
  if (!t || typeof t !== "object") return "tentativa malformada";
  if (typeof t.aula !== "string" || typeof t.etapaId !== "string" || typeof t.entidadeId !== "string") return "tentativa malformada";
  if (!publicationIdSchema.safeParse(t.publicationId).success) return "publicação inválida";
  if (t.tipo !== "pratica" && t.tipo !== "treino") return "etapa desconhecida";
  if (typeof t.assessmentRevision !== "string" || !/^ar_[0-9a-f]{64}$/.test(t.assessmentRevision)) return "revisão inválida";
  if (typeof t.tentativaId !== "string" || !UUID.test(t.tentativaId)) return "id de tentativa inválido";
  if (!Number.isInteger(t.tentativaNumero) || t.tentativaNumero < 1) return "número de tentativa inválido";
  if (!Array.isArray(t.lances) || t.lances.some((l) => typeof l !== "string")) return "tentativa malformada";
  if (typeof t.tempoMs !== "number") return "tentativa malformada";
  return null;
}

export async function gravarTentativaDeAulaV2(
  aluno: string,
  tentativa: TentativaDeAulaV2,
  conteudo: ConteudoDasTentativasV2,
  banco: BancoDasTentativasV2,
  agora: () => Date = () => new Date(),
): Promise<ResultadoDeAulaV2> {
  const forma = formaValida(tentativa);
  if (forma) return { erro: forma };

  let pacote: PacoteV2 | null;
  try {
    pacote = conteudo.publicacao(tentativa.aula, tentativa.publicationId);
  } catch {
    pacote = null;
  }
  if (!pacote) {
    await banco.guardarSemSnapshot({ aluno, aula: tentativa.aula, publication_id: tentativa.publicationId, tentativa_id: tentativa.tentativaId, corpo: tentativa });
    return { reabrir: true, motivo: "esta versão da aula não está mais no servidor — abra a aula de novo" };
  }

  const etapa = pacote.aula.fluxo.find((item) => item.id === tentativa.etapaId);
  if (!etapa || etapa.entidadeId !== tentativa.entidadeId || etapa.tipo !== tentativa.tipo) return { erro: "a etapa não é desta aula" };
  const revisao = pacote.revisoes[tentativa.entidadeId];
  if (!revisao || revisao.revisao !== tentativa.assessmentRevision) return { erro: "a revisão enviada não é a desta publicação" };

  const julgamento: Rejulgamento = tentativa.tipo === "pratica"
    ? rejulgarPraticaV2(pacote, tentativa.entidadeId, tentativa.lances)
    : rejulgarTreinoV2(pacote, tentativa.entidadeId, tentativa.lances, tentativa.tentativaNumero);
  if ("erro" in julgamento) return { erro: julgamento.erro };

  const treino = tentativa.tipo === "treino" ? pacote.aula.treinos.find((item) => item.id === tentativa.entidadeId) : undefined;
  const insercao = await banco.inserirTentativa({
    aluno,
    aula: pacote.aula.id,
    etapa: tentativa.tipo,
    sucesso: julgamento.sucesso,
    lances: tentativa.lances,
    tempo_ms: Math.min(Math.max(0, Math.round(tentativa.tempoMs) || 0), TEMPO_MAXIMO_MS),
    posicao: null,
    tentativa_id: tentativa.tentativaId,
    publication_id: pacote.publicationId,
    entidade_id: tentativa.entidadeId,
    assessment_revision: revisao.revisao,
    tentativa_numero: tentativa.tentativaNumero,
    // A política vem do snapshot, e não do navegador: é ela que o juiz usou.
    politica_defensor: treino ? treino.defensor.politica : null,
    ajuda: treino ? Boolean(tentativa.ajuda) : null,
  });
  if ("erro" in insercao) return { erro: insercao.erro };

  let conta: ContaDaTentativaV2 = "registro";
  if (tentativa.tipo === "pratica") {
    let ativo: PacoteV2 | null = null;
    try { ativo = conteudo.ativo(pacote.aula.id); } catch { ativo = null; }
    conta = ativo?.revisoes[tentativa.entidadeId]?.revisao === revisao.revisao ? "escada" : "historico";
  }
  if (!insercao.inserida) return { sucesso: julgamento.sucesso, conta, repetida: true };

  if (conta === "escada") {
    const chave = { aluno, aula: pacote.aula.id, entidadeId: tentativa.entidadeId, assessmentRevision: revisao.revisao };
    const anterior = await banco.lerEscada(chave);
    // Como no v1: a tentativa já está registrada; um erro na escada não derruba o veredito.
    if (anterior === null || !("erro" in anterior)) {
      await banco.gravarEscada(chave, depoisDaPassada(anterior ?? zerada(), julgamento.sucesso, agora().toISOString()));
    }
  }
  return { sucesso: julgamento.sucesso, conta };
}
