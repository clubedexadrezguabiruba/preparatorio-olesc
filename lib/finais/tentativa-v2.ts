/**
 * O que o navegador manda quando o aluno termina uma etapa jogada de uma aula v2 (fatia 7,
 * especificação §20.2). Só tipos: o arquivo é importado pelo player do aluno.
 *
 * O que sobe são os **lances**, a publicação e a revisão que o aluno jogou, o id idempotente
 * da tentativa, o número dela, a política do defensor e se houve ajuda — nunca um "acertei".
 * O servidor resolve o snapshot pela publicação enviada, confere a revisão e rejulga.
 */
export type TentativaDeAulaV2 = {
  aula: string;
  publicationId: string;
  /** O id da etapa do fluxo — é a chave da árvore na store do aluno. */
  etapaId: string;
  /** O id do treino ou da prática no documento. */
  entidadeId: string;
  tipo: "pratica" | "treino";
  assessmentRevision: string;
  /** Idempotência: o retry da mesma tentativa não vira segunda linha nem segundo degrau. */
  tentativaId: string;
  /** O contador da store; entra na rotação do defensor, e por isso no rejulgamento. */
  tentativaNumero: number;
  /** Treino: os lances do aluno, aceitos e recusados, na ordem. Prática: os dos dois lados. */
  lances: string[];
  tempoMs: number;
  politicaDefensor?: "deterministica" | "fixa";
  /** Treino: o aluno viu alguma dica nesta tentativa. Registrado; não decide domínio. */
  ajuda?: boolean;
};

/**
 * - `escada`: prática da revisão **ativa** — a passada moveu a escada de domínio;
 * - `historico`: prática de uma revisão que já não é a ativa (aba antiga) — gravada, sem domínio;
 * - `registro`: treino — gravado, e treino não concede domínio nesta versão (plano §10).
 */
export type ContaDaTentativaV2 = "escada" | "historico" | "registro";

export type ResultadoDeAulaV2 =
  | { sucesso: boolean; conta: ContaDaTentativaV2; repetida?: boolean }
  | { reabrir: true; motivo: string }
  | { erro: string };
