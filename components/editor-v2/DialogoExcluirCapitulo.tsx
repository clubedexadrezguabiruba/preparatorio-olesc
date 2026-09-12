"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { PainelDeResolucoes, faltamEscolhas } from "@/components/editor-v2/PainelDeResolucoes";
import { calcularExclusaoDeCapitulo, type PlanoDeExclusaoV2 } from "@/lib/editor-v2/capitulo";
import type { ResolucoesV2 } from "@/lib/editor-v2/impacto";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

/**
 * "Excluir capítulo" — §8.4.
 *
 * ## As duas decisões, e por que elas não são uma só
 *
 * §8.4: "excluir capítulo **não** exclui automaticamente a análise
 * compartilhada". Aqui isso é uma caixa separada, desmarcada por padrão. Excluir
 * o capítulo perde a *apresentação* — as narrações e o lugar no fluxo. Excluir a
 * análise perde os *lances*. São perdas de tamanho muito diferente, e juntá-las
 * num botão só faria o professor perder a segunda sem ter pedido.
 *
 * Quando outro capítulo mostra a mesma partida, a caixa nem aparece: em vez dela
 * fica escrito quem são os outros capítulos, pelo nome.
 *
 * ## Confirmação mesmo quando não há nada a perder
 *
 * §8.4: "exclusão simples e sem dependentes ainda exige confirmação clara". Por
 * isso esta janela existe até no caso trivial — e, nesse caso, ela diz
 * exatamente o que vai acontecer, que é pouca coisa. Uma confirmação que só
 * aparece no caso perigoso ensina o professor a clicar sem ler no caso comum.
 */
export function DialogoExcluirCapitulo({
  aula,
  capituloId,
  positions,
  aoExcluir,
  aoFechar,
}: {
  aula: AulaV2;
  capituloId: string;
  positions: Record<string, Position>;
  aoExcluir: (plano: PlanoDeExclusaoV2, resolucoes: ResolucoesV2) => void;
  aoFechar: () => void;
}) {
  const [levarAnalise, setLevarAnalise] = useState(false);
  const [resolucoes, setResolucoes] = useState<ResolucoesV2>({});

  const calculo = useMemo(
    () => calcularExclusaoDeCapitulo(aula, { capituloId, excluirAnalise: levarAnalise }, positions),
    [aula, capituloId, levarAnalise, positions],
  );

  const impacto = calculo.ok ? calculo.plano.impacto : null;
  const dependentes = impacto?.dependentes ?? [];
  const faltam = faltamEscolhas(dependentes, resolucoes);

  return (
    <Dialogo
      titulo={`Excluir «${impacto?.titulo ?? "capítulo"}»?`}
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
            onClick={() => { if (calculo.ok) aoExcluir(calculo.plano, resolucoes); }}
            className="foco rounded-md border border-erro bg-erro-superficie/20 px-3 py-2 text-sm font-medium text-erro-texto disabled:opacity-40"
          >
            {levarAnalise ? "Excluir o capítulo e a partida" : "Excluir o capítulo"}
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
            <li>O capítulo sai da coluna da esquerda e da ordem da aula.</li>
            {impacto.narracoesRemovidas > 0 ? (
              <li>
                {impacto.narracoesRemovidas === 1
                  ? "Uma narração some com ele"
                  : `${impacto.narracoesRemovidas} narrações somem com ele`} — a narração é da apresentação, e a apresentação é este capítulo.
              </li>
            ) : null}
            {impacto.compartilhamComOutros.length > 0 ? (
              <li>
                A partida continua na aula: {impacto.compartilhamComOutros.map((n) => `«${n}»`).join(", ")}{" "}
                {impacto.compartilhamComOutros.length === 1 ? "também a mostra" : "também a mostram"}.
              </li>
            ) : null}
            {impacto.analiseFicaOrfa ? (
              <li className="text-aviso-tinta">
                A partida fica na aula sem nenhum capítulo que a mostre. Os lances não se perdem; eles deixam de aparecer.
              </li>
            ) : null}
            {impacto.excluirAnalise ? (
              <li className="text-erro-texto">
                A partida vai junto: {impacto.nosRemovidos} {impacto.nosRemovidos === 1 ? "lance" : "lances"}
                {impacto.comentariosRemovidos > 0 ? `, ${impacto.comentariosRemovidos} ${impacto.comentariosRemovidos === 1 ? "comentário" : "comentários"}` : ""}
                {impacto.desenhosRemovidos > 0 ? ` e ${impacto.desenhosRemovidos} ${impacto.desenhosRemovidos === 1 ? "posição com desenho" : "posições com desenho"}` : ""}.
              </li>
            ) : null}
            {impacto.publicada ? (
              <li className="text-tinta-fraca">
                Esta aula já foi publicada. O aluno continua vendo a versão publicada: excluir aqui mexe no rascunho, não no curso.
              </li>
            ) : null}
          </ul>

          {impacto.compartilhamComOutros.length === 0 ? (
            <label className="flex items-start gap-2 rounded-md border border-borda-fraca bg-papel p-3 text-sm text-tinta">
              <input
                type="checkbox"
                checked={levarAnalise}
                onChange={(evento) => { setLevarAnalise(evento.currentTarget.checked); setResolucoes({}); }}
                className="foco mt-0.5"
              />
              <span>
                Excluir também a partida deste capítulo
                <span className="block text-xs text-tinta-fraca">
                  Nenhum outro capítulo a mostra. Sem isto, os lances continuam guardados na aula.
                </span>
              </span>
            </label>
          ) : null}

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
