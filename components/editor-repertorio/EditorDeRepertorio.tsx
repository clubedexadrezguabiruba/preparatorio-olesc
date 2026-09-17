"use client";

import { Chess, type Square } from "chess.js";
import type { Key } from "@lichess-org/chessground/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { descartarRascunhoDoRepertorioAcao, salvarRascunhoDoRepertorioAcao } from "@/app/editor/repertorio/acoes";
import { ChessBoard } from "@/components/board/ChessBoard";
import { NagOverlay } from "@/components/board/NagOverlay";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { BarraDeAvaliacao } from "@/components/motor-do-professor/BarraDeAvaliacao";
import { FaixaDoMotor } from "@/components/motor-do-professor/FaixaDoMotor";
import { LinhasDoMotor } from "@/components/motor-do-professor/LinhasDoMotor";
import { useControlesDoMotor } from "@/components/motor-do-professor/useControlesDoMotor";
import { PainelDeLances } from "@/components/editor-v2/PainelDeLances";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import type { AcaoDoLanceV2 } from "@/lib/editor-v2/acoes-do-lance";
import { mapaDaAnalise } from "@/lib/editor-v2/arvore";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer, type ComandoV2, type Historico } from "@/lib/editor-v2/comandos";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import { acaoDeTeclado, ehCampoDeTexto, navegar } from "@/lib/editor-v2/navegacao";
import { ORIGENS, type Cor } from "@/lib/repertorio/linhas";
import { cascaDoArquivo } from "@/lib/repertorio/editor/adaptar";
import { escreverArquivo } from "@/lib/repertorio/editor/escrever";
import { frasesDoImpactoDoRepertorio, impactoDoRepertorio } from "@/lib/repertorio/editor/impacto";
import {
  classificarLance,
  comentarioComPlano,
  conferirCasca,
  efeitoDoSimbolo,
  ehLanceNosso,
  planoDoComentario,
  type EntradaDoPlanoNaTela,
} from "@/lib/repertorio/editor/sessao";
import { DialogoAplicarRepertorio } from "./DialogoAplicarRepertorio";

/**
 * O editor do repertório — §21 da especificação, parada 8D da fatia 8.
 *
 * ## O que ele é, e o que ele não é
 *
 * É o painel de lances e os comandos do Editor v2 sobre uma **casca em memória**: o `.pgn`
 * vira uma `AulaV2` com uma análise por jogo (`adaptar.ts`), os gestos passam por
 * `executarComando` — com o mesmo Desfazer —, e o que se grava é **PGN**: o rascunho em
 * `.editor/repertorio/`, escrito pelo emendador (`escrever.ts`), que reescreve só o jogo
 * tocado. Não existe JSON autoral do repertório em lugar nenhum (§15 do plano).
 *
 * Não é o editor de aulas: não há capítulo, narração, treino nem prática. As ações do menu
 * que dependem deles não aparecem.
 *
 * ## As regras do repertório continuam valendo
 *
 * A conferência ao lado é a do compilador, rodando na casca a cada edição: linha que termina
 * no adversário, régua do término, `[%plano]` torto (comentário é opcional desde 17/9/2026). Aplicar só
 * habilita com zero erros e o rascunho salvo — e o servidor compila os onze de novo antes de
 * tocar `content/`.
 */

const SIMBOLOS: Array<{ nag: number; simbolo: string }> = [
  { nag: 1, simbolo: "!" }, { nag: 2, simbolo: "?" }, { nag: 3, simbolo: "!!" },
  { nag: 4, simbolo: "??" }, { nag: 5, simbolo: "!?" }, { nag: 6, simbolo: "?!" },
];

const ACOES_DO_REPERTORIO = new Set<AcaoDoLanceV2["id"]>(["principal", "comentar", "simbolo", "variante", "excluir-daqui"]);

type Estado = "salvo" | "alterado" | "salvando" | "erro" | "conflito";

const ROTULO_DO_ESTADO: Record<Estado, string> = {
  salvo: "salvo",
  alterado: "alterado",
  salvando: "salvando…",
  erro: "erro ao salvar",
  conflito: "conflito",
};

