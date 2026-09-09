"use client";

import type { ReactNode } from "react";
import type { MessageTone, PanelMessage } from "@/lib/lesson/store";

/**
 * `conclusao` é uma entrada de mapa, e não uma concatenação de utilitários por
 * cima de `good`: no Tailwind v4 duas utilities conflitantes na mesma string
 * resolvem pela ordem **na folha gerada**, não na ordem da `class` — concatenar
 * seria um erro silencioso de ordem, que às vezes acerta e às vezes não.
 */
const TONE: Record<MessageTone | "conclusao", string> = {
  good: "border-metodo-superficie/40 bg-metodo-superficie/10 text-metodo-tinta",
  bad: "border-erro-superficie/40 bg-erro-superficie/10 text-erro-tinta",
  warn: "border-aviso-superficie/40 bg-aviso-superficie/10 text-aviso-tinta",
  neutral: "border-borda bg-carta text-tinta-media",
  conclusao: "border-metodo/70 bg-metodo-superficie/20 text-metodo-tinta-alta ring-1 ring-metodo/30",
};

/**
 * O painel que fala com o aluno. É a única voz da aula: feedback do método,
 * texto do erro nomeado e os dois fallbacks honestos saem todos daqui.
 *
 * A região é `aria-live` e existe sempre — mesmo vazia —, porque um leitor de
 * tela só anuncia mudanças dentro de uma região que já estava lá. O `key={seq}`
 * troca o nó de dentro a cada mensagem: sem isso, repetir o mesmo erro duas
 * vezes seguidas não geraria mutação nenhuma e o anúncio ficaria mudo.
 *
 * **Regra inviolável:** este `<div>` nunca é desmontado nem recebe `key`.
 * Trocar `className` e trocar filhos é seguro; deixar de existir por um instante
 * é o que emudece o leitor de tela.
 */
export function FeedbackPanel({
  message,
  placeholder,
  retrato,
}: {
  message: PanelMessage | null;
  placeholder?: string;
  /**
   * O professor, à esquerda da fala. É a mesma linha que o `Comentario` do
   * repertório monta, e pela mesma razão: **a ordem é a informação** — o texto
   * vem depois do desenho, e assim a instrução lê como alguém falando em vez de
   * como aviso de sistema.
   *
   * **Abaixo de `lg` ele some.** No celular o painel tem 328 px, e 112 deles
   * seriam um terço da tela tirados justamente do texto.
   *
   * O retrato fica FORA do `aria-live`, e isso não é detalhe: a região viva
   * anuncia tudo que muda dentro dela, e um desenho que não fala não pode
   * entrar na fala. A regra inviolável do painel — nunca desmontar — continua
   * valendo para o `<div>` de dentro, que é o que tem o `aria-live`.
   */
  retrato?: ReactNode;
}) {
  const done = message?.done ?? false;
  const fala = (
    <div
      aria-live="polite"
      role="status"
      data-enfase={done ? "conclusao" : undefined}
      className={`min-h-16 rounded-lg border px-4 py-3 text-sm leading-relaxed transition-colors ${
        message ? TONE[done ? "conclusao" : message.tone] : TONE.neutral
      }`}
    >
      {message ? (
        // O selo entra *dentro* do nó com `key`, para fazer parte da mutação
        // anunciada: o leitor de tela começa pela conclusão.
        <span key={message.seq}>
          {done && (
            <strong className="mr-2 inline-block rounded bg-metodo/20 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-metodo-selo">
              Etapa concluída.
            </strong>
          )}
          {message.text}
        </span>
      ) : (
        <span className="text-tinta-fraca">{placeholder ?? ""}</span>
      )}
    </div>
  );

  if (!retrato) return fala;
  return (
    <div className="flex gap-4">
      <div className="hidden shrink-0 lg:block">{retrato}</div>
      <div className="min-w-0 flex-1">{fala}</div>
    </div>
  );
}
