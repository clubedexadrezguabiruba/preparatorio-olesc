/**
 * A resposta do modo rating que saiu do navegador e ainda não voltou julgada.
 *
 * ## O defeito que isto fecha (revisão de 15/9, defeito 3)
 *
 * A tela percebe o lance errado **antes** do servidor: a peça volta, o som de
 * recusa toca, e só então a resposta vai. Sem internet nessa hora, a resposta
 * não chegava — e um F5, já com internet, trazia o mesmo problema do zero. O
 * aluno jogava de novo sabendo que o primeiro lance estava errado. Reproduzido
 * no navegador (`npm run tatica:rating:tela -- segunda-chance`).
 *
 * Agora a resposta é guardada no aparelho antes de sair, e só é esquecida
 * quando o servidor devolve um veredito (ou recusa de vez). Ao abrir o problema,
 * a tela procura uma guardada **para aquele problema** e a envia antes de
 * liberar o tabuleiro.
 *
 * ## O limite, dito
 *
 * É o `localStorage`: quem apaga os dados do navegador, ou troca de aparelho no
 * meio, escapa. Fecha a segunda chance que se ganha sem querer, com sinal ruim
 * de celular — não a de quem procura. A chave leva o aluno porque o computador
 * da escola é dividido: a resposta guardada de um nunca é enviada pelo outro.
 */

export type RespostaGuardada = {
  readonly puzzleId: string;
  readonly lances: readonly string[];
  /** Onde o aluno errou, para a tela jogar a solução dali. `null` = a linha inteira foi jogada. */
  readonly ondeErrou: { readonly fen: string; readonly indice: number } | null;
};

/** O pedaço do `Storage` que isto usa — o teste passa um de mentira. */
export type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const chave = (aluno: string) => `tatica-rating:resposta:${aluno}`;

/** O `localStorage`, ou `null` onde ele não existe ou o acesso é recusado (aba privada, servidor). */
export function armazemDoNavegador(): Armazem | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function guardarResposta(armazem: Armazem | null, aluno: string, resposta: RespostaGuardada): void {
  try {
    armazem?.setItem(chave(aluno), JSON.stringify(resposta));
  } catch {
    // Cheio ou recusado: a tela segue sem a guarda, como era antes.
  }
}

export function esquecerResposta(armazem: Armazem | null, aluno: string): void {
  try {
    armazem?.removeItem(chave(aluno));
  } catch {
    // Idem.
  }
}

function eGuardada(valor: unknown): valor is RespostaGuardada {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  const onde = v.ondeErrou as Record<string, unknown> | null | undefined;
  return (
    typeof v.puzzleId === "string" &&
    Array.isArray(v.lances) &&
    v.lances.every((l) => typeof l === "string") &&
    (onde === null || (typeof onde === "object" && typeof onde?.fen === "string" && typeof onde?.indice === "number"))
  );
}

/**
 * A resposta guardada para `puzzleId`, ou `null`.
 *
 * Uma guardada de **outro** problema é apagada: o servidor já andou (ela foi
 * aceita antes de a resposta se perder, e o pendente agora é outro), e ela não
 * serve mais para nada.
 */
export function respostaGuardada(armazem: Armazem | null, aluno: string, puzzleId: string): RespostaGuardada | null {
  let valor: unknown;
  try {
    const texto = armazem?.getItem(chave(aluno));
    if (!texto) return null;
    valor = JSON.parse(texto);
  } catch {
    esquecerResposta(armazem, aluno);
    return null;
  }
  if (!eGuardada(valor) || valor.puzzleId !== puzzleId) {
    esquecerResposta(armazem, aluno);
    return null;
  }
  return valor;
}
