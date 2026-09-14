"use client";

import { Dialogo } from "@/components/editor-v2/Dialogo";
import { etapasNaOrdem } from "@/lib/editor-v2/fluxo";
import type { AulaV2 } from "@/lib/editor-v2/modelo";

/**
 * A ordem da aula — §18, fatia 10.
 *
 * A lista inteira do `fluxo` — introdução, capítulos, treinos e prática — com ↑ e ↓ e a frase
 * humana do lugar ("depois do capítulo «O L e a caixa»"). Cada movimento é um Desfazer; a revisão da
 * avaliação não muda (reordenar não invalida domínio).
 */
export function OrdemDaAula({ aula, aoMover, aoFechar }: {
  aula: AulaV2;
  aoMover: (etapaId: string, para: number) => void;
  aoFechar: () => void;
}) {
  const linhas = etapasNaOrdem(aula);
  const praticaNoMeio = linhas.findIndex((linha) => linha.etapa.tipo === "pratica") >= 0
    && linhas.findIndex((linha) => linha.etapa.tipo === "pratica") < linhas.length - 1;
  return (
    <Dialogo
      titulo="Ordem da aula"
      descricao="É nesta ordem que o aluno faz a aula. Mover não muda o que foi avaliado."
      largura="max-w-2xl"
      aoFechar={aoFechar}
      rodape={<button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>}
    >
      <ol aria-label="Etapas na ordem da aula" className="flex flex-col gap-1">
        {linhas.map((linha, i) => (
          <li key={linha.etapa.id} data-etapa={linha.etapa.id} className="flex items-center gap-2 rounded-md border border-borda-fraca p-2">
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-tinta-fraca">{i + 1}.</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-tinta"><strong>{linha.rotulo}</strong> · {linha.nome}</span>
              <span className="block text-xs text-tinta-fraca">{linha.lugar}</span>
            </span>
            <button type="button" aria-disabled={i === 0} aria-label={`Subir ${linha.rotulo.toLowerCase()} «${linha.nome}»`} onClick={() => i > 0 && aoMover(linha.etapa.id, i - 1)} className="foco rounded border border-borda px-2 py-1 text-sm text-tinta aria-disabled:opacity-40">↑</button>
            <button type="button" aria-disabled={i === linhas.length - 1} aria-label={`Descer ${linha.rotulo.toLowerCase()} «${linha.nome}»`} onClick={() => i < linhas.length - 1 && aoMover(linha.etapa.id, i + 1)} className="foco rounded border border-borda px-2 py-1 text-sm text-tinta aria-disabled:opacity-40">↓</button>
          </li>
        ))}
      </ol>
      {praticaNoMeio ? (
        <p role="status" className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-xs text-aviso-tinta">
          A prática não é a última etapa: o aluno faz a avaliação antes de terminar o que a prepara. Pode ser de propósito — confira.
        </p>
      ) : null}
    </Dialogo>
  );
}