function novoId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EditorDeRepertorio({ arquivo, textoInicial, hashInicial, origem, temFonte }: {
  arquivo: string;
  textoInicial: string;
  hashInicial: string;
  origem: "rascunho" | "fonte";
  temFonte: boolean;
}) {
  const casca0 = useMemo(() => cascaDoArquivo(arquivo, textoInicial), [arquivo, textoInicial]);
  const [historico, setHistorico] = useState<Historico<AulaV2>>(() => iniciarHistorico(casca0.aula));
  const aula = historico.presente;
  const [analiseId, setAnaliseId] = useState(casca0.aula.analises[0]?.id ?? "");
  const analise = aula.analises.find((a) => a.id === analiseId) ?? aula.analises[0];
  const [nodeId, setNodeId] = useState(analise?.raizId ?? "");
  const [focar, setFocar] = useState(0);
  const [recado, setRecado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [temRascunho, setTemRascunho] = useState(origem === "rascunho");
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [excluindo, setExcluindo] = useState<{ parentId: string; nodeId: string; frases: string[] } | null>(null);
  const [aplicado, setAplicado] = useState(false);
  const hash = useRef(hashInicial);
  const fila = useRef(Promise.resolve());
  const ultimoEnfileirado = useRef<AulaV2>(casca0.aula);
  const maisRecente = useRef<AulaV2>(casca0.aula);
  const campoDoComentario = useRef<HTMLTextAreaElement>(null);
  const grupoDeSimbolos = useRef<HTMLDivElement>(null);

  const cor: Cor = analise?.origemPgn?.tags.Cor === "pretas" ? "pretas" : "brancas";
  const orientacao = cor === "pretas" ? "black" : "white";

  const aplicar = useCallback((comando: ComandoV2) => {
    setHistorico((atual) => {
      try {
        const proximo = executarComando(atual.presente, comando, {});
        setRecado(null);
        return aplicarNoHistorico(atual, proximo);
      } catch (erro) {
        setRecado(erro instanceof Error ? erro.message : "não foi possível fazer esta edição");
        return atual;
      }
    });
  }, []);

  /* ---- o PGN que a edição produz, e a conferência dele ------------------------- */

  const tocados = useMemo(
    () => new Set(aula.analises.filter((a) => casca0.aula.analises.find((o) => o.id === a.id) !== a).map((a) => a.id)),
    [aula, casca0],
  );
  const escrita = useMemo(() => escreverArquivo(textoInicial, aula, tocados, casca0), [textoInicial, aula, tocados, casca0]);
  const conferencia = useMemo(() => conferirCasca(aula, casca0.formas), [aula, casca0.formas]);
  const erros = conferencia.itens.filter((i) => i.severidade === "erro");

  /* ---- autosave do rascunho (PGN) ------------------------------------------------ */

  useEffect(() => {
    if (ultimoEnfileirado.current === aula) return;
    ultimoEnfileirado.current = aula;
    maisRecente.current = aula;
    if (escrita.problemas.length > 0) {
      // O escritor recusou (uma chave no comentário, aspas numa tag): nada vai a disco
      // enquanto isso não for corrigido, e a tela diz o porquê.
      queueMicrotask(() => { setEstado("erro"); setRecado(`não dá para salvar: ${escrita.problemas[0]}`); });
      return;
    }
    queueMicrotask(() => setEstado("alterado"));
    const texto = escrita.texto;
    const relogio = setTimeout(() => {
      fila.current = fila.current.then(async () => {
        setEstado("salvando");
        const resposta = await salvarRascunhoDoRepertorioAcao(arquivo, texto, hash.current);
        if (resposta.ok) {
          hash.current = resposta.hash;
          setTemRascunho(true);
          if (maisRecente.current === aula) { setEstado("salvo"); setRecado(null); }
        } else if ("conflito" in resposta) {
          setEstado("conflito");
          setRecado("O arquivo mudou em disco depois que esta tela o abriu (outra aba, ou alguém editou o PGN). Suas mudanças continuam aqui: baixe a sua cópia antes de abrir a versão do disco.");
        } else {
          setEstado("erro");
          setRecado(resposta.erro);
        }
      }).catch(() => {
        setEstado("erro");
        setRecado("Não foi possível salvar o rascunho. Suas mudanças continuam nesta tela.");
      });
    }, 600);
    return () => clearTimeout(relogio);
  }, [arquivo, aula, escrita]);

  /* ---- teclado: Desfazer/Refazer e navegação na árvore ---------------------------- */

  const janelaAberta = maisOpcoes || aplicando || excluindo !== null;
  const estadoDoTeclado = useRef({ analise, janelaAberta });
  useEffect(() => { estadoDoTeclado.current = { analise, janelaAberta }; });

  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      const { analise: arvore, janelaAberta: aberta } = estadoDoTeclado.current;
      if (aberta || ehCampoDeTexto(evento.target as HTMLElement | null)) return;
      if ((evento.ctrlKey || evento.metaKey) && !evento.altKey) {
        const tecla = evento.key.toLowerCase();
        if (tecla === "z") { evento.preventDefault(); setHistorico((h) => (evento.shiftKey ? refazer(h) : desfazer(h))); }
        else if (tecla === "y") { evento.preventDefault(); setHistorico(refazer); }
        return;
      }
      const acao = acaoDeTeclado(evento);
      if (!acao || !arvore) return;
      evento.preventDefault();
      setNodeId((atual) => navegar(arvore, atual, acao));
      setFocar((n) => n + 1);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, []);

  /* ---- a posição selecionada --------------------------------------------------------- */

  const mapa = useMemo(() => {
    if (!analise) return null;
    try { return mapaDaAnalise(aula, analise.id, {}); } catch { return null; }
  }, [aula, analise]);

  /*
   * O motor do professor (fatia 9, §23.1), antes do retorno antecipado abaixo: é um hook.
   * Pausa com as janelas desta tela abertas, como no editor de aulas.
   */
  const fenDoMotor = analise && mapa ? mapa.quadros[analise.nos[nodeId] ? nodeId : analise.raizId]?.fen ?? "" : "";
  const motor = useControlesDoMotor(fenDoMotor, { pausado: janelaAberta, idDoAtalho: "repertorio-motor" });

  if (!analise || !mapa) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
        <Link href="/editor/repertorio" className="foco w-fit text-xs text-tinta-fraca hover:text-tinta">← Repertório</Link>
        <h1 className="titulo">{arquivo}</h1>
        <p role="alert" className="text-sm text-erro-texto">Este arquivo não tem nenhum jogo que o editor consiga abrir: falta o cabeçalho com as tags.</p>
      </main>
    );
  }

  const nodeIdAtual = analise.nos[nodeId] ? nodeId : analise.raizId;
  const selecionado = analise.nos[nodeIdAtual];
  const quadro = mapa.quadros[nodeIdAtual];
  const pai = Object.values(analise.nos).find((n) => n.filhos.includes(nodeIdAtual));
  const problemasDoJogo = casca0.problemas[analise.id] ?? [];
  const ehRaiz = nodeIdAtual === analise.raizId;
  const nosso = pai ? ehLanceNosso(mapa.quadros[pai.id].fen, cor) : false;
  const principal = pai ? pai.filhos[0] === nodeIdAtual : true;
  const ehPonta = selecionado.filhos.length === 0 && !ehRaiz;
  const qualidade = selecionado.nags?.find((n) => n >= 1 && n <= 6);
  const nomeDoLance = (id: string) => (mapa.sans[id] ? `${mapa.rotulos[id] ?? ""} ${mapa.sans[id]}`.trim() : "a posição inicial");

  const selecionar = (id: string) => { setNodeId(id); setAviso(null); };

  const mover = (orig: Key, dest: Key) => {
    const jogo = new Chess(quadro.fen);
    const peca = jogo.get(orig as Square);
    const promocao = peca?.type === "p" && (dest[1] === "1" || dest[1] === "8") ? "q" : "";
    const uci = `${orig}${dest}${promocao}`;
    const classe = classificarLance(analise, cor, selecionado.id, quadro.fen, uci);
    if (classe.tipo === "existente") { selecionar(classe.nodeId); return; }
    const id = novoId();
    aplicar({ tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: selecionado.id, uci, novoNodeId: id });
    setNodeId(id);
    setAviso(classe.frase);
  };

  const pedirExclusao = (id: string) => {
    const doPai = Object.values(analise.nos).find((n) => n.filhos.includes(id));
    if (!doPai) return;
    try {
      const depois = executarComando(aula, { tipo: "EXCLUIR_RAMO", analiseId: analise.id, parentId: doPai.id, nodeId: id }, {});
      const impacto = impactoDoRepertorio(conferencia.linhas, conferirCasca(depois, casca0.formas).linhas);
      setExcluindo({ parentId: doPai.id, nodeId: id, frases: frasesDoImpactoDoRepertorio(impacto) });
    } catch (erro) {
      setRecado(erro instanceof Error ? erro.message : "não foi possível calcular a exclusão");
    }
  };

  const aoAcao = (acao: AcaoDoLanceV2["id"], id: string) => {
    selecionar(id);
    if (acao === "principal") {
      const doPai = Object.values(analise.nos).find((n) => n.filhos.includes(id));
      if (doPai) aplicar({ tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId: doPai.id, nodeId: id });
    } else if (acao === "comentar") {
      requestAnimationFrame(() => campoDoComentario.current?.focus());
    } else if (acao === "simbolo") {
      requestAnimationFrame(() => grupoDeSimbolos.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus());
    } else if (acao === "variante") {
      setAviso(`Jogue no tabuleiro a partir de ${nomeDoLance(id)}: um lance diferente dos que já existem nasce ao lado, e a continuação de agora fica onde está.`);
    } else if (acao === "excluir-daqui") {
      pedirExclusao(id);
    }
  };

  const baixarCopia = () => {
    const blob = new Blob([escrita.texto], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${arquivo}-minha-copia.pgn`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const descartar = async () => {
    if (!window.confirm("Descartar o rascunho? A tela volta ao PGN publicado, e o que não foi aplicado se perde.")) return;
    await descartarRascunhoDoRepertorioAcao(arquivo);
    window.location.reload();
  };

  const podeAplicar = estado === "salvo" && temRascunho && erros.length === 0 && problemasDoJogo.length === 0;
  const motivoDeNaoAplicar = !temRascunho
    ? "Nada para aplicar: o arquivo está igual ao publicado"
    : estado !== "salvo"
      ? "Espere o rascunho salvar"
      : erros.length > 0
        ? `A conferência tem ${erros.length} erro(s) — corrija antes de aplicar`
        : undefined;

  const itensDoJogo = conferencia.itens.filter((i) => i.analiseId === analise.id);

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3">
      <header className="flex flex-wrap items-center gap-2">
        <Link href="/editor/repertorio" className="foco text-xs text-tinta-fraca hover:text-tinta">← Repertório</Link>
        <h1 className="titulo mr-2">{arquivo}</h1>
        <span role="status" className={`rounded-full border px-2 py-0.5 text-xs ${estado === "salvo" ? "border-borda text-tinta-fraca" : estado === "erro" || estado === "conflito" ? "border-erro-texto text-erro-texto" : "border-aviso-superficie text-aviso-tinta"}`}>
          {ROTULO_DO_ESTADO[estado]}{temRascunho ? " · rascunho" : temFonte ? " · igual ao publicado" : ""}
        </span>
        <span className="flex-1" />
        <button type="button" disabled={!historico.passados.length} onClick={() => setHistorico(desfazer)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta disabled:opacity-40">Desfazer</button>
        <button type="button" disabled={!historico.futuros.length} onClick={() => setHistorico(refazer)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta disabled:opacity-40">Refazer</button>
        <button type="button" onClick={() => setMaisOpcoes(true)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Mais opções</button>
        {temRascunho ? <button type="button" onClick={() => void descartar()} className="foco rounded-md border border-aviso-superficie px-3 py-2 text-sm text-aviso-tinta">Descartar rascunho</button> : null}
        <button
          type="button"
          disabled={!podeAplicar}
          title={motivoDeNaoAplicar}
          onClick={() => setAplicando(true)}
          className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
        >
          Aplicar
        </button>
      </header>

      {aplicado ? <p role="status" className="text-sm text-metodo-tinta">Aplicado: a fonte e o compilado foram trocados juntos. Recarregando…</p> : null}
      {recado ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-erro-texto">
          <span>{recado}</span>
          {estado === "conflito" ? (
            <>
              <button type="button" onClick={baixarCopia} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Baixar minha cópia</button>
              <button type="button" onClick={() => window.location.reload()} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Abrir versão do disco</button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-h-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(18rem,24rem)]">
        {/* ---- os jogos do arquivo ---- */}
        <nav aria-label="Jogos do arquivo" className="flex flex-col gap-1">
          <p className="text-xs text-tinta-fraca">{aula.analises.length === 1 ? "1 jogo" : `${aula.analises.length} jogos`} · {conferencia.linhas.length} linhas</p>
          <ul className="flex flex-col gap-1">
            {aula.analises.map((a, i) => {
              const tags = a.origemPgn?.tags ?? {};
              const linhas = conferencia.linhas.filter((l) => l.analiseId === a.id).length;
              const errosDoJogo = conferencia.itens.filter((it) => it.analiseId === a.id && it.severidade === "erro").length;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-current={a.id === analise.id ? "true" : undefined}
                    onClick={() => { setAnaliseId(a.id); setNodeId(a.raizId); setAviso(null); }}
                    className={`foco flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm ${a.id === analise.id ? "bg-metodo-superficie/25 text-metodo-tinta-alta" : "text-tinta hover:bg-carta-toque"}`}
                  >
                    <span className="font-medium">{tags.Nome ?? `Jogo ${i + 1}`}</span>
                    <span className="text-xs opacity-80">
                      {tags.Nivel === "avancado" ? "Avançado" : "Base"} · {linhas} {linhas === 1 ? "linha" : "linhas"}{errosDoJogo ? ` · ${errosDoJogo} erro(s)` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---- tabuleiro, símbolos e comentário ---- */}
        <section aria-label="Posição" className="flex min-w-0 flex-col gap-2">
          {/* 28,125 rem = os 27 rem do tabuleiro + a barra (0,875) + o vão (0,25): a barra
              entrou sem encolher o tabuleiro que a parada 8D mediu. */}
          <div className="mx-auto flex w-full max-w-[28.125rem] gap-1">
            <BarraDeAvaliacao altura={motor.estado.barra} orientacao={orientacao} />
            <div className="min-w-0 flex-1">
            <ChessBoard
              fen={quadro.fen}
              orientation={orientacao}
              shapes={motor.shapes}
              turnColor={toBoardColor(new Chess(quadro.fen).turn())}
              dests={legalDests(new Chess(quadro.fen))}
              lastMove={quadro.ultimoLance as [Key, Key] | null}
              check={new Chess(quadro.fen).inCheck()}
              onMove={mover}
              revision={historico.passados.length + historico.futuros.length}
              overlay={qualidade && quadro.ultimoLance
                ? <NagOverlay casa={quadro.ultimoLance[1] as Key} orientation={orientacao} simbolo={SIMBOLOS.find((s) => s.nag === qualidade)!.simbolo} />
                : undefined}
            />
            </div>
          </div>
          {aviso ? <p role="status" className="rounded-md border border-metodo-superficie bg-metodo-superficie/10 p-2 text-sm text-metodo-tinta">{aviso}</p> : null}
          {problemasDoJogo.length > 0 ? (
            <p role="alert" className="text-sm text-erro-texto">Este jogo não pode ser regravado pela tela: {problemasDoJogo[0]}</p>
          ) : null}

          <div className="flex flex-col gap-1">
            <p className="text-sm text-tinta">
              <strong>{nomeDoLance(nodeIdAtual)}</strong>
              {ehRaiz ? null : <span className="text-tinta-fraca"> · lance {nosso ? "nosso" : "do adversário"}{principal ? "" : " · ao lado da linha"}</span>}
            </p>
            <div ref={grupoDeSimbolos} role="group" aria-label="Símbolo do lance" className="flex flex-wrap gap-1">
              {SIMBOLOS.map(({ nag, simbolo }) => {
                const efeito = ehRaiz ? "a posição inicial não é um lance" : efeitoDoSimbolo(nag, nosso, principal);
                return (
                  <button
                    key={nag}
                    type="button"
                    disabled={ehRaiz}
                    aria-pressed={qualidade === nag}
                    aria-label={`${simbolo}: ${efeito}`}
                    title={efeito}
                    onClick={() => aplicar({ tipo: "ALTERNAR_NAG", analiseId: analise.id, nodeId: nodeIdAtual, nag })}
                    className={`foco min-w-10 rounded-md border px-2 py-1 text-sm font-semibold disabled:opacity-40 ${qualidade === nag ? "border-metodo-superficie bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta hover:bg-carta-toque"}`}
                  >
                    {simbolo}
                  </button>
                );
              })}
            </div>
            {qualidade && !ehRaiz ? <p className="text-xs text-tinta-fraca">{SIMBOLOS.find((s) => s.nag === qualidade)!.simbolo}: {efeitoDoSimbolo(qualidade, nosso, principal)}.</p> : null}
          </div>

          <EditorDeComentario
            key={`${analise.id}:${nodeIdAtual}:${selecionado.comentario ?? ""}`}
            campo={campoDoComentario}
            comentario={selecionado.comentario}
            cor={cor}
            comPlano={ehPonta && nosso}
            desabilitado={ehRaiz && !selecionado.comentario}
            aoGuardar={(texto) => aplicar({ tipo: "EDITAR_COMENTARIO", analiseId: analise.id, nodeId: nodeIdAtual, comentario: texto })}
          />
        </section>

        {/* ---- lances e conferência ---- */}
        <aside aria-label="Lances e conferência" className="flex min-h-0 flex-col gap-3">
          <div className="flex shrink-0 flex-col gap-1 border-b border-borda-fraca pb-2">
            <FaixaDoMotor
              estado={motor.estado}
              ligado={motor.ligado}
              aoAlternar={motor.alternar}
              seta={motor.seta}
              aoAlternarSeta={motor.alternarSeta}
              linhas={motor.linhas}
              aoMudarLinhas={motor.mudarLinhas}
            />
            <LinhasDoMotor estado={motor.estado} quantas={motor.linhas} />
          </div>
          <div className="flex max-h-[21rem] min-h-0 flex-col">
            <PainelDeLances
              analise={analise}
              sans={mapa.sans}
              rotulos={mapa.rotulos}
              selecionado={nodeIdAtual}
              focar={focar}
              filtrarAcoes={(acoes) => acoes.filter((a) => ACOES_DO_REPERTORIO.has(a.id))}
              onSelecionar={selecionar}
              onPromover={(parentId, id) => aplicar({ tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId, nodeId: id })}
              onAcao={aoAcao}
            />
          </div>
          <section aria-label="Conferência" className="flex min-h-0 flex-col gap-1">
            <h2 className="text-sm font-semibold text-tinta">
              Conferência: {erros.length === 0 ? "nenhum erro" : `${erros.length} erro(s)`}
              {conferencia.itens.length - erros.length > 0 ? `, ${conferencia.itens.length - erros.length} aviso(s)` : ""}
            </h2>
            {itensDoJogo.length === 0 ? (
              <p className="text-xs text-tinta-fraca">Este jogo passa nas regras do repertório.{erros.length > 0 ? " Os erros são de outro jogo do arquivo." : ""}</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1 overflow-auto pr-1">
                {itensDoJogo.map((item, i) => (
                  <li key={`${i}-${item.mensagem}`} className={`flex flex-col gap-1 border-l-2 pl-2 text-xs ${item.severidade === "erro" ? "border-erro-texto text-tinta" : "border-aviso-superficie text-tinta-media"}`}>
                    <span><strong>{item.severidade === "erro" ? "Erro" : "Aviso"}:</strong> {item.mensagem}</span>
                    {item.nodeId && analise.nos[item.nodeId] ? (
                      <button type="button" onClick={() => { selecionar(item.nodeId!); setFocar((n) => n + 1); }} className="foco w-fit rounded border border-borda px-2 py-0.5 text-xs text-tinta hover:bg-carta-toque">
                        Ir até a linha
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {maisOpcoes ? (
        <DialogoMaisOpcoes
          tags={analise.origemPgn?.tags ?? {}}
          aoFechar={() => setMaisOpcoes(false)}
          aoGuardar={(chave, valor) => aplicar({ tipo: "EDITAR_TAG_PGN", analiseId: analise.id, chave, valor })}
        />
      ) : null}

      {excluindo ? (
        <Dialogo
          titulo={`Excluir a partir de ${nomeDoLance(excluindo.nodeId)}`}
          descricao="O lance e tudo o que nasce dele saem do rascunho. Desfazer devolve."
          largura="max-w-xl"
          aoFechar={() => setExcluindo(null)}
          rodape={(
            <div className="flex gap-2">
              <button type="button" onClick={() => setExcluindo(null)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  aplicar({ tipo: "EXCLUIR_RAMO", analiseId: analise.id, parentId: excluindo.parentId, nodeId: excluindo.nodeId });
                  setNodeId(excluindo.parentId);
                  setExcluindo(null);
                }}
                className="foco rounded-md border border-erro-texto px-3 py-2 text-sm font-medium text-erro-texto"
              >
                Excluir
              </button>
            </div>
          )}
        >
          <ul className="flex flex-col gap-1.5 text-sm text-tinta">
            {excluindo.frases.map((frase) => <li key={frase} className="border-l-2 border-borda pl-2">{frase}</li>)}
          </ul>
          <p className="text-xs text-tinta-fraca">Quantos alunos têm progresso nas linhas que morrem aparece ao aplicar, quando o banco é consultado.</p>
        </Dialogo>
      ) : null}

      {aplicando ? (
        <DialogoAplicarRepertorio
          arquivo={arquivo}
          aoFechar={() => setAplicando(false)}
          aoAplicar={() => { setAplicando(false); setAplicado(true); window.location.reload(); }}
        />
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * O comentário do lance, com o [%plano] em campos na ponta da linha
 * ------------------------------------------------------------------ */

function EditorDeComentario({ campo, comentario, cor, comPlano, desabilitado, aoGuardar }: {
  campo: React.RefObject<HTMLTextAreaElement | null>;
  comentario: string | undefined;
  cor: Cor;
  comPlano: boolean;
  desabilitado: boolean;
  aoGuardar: (texto: string) => void;
}) {
  const inicial = useMemo(() => planoDoComentario(comentario, cor), [comentario, cor]);
  const [prosa, setProsa] = useState(inicial.prosa);
  const [entradas, setEntradas] = useState<EntradaDoPlanoNaTela[]>(inicial.entradas);
  const origens = Object.keys(ORIGENS[cor]);

  const guardar = (novaProsa = prosa, novasEntradas = entradas) => {
    aoGuardar(comPlano || novasEntradas.length > 0 ? comentarioComPlano(novaProsa, novasEntradas) : novaProsa);
  };
  const trocarEntrada = (i: number, entrada: EntradaDoPlanoNaTela, guardarJa = false) => {
    const novas = entradas.map((e, j) => (j === i ? entrada : e));
    setEntradas(novas);
    if (guardarJa) guardar(prosa, novas);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Comentário
        <textarea
          ref={campo}
          value={prosa}
          disabled={desabilitado}
          rows={4}
          onChange={(e) => setProsa(e.target.value)}
          onBlur={() => guardar()}
          placeholder={desabilitado ? "A posição inicial não leva comentário no repertório." : "Por que este lance? O aluno lê isto quando acerta."}
          className="foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm leading-relaxed disabled:opacity-50"
        />
      </label>
      {inicial.erros.length > 0 ? <p role="alert" className="text-xs text-erro-texto">O plano deste lance está torto: {inicial.erros[0]}</p> : null}
      {comPlano ? (
        <fieldset className="flex flex-col gap-2 rounded-md border border-borda-fraca p-2">
          <legend className="px-1 text-xs text-tinta-fraca">Plano — o que a linha não fechou até aqui, e por quê</legend>
          {entradas.map((entrada, i) => (
            <div key={i} className="grid grid-cols-[6rem_7rem_minmax(0,1fr)_auto] items-start gap-1">
              <select
                aria-label="Peça do plano"
                value={entrada.chave}
                onChange={(e) => {
                  const chave = e.target.value;
                  trocarEntrada(i, chave === "rei" ? { chave: "rei", roque: "O-O", motivo: entrada.motivo } : { chave, destino: "roque" in entrada ? "" : entrada.destino, motivo: entrada.motivo }, true);
                }}
                className="foco rounded-md border border-borda bg-papel px-1 py-1 text-xs"
              >
                <option value="rei">Rei</option>
                {origens.map((o) => <option key={o} value={o}>Peça de {o}</option>)}
              </select>
              {"roque" in entrada ? (
                <select
                  aria-label="O que o rei faz"
                  value={entrada.roque}
                  onChange={(e) => trocarEntrada(i, { ...entrada, roque: e.target.value as "O-O" | "O-O-O" | "rei-fica" }, true)}
                  className="foco rounded-md border border-borda bg-papel px-1 py-1 text-xs"
                >
                  <option value="O-O">Roque curto</option>
                  <option value="O-O-O">Roque longo</option>
                  <option value="rei-fica">Fica</option>
                </select>
              ) : (
                <input
                  aria-label="Casa de destino"
                  value={entrada.destino}
                  maxLength={2}
                  onChange={(e) => trocarEntrada(i, { ...entrada, destino: e.target.value.toLowerCase() })}
                  onBlur={() => guardar()}
                  placeholder="casa (b2)"
                  className="foco rounded-md border border-borda bg-papel px-1 py-1 text-xs"
                />
              )}
              <textarea
                aria-label="Motivo"
                value={entrada.motivo}
                rows={2}
                onChange={(e) => trocarEntrada(i, { ...entrada, motivo: e.target.value })}
                onBlur={() => guardar()}
                placeholder="Por que ainda não saiu (pelo menos 25 letras)"
                className="foco rounded-md border border-borda bg-papel px-1 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => { const novas = entradas.filter((_, j) => j !== i); setEntradas(novas); guardar(prosa, novas); }}
                className="foco rounded border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque"
              >
                Tirar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEntradas([...entradas, { chave: origens[0], destino: "", motivo: "" }])}
            className="foco w-fit rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque"
          >
            + Acrescentar ao plano
          </button>
        </fieldset>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mais opções: Nome, Nível e Fonte
 * ------------------------------------------------------------------ */

function DialogoMaisOpcoes({ tags, aoFechar, aoGuardar }: {
  tags: Record<string, string>;
  aoFechar: () => void;
  aoGuardar: (chave: string, valor: string) => void;
}) {
  const [nome, setNome] = useState(tags.Nome ?? "");
  const [nivel, setNivel] = useState(tags.Nivel ?? "base");
  const [fonte, setFonte] = useState(tags.Fonte ?? "");

  const guardar = () => {
    if (nome.trim() && nome.trim() !== tags.Nome) aoGuardar("Nome", nome);
    if (nivel !== tags.Nivel) aoGuardar("Nivel", nivel);
    if (fonte.trim() && fonte.trim() !== tags.Fonte) aoGuardar("Fonte", fonte.replace(/\s*\n\s*/g, " "));
    aoFechar();
  };

  return (
    <Dialogo
      titulo="Mais opções deste jogo"
      descricao="O cabeçalho do PGN. Cada campo mudado entra no Desfazer."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={(
        <div className="flex gap-2">
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button type="button" onClick={guardar} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta">Guardar</button>
        </div>
      )}
    >
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="foco rounded-md border border-borda bg-papel px-2 py-1.5" />
        <span className="text-xs text-tinta-fraca">É o que o aluno lê na lista, antes dos últimos lances da linha.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nível
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="foco w-fit rounded-md border border-borda bg-papel px-2 py-1.5">
          <option value="base">Base</option>
          <option value="avancado">Avançado</option>
        </select>
        <span className="text-xs text-tinta-fraca">Passar linhas para o Base re-tranca o Avançado de quem já tinha terminado o Base — o impacto diz quando aplicar.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Fonte
        <textarea value={fonte} rows={6} onChange={(e) => setFonte(e.target.value)} className="foco rounded-md border border-borda bg-papel px-2 py-1.5 text-xs" />
      </label>
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-1 text-sm">
        <dt className="text-tinta-fraca">Cor</dt><dd className="text-tinta">{tags.Cor ?? "—"}</dd>
        <dt className="text-tinta-fraca">Abertura</dt><dd className="text-tinta">{tags.Abertura ?? "—"}</dd>
      </dl>
      <p className="text-xs text-tinta-fraca">
        Cor e abertura ficam travadas: as duas entram no id de todas as linhas, e mudá-las faria todos os alunos
        recomeçarem. Para outra abertura, crie uma abertura nova.
      </p>
    </Dialogo>
  );
}
