"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "@lichess-org/chessground/types";
import { salvarDocumentoV2 } from "@/app/editor/v2/acoes";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PainelDeLances } from "@/components/editor-v2/PainelDeLances";
import { PainelDeProblemas } from "@/components/editor-v2/PainelDeProblemas";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { analiseDaAula, mapaDaAnalise } from "@/lib/editor-v2/arvore";
import { problemasVisiveisV2, resumoDosProblemasV2, type DestinoV2 } from "@/lib/editor-v2/diagnostico-visual";
import {
  aplicarNoHistorico,
  desfazer,
  executarComando,
  iniciarHistorico,
  refazer,
  type ComandoV2,
  type Historico,
} from "@/lib/editor-v2/comandos";
import { problemasDaAulaV2, validarAulaV2, type AulaV2 } from "@/lib/editor-v2/modelo";
import { apagarRecuperacao, guardarRecuperacao, lerRecuperacao } from "@/lib/editor-v2/recuperacao";
import type { Position } from "@/lib/lesson/schema";

type Estado = "salvo" | "alterado" | "salvando" | "erro" | "conflito";

function novoId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditorV2({ aulaId, documentoInicial, hashInicial, positions }: {
  aulaId: string;
  documentoInicial: AulaV2;
  hashInicial: string;
  positions: Record<string, Position>;
}) {
  const [historico, setHistorico] = useState<Historico<AulaV2>>(() => iniciarHistorico(documentoInicial));
  const [capituloId, setCapituloId] = useState(() => documentoInicial.capitulos[0]?.id ?? "");
  const capitulo = historico.presente.capitulos.find((item) => item.id === capituloId) ?? historico.presente.capitulos[0];
  const analise = capitulo ? analiseDaAula(historico.presente, capitulo.analiseId) : historico.presente.analises[0];
  const [nodeId, setNodeId] = useState(() => capitulo?.inicioNodeId ?? analise.raizId);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [recado, setRecado] = useState<string | null>(null);
  const [recuperavel, setRecuperavel] = useState<{ aula: AulaV2; baseHash: string; em: string } | null>(null);
  const [conflitoAtual, setConflitoAtual] = useState<{ textoAtual: string | null; hashAtual: string | null } | null>(null);
  const [falhaRecuperacao, setFalhaRecuperacao] = useState(false);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const hash = useRef(hashInicial);
  const ultimoEnfileirado = useRef(documentoInicial);
  const fila = useRef(Promise.resolve());
  const maisRecente = useRef(documentoInicial);

  useEffect(() => {
    const chave = `editor-v2-sessao:${aulaId}`;
    let id = sessionStorage.getItem(chave);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(chave, id); }
    let ativo = true;
    queueMicrotask(() => { if (ativo) setSessaoId(id); });
    return () => { ativo = false; };
  }, [aulaId]);

  useEffect(() => {
    if (!sessaoId) return;
    void lerRecuperacao(aulaId, sessaoId).then((r) => {
      if (r && JSON.stringify(r.aula) !== JSON.stringify(documentoInicial)) setRecuperavel(r);
    }).catch(() => undefined);
  }, [aulaId, documentoInicial, sessaoId]);

  const aplicar = useCallback((comando: ComandoV2) => {
    setHistorico((atual) => {
      try {
        const proximo = executarComando(atual.presente, comando, positions);
        setRecado(null);
        return aplicarNoHistorico(atual, proximo);
      } catch (erro) {
        setRecado(erro instanceof Error ? erro.message : "não foi possível fazer esta edição");
        return atual;
      }
    });
  }, [positions]);

  useEffect(() => {
    if (ultimoEnfileirado.current === historico.presente) return;
    ultimoEnfileirado.current = historico.presente;
    setEstado("alterado");
    const aula = historico.presente;
    maisRecente.current = aula;
    const baseHash = hash.current;
    if (!sessaoId) return;
    void guardarRecuperacao(aulaId, sessaoId, aula, baseHash)
      .then(() => setFalhaRecuperacao(false))
      .catch(() => setFalhaRecuperacao(true));
    const relogio = setTimeout(() => {
      fila.current = fila.current.then(async () => {
        setEstado("salvando");
        const resposta = await salvarDocumentoV2(aulaId, JSON.stringify(aula), hash.current);
        if (resposta.ok) {
          hash.current = resposta.hash;
          if (maisRecente.current === aula) {
            setEstado("salvo");
            setRecado(null);
            setConflitoAtual(null);
            await apagarRecuperacao(aulaId, sessaoId).catch(() => undefined);
          }
        } else if ("conflito" in resposta && resposta.conflito) {
          setEstado("conflito");
          setConflitoAtual(resposta.conflito);
          setRecado(null);
        } else {
          setEstado("erro");
          setRecado(resposta.erro);
        }
      }).catch(() => {
        setEstado("erro");
        setRecado("Não foi possível salvar. Suas mudanças continuam guardadas neste navegador.");
      });
    }, 600);
    return () => clearTimeout(relogio);
  }, [aulaId, historico.presente, sessaoId]);

  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return;
      const tag = (evento.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (evento.key.toLowerCase() === "z") {
        evento.preventDefault();
        setHistorico((h) => evento.shiftKey ? refazer(h) : desfazer(h));
      } else if (evento.key.toLowerCase() === "y") {
        evento.preventDefault();
        setHistorico(refazer);
      }
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, []);

  const nodeIdAtual = analise.nos[nodeId] ? nodeId : capitulo?.inicioNodeId ?? analise.raizId;

  /*
   * Os problemas da aula que está na tela **agora**, e não os do arquivo no disco.
   * É esta a lista que o professor vê enquanto escreve: um erro que só aparecesse
   * ao salvar chegaria depois de ele já ter esquecido o que fez.
   */
  const problemas = useMemo(
    () => problemasDaAulaV2(historico.presente, positions),
    [historico.presente, positions],
  );
  const visiveis = useMemo(() => problemasVisiveisV2(historico.presente, problemas), [historico.presente, problemas]);
  const resumo = useMemo(() => resumoDosProblemasV2(problemas), [problemas]);

  /*
   * ## Por que isto é um `try`
   *
   * Reconstruir a posição de um nó exige jogar os lances desde a raiz, e um lance
   * impossível faz a chess.js estourar. Sem este `try`, a exceção sobe e **apaga a
   * tela inteira** — o professor recebe uma página em branco no exato momento em que
   * mais precisa de um dedo apontando para o lance errado.
   *
   * Com ele, a tela deixa de desenhar o tabuleiro (que de fato não existe) e mostra a
   * lista de problemas no lugar, com o botão que leva ao lance. O documento continua
   * intacto: nada aqui corrige nada sozinho.
   */
  /*
   * ## E por que é UMA passada, e não três
   *
   * Antes eram três percursos independentes — posição do nó, SAN de todos, numeração
   * de todos — e cada um rejogava a partida desde a raiz por nó. Numa partida de 60
   * lances (121 nós) isso media **758 ms** por recálculo, contra **24 ms** agora —
   * medido em Node, sem o relógio do navegador no meio. `mapaDaAnalise` faz os três
   * numa descida só, com um tabuleiro e `undo`.
   *
   * As dependências também mudaram: o mapa **não depende do nó selecionado**, então
   * trocar de lance na lista não recalcula a árvore — só lê `quadros[nodeIdAtual]`.
   */
  const mapa = useMemo(() => {
    try {
      return mapaDaAnalise(historico.presente, analise.id, positions);
    } catch {
      return null;
    }
  }, [analise.id, historico.presente, positions]);

  const derivado = mapa && mapa.quadros[nodeIdAtual]
    ? { quadro: mapa.quadros[nodeIdAtual], sans: mapa.sans, rotulos: mapa.rotulos }
    : null;

  const jogo = useMemo(() => new Chess(derivado?.quadro.fen), [derivado?.quadro.fen]);
  const selecionado = analise.nos[nodeIdAtual];
  const narracoes = capitulo?.narracoes.filter((n) => n.nodeId === selecionado?.id) ?? [];

  /** Leva a tela até o lugar do problema. É o que o botão da lista faz. */
  const irAoProblema = useCallback((destino: DestinoV2) => {
    if (destino.capituloId) setCapituloId(destino.capituloId);
    if (destino.nodeId) setNodeId(destino.nodeId);
  }, []);

  const mover = (orig: Key, dest: Key) => {
    const peca = jogo.get(orig as Square);
    const promocao = peca?.type === "p" && (dest[1] === "1" || dest[1] === "8") ? "q" : "";
    const uci = `${orig}${dest}${promocao}`;
    const existente = selecionado.filhos.find((filho) => analise.nos[filho]?.uci === uci);
    if (existente) {
      setNodeId(existente);
      return;
    }
    const id = novoId();
    aplicar({ tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: selecionado.id, uci, novoNodeId: id });
    setNodeId(id);
  };

  const baixarCopia = () => {
    const blob = new Blob([JSON.stringify(historico.presente, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${aulaId}-editor-v2-recuperacao.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const adotarVersaoDoDisco = async () => {
    if (!conflitoAtual?.textoAtual || !conflitoAtual.hashAtual) return;
    let cru: unknown;
    try { cru = JSON.parse(conflitoAtual.textoAtual); } catch { setRecado("A versão do disco não contém JSON válido."); return; }
    const validada = validarAulaV2(cru);
    if (!validada.ok) { setRecado("A versão do disco não é um documento v2 válido."); return; }
    const copiaLocal = { aula: historico.presente, baseHash: hash.current, em: new Date().toISOString() };
    if (!sessaoId) { setRecado("A sessão local ainda não está pronta. Tente novamente."); return; }
    try {
      await guardarRecuperacao(aulaId, sessaoId, copiaLocal.aula, copiaLocal.baseHash);
    } catch {
      setFalhaRecuperacao(true);
      setRecado("A versão do disco não foi aberta porque o navegador não confirmou a preservação da sua edição.");
      return;
    }
    setRecuperavel(copiaLocal);
    hash.current = conflitoAtual.hashAtual;
    maisRecente.current = validada.aula;
    ultimoEnfileirado.current = validada.aula;
    setHistorico(iniciarHistorico(validada.aula));
    setConflitoAtual(null);
    setRecado(null);
    setEstado("salvo");
  };

  if (!capitulo) return <main className="p-4 text-erro-texto">Esta aula ainda não tem capítulo editável.</main>;

  return (
    /*
     * ## A altura é FECHADA (`h-dvh`), e não um piso
     *
     * Medido em 10/09/2026 com uma partida de 60 lances: a lista de lances tem
     * `overflow-auto` — ela **promete** rolar por dentro —, mas sem nenhum pai de
     * altura fechada ela cresce em vez de rolar. Eram **4.420 px** de lista numa
     * página de 5.452 px, e quem rolava era a página inteira: o professor perdia o
     * tabuleiro de vista justamente enquanto procurava um lance lá embaixo.
     *
     * É o mesmo defeito que o editor v1 já tinha corrigido, e o conserto é o mesmo:
     * altura fechada aqui, `min-h-0` na linha de baixo (sem ele um filho flex nunca
     * encolhe abaixo do próprio conteúdo) e `overflow-y-auto` em cada coluna. Assim
     * as três colunas rolam por dentro e o tabuleiro fica onde está.
     *
     * **Só a partir de `lg`.** Em tela estreita o layout de três colunas não se
     * aplica, tudo empilha, e uma altura fechada espremeria a lista de lances até
     * zero — medido. Abaixo disso a página volta a rolar como antes. O plano (§16)
     * diz que o alvo da autoria é o desktop; isto não promete paridade no celular,
     * só evita quebrar o que já funcionava.
     */
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:h-dvh">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-metodo-tinta">Editor v2 · piloto</p>
          <h1 className="titulo">{historico.presente.titulo}</h1>
          <p className="text-sm text-tinta-fraca">Formato novo separado. A aula publicada e o editor atual não são alterados.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!historico.passados.length} onClick={() => setHistorico(desfazer)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta disabled:opacity-40">Desfazer</button>
          <button type="button" disabled={!historico.futuros.length} onClick={() => setHistorico(refazer)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta disabled:opacity-40">Refazer</button>
          <span className={`text-xs ${estado === "erro" || estado === "conflito" ? "text-erro-texto" : "text-tinta-fraca"}`}>
            {estado === "salvo" ? "✓ salvo" : estado === "alterado" ? "alterado" : estado === "salvando" ? "salvando…" : estado}
          </span>
        </div>
      </header>

      {recuperavel ? (
        <section className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          Há uma versão local não concluída de {new Date(recuperavel.em).toLocaleString("pt-BR")}.
          <button type="button" className="foco ml-2 underline" onClick={() => { setHistorico(iniciarHistorico(recuperavel.aula)); hash.current = recuperavel.baseHash; setRecuperavel(null); }}>Recuperar</button>
          <button type="button" className="foco ml-3 underline" onClick={() => { if (sessaoId) void apagarRecuperacao(aulaId, sessaoId); setRecuperavel(null); }}>Descartar</button>
        </section>
      ) : null}
      {conflitoAtual ? (
        <section className="rounded-lg border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
          <p>Outra aba gravou esta aula. Sua versão não foi sobrescrita.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="foco underline" onClick={baixarCopia}>Baixar minha cópia</button>
            <button type="button" className="foco underline disabled:opacity-40" disabled={!conflitoAtual.textoAtual || !conflitoAtual.hashAtual} onClick={adotarVersaoDoDisco}>Abrir versão do disco</button>
          </div>
        </section>
      ) : null}
      {falhaRecuperacao ? (
        <section className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          O navegador não conseguiu guardar a cópia de recuperação. O autosave no disco ainda será tentado.
          <button type="button" className="foco ml-2 underline" onClick={baixarCopia}>Baixar cópia agora</button>
        </section>
      ) : null}
      {recado ? <p role="alert" className="rounded-lg border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{recado}</p> : null}
      <PainelDeProblemas visiveis={visiveis} resumo={resumo} aoIr={irAoProblema} />

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(20rem,38rem)_minmax(18rem,1fr)]">
        <aside className="cartao-vazio flex flex-col gap-3 p-3 lg:min-h-0 lg:overflow-y-auto">
          <h2 className="text-sm font-semibold text-tinta">Capítulos</h2>
          {historico.presente.capitulos.map((item) => (
            <button key={item.id} type="button" onClick={() => { setCapituloId(item.id); setNodeId(item.inicioNodeId); }} className={`foco rounded-md px-2 py-2 text-left text-sm ${item.id === capitulo.id ? "bg-metodo-superficie text-metodo-tinta-alta" : "text-tinta hover:bg-carta-toque"}`}>{item.titulo}</button>
          ))}
          <label className="mt-2 flex flex-col gap-1 text-xs text-tinta-fraca">
            Nome do capítulo
            <input key={capitulo.id + capitulo.titulo} defaultValue={capitulo.titulo} onBlur={(e) => aplicar({ tipo: "RENOMEAR_CAPITULO", capituloId: capitulo.id, titulo: e.currentTarget.value })} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta" />
          </label>
        </aside>

        <section className="cartao-vazio flex flex-col gap-3 p-3 lg:min-h-0 lg:overflow-y-auto">
          {derivado ? (
            <>
              <ChessBoard fen={derivado.quadro.fen} orientation={capitulo.orientacao} turnColor={toBoardColor(jogo.turn())} dests={legalDests(jogo)} lastMove={derivado.quadro.ultimoLance as [Key, Key] | null} check={jogo.inCheck()} onMove={mover} revision={historico.passados.length + historico.futuros.length} />
              <p className="text-center text-xs text-tinta-fraca">Arraste uma peça para acrescentar um lance a partir da posição selecionada. Promoção usa dama por padrão.</p>
            </>
          ) : (
            /* Sem tabuleiro possível, e dizendo por quê. A lista de problemas acima
               já nomeia o lance; aqui explica-se por que o tabuleiro sumiu, para o
               sumiço não parecer defeito do editor. */
            <p className="p-4 text-sm text-tinta-media">
              O tabuleiro não pode ser montado enquanto houver um lance impossível nesta partida — a posição
              seguinte a ele nunca existiu. A lista acima diz qual é o lance e leva até ele.
            </p>
          )}
        </section>

        <section className="cartao-vazio flex min-h-[32rem] flex-col gap-4 p-3 lg:min-h-0">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <h2 className="text-sm font-semibold text-tinta">Lances e variantes</h2>
            {/* Sem as posições reconstruídas não há SAN nem numeração; o painel cai
                para o UCI cru, que é feio mas legível, em vez de sumir junto com o
                tabuleiro. O professor continua conseguindo clicar no lance errado. */}
            <PainelDeLances
              analise={analise}
              sans={derivado?.sans ?? Object.fromEntries(Object.values(analise.nos).filter((no) => no.uci).map((no) => [no.id, no.uci!]))}
              rotulos={derivado?.rotulos ?? {}}
              selecionado={selecionado.id}
              onSelecionar={setNodeId}
              onPromover={(parentId, id) => aplicar({ tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId, nodeId: id })}
            />
          </div>
          <div className="border-t border-borda-fraca pt-3">
            <p className="mb-2 text-xs text-tinta-fraca">Avaliação do lance</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries({ 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" }).map(([nag, simbolo]) => (
                <button key={nag} type="button" disabled={!selecionado.uci} onClick={() => aplicar({ tipo: "ALTERNAR_NAG", analiseId: analise.id, nodeId: selecionado.id, nag: Number(nag) })} className={`foco rounded border px-2 py-1 text-sm disabled:opacity-40 ${selecionado.nags?.includes(Number(nag)) ? "border-aviso-superficie bg-aviso-superficie/10 text-aviso-tinta" : "border-borda text-tinta"}`}>{simbolo}</button>
              ))}
            </div>
            <label className="mt-3 flex flex-col gap-1 text-xs text-tinta-fraca">
              Comentário desta posição
              <textarea key={selecionado.id + (selecionado.comentario ?? "")} defaultValue={selecionado.comentario ?? ""} onBlur={(e) => aplicar({ tipo: "EDITAR_COMENTARIO", analiseId: analise.id, nodeId: selecionado.id, comentario: e.currentTarget.value })} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm text-tinta" placeholder="Explique a ideia deste lance…" />
            </label>
            {narracoes.length ? <div className="mt-3 rounded-md bg-papel p-2 text-sm text-tinta-media"><span className="text-xs text-tinta-fraca">Narração existente</span>{narracoes.map((n) => <p key={n.id} className="mt-1">{n.texto}</p>)}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
