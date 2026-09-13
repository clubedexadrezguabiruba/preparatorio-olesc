"use client";

import { useEffect, useState } from "react";
import { aplicarRepertorioAcao, prepararAplicacaoDoRepertorioAcao, type PreparoDaAplicacaoNaTela } from "@/app/editor/repertorio/acoes";
import { Dialogo } from "@/components/editor-v2/Dialogo";

/**
 * Aplicar o rascunho do repertório — §21: "antes de aplicar, compilar candidato e mostrar
 * impacto em IDs/progresso".
 *
 * O molde é o de `DialogoPublicar`: a janela abre calculando, mostra o que muda (linhas que
 * nascem e morrem, o Base que re-tranca o Avançado, os registros de alunos que deixam de ser
 * alcançados) e só então oferece o botão. O hash do que o professor leu vai junto, e o
 * servidor recusa se a fonte ou o rascunho mudaram nesse meio-tempo. Cancelar não muda nada.
 */
export function DialogoAplicarRepertorio({ arquivo, aoFechar, aoAplicar }: {
  arquivo: string;
  aoFechar: () => void;
  aoAplicar: () => void;
}) {
  const [preparo, setPreparo] = useState<PreparoDaAplicacaoNaTela | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    prepararAplicacaoDoRepertorioAcao(arquivo)
      .then((resposta) => { if (ativo) setPreparo(resposta); })
      .catch(() => { if (ativo) setPreparo({ ok: false, motivo: "não foi possível calcular o impacto agora", problemas: [] }); });
    return () => { ativo = false; };
  }, [arquivo]);

  const aplicar = async () => {
    if (!preparo?.ok || aplicando) return;
    setAplicando(true);
    setFalha(null);
    try {
      const resultado = await aplicarRepertorioAcao(arquivo, preparo.impactoHash);
      if (resultado.ok) aoAplicar();
      else setFalha(resultado.motivo);
    } catch {
      setFalha("a aplicação não respondeu — abra o arquivo de novo para conferir o que está em disco");
    } finally {
      setAplicando(false);
    }
  };

  return (
    <Dialogo
      titulo="Aplicar no repertório"
      descricao="O que muda para os alunos, antes de trocar a fonte e o compilado."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-tinta-fraca">Grava content/repertorio e public/repertorio neste computador. Commit, push e deploy continuam à parte.</p>
          <div className="flex gap-2">
            <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
            <button
              type="button"
              onClick={() => void aplicar()}
              disabled={!preparo?.ok || aplicando}
              className="foco rounded-md border border-metodo-superficie bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
            >
              {aplicando ? "Aplicando…" : "Aplicar"}
            </button>
          </div>
        </div>
      )}
    >
      {!preparo ? (
        <p role="status" className="text-sm text-tinta-media">Compilando o repertório com a edição…</p>
      ) : !preparo.ok ? (
        <div role="alert" className="flex flex-col gap-1 text-sm text-erro-texto">
          <p>Não dá para aplicar agora: {preparo.motivo}.</p>
          {preparo.problemas.length > 0 ? (
            <ul className="flex max-h-60 flex-col gap-1 overflow-auto text-xs">
              {preparo.problemas.slice(0, 20).map((p) => <li key={p}>{p}</li>)}
            </ul>
          ) : null}
        </div>
      ) : (
        <section aria-label="Impacto da aplicação" className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5 text-sm text-tinta">
            {preparo.frases.map((frase) => <li key={frase} className="border-l-2 border-borda pl-2">{frase}</li>)}
          </ul>
        </section>
      )}
      {falha ? <p role="alert" className="text-sm text-erro-texto">Nada foi aplicado: {falha}.</p> : null}
    </Dialogo>
  );
}
