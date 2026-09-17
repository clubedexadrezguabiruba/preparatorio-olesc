/**
 * "Fazer a aula inteira como aluno" — pedido do Doug no teste humano de 14/9/2026.
 *
 * O professor faz a aula do rascunho no player do aluno, do começo ao fim — introdução, capítulos,
 * treinos e prática —, sem gravar nada, e no fim vê **quanto tempo cada etapa levou**. É a resposta
 * para "quanto tempo o aluno demora", e fecha o buraco da prévia "aula inteira", que só encadeava
 * capítulos (§15.1, §28 "Prévia real da aula").
 *
 * Este arquivo é só a conta: o relógio por etapa e o resumo. O relógio é de parede — o tempo que a
 * etapa ficou aberta —, como o aluno vive; voltar a uma etapa soma ao tempo dela.
 */

export type RelogioDaAula = {
  /** A etapa aberta agora, ou `null` antes de a aula abrir. */
  atual: string | null;
  /** Quando a etapa atual abriu (ms). */
  desde: number;
  /** O tempo já fechado de cada etapa (ms). */
  gasto: Record<string, number>;
};

export function iniciarRelogio(): RelogioDaAula {
  return { atual: null, desde: 0, gasto: {} };
}

/** A etapa aberta mudou (ou abriu pela primeira vez): fecha o tempo da anterior. */
export function trocarEtapa(relogio: RelogioDaAula, etapaId: string, agora: number): RelogioDaAula {
  if (relogio.atual === etapaId) return relogio;
  return { atual: etapaId, desde: agora, gasto: gastoAte(relogio, agora) };
}

/** O tempo de cada etapa até agora, contando a que está aberta. */
export function gastoAte(relogio: RelogioDaAula, agora: number): Record<string, number> {
  if (relogio.atual === null) return { ...relogio.gasto };
  const aberta = Math.max(0, agora - relogio.desde);
  return { ...relogio.gasto, [relogio.atual]: (relogio.gasto[relogio.atual] ?? 0) + aberta };
}

/** `40 s` vira "0:40"; `12 min 5 s`, "12:05"; uma hora e pouco, "1:02:03". */
export function formatarDuracao(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = String(total % 60).padStart(2, "0");
  return horas > 0 ? `${horas}:${String(minutos).padStart(2, "0")}:${segundos}` : `${minutos}:${segundos}`;
}

export type SituacaoDaEtapa = "concluida" | "nao-concluida" | "vista" | "nao-visitada";

export type LinhaDoResumo = {
  etapaId: string;
  rotulo: string;
  tipo: "introducao" | "capitulo" | "treino" | "pratica" | "treinador";
  ms: number;
  /** Só em treino e prática: a tentativa em que o professor estava (1 = de primeira). */
  tentativas?: number;
  situacao: SituacaoDaEtapa;
};

export type ResumoDaAulaComoAluno = {
  linhas: LinhaDoResumo[];
  totalMs: number;
  /** Todos os treinos terminados e todas as práticas vencidas. */
  concluida: boolean;
};

export function resumoDaAulaComoAluno(
  etapas: Array<{ id: string; tipo: LinhaDoResumo["tipo"]; rotulo: string }>,
  gasto: Record<string, number>,
  jogadas: Record<string, { tentativas: number; concluida: boolean }>,
): ResumoDaAulaComoAluno {
  const linhas = etapas.map((etapa): LinhaDoResumo => {
    const ms = gasto[etapa.id] ?? 0;
    // O move trainer da aula de abertura (§18.1) não é jogado na prévia do professor: conta como visto.
    if (etapa.tipo === "introducao" || etapa.tipo === "capitulo" || etapa.tipo === "treinador") {
      return { etapaId: etapa.id, rotulo: etapa.rotulo, tipo: etapa.tipo, ms, situacao: ms > 0 ? "vista" : "nao-visitada" };
    }
    const jogada = jogadas[etapa.id];
    const situacao: SituacaoDaEtapa = jogada?.concluida ? "concluida" : ms > 0 ? "nao-concluida" : "nao-visitada";
    return {
      etapaId: etapa.id, rotulo: etapa.rotulo, tipo: etapa.tipo, ms, situacao,
      ...(situacao !== "nao-visitada" && jogada ? { tentativas: jogada.tentativas } : {}),
    };
  });
  const avaliadas = linhas.filter((linha) => linha.tipo === "treino" || linha.tipo === "pratica");
  return {
    linhas,
    totalMs: linhas.reduce((soma, linha) => soma + linha.ms, 0),
    concluida: avaliadas.every((linha) => linha.situacao === "concluida"),
  };
}
