"use client";

import { Chess } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAtalho, useTeclasDoTabuleiro } from "@/components/atalhos/Atalhos";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { desenhoDaAutoriaV2 } from "@/lib/chess/annotations";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { mapaDaAnalise } from "@/lib/editor-v2/arvore";
import { desenhoDeFormas } from "@/lib/editor-v2/desenhos";
import { fenDoQuadro, problemaDaPosicaoDoQuadro, quadroDepoisDoLance, type ComandoDeIntroducaoV2, type PosicaoDoQuadroV2 } from "@/lib/editor-v2/introducao";
import type { AulaV2, QuadroIntroducaoV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";
import { usePrisaoDeFoco } from "./foco";

const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * A introdução e seus quadros — §7.1, fatia 10. Tela cheia, como a prévia: o professor precisa do
 * tabuleiro grande para desenhar, e a introdução é uma sequência que se lê de uma vez.
 *
 * - Coluna da esquerda: os quadros na ordem, com ↑ ↓, duplicar e excluir. ← e → trocam de quadro
 *   fora dos campos de texto.
 * - Centro: o tabuleiro do quadro. Botão direito desenha; **jogar uma peça insere o lance** e cria o
 *   quadro seguinte com a posição nova.
 * - Direita: título, texto e a posição — a inicial de um capítulo, um lance do percurso dele, ou uma
 *   FEN própria.
 *
 * Cada gesto é um comando do editor, com Desfazer; a tela não guarda cópia do documento.
 */
export function EditorDeIntroducao({ aula, introducaoId, quadroInicial, positions, aoComando, aoPrever, aoMudarModo, aoResolverRevisao, aoFechar }: {
  aula: AulaV2;
  introducaoId: string | null;
  quadroInicial?: string;
  positions: Record<string, Position>;
  /** Aplica o comando no editor e devolve a recusa em português, ou `null`. */
  aoComando: (comando: ComandoDeIntroducaoV2) => string | null;
  aoPrever: (introducaoId: string) => void;
  /** "Mudar para…" capítulo ou treino, para o quadro aberto (pedido do Doug, 15/9/2026). */
  aoMudarModo?: (quadroId: string) => void;
  /**
   * §19.2: "Já reli" do quadro marcado, no mesmo lugar em que o texto se edita — como o comentário e
   * a narração já têm. Sem isto, quem chegava pelo "Resolver" da conferência reescrevia o texto e a
   * marca continuava (15/9/2026).
   */
  aoResolverRevisao?: (quadroId: string) => void;
  aoFechar: () => void;
}) {
  const camada = useRef<HTMLDivElement>(null);
  const camadaDeAtalhos = usePrisaoDeFoco(camada, aoFechar);
  // x vira a vista e ? mostra os atalhos também por cima do editor (fatia 10).
  useTeclasDoTabuleiro(camadaDeAtalhos);
  const introducao = introducaoId ? aula.introducoes.find((item) => item.id === introducaoId) : undefined;
  const [quadroId, setQuadroId] = useState(quadroInicial ?? introducao?.quadros[0]?.id ?? "");
  const quadro = introducao?.quadros.find((item) => item.id === quadroId) ?? introducao?.quadros[0];
  const indice = introducao && quadro ? introducao.quadros.indexOf(quadro) : -1;
  const [novoTexto, setNovoTexto] = useState("");
  const [recado, setRecado] = useState<string | null>(null);

  // ← e → trocam de quadro, fora de campo de texto (§7.1), pela tabela de atalhos.
  const andarQuadro = (passo: 1 | -1) => {
    const proximo = introducao?.quadros[indice + passo];
    if (!proximo) return false;
    setQuadroId(proximo.id);
  };
  useAtalho("quadro-anterior", () => andarQuadro(-1), { camada: camadaDeAtalhos });
  useAtalho("quadro-seguinte", () => andarQuadro(1), { camada: camadaDeAtalhos });

  const executar = useCallback((comando: ComandoDeIntroducaoV2): boolean => {
    const recusa = aoComando(comando);
    setRecado(recusa);
    return recusa === null;
  }, [aoComando]);

  const fen = useMemo(() => {
    if (!quadro) return null;
    try { return fenDoQuadro(aula, quadro, positions); } catch { return null; }
  }, [aula, positions, quadro]);
  const jogo = useMemo(() => (fen ? new Chess(fen) : null), [fen]);
  const formas = useMemo(() => desenhoDaAutoriaV2(quadro?.desenhos), [quadro?.desenhos]);
  const aoDesenhar = useCallback((lista: DrawShape[]) => {
    if (introducao && quadro) executar({ tipo: "DEFINIR_DESENHOS_DO_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, desenhos: desenhoDeFormas(lista) });
  }, [executar, introducao, quadro]);
  const desenhavel = useMemo(() => ({ shapes: formas, onChange: aoDesenhar }), [formas, aoDesenhar]);

  const inserirLance = (orig: Key, dest: Key) => {
    if (!introducao || !quadro || !jogo) return;
    const peca = jogo.get(orig as never);
    const promocao = peca?.type === "p" && (dest[1] === "1" || dest[1] === "8") ? "q" : "";
    try {
      const novo = quadroDepoisDoLance(aula, quadro, `${orig}${dest}${promocao}`, positions, novoId("quadro"));
      const problema = problemaDaPosicaoDoQuadro(aula, novo.posicao, positions);
      if (problema) { setRecado(problema); return; }
      if (executar({ tipo: "ADICIONAR_QUADRO", introducaoId: introducao.id, quadro: novo, depoisDe: quadro.id })) setQuadroId(novo.id);
    } catch (erro) {
      setRecado(erro instanceof Error ? erro.message : "não foi possível inserir o lance");
    }
  };

  if (!introducao) {
    return (
      <div ref={camada} role="dialog" aria-modal="true" aria-label="Criar a introdução" className="fixed inset-0 z-50 overflow-y-auto bg-papel p-4">
        <CriarIntroducao aula={aula} positions={positions} aoCriar={executar} aoFechar={aoFechar} />
      </div>
    );
  }

  const campo = "foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta";
  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label={`Introdução: ${introducao.titulo}`} className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center gap-2 border-b border-borda-fraca px-4 py-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-tinta-fraca">
          <span className="shrink-0">Introdução</span>
          <input key={introducao.titulo} aria-label="Título da introdução" defaultValue={introducao.titulo} onBlur={(e) => executar({ tipo: "RENOMEAR_INTRODUCAO", introducaoId: introducao.id, titulo: e.currentTarget.value })} className={`${campo} min-w-0 flex-1 font-medium`} />
        </label>
        <button type="button" onClick={() => aoPrever(introducao.id)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Pré-visualizar a introdução</button>
        <button
          type="button"
          onClick={() => { if (window.confirm(`Excluir a introdução «${introducao.titulo}» com os ${introducao.quadros.length} quadros? O Desfazer devolve.`)) { executar({ tipo: "EXCLUIR_INTRODUCAO", introducaoId: introducao.id }); aoFechar(); } }}
          className="foco rounded-md border border-erro px-3 py-2 text-sm text-erro-texto hover:bg-erro-superficie/20"
        >
          Excluir introdução…
        </button>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
      </header>
      {recado ? <p role="alert" className="mx-4 mt-2 rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{recado}</p> : null}

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[15rem_minmax(18rem,34rem)_minmax(18rem,1fr)] lg:overflow-hidden">
        <nav aria-label="Quadros da introdução" className="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
          <p className="text-xs text-tinta-fraca">← e → trocam de quadro.</p>
          <ol className="flex flex-col gap-1">
            {introducao.quadros.map((item, i) => {
              const atual = item.id === quadro?.id;
              return (
                <li key={item.id}>
                  <button type="button" aria-current={atual ? "step" : undefined} onClick={() => setQuadroId(item.id)} className={`foco w-full rounded-md border px-2 py-1.5 text-left text-xs ${atual ? "border-foco bg-metodo-superficie/25 font-semibold text-metodo-tinta-alta" : "border-borda-fraca text-tinta hover:bg-carta-toque"}`}>
                    <span className="tabular-nums">{atual ? "▸ " : ""}{i + 1}.</span> {item.titulo ?? item.texto.slice(0, 48)}
                  </button>
                </li>
              );
            })}
          </ol>
          {quadro ? (
            <div className="grid grid-cols-2 gap-1">
              <button type="button" aria-disabled={indice === 0} onClick={() => executar({ tipo: "MOVER_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, direcao: "acima" })} className="foco rounded border border-borda px-2 py-1 text-xs text-tinta aria-disabled:opacity-40">↑ Antes</button>
              <button type="button" aria-disabled={indice === introducao.quadros.length - 1} onClick={() => executar({ tipo: "MOVER_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, direcao: "abaixo" })} className="foco rounded border border-borda px-2 py-1 text-xs text-tinta aria-disabled:opacity-40">↓ Depois</button>
              <button type="button" onClick={() => { const copia: QuadroIntroducaoV2 = { ...structuredClone(quadro), id: novoId("quadro") }; if (executar({ tipo: "ADICIONAR_QUADRO", introducaoId: introducao.id, quadro: copia, depoisDe: quadro.id })) setQuadroId(copia.id); }} className="foco rounded border border-borda px-2 py-1 text-xs text-tinta">Duplicar</button>
              <button type="button" onClick={() => { const vizinho = introducao.quadros[indice + 1] ?? introducao.quadros[indice - 1]; if (executar({ tipo: "EXCLUIR_QUADRO", introducaoId: introducao.id, quadroId: quadro.id }) && vizinho) setQuadroId(vizinho.id); }} className="foco rounded border border-erro px-2 py-1 text-xs text-erro-texto">Excluir quadro</button>
              {aoMudarModo ? (
                <button type="button" data-mudar-modo-quadro={quadro.id} onClick={() => aoMudarModo(quadro.id)} title="Transformar este quadro em capítulo ou treino" className="foco col-span-2 rounded border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">Mudar este quadro para…</button>
              ) : null}
            </div>
          ) : null}
          <label className="mt-2 flex flex-col gap-1 text-xs text-tinta-fraca">
            Texto do quadro novo
            <textarea rows={3} value={novoTexto} onChange={(e) => setNovoTexto(e.currentTarget.value)} placeholder="O que o aluno lê no quadro seguinte." className={campo} />
          </label>
          <button
            type="button"
            disabled={!novoTexto.trim() || !quadro}
            onClick={() => {
              if (!quadro) return;
              const novo: QuadroIntroducaoV2 = { id: novoId("quadro"), texto: novoTexto.trim(), posicao: structuredClone(quadro.posicao) };
              if (!executar({ tipo: "ADICIONAR_QUADRO", introducaoId: introducao.id, quadro: novo, depoisDe: quadro.id })) return;
              setQuadroId(novo.id);
              setNovoTexto("");
            }}
            className="foco rounded-md border border-borda px-2 py-1.5 text-sm text-tinta hover:bg-carta-toque disabled:opacity-40"
          >
            + Acrescentar quadro depois deste
          </button>
        </nav>

        <section aria-label="Tabuleiro do quadro" className="flex min-h-0 flex-col gap-2">
          {fen && jogo && quadro ? (
            <>
              <ChessBoard
                key={quadro.id}
                fen={fen}
                orientation={aula.metadados?.orientacaoPadrao ?? "white"}
                turnColor={toBoardColor(jogo.turn())}
                dests={legalDests(jogo)}
                lastMove={quadro.lance ? [quadro.lance.slice(0, 2) as Key, quadro.lance.slice(2, 4) as Key] : null}
                onMove={inserirLance}
                desenhavel={desenhavel}
                espessuraDeDesenhoUniforme
              />
              <p className="text-xs text-tinta-fraca">Botão direito desenha seta e casa (Shift vermelho, Alt azul). Jogar uma peça cria o quadro seguinte com a posição nova.</p>
              <button type="button" disabled={!quadro.desenhos} onClick={() => executar({ tipo: "DEFINIR_DESENHOS_DO_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, desenhos: undefined })} className="foco w-fit rounded-md border border-borda px-2 py-1 text-xs text-tinta disabled:opacity-40">Apagar desenhos deste quadro</button>
            </>
          ) : <p className="text-sm text-tinta-media">A posição deste quadro não pode ser montada — escolha outra ao lado.</p>}
        </section>

        {quadro ? (
          <section aria-label="Texto e posição do quadro" className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
            <p className="text-sm font-semibold text-tinta">Quadro {indice + 1} de {introducao.quadros.length}</p>
            {quadro.revisao && aoResolverRevisao ? (
              <p className="flex flex-wrap items-center gap-2 rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-xs text-aviso-tinta">
                A posição inicial do capítulo mudou depois que este quadro foi escrito.
                <button type="button" onClick={() => aoResolverRevisao(quadro.id)} className="foco rounded border border-aviso-superficie px-2 py-1">
                  Já reli
                </button>
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
              Título do quadro (opcional)
              <input key={`${quadro.id}:${quadro.titulo ?? ""}`} defaultValue={quadro.titulo ?? ""} onBlur={(e) => executar({ tipo: "EDITAR_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, titulo: e.currentTarget.value })} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
              Texto que o aluno lê
              <textarea key={`${quadro.id}:${quadro.texto}`} rows={7} defaultValue={quadro.texto} onBlur={(e) => executar({ tipo: "EDITAR_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, texto: e.currentTarget.value })} className={`${campo} resize-y`} />
              <span>Na introdução o aluno avança quando quiser: cada quadro espera o clique em Continuar.</span>
            </label>
            <EscolherPosicao key={quadro.id} aula={aula} positions={positions} atual={quadro.posicao} aoEscolher={(posicao) => {
              const problema = problemaDaPosicaoDoQuadro(aula, posicao, positions);
              if (problema) { setRecado(problema); return; }
              executar({ tipo: "DEFINIR_POSICAO_DO_QUADRO", introducaoId: introducao.id, quadroId: quadro.id, posicao });
            }} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** A posição do quadro: a inicial de um capítulo, um lance do percurso dele, ou uma FEN própria. */
function EscolherPosicao({ aula, positions, atual, aoEscolher }: {
  aula: AulaV2;
  positions: Record<string, Position>;
  atual: PosicaoDoQuadroV2;
  aoEscolher: (posicao: PosicaoDoQuadroV2) => void;
}) {
  const capituloAtual = atual.tipo === "referencia" ? aula.capitulos.find((c) => c.analiseId === atual.origem.analiseId && [c.inicioNodeId, ...c.caminho].includes(atual.origem.nodeId)) : undefined;
  const [modo, setModo] = useState<"capitulo" | "fen">(atual.tipo === "fen" ? "fen" : "capitulo");
  const [capituloId, setCapituloId] = useState(capituloAtual?.id ?? aula.capitulos[0]?.id ?? "");
  const [fen, setFen] = useState(atual.tipo === "fen" ? atual.fen : "");
  const capitulo = aula.capitulos.find((c) => c.id === capituloId);
  const lances = useMemo(() => {
    if (!capitulo) return [];
    try {
      const mapa = mapaDaAnalise(aula, capitulo.analiseId, positions);
      return [capitulo.inicioNodeId, ...capitulo.caminho].map((nodeId, i) => ({ nodeId, nome: i === 0 ? "a posição inicial" : `${mapa.rotulos[nodeId] ?? ""} ${mapa.sans[nodeId] ?? ""}`.trim() }));
    } catch { return []; }
  }, [aula, capitulo, positions]);
  const campo = "foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta";
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-borda-fraca p-2">
      <legend className="px-1 text-xs font-medium text-tinta">Posição do quadro</legend>
      <div role="group" aria-label="De onde vem a posição" className="flex flex-wrap gap-2">
        {([["capitulo", "De um capítulo"], ["fen", "FEN própria"]] as const).map(([chave, rotulo]) => (
          <button key={chave} type="button" aria-pressed={modo === chave} onClick={() => setModo(chave)} className={`foco rounded-md border px-2 py-1 text-xs ${modo === chave ? "border-foco bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta"}`}>{modo === chave ? "✓ " : ""}{rotulo}</button>
        ))}
      </div>
      {modo === "capitulo" ? (
        aula.capitulos.length ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-tinta-fraca">Capítulo
              <select value={capituloId} onChange={(e) => setCapituloId(e.currentTarget.value)} className={campo}>
                {aula.capitulos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-tinta-fraca">Lance
              <select
                value={atual.tipo === "referencia" && capitulo?.analiseId === atual.origem.analiseId ? atual.origem.nodeId : ""}
                onChange={(e) => capitulo && e.currentTarget.value && aoEscolher({ tipo: "referencia", origem: { analiseId: capitulo.analiseId, nodeId: e.currentTarget.value } })}
                className={campo}
              >
                <option value="">— escolha —</option>
                {lances.map((lance) => <option key={lance.nodeId} value={lance.nodeId}>{lance.nome}</option>)}
              </select>
            </label>
            <p className="text-xs text-tinta-fraca">A posição fica ligada ao capítulo: se ele mudar, o quadro acompanha.</p>
          </>
        ) : <p className="text-xs text-tinta-fraca">A aula ainda não tem capítulo. Use uma FEN própria.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">FEN
            <input value={fen} onChange={(e) => setFen(e.currentTarget.value)} spellCheck={false} placeholder="8/8/8/8/4k3/8/8/3QK3 w - - 0 1" className={`${campo} font-mono text-xs`} />
          </label>
          <button type="button" disabled={!fen.trim()} onClick={() => aoEscolher({ tipo: "fen", fen: fen.trim() })} className="foco w-fit rounded-md border border-borda px-2 py-1 text-xs text-tinta disabled:opacity-40">Usar esta FEN</button>
        </>
      )}
    </fieldset>
  );
}

function CriarIntroducao({ aula, positions, aoCriar, aoFechar }: {
  aula: AulaV2;
  positions: Record<string, Position>;
  aoCriar: (comando: ComandoDeIntroducaoV2) => boolean;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState("Introdução");
  const [texto, setTexto] = useState("");
  const primeiro = aula.capitulos.find((c) => aula.fluxo.some((e) => e.entidadeId === c.id));
  const [posicao, setPosicao] = useState<PosicaoDoQuadroV2 | null>(primeiro ? { tipo: "referencia", origem: { analiseId: primeiro.analiseId, nodeId: primeiro.inicioNodeId } } : null);
  const [erro, setErro] = useState<string | null>(null);
  const campo = "foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta";
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-tinta">Criar a introdução</h2>
          <p className="text-sm text-tinta-fraca">Os quadros que o aluno lê antes dos capítulos. Comece pelo primeiro; os outros vêm depois.</p>
        </div>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Fechar</button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-tinta">Título da introdução<input value={titulo} onChange={(e) => setTitulo(e.currentTarget.value)} className={campo} /></label>
      <label className="flex flex-col gap-1 text-sm text-tinta">Texto do primeiro quadro<textarea rows={5} value={texto} onChange={(e) => { setTexto(e.currentTarget.value); setErro(null); }} className={campo} /></label>
      {posicao ? <p className="text-xs text-tinta-fraca">Posição escolhida: {posicao.tipo === "fen" ? posicao.fen : "ligada a um capítulo"}.</p> : null}
      <EscolherPosicao aula={aula} positions={positions} atual={posicao ?? { tipo: "fen", fen: "" }} aoEscolher={(p) => { const problema = problemaDaPosicaoDoQuadro(aula, p, positions); setErro(problema); if (!problema) setPosicao(p); }} />
      {erro ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{erro}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar</button>
        <button
          type="button"
          onClick={() => {
            if (!texto.trim()) { setErro("escreva o texto do primeiro quadro — é o que o aluno lê"); return; }
            if (!posicao) { setErro("escolha a posição do primeiro quadro"); return; }
            const introducaoId = novoId("introducao");
            aoCriar({ tipo: "ADICIONAR_INTRODUCAO", introducaoId, etapaId: `etapa-${introducaoId}`, titulo, quadro: { id: novoId("quadro"), texto: texto.trim(), posicao } });
          }}
          className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta"
        >
          Criar introdução
        </button>
      </div>
    </div>
  );
}
