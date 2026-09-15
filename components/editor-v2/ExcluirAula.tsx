"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { excluirAulaV2Acao, impactoDaExclusaoDeAulaV2Acao, restaurarAulaV2Acao } from "@/app/editor/v2/acoes";
import type { ImpactoDaExclusaoV2, ItemDaLixeiraV2 } from "@/lib/editor-v2/excluir-aula";
import { Dialogo } from "./Dialogo";

/**
 * "Excluir aula…" no índice do editor, e a lixeira — pedido do Doug, 14/9/2026.
 *
 * A janela abre **calculando o que se perde** (capítulos, treinos, prática, posições do acervo), e só
 * então oferece o botão. Nada some: a aula vai para a lixeira, e a lixeira restaura. As regras moram
 * em `lib/editor-v2/excluir-aula.ts`.
 */
export function BotaoExcluirAula({ aulaId, titulo }: { aulaId: string; titulo: string }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [impacto, setImpacto] = useState<ImpactoDaExclusaoV2 | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberta) return;
    let ativo = true;
    impactoDaExclusaoDeAulaV2Acao(aulaId)
      .then((resposta) => {
        if (!ativo) return;
        if (resposta.ok) setImpacto(resposta.impacto);
        else setFalha(resposta.motivo);
      })
      .catch(() => { if (ativo) setFalha("o servidor não respondeu — nada foi excluído"); });
    return () => { ativo = false; };
  }, [aberta, aulaId]);

  const fechar = () => {
    setAberta(false);
    setImpacto(null);
    setFalha(null);
    queueMicrotask(() => botao.current?.focus());
  };

  const excluir = async () => {
    if (!impacto || excluindo) return;
    setExcluindo(true);
    setFalha(null);
    try {
      const resposta = await excluirAulaV2Acao(aulaId);
      if (!resposta.ok) { setFalha(resposta.motivo); return; }
      setAberta(false);
      router.refresh();
    } catch {
      setFalha("o servidor não respondeu — confira a lista antes de tentar de novo");
    } finally {
      setExcluindo(false);
    }
  };

  const partes = impacto
    ? [
        [impacto.capitulos, "capítulo", "capítulos"],
        [impacto.treinos, "treino", "treinos"],
        [impacto.praticas, "prática", "práticas"],
        [impacto.quadros, "quadro de introdução", "quadros de introdução"],
      ].filter(([quantos]) => Number(quantos) > 0).map(([quantos, um, varios]) => `${quantos} ${quantos === 1 ? um : varios}`)
    : [];

  return (
    <>
      <button
        type="button"
        ref={botao}
        onClick={() => setAberta(true)}
        aria-label={`Excluir a aula ${titulo}`}
        className="foco flex shrink-0 items-center rounded-md border border-borda px-3 py-2 text-xs text-tinta-media transition-colors hover:border-erro hover:text-erro-texto"
      >
        Excluir…
      </button>
      {aberta ? (
        <Dialogo
          titulo={`Excluir «${titulo}»?`}
          descricao="A aula vai para a lixeira do editor, neste computador. Dá para restaurar depois."
          largura="max-w-lg"
          aoFechar={fechar}
          rodape={(
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={fechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
              <button
                type="button"
                onClick={() => void excluir()}
                disabled={!impacto || excluindo}
                className="foco rounded-md border border-erro bg-erro-superficie/15 px-3 py-2 text-sm font-medium text-erro-texto disabled:opacity-40"
              >
                {excluindo ? "Excluindo…" : "Mover para a lixeira"}
              </button>
            </div>
          )}
        >
          {falha ? (
            <p role="alert" className="text-sm text-erro-texto">Não dá para excluir: {falha}.</p>
          ) : !impacto ? (
            <p role="status" className="text-sm text-tinta-media">Calculando o que sai junto…</p>
          ) : (
            <section aria-label="O que sai junto" className="flex flex-col gap-2 text-sm text-tinta">
              <p>{partes.length ? `Sai a aula inteira: ${partes.join(", ")}.` : "A aula está vazia."}</p>
              {impacto.publicada ? (
                <p className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-aviso-tinta">
                  Esta aula está publicada: excluir também a tira dos alunos. As versões publicadas continuam guardadas.
                </p>
              ) : null}
              {impacto.posicoesQueSaem.length ? (
                <p>{impacto.posicoesQueSaem.length === 1 ? "A posição da prática sai junto" : `${impacto.posicoesQueSaem.length} posições salvas saem junto`}: só esta aula usava.</p>
              ) : null}
              {impacto.posicoesQueFicam.length ? (
                <p className="text-tinta-media" title={impacto.posicoesQueFicam.map((posicao) => `${posicao.id}: ${posicao.motivo}`).join(" · ")}>
                  {impacto.posicoesQueFicam.length === 1 ? "Uma posição salva continua" : `${impacto.posicoesQueFicam.length} posições salvas continuam`}: outra aula também usa.
                </p>
              ) : null}
              <p className="text-xs text-tinta-fraca">Se a aula estiver aberta em outra aba, feche aquela aba antes: ela tentaria salvar de novo.</p>
            </section>
          )}
        </Dialogo>
      ) : null}
    </>
  );
}

export function LixeiraDoEditor({ itens }: { itens: ItemDaLixeiraV2[] }) {
  const router = useRouter();
  const [recado, setRecado] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  if (!itens.length && !recado) return null;

  const restaurar = async (item: ItemDaLixeiraV2) => {
    setRestaurando(item.nome);
    setRecado(null);
    try {
      const resposta = await restaurarAulaV2Acao(item.nome);
      if (!resposta.ok) { setRecado(`«${item.titulo}» não foi restaurada: ${resposta.motivo}.`); return; }
      setRecado(resposta.desativouPublicacao
        ? `«${item.titulo}» voltou como rascunho. Ela estava publicada: para o aluno recebê-la de novo, abra a aula e reative em Mais ações → Nível e publicações.`
        : `«${item.titulo}» voltou para a lista.`);
      router.refresh();
    } catch {
      setRecado("o servidor não respondeu — confira a lista antes de tentar de novo");
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <section aria-label="Lixeira" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-tinta">Lixeira</h2>
      {recado ? <p role="status" className="text-sm text-tinta-media">{recado}</p> : null}
      <ul className="flex flex-col gap-2">
        {itens.map((item) => (
          <li key={item.nome} className="cartao-vazio flex items-center gap-3 p-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm text-tinta">{item.titulo}</span>
              <span className="text-xs text-tinta-fraca">
                {item.id} · excluída em {new Date(item.excluidaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {item.desativouPublicacao ? " · estava publicada" : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void restaurar(item)}
              disabled={restaurando !== null}
              aria-label={`Restaurar a aula ${item.titulo}`}
              className="foco shrink-0 rounded-md border border-borda px-3 py-2 text-xs text-tinta hover:bg-carta-toque disabled:opacity-40"
            >
              {restaurando === item.nome ? "Restaurando…" : "Restaurar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
