"use client";

import { emOnde, type DestinoV2, type ProblemaVisivelV2 } from "@/lib/editor-v2/diagnostico-visual";

/**
 * A lista de problemas da aula, no vocabulário do professor.
 *
 * ## O que ela substitui
 *
 * Até aqui, um documento inválido chegava ao professor de duas formas, e as duas
 * eram inúteis: ou uma mensagem crua do validador com identificadores internos
 * (`analise-n1-kpk / node-7`), ou — no caso de um lance impossível — **uma tela
 * vazia**, porque o desenhador do painel estourava antes de desenhar qualquer coisa.
 *
 * Aqui cada problema tem três partes, e as três importam: **o que está errado**, em
 * uma frase; **onde**, com o nome que o professor deu ao capítulo e o número do lance
 * que ele conta na tela; e um botão que **leva até lá**.
 *
 * ## Por que o botão às vezes não aparece
 *
 * Nem todo problema tem lugar navegável — "esta aula não declara seus metadados" é da
 * aula inteira, não de um lance. Oferecer "Ir para o problema" ali seria um botão que
 * não faz nada, e um botão que não faz nada ensina o professor a desconfiar dos
 * outros. Quando não há destino, sobra a frase, que continua dizendo onde olhar.
 */
export function PainelDeProblemas({
  visiveis,
  resumo,
  aoIr,
}: {
  visiveis: ProblemaVisivelV2[];
  resumo: string | null;
  aoIr: (destino: DestinoV2) => void;
}) {
  if (!visiveis.length) return null;
  const impede = visiveis.some((item) => item.problema.severidade === "erro");

  return (
    <section
      aria-label="Problemas desta aula"
      className={`rounded-lg border p-3 ${impede ? "border-erro bg-erro-superficie/10" : "border-aviso-superficie bg-aviso-superficie/10"}`}
    >
      <p className={`text-sm font-medium ${impede ? "text-erro-texto" : "text-aviso-tinta"}`}>{resumo}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {visiveis.map((item, indice) => (
          <li
            key={`${item.problema.codigo}-${indice}`}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-borda-fraca pt-2 text-sm first:border-t-0 first:pt-0"
          >
            {/* O aviso precisa se distinguir do que trava mesmo dentro da lista:
                com os dois misturados, o professor não sabe o que é obrigatório. */}
            <span className={`rotulo shrink-0 ${item.problema.severidade === "erro" ? "text-erro-texto" : "text-aviso-tinta"}`}>
              {item.problema.severidade === "erro" ? "impede" : "aviso"}
            </span>
            <span className="text-tinta">{item.problema.mensagem}</span>
            <span className="text-tinta-fraca">— {emOnde(item.onde)}</span>
            {item.destino ? (
              <button
                type="button"
                onClick={() => aoIr(item.destino!)}
                className="foco shrink-0 rounded-md border border-borda px-2 py-0.5 text-xs font-medium text-tinta hover:bg-carta-toque"
              >
                Ir para o problema
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
