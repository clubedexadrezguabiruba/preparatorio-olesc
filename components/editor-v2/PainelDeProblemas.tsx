"use client";

import { useState } from "react";
import { emOnde, type DestinoV2, type ProblemaVisivelV2 } from "@/lib/editor-v2/diagnostico-visual";

/** O cabeçalho do resultado do botão Conferir (§19.3): contagens e o veredito. */
export type ResumoDaConferenciaV2 = {
  em: string;
  erros: number;
  avisos: number;
  podePublicar: boolean;
  /** A conferência nem julgou: trava, conflito, aula ausente. */
  impedimento?: string;
  /** A aula mudou depois da conferência: o resultado não vale mais, e o editor já está conferindo de novo. */
  vencida: boolean;
};

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
 *
 * ## As duas listas
 *
 * A mesma moldura mostra a lista **viva** (o que a tela calcula a cada edição) e o
 * resultado do **Conferir** (o que o servidor julgou para publicar). Com `conferencia`,
 * o cabeçalho diz as contagens e se pode publicar, e aparece mesmo sem nenhum problema:
 * "nada impede" é uma resposta que o professor precisa ler.
 */
export function PainelDeProblemas({
  visiveis,
  resumo,
  aoIr,
  conferencia,
  aoFechar,
}: {
  visiveis: ProblemaVisivelV2[];
  resumo: string | null;
  aoIr: (destino: DestinoV2) => void;
  conferencia?: ResumoDaConferenciaV2;
  aoFechar?: () => void;
}) {
  // Revisão de experiência (14/9/2026): a lista começa aberta quando algo impede publicar, e fechada
  // quando só há avisos — aviso não é tarefa, e doze avisos abertos empurravam o tabuleiro para baixo.
  const temErro = visiveis.some((item) => item.problema.severidade === "erro");
  const [aberta, setAberta] = useState<boolean | null>(null);
  // A lista viva (sem conferência) com poucos avisos continua aberta: são tarefas do capítulo aberto.
  const listaAberta = aberta ?? (temErro || (!conferencia && visiveis.length <= 3));
  if (!visiveis.length && !conferencia) return null;
  const impede = conferencia ? !conferencia.podePublicar || Boolean(conferencia.impedimento) : visiveis.some((item) => item.problema.severidade === "erro");
  const tom = conferencia?.vencida
    ? "border-borda bg-carta-toque/40"
    : impede ? "border-erro bg-erro-superficie/10" : conferencia ? "border-metodo-superficie bg-metodo-superficie/10" : "border-aviso-superficie bg-aviso-superficie/10";

  return (
    <section aria-label={conferencia ? "Resultado da conferência" : "Problemas desta aula"} className={`rounded-lg border p-3 ${tom} ${conferencia ? "bg-papel" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {conferencia ? (
          <p
            className={`text-sm font-medium ${conferencia.vencida ? "text-tinta-media" : impede ? "text-erro-texto" : "text-metodo-tinta-alta"}`}
            role="status"
            title={`Conferência das ${new Date(conferencia.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
          >
            {conferencia.impedimento
              ? `Não deu para conferir: ${conferencia.impedimento}.`
              : conferencia.vencida
                ? "A aula mudou — conferindo de novo…"
                : conferencia.podePublicar
                  ? `Pode publicar.${conferencia.avisos ? ` ${conferencia.avisos} ${conferencia.avisos === 1 ? "aviso" : "avisos"}, que não impedem.` : ""}`
                  : `Ainda não dá para publicar: ${conferencia.erros} ${conferencia.erros === 1 ? "problema impede" : "problemas impedem"}.${conferencia.avisos ? ` E ${conferencia.avisos} ${conferencia.avisos === 1 ? "aviso" : "avisos"}.` : ""}`}
          </p>
        ) : (
          <p className={`text-sm font-medium ${impede ? "text-erro-texto" : "text-aviso-tinta"}`}>{resumo}</p>
        )}
        <span className="flex gap-2">
          {visiveis.length ? (
            <button type="button" aria-expanded={listaAberta} onClick={() => setAberta(!listaAberta)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">
              {listaAberta ? "Esconder lista" : `Ver lista (${visiveis.length})`}
            </button>
          ) : null}
          {conferencia && aoFechar ? (
            <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">
              Fechar
            </button>
          ) : null}
        </span>
      </div>
      {/* Teto com rolagem própria: a página tem altura fechada, e uma lista de
          quarenta problemas espremeria o tabuleiro até ele sumir. O resumo acima
          continua visível, então o professor sabe quantos são mesmo sem rolar. */}
      {visiveis.length && listaAberta ? (
        <ul className="mt-2 flex max-h-40 flex-col gap-2 overflow-y-auto">
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
              <span className="text-tinta">{item.problema.mensagem.charAt(0).toUpperCase() + item.problema.mensagem.slice(1)}</span>
              <span className="text-tinta-fraca">— {emOnde(item.onde)}</span>
              {item.destino ? (
                <button
                  type="button"
                  onClick={() => aoIr(item.destino!)}
                  className="foco shrink-0 rounded-md border border-borda px-2 py-0.5 text-xs font-medium text-tinta hover:bg-carta-toque"
                >
                  Resolver
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
