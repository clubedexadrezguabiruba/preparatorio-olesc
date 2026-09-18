import type { Cor } from "@/lib/repertorio/linhas";

/**
 * A vitrine de `/aberturas`: em que ordem as aberturas aparecem, e quais o aluno já pode abrir
 * (18/9/2026).
 *
 * ## A ordem é a do tabuleiro
 *
 * Pedido do Doug: a abertura que o aluno mais vai encontrar vem primeiro. Os números saem do
 * explorador do Lichess na faixa 1000–1599 — o cache está em
 * `content/repertorio/cache/explorer/lichess-1000-1599`, medido em 18/9/2026:
 *
 * - **Brancas**, em % das respostas a 1.e4: 1…e5 2.Cf3 Cc6 (Escocesa) 39 · 1…c5 (Alapin) 10 ·
 *   1…d5 9 · 1…e5 2.Cf3 d6 (Philidor) 8 · 1…e6 7 · 1…e5 2.Cf3 Cf6 (Petroff) 7 · 1…c6 5.
 * - **Pretas**: 1.e4 é 69% das partidas, e contra ele é a Siciliana. Depois de 1.d4 d5, em % dos
 *   segundos lances: 2.c4 (Manhattan) 30 · 2.e3 + 2.Cc3 (Colle e Jobava) 25 · 2.Bf4 (Londres) 22.
 *
 * ## Só abre o que já tem a estrutura nova
 *
 * As aberturas estão sendo refeitas no molde da Francesa (aula A → B → … e o move trainer no fim).
 * A que ainda não foi refeita aparece com "Em breve" e não abre para o aluno — nem pela lista, nem
 * pela URL. O professor continua entrando, porque é ele quem revisa.
 *
 * **Para liberar uma abertura, é só pôr `liberada: true` na linha dela.**
 */
export type NaVitrine = {
  readonly cor: Cor;
  /** O slug do índice (`public/repertorio/index.json`). */
  readonly abertura: string;
  /** Os lances que definem a abertura, em SAN — é deles que sai o tabuleirinho da lista. */
  readonly sans: readonly string[];
  /** Os mesmos lances, já em português, para ler. */
  readonly lances: string;
  /** Quanto ela aparece, em frase curta — é o porquê da ordem. */
  readonly frequencia: string;
  readonly liberada: boolean;
};

export const VITRINE: readonly NaVitrine[] = [
  { cor: "brancas", abertura: "escocesa", sans: ["e4", "e5", "Nf3", "Nc6", "d4"], lances: "1.e4 e5 2.Cf3 Cc6 3.d4", frequencia: "39% das respostas a 1.e4", liberada: false },
  { cor: "brancas", abertura: "alapin", sans: ["e4", "c5", "c3"], lances: "1.e4 c5 2.c3", frequencia: "10% das respostas a 1.e4", liberada: false },
  { cor: "brancas", abertura: "escandinava", sans: ["e4", "d5"], lances: "1.e4 d5", frequencia: "9% das respostas a 1.e4", liberada: false },
  { cor: "brancas", abertura: "philidor", sans: ["e4", "e5", "Nf3", "d6"], lances: "1.e4 e5 2.Cf3 d6", frequencia: "8% das respostas a 1.e4", liberada: false },
  { cor: "brancas", abertura: "francesa", sans: ["e4", "e6"], lances: "1.e4 e6", frequencia: "7% das respostas a 1.e4", liberada: true },
  { cor: "brancas", abertura: "petroff", sans: ["e4", "e5", "Nf3", "Nf6"], lances: "1.e4 e5 2.Cf3 Cf6", frequencia: "7% das respostas a 1.e4", liberada: false },
  { cor: "brancas", abertura: "caro-kann", sans: ["e4", "c6"], lances: "1.e4 c6", frequencia: "5% das respostas a 1.e4", liberada: false },
  { cor: "pretas", abertura: "siciliana", sans: ["e4", "c5"], lances: "1.e4 c5", frequencia: "1.e4 é 7 em cada 10 partidas", liberada: true },
  { cor: "pretas", abertura: "manhattan", sans: ["d4", "d5", "c4", "e6"], lances: "1.d4 d5 2.c4 e6", frequencia: "30% depois de 1.d4 d5", liberada: false },
  { cor: "pretas", abertura: "colle", sans: ["d4", "d5", "e3"], lances: "1.d4 d5 2.e3 · 2.Cc3", frequencia: "25% depois de 1.d4 d5", liberada: false },
  { cor: "pretas", abertura: "londres", sans: ["d4", "d5", "Bf4"], lances: "1.d4 d5 2.Bf4", frequencia: "22% depois de 1.d4 d5", liberada: false },
];

/** A posição na vitrine; a abertura que não está nela vai para o fim, na ordem do índice. */
export function posicaoNaVitrine(cor: Cor, abertura: string): number {
  const i = VITRINE.findIndex((v) => v.cor === cor && v.abertura === abertura);
  return i === -1 ? VITRINE.length : i;
}

export function naVitrine(cor: Cor, abertura: string): NaVitrine | null {
  return VITRINE.find((v) => v.cor === cor && v.abertura === abertura) ?? null;
}

/** Abertura fora da vitrine é abertura nova, ainda não revisada: fica trancada. */
export function aberturaLiberada(cor: Cor, abertura: string): boolean {
  return naVitrine(cor, abertura)?.liberada ?? false;
}

/** Quem pode entrar numa abertura: a liberada, para todos; qualquer uma, para o professor. */
export function podeAbrir(cor: Cor, abertura: string, papel: "aluno" | "professor"): boolean {
  return papel === "professor" || aberturaLiberada(cor, abertura);
}
