"use client";

import { useEffect, useState } from "react";
import { guardarSnapshotDeMigracaoV1Acao, prepararConversaoV1Acao, type PreparoDaConversaoNaTelaV2 } from "@/app/editor/v2/acoes";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import { Dialogo } from "./Dialogo";

/**
 * Converter a aula para o formato novo — especificação §20.3.
 *
 * Mostra o diff pedagógico contra a aula antiga **antes** do botão, guarda o snapshot
 * `antes-de-migrar` no servidor, e só então pede à tela para aplicar a conversão como um
 * comando (que o Desfazer desfaz). O arquivo da aula antiga não é tocado.
 */
export function DialogoConverterV1({ aulaId, aula, aoFechar, aoConverter }: {
  aulaId: string;
  aula: AulaV2;
  aoFechar: () => void;
  aoConverter: () => void;
}) {
  const [preparo, setPreparo] = useState<PreparoDaConversaoNaTelaV2 | null>(null);
  const [convertendo, setConvertendo] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    prepararConversaoV1Acao(aulaId, JSON.stringify(aula))
      .then((resposta) => { if (ativo) setPreparo(resposta); })
      .catch(() => { if (ativo) setPreparo({ ok: false, motivo: "não foi possível comparar agora" }); });
    return () => { ativo = false; };
    // O diff é um retrato do documento no instante em que a janela abriu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aulaId]);

  const converter = async () => {
    if (!preparo?.ok || !preparo.preparo.podeConverter || convertendo) return;
    setConvertendo(true);
    setFalha(null);
    try {
      const guardado = await guardarSnapshotDeMigracaoV1Acao(aulaId, JSON.stringify(aula));
      if (guardado.ok) aoConverter();
      else setFalha(guardado.erro);
    } catch {
      setFalha("o servidor não respondeu; a aula não foi convertida");
    } finally {
      setConvertendo(false);
    }
  };

  const p = preparo?.ok ? preparo.preparo : null;
  return (
    <Dialogo
      titulo="Converter para o formato novo"
      descricao="A aula antiga continua intacta. Depois de converter, esta é a aula que o editor publica."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button type="button" onClick={() => void converter()} disabled={!p?.podeConverter || convertendo} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40">
            {convertendo ? "Convertendo…" : "Converter"}
          </button>
        </div>
      )}
    >
      {!preparo ? <p role="status" className="text-sm text-tinta-media">Comparando com a aula antiga…</p> : null}
      {preparo && !preparo.ok ? <p role="alert" className="text-sm text-erro-texto">{preparo.motivo}.</p> : null}
      {p ? (
        <section aria-label="Diferenças para a aula antiga" className="flex flex-col gap-2 text-sm">
          <p className={p.divergencias.length ? "text-aviso-tinta" : "text-metodo-tinta-alta"} role="status">
            {p.divergencias.length
              ? `${p.divergencias.length} diferença(s) para o que o aluno recebe na aula antiga:`
              : "0 diferenças: o aluno recebe exatamente o que recebia na aula antiga."}
          </p>
          {p.divergencias.length ? (
            <ul className="max-h-40 overflow-y-auto border-l-2 border-borda pl-2 text-tinta">
              {p.divergencias.map((d) => <li key={d.onde}>{d.onde}</li>)}
            </ul>
          ) : null}
          <p className="text-tinta-media">
            Ficam permanentes: {p.ids.capitulos} capítulo(s), {p.ids.narracoes} narrações, {p.ids.nos} posições,{" "}
            {p.ids.treinos} treino(s) com {p.ids.questoes} perguntas, {p.ids.praticas} prática(s) e {p.ids.etapas} etapas.
          </p>
          <p className="text-xs text-tinta-fraca">Aula antiga conferida pelo conteúdo: {p.hashV1.slice(0, 12)}…</p>
          {p.motivo ? <p className="text-aviso-tinta">{p.motivo}.</p> : null}
        </section>
      ) : null}
      {falha ? <p role="alert" className="text-sm text-erro-texto">{falha}.</p> : null}
    </Dialogo>
  );
}
