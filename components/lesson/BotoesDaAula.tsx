"use client";

import type { ReactNode } from "react";

/**
 * Os dois botões do rodapé de uma aula: o que segue, e o que desvia.
 *
 * ## Por que o secundário é contornado em VERDE, e não em cinza
 *
 * **Era `border-borda` sobre o papel, e sumia.** Medido em 8/9/2026: a borda
 * neutra sobre a página dá **1,36:1** — abaixo do piso de 3:1 da WCAG 1.4.11
 * para componente de interface, e abaixo do que o olho separa de uma sombra.
 * "Pular e jogar" e "Dica" ficavam sendo texto solto no meio do painel, sem
 * nada dizendo que ali havia um alvo para tocar. Escurecer a borda neutra não
 * resolvia: `borda-forte`, o degrau mais escuro que existe, mede 1,76:1.
 *
 * A saída usa a paleta que já está na tela: o botão principal é o verde
 * **cheio**, e este é o mesmo verde **contornado** — 3,54:1 de traço e 11,08:1
 * de rótulo sobre a página. É o par preenchido/contornado de sempre, e ele diz
 * a hierarquia sem precisar de um cinza que não se enxerga.
 *
 * ## Por que eles moram aqui
 *
 * Nasceram dentro de `Passada.tsx` e foram copiados para `Treino.tsx`, e as
 * duas cópias já tinham divergido: `px-3` numa, `px-4` na outra, `disabled` só
 * numa. Quando a **tática** adotou o palco, a terceira cópia seria a que
 * transformaria a divergência em regra. Subiram aqui unificados em `px-4`, que
 * é o valor do `Treino` e o do `LessonButton` ao lado.
 *
 * `min-h-11` não é enfeite: é o alvo de toque mínimo confortável no celular, e
 * celular e desktop são iguais aqui.
 */

export function BotaoPrincipal({
  onClick,
  esperando = false,
  children,
}: {
  onClick: () => void;
  /** Gravação em curso: o botão trava para não mandar a mesma coisa duas vezes. */
  esperando?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      className="foco min-h-11 rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({
  onClick,
  esperando = false,
  rotulo,
  children,
}: {
  onClick: () => void;
  esperando?: boolean;
  /**
   * O rótulo do leitor de tela, quando o texto visível é curto demais fora de
   * contexto. "O que procurar" diz pouco lido sozinho numa lista de botões; "Mate
   * em 1: o que procurar" diz o suficiente, e é longo demais para caber na tela.
   */
  rotulo?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      aria-label={rotulo}
      className="foco min-h-11 rounded-lg border border-metodo-superficie px-4 py-2.5 text-sm font-medium text-metodo-tinta transition-colors hover:bg-metodo-superficie/10 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
