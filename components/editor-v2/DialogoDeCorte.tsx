"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { PainelDeResolucoes, faltamEscolhas } from "@/components/editor-v2/PainelDeResolucoes";
import { calcularCorte, type PlanoDoCorteV2, type TipoDeCorteV2 } from "@/lib/editor-v2/acoes-do-lance";
import type { ResolucoesV2 } from "@/lib/editor-v2/impacto";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

/**
 * "Excluir a partir daqui" e "Substituir continuação" — §11.3.
 *
 * ## Por que as duas moram na mesma janela
 *
 * Porque são a mesma conta com um nó de diferença: excluir leva o lance junto,
 * substituir deixa o lance e leva o que vinha depois dele. O impacto é
 * calculado pela mesma função, mostrado do mesmo jeito, e resolvido com as
 * mesmas três saídas de §5.
 *
 * ## O que a substituição **não** é
 *
 * Ela não é o que acontece quando o professor joga um lance diferente no
 * tabuleiro: ali nasce uma **variante**, e a continuação anterior fica — §5 do
 * plano é explícito em evitar "um modal em cada lance divergente". Substituir é
 * o gesto deliberado de quem já decidiu que a continuação antiga está errada, e
 * por isso passa por aqui, com impacto e com Desfazer.
 */
export function DialogoDeCorte({
  aula,
  tipo,
  analiseId,
  nodeId,
  lance,
  positions,
  aoCortar,
  aoFechar,
}: {
  aula: AulaV2;
  tipo: TipoDeCorteV2;
  analiseId: string;
  nodeId: string;
  /** O lance com a numeração do painel — `12… Rd6`. */
  lance: string;
  positions: Record<string, Position>;
  aoCortar: (plano: PlanoDoCorteV2, resolucoes: ResolucoesV2) => void;
  aoFechar: () => void;
}) {
  const [resolucoes, setResolucoes] = useState<ResolucoesV2>({});
  const calculo = useMemo(
    () => calcularCorte(aula, { analiseId, nodeId, tipo, lance }, positions),
    [analiseId, aula, lance, nodeId, positions, tipo],
  );

  const impacto = calculo.ok ? calculo.plano.impacto : null;
  const dependentes = impacto?.dependentes ?? [];
  const faltam = faltamEscolhas(dependentes, resolucoes);
  const lances = impacto?.nosRemovidos.length ?? 0;

  return (
    <Dialogo
      titulo={tipo === "excluir-daqui" ? `Excluir a partir de ${lance}?` : `Substituir a continuação de ${lance}?`}
      descricao="Nada acontece antes de você confirmar, e um Desfazer traz tudo de volta."
      largura="max-w-2xl"
      aoFechar={aoFechar}
      rodape={
        <>
          {faltam > 0 ? (
            <span className="mr-auto text-xs text-tinta-fraca">
              {faltam === 1 ? "Falta decidir o que fazer com 1 dependente." : `Faltam decidir ${faltam} dependentes.`}
            </span>
          ) : null}
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button
            type="button"
            disabled={!calculo.ok || faltam > 0}
            onClick={() => { if (calculo.ok) aoCortar(calculo.plano, resolucoes); }}
            className="foco rounded-md border border-erro bg-erro-superficie/20 px-3 py-2 text-sm font-medium text-erro-texto disabled:opacity-40"
          >
            {tipo === "excluir-daqui" ? "Excluir" : "Substituir"}
          </button>
        </>
      }
    >
      {!calculo.ok ? (
        <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{calculo.mensagem}</p>
      ) : null}

      {impacto ? (
        <>
          <ul className="flex flex-col gap-1 rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">
            <li>
              {lances === 1 ? "1 lance sai" : `${lances} lances saem`} da partida
              {tipo === "substituir-continuacao" ? `; ${lance} fica, e você joga a continuação nova no tabuleiro.` : "."}
            </li>
            {impacto.comentariosRemovidos > 0 ? (
              <li>{impacto.comentariosRemovidos === 1 ? "1 comentário some" : `${impacto.comentariosRemovidos} comentários somem`} junto.</li>
            ) : null}
            {impacto.desenhosRemovidos > 0 ? (
              <li>{impacto.desenhosRemovidos === 1 ? "1 posição com desenho some" : `${impacto.desenhosRemovidos} posições com desenho somem`} junto.</li>
            ) : null}
            {impacto.narracoesRemovidas.length > 0 ? (
              <li>
                {impacto.narracoesRemovidas.length === 1 ? "Uma narração some" : `${impacto.narracoesRemovidas.length} narrações somem`}:{" "}
                {impacto.narracoesRemovidas.map((n) => `«${n.texto.slice(0, 40)}${n.texto.length > 40 ? "…" : ""}»`).join(", ")}.
              </li>
            ) : null}
            {impacto.capitulosAfetados.filter((c) => c.percursoCortado || c.inicioReiniciado).map((capitulo) => (
              <li key={capitulo.id}>
                O capítulo «{capitulo.titulo}»{" "}
                {capitulo.inicioReiniciado ? "volta a começar na posição inicial" : "tem o percurso cortado no lance que cai"}.
              </li>
            ))}
            {impacto.treinosAfetados.map((treino) => (
              <li key={treino.id}>
                O treino «{treino.titulo}» volta a ter a avaliação pendente
                {treino.certificacaoReaberta ? ", e a certificação dele é reaberta" : ""}
                {treino.fonteAlterada ? ", e a fonte dele passa a constar como alterada" : ""}.
              </li>
            ))}
            {lances === 0 ? <li className="text-tinta-fraca">Nada a remover aqui.</li> : null}
          </ul>

          <PainelDeResolucoes
            dependentes={dependentes}
            resolucoes={resolucoes}
            aoEscolher={(id, escolha) => setResolucoes((atual) => ({ ...atual, [id]: escolha }))}
          />
        </>
      ) : null}
    </Dialogo>
  );
}
