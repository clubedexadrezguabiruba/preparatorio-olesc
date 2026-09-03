/**
 * Os tempos da série de puzzles, em milissegundos.
 *
 * Eram cinco números soltos dentro do `Serie.tsx`. Saíram daqui porque um deles
 * — o `RESPOSTA_MS` — virou **teto de outra coisa**: o som de um lance não pode
 * durar mais que o intervalo até a resposta do adversário, senão os dois lances
 * viram lama. O `lib/sound-catalog.test.ts` cobra isso, e para cobrar precisa
 * poder importar o número.
 */

/** A posição parada antes do erro do adversário: o aluno precisa ver o "antes". */
export const ABERTURA_MS = 600;

/**
 * Do lance certo do aluno até a resposta do adversário.
 *
 * **É teto de som.** Toda síntese de lance, captura e xeque tem de caber aqui —
 * ver `maxDurationMs` em `lib/sound-catalog.ts`.
 */
export const RESPOSTA_MS = 480;

/** Lance errado: quanto o recado fica na tela antes de o tabuleiro destravar. */
export const VOLTA_MS = 850;

/** Linha resolvida: o tempo de ver a posição final antes do próximo puzzle. */
export const FIM_MS = 1100;

/** O mesmo, quando terminou em mate — o rei pulsa, e isso leva mais tempo. */
export const FIM_COM_MATE_MS = 1500;
