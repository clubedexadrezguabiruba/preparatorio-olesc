"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { usePrisaoDeFoco } from "./foco";

/**
 * O casco de todas as janelas do Editor v2 — §25.
 *
 * ## Por que isto virou um componente
 *
 * Havia duas janelas com o mesmo casco escrito duas vezes (adicionar capítulo e
 * trocar a posição), e esta rodada acrescentaria mais cinco. Sete cópias de um
 * contrato de acessibilidade são sete chances de uma delas envelhecer sozinha —
 * e a prova de que isso acontece já está no diário: o defeito do véu, achado no
 * teste humano de 11/9, existia nas **duas**, e só uma tinha sido exercitada.
 *
 * O que este casco garante, de uma vez, para todas:
 *
 * - `role="dialog"`, `aria-modal` e o título ligado por `aria-labelledby`;
 * - foco no primeiro campo ao abrir, e `Tab` que não escapa para a aula atrás;
 * - `Esc` fecha, e o foco volta ao botão que abriu (quem devolve é quem chamou);
 * - rodapé grudado embaixo, para o botão de confirmar continuar visível numa
 *   janela alta que rola por dentro — medido em 1366×768;
 * - e a regra do véu abaixo.
 *
 * ## A regra do véu: onde o dedo **desceu**, não onde ele subiu
 *
 * O véu fecha a janela ao clique, que é o gesto esperado de "cliquei fora". Só
 * que arrastar uma peça para fora do tabuleiro — o jeito de **remover** uma peça
 * no montador, §9 — termina com o ponteiro no véu, e o navegador dispara o
 * `click` no ancestral comum entre onde o botão desceu e onde subiu: o próprio
 * véu. A janela fechava, e a posição montada ia junto.
 *
 * A regra é: só fecha se o gesto **começou** no véu. Soltar ali o que saiu de
 * dentro da janela não é um pedido de fechar — é o fim de um arrasto.
 */
export function Dialogo({
  titulo,
  descricao,
  largura = "max-w-3xl",
  rodape,
  aoFechar,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  /** A classe de largura do Tailwind. Janelas com tabuleiro pedem mais. */
  largura?: string;
  /** Os botões de fechar e confirmar. Ficam grudados embaixo. */
  rodape: ReactNode;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const janela = useRef<HTMLElement>(null);
  const pressionouNoVeu = useRef(false);
  const tituloId = useId();

  useEffect(() => {
    // O primeiro focável da janela é o botão «Fechar» do cabeçalho: abrir ali dá
    // ao teclado uma saída imediata, antes de atravessar o formulário inteiro.
    janela.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
  }, []);

  // `Esc` e a prisão do `Tab` moram em `foco.ts`, porque a prévia (§15) precisa do
  // mesmo contrato num casco de tela inteira.
  usePrisaoDeFoco(janela, aoFechar);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-veu p-4 backdrop-blur-[2px]"
      onMouseDown={(evento) => { pressionouNoVeu.current = evento.target === evento.currentTarget; }}
      onClick={(evento) => { if (evento.target === evento.currentTarget && pressionouNoVeu.current) aoFechar(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={janela}
        onClick={(evento) => evento.stopPropagation()}
        className={`my-8 flex w-full ${largura} flex-col gap-3 rounded-lg border border-borda bg-papel p-4`}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={tituloId} className="text-base font-semibold text-tinta">{titulo}</h2>
            {descricao ? <p className="text-sm text-tinta-fraca">{descricao}</p> : null}
          </div>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
        </header>

        {children}

        <footer className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-borda-fraca bg-papel px-4 py-3">
          {rodape}
        </footer>
      </section>
    </div>
  );
}
