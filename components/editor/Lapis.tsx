"use client";

import { useEffect, useRef, useState } from "react";

/**
 * O lapisinho: o texto no lugar em que ele é lido, e a edição em cima dele.
 *
 * ## A régua de uso
 *
 * O pedido do Doug, literal: *"fácil de utilizar, até para uma pessoa leiga. Um
 * lapisinho fácil de editar"*. Isso descarta o formulário — e descarta também
 * o rótulo. Aqui não aparece nome de campo nenhum: a fala está onde o aluno a
 * lê, e o ✎ diz o que fazer sem precisar de legenda.
 *
 * - Passar o mouse (ou dar foco pelo teclado) mostra o lápis.
 * - Clicar abre um `textarea` **no mesmo lugar**, com a mesma tipografia. O
 *   texto não pula, não muda de tamanho, não vai para uma gaveta lateral.
 * - `Enter` salva. `Esc` cancela e devolve o texto de antes. Clicar fora salva.
 * - `Shift+Enter` quebra linha, porque uma fala pode ter duas frases e o
 *   professor não deve descobrir isso perdendo o parágrafo.
 *
 * ## O contador
 *
 * Aparece **só quando estoura** o teto da régua editorial (§3 de
 * `docs/VOZ-DO-CURSO.md`) e **só enquanto se digita**. Um contador permanente
 * transformaria a escrita numa prova; um contador ausente deixaria o Doug
 * descobrir o estouro no CI, dias depois. Ele não impede o salvamento: a régua
 * é editorial, e a última palavra é dele.
 *
 * ## Por que `textarea` e não `contentEditable`
 *
 * `contentEditable` aceita HTML colado — negrito, cor, `<span>` de outro site.
 * O que vai para o JSON é texto puro, e um `<b>` invisível dentro de uma fala
 * viraria um bug de renderização meses depois, sem ninguém saber de onde veio.
 */
export function Lapis({
  valor,
  aoSalvar,
  rotulo,
  teto,
  multilinha = true,
  className = "",
}: {
  valor: string;
  aoSalvar: (novo: string) => void;
  /** Para quem usa leitor de tela: "a fala do diagrama 3", "o título da aula". */
  rotulo: string;
  /** O teto de caracteres da régua. Sem ele, não há contador. */
  teto?: number;
  multilinha?: boolean;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(valor);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editando) return;
    const el = campo.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    crescer(el);
  }, [editando]);

  function crescer(el: HTMLTextAreaElement) {
    // A caixa acompanha o texto: uma barra de rolagem dentro de uma fala de
    // três linhas esconderia metade do que se está escrevendo.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  /**
   * Abrir a edição é o **único** momento em que o texto de fora entra na caixa.
   *
   * O valor pode mudar por fora enquanto se digita — a conferência reescreve o
   * rascunho, o "recarregar" traz o arquivo do disco —, e sincronizar isso por
   * efeito apagaria a frase do professor no meio dela. Como o botão fechado
   * mostra `valor` direto, e não `rascunho`, não há nada para sincronizar: a
   * cópia nasce no clique e morre no fechamento.
   */
  function abrir() {
    setRascunho(valor);
    setEditando(true);
  }

  function fechar(salvando: boolean) {
    setEditando(false);
    if (salvando && rascunho !== valor) aoSalvar(rascunho);
  }

  if (editando) {
    const estourou = teto !== undefined && rascunho.length > teto;
    return (
      <div className="relative">
        <textarea
          ref={campo}
          value={rascunho}
          aria-label={rotulo}
          onChange={(e) => {
            setRascunho(e.target.value);
            crescer(e.target);
          }}
          onBlur={() => fechar(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              fechar(false);
            } else if (e.key === "Enter" && (!multilinha || !e.shiftKey)) {
              e.preventDefault();
              fechar(true);
            }
          }}
          className={`foco w-full resize-none rounded-lg border border-foco bg-carta-alta px-3 py-2 outline-none ${className}`}
          rows={1}
        />
        {estourou && (
          <span className="absolute -bottom-4 right-1 text-xs font-medium text-erro-tinta">
            {rascunho.length} de {teto}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Editar ${rotulo}`}
      className={`group foco relative w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-borda-fraca hover:bg-carta-alta ${className}`}
    >
      {/* Texto vazio ainda precisa de alvo: sem isto, uma fala apagada viraria
          um botão de zero pixel de altura, impossível de clicar de volta. */}
      {valor || <span className="text-tinta-muda">escreva aqui</span>}
      <span
        aria-hidden
        className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        ✎
      </span>
    </button>
  );
}
