"use client";

import { useCallback, useEffect, useState } from "react";
import { desativarV2Acao, publicacoesDaAulaV2Acao, reativarPublicacaoV2Acao } from "@/app/editor/v2/acoes";
import { Dialogo } from "./Dialogo";

type Publicacao = Awaited<ReturnType<typeof publicacoesDaAulaV2Acao>>[number];

/**
 * "Mais opções" → as publicações guardadas desta aula (§20.1: snapshots e recuperação).
 *
 * Reativar uma anterior é o rollback: troca só o ponteiro, e nenhuma publicação é apagada.
 * Desativar o v2 devolve o aluno à aula v1. As duas ações pedem confirmação escrita na
 * própria linha, porque mudam o que o aluno recebe.
 */
export function DialogoPublicacoes({ aulaId, aoFechar }: { aulaId: string; aoFechar: () => void }) {
  const [lista, setLista] = useState<Publicacao[] | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(() => {
    publicacoesDaAulaV2Acao(aulaId).then(setLista).catch(() => setLista([]));
  }, [aulaId]);
  useEffect(() => { carregar(); }, [carregar]);

  const reativar = async (publicationId: string) => {
    const resultado = await reativarPublicacaoV2Acao(aulaId, publicationId);
    setConfirmando(null);
    setRecado(resultado.ok ? `A publicação ${publicationId} voltou a ser a ativa.` : `Não foi possível reativar: ${resultado.motivo}.`);
    carregar();
  };

  const desativar = async () => {
    const resultado = await desativarV2Acao(aulaId);
    setConfirmando(null);
    setRecado(resultado.ok ? "O v2 foi desativado: os alunos voltam a receber a aula antiga. As publicações continuam guardadas." : `Não foi possível desativar: ${resultado.motivo}.`);
    carregar();
  };

  const temAtiva = Boolean(lista?.some((item) => item.ativa));

  return (
    <Dialogo
      titulo="Publicações desta aula"
      descricao="Cada publicação fica guardada. Reativar troca a que o aluno recebe; nada é apagado."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={<div className="flex justify-end"><button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button></div>}
    >
      {!lista ? <p role="status" className="text-sm text-tinta-media">Lendo as publicações…</p> : null}
      {lista && !lista.length ? <p className="text-sm text-tinta-media">Esta aula ainda não foi publicada pelo Editor v2.</p> : null}
      {lista?.length ? (
        <ul className="flex flex-col gap-2">
          {lista.map((item) => (
            <li key={item.publicationId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-borda-fraca p-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-tinta">{item.titulo ?? "(pacote ilegível)"}</span>
                <span className="block text-xs text-tinta-fraca">{item.publicationId}{item.ativa ? " · ativa" : ""}{item.integra ? "" : " · não está íntegra"}</span>
              </span>
              {item.ativa || !item.integra ? null : confirmando === item.publicationId ? (
                <span className="flex gap-2">
                  <button type="button" onClick={() => void reativar(item.publicationId)} className="foco rounded-md border border-aviso-superficie px-2 py-1 text-xs text-aviso-tinta">Sim, reativar esta</button>
                  <button type="button" onClick={() => setConfirmando(null)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Cancelar</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmando(item.publicationId)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">Reativar</button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {temAtiva ? (
        confirmando === "desativar" ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-aviso-tinta">
            Os alunos voltam a receber a aula antiga.
            <button type="button" onClick={() => void desativar()} className="foco rounded-md border border-aviso-superficie px-2 py-1 text-xs">Sim, desativar o v2</button>
            <button type="button" onClick={() => setConfirmando(null)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Cancelar</button>
          </p>
        ) : (
          <button type="button" onClick={() => setConfirmando("desativar")} className="foco self-start rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">Desativar o v2 desta aula</button>
        )
      ) : null}
      {recado ? <p role="status" className="text-sm text-tinta">{recado}</p> : null}
    </Dialogo>
  );
}
