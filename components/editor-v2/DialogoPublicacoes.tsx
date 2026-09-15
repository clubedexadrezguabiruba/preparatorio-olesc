"use client";

import { useCallback, useEffect, useState } from "react";
import { desativarV2Acao, publicacoesDaAulaV2Acao, reativarPublicacaoV2Acao } from "@/app/editor/v2/acoes";
import type { ComandoV2 } from "@/lib/editor-v2/comandos";
import type { MetadadosAulaV2 } from "@/lib/editor-v2/modelo";
import { aulaDaTrilha, CLASSE, CLASSES } from "@/lib/finais/trilha";
import { Dialogo } from "./Dialogo";

type Publicacao = Awaited<ReturnType<typeof publicacoesDaAulaV2Acao>>[number];

/**
 * "Mais opções" → as publicações guardadas desta aula (§20.1: snapshots e recuperação).
 *
 * Reativar uma anterior é o rollback: troca só o ponteiro, e nenhuma publicação é apagada.
 * Desativar o v2 devolve o aluno à aula v1. As duas ações pedem confirmação escrita na
 * própria linha, porque mudam o que o aluno recebe.
 */
export function DialogoPublicacoes({ aulaId, metadados, aoEditarMetadados, aoReativar, aoFechar }: {
  aulaId: string;
  /** Avisa o editor depois de reativar (D11): a conferência da tela deixa de valer. */
  aoReativar?: (publicationId: string) => void;
  metadados?: MetadadosAulaV2;
  /** Nível e classe entram no Desfazer como qualquer edição (`EDITAR_METADADOS`). */
  aoEditarMetadados?: (comando: ComandoV2) => void;
  aoFechar: () => void;
}) {
  const [lista, setLista] = useState<Publicacao[] | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  /** A troca do ponteiro leva ~1 s no `next dev` (roteiro 8F): sem este estado a confirmação parecia não ter pegado. */
  const [trocando, setTrocando] = useState(false);

  const carregar = useCallback(() => {
    publicacoesDaAulaV2Acao(aulaId).then(setLista).catch(() => setLista([]));
  }, [aulaId]);
  useEffect(() => { carregar(); }, [carregar]);

  const reativar = async (publicationId: string) => {
    setTrocando(true);
    const resultado = await reativarPublicacaoV2Acao(aulaId, publicationId).finally(() => setTrocando(false));
    setConfirmando(null);
    setRecado(resultado.ok ? `A publicação ${publicationId} voltou a ser a ativa.` : `Não foi possível reativar: ${resultado.motivo}.`);
    if (resultado.ok) aoReativar?.(publicationId);
    carregar();
  };

  const desativar = async () => {
    const resultado = await desativarV2Acao(aulaId);
    setConfirmando(null);
    setRecado(resultado.ok ? "A aula foi tirada dos alunos. As versões publicadas continuam guardadas." : `Não foi possível desativar: ${resultado.motivo}.`);
    carregar();
  };

  const temAtiva = Boolean(lista?.some((item) => item.ativa));

  return (
    <Dialogo
      titulo="Mais opções"
      descricao="Os dados da aula e as publicações guardadas. Reativar troca a que o aluno recebe; nada é apagado."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={<div className="flex justify-end"><button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button></div>}
    >
      {aoEditarMetadados ? <DadosDaAula aulaId={aulaId} metadados={metadados} aoEditar={aoEditarMetadados} /> : null}
      {!lista ? <p role="status" className="text-sm text-tinta-media">Lendo as publicações…</p> : null}
      {lista && !lista.length ? <p className="text-sm text-tinta-media">Esta aula ainda não foi publicada.</p> : null}
      {lista?.length ? (
        <ul className="flex flex-col gap-2">
          {lista.map((item) => (
            <li key={item.publicationId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-borda-fraca p-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-tinta">{item.titulo ?? "(pacote ilegível)"}</span>
                <span className="block text-xs text-tinta-fraca">{item.publicationId}{item.ativa ? " · ativa — é a que o aluno recebe" : ""}{item.anterior ? " · a anterior" : ""}{item.integra ? "" : " · não está íntegra"}</span>
              </span>
              {item.ativa || !item.integra ? null : confirmando === item.publicationId ? (
                <span className="flex gap-2">
                  <button type="button" disabled={trocando} onClick={() => void reativar(item.publicationId)} className="foco rounded-md border border-aviso-superficie px-2 py-1 text-xs text-aviso-tinta disabled:opacity-60">{trocando ? "Reativando…" : "Sim, reativar esta"}</button>
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
            <button type="button" onClick={() => void desativar()} className="foco rounded-md border border-aviso-superficie px-2 py-1 text-xs">Sim, tirar dos alunos</button>
            <button type="button" onClick={() => setConfirmando(null)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Cancelar</button>
          </p>
        ) : (
          <button type="button" onClick={() => setConfirmando("desativar")} className="foco self-start rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">Tirar esta aula dos alunos</button>
        )
      ) : null}
      {recado ? <p role="status" className="text-sm text-tinta">{recado}</p> : null}
    </Dialogo>
  );
}

/**
 * Nível e classe da aula — §19.1 ("nível, classe…") e §22 (aula extra com nível explícito).
 *
 * Numa extra os dois são obrigatórios para publicar, e é daqui que a trilha os lê. Numa aula
 * do curso quem decide o nível é a trilha: o campo mostra o nível dela, e declarar outro é o
 * erro `NIVEL_DIVERGE` da conferência.
 */
function DadosDaAula({ aulaId, metadados, aoEditar }: { aulaId: string; metadados?: MetadadosAulaV2; aoEditar: (comando: ComandoV2) => void }) {
  const extra = aulaId.startsWith("EX-");
  const naTrilha = aulaDaTrilha(aulaId);
  return (
    <section aria-label="Dados da aula" className="flex flex-col gap-2 rounded-md border border-borda-fraca p-2">
      <h3 className="text-sm font-semibold text-tinta">Dados da aula</h3>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Nível
          <select
            value={metadados?.nivel ?? ""}
            onChange={(e) => aoEditar({ tipo: "EDITAR_METADADOS", campo: "nivel", valor: e.target.value === "" ? null : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5) })}
            className="foco w-fit rounded-md border border-borda bg-papel px-2 py-1.5"
          >
            <option value="">{extra ? "— escolha —" : naTrilha ? `o da trilha (${naTrilha.nivel})` : "sem nível"}</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Nível {n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Classe
          <select
            value={metadados?.classe ?? ""}
            onChange={(e) => aoEditar({ tipo: "EDITAR_METADADOS", campo: "classe", valor: e.target.value === "" ? null : (e.target.value as "E" | "D" | "C" | "B") })}
            className="foco w-fit rounded-md border border-borda bg-papel px-2 py-1.5"
          >
            <option value="">— escolha —</option>
            {CLASSES.map((c) => <option key={c} value={c}>{CLASSE[c].nome}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-tinta-fraca">
        {extra
          ? "Aula extra: com nível e classe, ela entra na trilha ao publicar e passa a contar para o fechamento daquele nível."
          : naTrilha
            ? `Esta aula é do nível ${naTrilha.nivel} pela trilha do curso. Deixe o nível como está: um nível diferente impede publicar.`
            : "Esta aula não está na trilha do curso: publicada, não conta para nível nenhum."}
      </p>
    </section>
  );
}
