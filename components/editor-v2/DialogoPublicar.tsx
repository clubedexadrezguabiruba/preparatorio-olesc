"use client";

import { useEffect, useState } from "react";
import { prepararPublicacaoV2Acao, publicarAulaV2Acao, type PreparoDaPublicacaoNaTelaV2 } from "@/app/editor/v2/acoes";
import { Dialogo } from "./Dialogo";

/**
 * Publicar — especificação §20.1.
 *
 * A janela abre **calculando o impacto**, e só depois oferece o botão. O professor lê o que
 * muda para o curso e os alunos antes do clique; o hash do que ele leu vai junto no pedido,
 * e o servidor recusa se a aula ou a publicação ativa tiverem mudado nesse meio-tempo.
 *
 * O texto do rodapé repete a fronteira de §20.1: publicar grava no `content/` deste
 * computador. O aluno do site só recebe depois do commit, do push e do deploy — e isso
 * continua sendo feito à parte.
 */
export function DialogoPublicar({ aulaId, aoFechar, aoPublicar }: {
  aulaId: string;
  aoFechar: () => void;
  aoPublicar: (publicationId: string) => void;
}) {
  const [preparo, setPreparo] = useState<PreparoDaPublicacaoNaTelaV2 | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    prepararPublicacaoV2Acao(aulaId)
      .then((resposta) => { if (ativo) setPreparo(resposta); })
      .catch(() => { if (ativo) setPreparo({ ok: false, motivo: "não foi possível calcular o impacto agora" }); });
    return () => { ativo = false; };
  }, [aulaId]);

  const publicar = async () => {
    if (!preparo?.ok || publicando) return;
    setPublicando(true);
    setFalha(null);
    try {
      const resultado = await publicarAulaV2Acao(aulaId, preparo.impactoHash);
      if (resultado.ok) aoPublicar(resultado.publicationId);
      else setFalha(resultado.motivo);
    } catch {
      setFalha("a publicação não respondeu; nada foi ativado sem confirmação — abra a aula de novo para conferir");
    } finally {
      setPublicando(false);
    }
  };

  return (
    <Dialogo
      titulo="Publicar a aula"
      descricao="O que muda para o curso e para os alunos, antes de ativar."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-tinta-fraca">Grava em content/ neste computador. Commit, push e deploy continuam à parte.</p>
          <div className="flex gap-2">
            <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
            <button
              type="button"
              onClick={() => void publicar()}
              disabled={!preparo?.ok || publicando}
              className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
            >
              {publicando ? "Publicando…" : preparo?.ok && preparo.mesmoConteudo ? "Republicar igual" : "Publicar"}
            </button>
          </div>
        </div>
      )}
    >
      {!preparo ? (
        <p role="status" className="text-sm text-tinta-media">Calculando o impacto…</p>
      ) : !preparo.ok ? (
        <p role="alert" className="text-sm text-erro-texto">Não dá para publicar agora: {preparo.motivo}.</p>
      ) : (
        <section aria-label="Impacto da publicação" className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5 text-sm text-tinta">
            {preparo.frases.map((frase) => <li key={frase} className="border-l-2 border-borda pl-2">{frase}</li>)}
          </ul>
          <p className="text-xs text-tinta-fraca">Identificador desta publicação: {preparo.publicationId}</p>
        </section>
      )}
      {falha ? <p role="alert" className="text-sm text-erro-texto">A publicação não foi feita: {falha}.</p> : null}
    </Dialogo>
  );
}
