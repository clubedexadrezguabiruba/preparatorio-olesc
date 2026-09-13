"use client";

import { useMemo, useState } from "react";
import type { Position } from "@/lib/lesson/schema";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import { prepararRefazerTreino, type PlanoDeRefazerTreinoV2 } from "@/lib/editor-v2/propriedade-treino";
import { Dialogo } from "./Dialogo";

function nomeDaPropriedade(valor: "derivado" | "personalizado" | "independente") {
  if (valor === "derivado") return "ligado à aula";
  return valor;
}

export function DialogoPropriedadeTreino({
  aula,
  treinoId,
  positions,
  salvandoSnapshot,
  aoRefazer,
  aoTornarIndependente,
  aoFechar,
}: {
  aula: AulaV2;
  treinoId: string;
  positions: Record<string, Position>;
  salvandoSnapshot: boolean;
  aoRefazer: (plano: PlanoDeRefazerTreinoV2) => void;
  aoTornarIndependente: () => void;
  aoFechar: () => void;
}) {
  const treino = aula.treinos.find((item) => item.id === treinoId)!;
  const fonteOriginalExiste = Boolean(treino.origem && aula.analises.find((item) => item.id === treino.origem?.analiseId));
  // Fonte removida exige uma decisão explícita: não escolhemos o primeiro
  // capítulo em nome do professor só porque ele aparece primeiro na lista.
  const [capituloNovoId, setCapituloNovoId] = useState("");
  const capituloNovo = aula.capitulos.find((item) => item.id === capituloNovoId);
  const plano = useMemo(() => prepararRefazerTreino(
    aula,
    treinoId,
    positions,
    capituloNovo ? { capituloId: capituloNovo.id, nodeId: capituloNovo.inicioNodeId } : undefined,
  ), [aula, capituloNovo, positions, treinoId]);

  return (
    <Dialogo
      titulo={`Propriedade de «${treino.titulo}»`}
      descricao="Veja o vínculo com a aula antes de substituir qualquer autoria."
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          {treino.propriedade !== "independente" ? (
            <button type="button" onClick={aoTornarIndependente} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Tornar independente</button>
          ) : null}
          <button
            type="button"
            disabled={!plano.ok || salvandoSnapshot}
            onClick={() => { if (plano.ok) aoRefazer(plano.plano); }}
            className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-semibold text-papel disabled:opacity-40"
          >
            {salvandoSnapshot ? "Guardando cópia…" : "Refazer a partir da aula"}
          </button>
        </>
      )}
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-md border border-borda-fraca bg-carta p-3"><strong>Propriedade:</strong> {nomeDaPropriedade(treino.propriedade)}</p>
        <p className={`rounded-md border p-3 ${treino.fonte === "atual" ? "border-borda-fraca bg-carta" : "border-aviso-superficie bg-aviso-superficie/10 text-aviso-tinta"}`}>
          <strong>Fonte:</strong> {treino.fonte}
        </p>
      </div>

      {treino.propriedade === "personalizado" ? (
        <p className="rounded-md border border-metodo-superficie bg-metodo-superficie/10 p-3 text-sm text-metodo-tinta">
          Este treino tem uma cópia própria. Mudanças na aula não sobrescrevem respostas, dicas, feedbacks nem textos das defesas.
        </p>
      ) : null}
      {treino.propriedade === "independente" ? (
        <p className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta-media">
          Este treino joga pela própria cópia. A origem abaixo é apenas histórica.
        </p>
      ) : null}

      {treino.fonte === "removida" || !fonteOriginalExiste ? (
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Escolha uma nova fonte para poder refazer
          <select value={capituloNovoId} onChange={(evento) => setCapituloNovoId(evento.currentTarget.value)} className="foco rounded-md border border-borda bg-papel px-3 py-2">
            <option value="">Escolha um capítulo</option>
            {aula.capitulos.map((capitulo) => <option key={capitulo.id} value={capitulo.id}>{capitulo.titulo}</option>)}
          </select>
          <span className="text-xs text-tinta-fraca">A reconstrução começa na posição inicial do capítulo escolhido.</span>
        </label>
      ) : null}

      {!plano.ok ? (
        <p role="alert" className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">{plano.mensagem}</p>
      ) : (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-tinta">O que será substituído</h3>
          {plano.plano.diferencas.length ? (
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead><tr><th className="border border-borda-fraca p-2">Parte</th><th className="border border-borda-fraca p-2">Agora</th><th className="border border-borda-fraca p-2">Depois</th></tr></thead>
              <tbody>{plano.plano.diferencas.map((item) => (
                <tr key={item.campo}>
                  <th className="border border-borda-fraca p-2 align-top">{item.campo}</th>
                  <td className="break-words border border-borda-fraca p-2 align-top">{item.antes}</td>
                  <td className="break-words border border-borda-fraca p-2 align-top">{item.depois}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-tinta-media">A fonte atual gera o mesmo conteúdo. Refazer apenas volta o treino ao modo ligado à aula.</p>}
          <p className="text-xs text-tinta-fraca">Também serão substituídos os textos próprios das defesas listados acima. Uma cópia anterior será guardada antes da ação, e um único Desfazer recupera tudo.</p>
        </section>
      )}
    </Dialogo>
  );
}
