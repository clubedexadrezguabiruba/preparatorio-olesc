"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { desenhoDaAutoriaV2 } from "@/lib/chess/annotations";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import {
  catalogoComErro,
  destinoDoLanceDoTabuleiro,
  efeitoAoTrocarTipo,
  FEEDBACK_DE_RESPOSTA_NOVA,
  lanceDoTabuleiro,
  prepararEdicaoDeTreino,
  proximoIdDeResposta,
  type CatalogoV2,
  type EdicaoDeTreinoV2,
} from "@/lib/editor-v2/autoria-treino";
import {
  acrescentarDefesa,
  fugasDaAnalise,
  proximoIdDeQuestao,
  removerDefesa,
  tornarDefesaFixa,
} from "@/lib/editor-v2/defesas-do-treino";
import { desenhoDeFormas } from "@/lib/editor-v2/desenhos";
import { fenDaQuestaoDoTreino } from "@/lib/editor-v2/propriedade-treino";
import { resultadoDoTreinoV2, type AulaV2, type QuestaoTreinoV2, type RespostaTreinoV2, type TreinoV2 } from "@/lib/editor-v2/modelo";
import { MAXIMO_DE_DEFESAS } from "@/lib/editor-v2/treino-jogavel";
import { falasDoTreinoV2 } from "@/lib/editor-v2/voz-do-treino";
import { reprovacoes, type Regua } from "@/lib/lesson/regua";
import type { Position } from "@/lib/lesson/schema";
import { Dialogo } from "./Dialogo";

const NOMES_DO_FIM: Record<Extract<RespostaTreinoV2["efeito"], { tipo: "encerra" }>["condicao"], string> = {
  mate: "Mate",
  promotion: "Promoção",
  "draw-secured": "Empate pelas regras",
  // Só aparece na aula antiga que já o usa: desde 15/9/2026 ninguém certifica vitória.
  "tablebase-win": "Vitória (aula antiga)",
  "objetivo-autoral": "Objetivo autoral alcançado",
};

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function efeitoModelo(questao: QuestaoTreinoV2): RespostaTreinoV2["efeito"] {
  return clonar(questao.respostas.find((resposta) => resposta.julgamento !== "erro")?.efeito
    ?? { tipo: "repete" as const });
}

function movimentos(texto: string): string[] {
  return texto.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

const NOMES_DO_JULGAMENTO: Record<RespostaTreinoV2["julgamento"], string> = {
  correta: "Correta no método",
  alternativa: "Correta fora do método",
  erro: "Erro conhecido",
};

/** A linha de uma resposta fechada: o lance como o aluno lê, o julgamento e o que vem depois. */
function resumoDaResposta(fen: string, resposta: RespostaTreinoV2): string {
  const lances = resposta.moves.map((uci) => {
    try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san; }
    catch { return uci; }
  });
  const depois = resposta.efeito.tipo === "avanca" ? "avança"
    : resposta.efeito.tipo === "repete" ? "repete a pergunta"
    : `encerra: ${NOMES_DO_FIM[resposta.efeito.condicao]}`;
  return [lances.join(", ") || "sem lance", NOMES_DO_JULGAMENTO[resposta.julgamento], resposta.julgamento === "erro" ? null : depois].filter(Boolean).join(" · ");
}

export function DialogoEditarTreino({ aula, treinoId, positions, regua, aoSalvar, aoFechar }: {
  aula: AulaV2;
  treinoId: string;
  positions: Record<string, Position>;
  /** A régua de voz, lida do documento pelo servidor. Sem ela, a janela não avisa nada. */
  regua?: Regua;
  aoSalvar: (edicao: EdicaoDeTreinoV2) => void;
  aoFechar: () => void;
}) {
  const original = aula.treinos.find((item) => item.id === treinoId)!;
  const [treino, setTreino] = useState<TreinoV2>(() => clonar(original));
  const [catalogo, setCatalogo] = useState<CatalogoV2 | undefined>(() => aula.catalogo ? clonar(aula.catalogo) : undefined);
  const [questaoId, setQuestaoId] = useState(original.questoes[0].id);
  /** A resposta cuja lista "+ Outra resposta do adversário" está aberta. */
  const [escolhendoFuga, setEscolhendoFuga] = useState<string | null>(null);
  const questao = treino.questoes.find((item) => item.id === questaoId) ?? treino.questoes[0];
  const indiceQuestao = treino.questoes.indexOf(questao);
  /**
   * Uma resposta aberta por vez (16/9/2026): com todas abertas, cada resposta ocupava um
   * palmo de janela. A primeira da pergunta abre sozinha, e a recém-criada também.
   */
  const [respostaAberta, setRespostaAberta] = useState<string | null>(original.questoes[0].respostas[0]?.id ?? null);
  /** O chessground move a peça antes de avisar; subir isto devolve o tabuleiro à pergunta. */
  const [giroDoTabuleiro, setGiroDoTabuleiro] = useState(0);
  const listaDeRespostas = useRef<HTMLElement>(null);
  // A mesma posição que a conferência usa: a cópia do treino personalizado, se houver.
  const fen = fenDaQuestaoDoTreino(aula, treino, questao, positions);
  const jogo = useMemo(() => new Chess(fen), [fen]);
  const destinos = useMemo(() => legalDests(jogo), [jogo]);
  const resultado = useMemo(() => prepararEdicaoDeTreino(aula, { treino, catalogo }, positions), [aula, catalogo, positions, treino]);
  /** §6 e §12: o que o aluno lê passa pela régua. Avisa, não impede salvar. */
  const avisosDeVoz = useMemo(() => regua ? reprovacoes(falasDoTreinoV2(treino), regua) : [], [regua, treino]);

  const atualizarQuestao = (muda: (atual: QuestaoTreinoV2) => QuestaoTreinoV2) => {
    setTreino((atual) => ({ ...atual, questoes: atual.questoes.map((item) => item.id === questao.id ? muda(item) : item) }));
  };
  const atualizarResposta = (respostaId: string, muda: (atual: RespostaTreinoV2) => RespostaTreinoV2) => {
    atualizarQuestao((atual) => ({ ...atual, respostas: atual.respostas.map((item) => item.id === respostaId ? muda(item) : item) }));
  };

  // A resposta que abre rola para a vista: a nova nasce no fim da lista.
  useEffect(() => {
    if (!respostaAberta) return;
    listaDeRespostas.current?.querySelector(`[data-resposta="${CSS.escape(respostaAberta)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [respostaAberta]);

  const escolherQuestao = (id: string) => {
    setQuestaoId(id);
    setRespostaAberta(treino.questoes.find((item) => item.id === id)?.respostas[0]?.id ?? null);
  };

  /** Sem lance, a resposta nova espera o tabuleiro (ou o campo); a conferência pede o lance. */
  const adicionarResposta = (julgamento: RespostaTreinoV2["julgamento"], moves: string[] = []) => {
    const id = proximoIdDeResposta(aula, treino, questao.id);
    setRespostaAberta(id);
    if (julgamento === "erro") {
      const numero = (catalogo?.erros.length ?? aula.catalogo?.erros.length ?? 0) + 1;
      const novo = catalogoComErro(aula, catalogo, `Erro conhecido ${numero}`, "Explique por que este lance não serve.");
      setCatalogo(novo.catalogo);
      atualizarQuestao((atual) => ({ ...atual, respostas: [...atual.respostas, {
        id, moves, julgamento: "erro", erroId: novo.erroId,
        feedback: FEEDBACK_DE_RESPOSTA_NOVA.erro, efeito: { tipo: "repete" },
      }] }));
      return;
    }
    atualizarQuestao((atual) => ({ ...atual, respostas: [...atual.respostas, {
      id, moves, julgamento,
      feedback: FEEDBACK_DE_RESPOSTA_NOVA[julgamento],
      efeito: efeitoModelo(atual),
    }] }));
  };

  const jogarNoTabuleiro = (orig: Key, dest: Key) => {
    setGiroDoTabuleiro((atual) => atual + 1);
    const lance = lanceDoTabuleiro(fen, orig, dest);
    if (!lance) return;
    const destino = destinoDoLanceDoTabuleiro(questao, respostaAberta, lance);
    if (destino.tipo === "nova") { adicionarResposta("correta", [lance]); return; }
    if (destino.tipo === "preencher") atualizarResposta(destino.respostaId, (atual) => ({ ...atual, moves: [lance] }));
    setRespostaAberta(destino.respostaId);
  };

  const removerResposta = (respostaId: string) => {
    atualizarQuestao((atual) => ({ ...atual, respostas: atual.respostas.filter((item) => item.id !== respostaId) }));
    if (respostaAberta === respostaId) setRespostaAberta(null);
  };

  const lanceAberto = questao.respostas.find((item) => item.id === respostaAberta)?.moves[0];

  const mudarJulgamento = (resposta: RespostaTreinoV2, julgamento: RespostaTreinoV2["julgamento"]) => {
    if (julgamento === "erro" && !resposta.erroId) {
      const numero = (catalogo?.erros.length ?? aula.catalogo?.erros.length ?? 0) + 1;
      const novo = catalogoComErro(aula, catalogo, `Erro conhecido ${numero}`, "Explique por que este lance não serve.");
      setCatalogo(novo.catalogo);
      atualizarResposta(resposta.id, (atual) => ({ ...atual, julgamento, erroId: novo.erroId, efeito: { tipo: "repete" } }));
      return;
    }
    atualizarResposta(resposta.id, (atual) => julgamento === "erro"
      ? { ...atual, julgamento, efeito: { tipo: "repete" } }
      : { ...atual, julgamento, erroId: undefined });
  };

  return (
    <Dialogo
      titulo={`Editar treino — ${original.titulo}`}
      descricao="As respostas que o aluno pode jogar, o que ele lê em cada uma, e como o adversário responde."
      largura="max-w-6xl"
      contida
      aoFechar={aoFechar}
      rodape={(
        <>
          <span className={`mr-auto text-xs ${resultado.ok ? "text-metodo-tinta" : "text-erro-texto"}`} role={resultado.ok ? undefined : "alert"}>
            {resultado.ok ? "Todas as respostas levam a outra pergunta ou a um fim." : resultado.mensagem}
            {avisosDeVoz.length ? <span className="text-tinta-media"> · {avisosDeVoz.length} {avisosDeVoz.length === 1 ? "aviso" : "avisos"} da régua de voz</span> : null}
          </span>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar</button>
          <button type="button" disabled={!resultado.ok} onClick={() => { if (resultado.ok) aoSalvar(resultado.edicao); }} className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-semibold text-metodo-tinta-alta disabled:opacity-40">Salvar treino</button>
        </>
      )}
    >
      {/* 16/9/2026: três colunas presas à altura da tela — o treino, a pergunta com o tabuleiro,
          e as respostas. Cada uma rola sozinha; o tabuleiro não sai de vista ao descer a lista. */}
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <label className="flex flex-col gap-1 text-sm text-tinta">Título
            <input value={treino.titulo} onChange={(e) => setTreino({ ...treino, titulo: e.currentTarget.value })} className="foco rounded-md border border-borda bg-papel px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">Objetivo
            <textarea value={treino.objetivo} onChange={(e) => setTreino({ ...treino, objetivo: e.currentTarget.value })} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          {/* Fatia 10: o treino importado do Lichess traz este texto, e ele vence o objetivo na tela
              do aluno — sem o campo, corrigir o objetivo não mudava o que o aluno lia. */}
          <label className="flex flex-col gap-1 text-sm text-tinta">Texto de abertura
            <textarea value={treino.introducao ?? ""} onChange={(e) => setTreino({ ...treino, introducao: e.currentTarget.value || undefined })} rows={3} placeholder="Vazio: o aluno lê o objetivo" className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">Explicação ao concluir
            <textarea value={treino.explicacaoConclusao ?? ""} onChange={(e) => setTreino({ ...treino, explicacaoConclusao: e.currentTarget.value || undefined })} rows={3} placeholder="O que o aluno deve entender no fim" className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          {/* Trava 2 de 15/9/2026: o resultado é declarado pelo professor. É por ele que o aluno lê
              "joga a vitória fora" ou "joga o empate fora" num erro conhecido que perde. */}
          <label className="flex flex-col gap-1 text-sm text-tinta">O treino cobra
            <select value={resultadoDoTreinoV2(treino) ?? "win"} onChange={(e) => setTreino({ ...treino, resultado: e.currentTarget.value as "win" | "draw" })} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta">
              <option value="win">Vencer</option>
              <option value="draw">Segurar o empate</option>
            </select>
            <span className="text-xs text-tinta-fraca">Você decide. O motor do editor ajuda a conferir.</span>
          </label>
          <fieldset className="rounded-md border border-borda p-2">
            <legend className="px-1 text-sm font-medium text-tinta">Quando o treino acaba</legend>
            <select value={treino.termino.tipo} onChange={(e) => {
              const tipo = e.currentTarget.value as TreinoV2["termino"]["tipo"];
              setTreino({ ...treino, termino: tipo === "limite" ? { tipo, maxPlies: treino.termino.maxPlies ?? 20 } : { tipo } });
            }} className="foco w-full rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta">
              <option value="objetivo">Pelo objetivo dos ramos</option><option value="mate">Ao dar mate</option><option value="limite">Depois de um número de lances</option>
            </select>
            {treino.termino.tipo === "limite" ? <input aria-label="Máximo de lances, contando os dois lados" type="number" min={1} value={treino.termino.maxPlies ?? 20} onChange={(e) => setTreino({ ...treino, termino: { tipo: "limite", maxPlies: Number(e.currentTarget.value) } })} className="foco mt-2 w-full rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta" /> : null}
          </fieldset>
          <fieldset className="rounded-md border border-borda p-2">
            <legend className="px-1 text-sm font-medium text-tinta">Adversário</legend>
            <select aria-label="Como o adversário escolhe a resposta" value={treino.defensor.politica} onChange={(e) => {
              const politica = e.currentTarget.value as TreinoV2["defensor"]["politica"];
              setTreino({ ...treino, defensor: { politica } });
            }} className="foco w-full rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta">
              <option value="deterministica">Muda de resposta a cada tentativa</option>
              <option value="fixa">Responde sempre igual</option>
            </select>
            <p className="mt-1 text-xs text-tinta-fraca">Só muda algo quando o adversário tem mais de uma resposta.</p>
            {treino.defesaInicial ? (
              <label className="mt-2 flex flex-col gap-1 text-xs text-tinta">O que o aluno lê quando o adversário abre com {treino.defesaInicial.move} (opcional)
                <textarea value={treino.defesaInicial.texto ?? ""} onChange={(e) => { const valor = e.currentTarget.value; setTreino((atual) => atual.defesaInicial ? { ...atual, defesaInicial: { ...atual.defesaInicial, texto: valor || undefined } } : atual); }} rows={2} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
              </label>
            ) : null}
          </fieldset>
          <nav aria-label="Perguntas do treino" className="flex flex-col gap-1">
            {treino.questoes.map((item, indice) => <button key={item.id} type="button" onClick={() => escolherQuestao(item.id)} className={`foco rounded-md border px-2 py-2 text-left text-sm ${item.id === questao.id ? "border-foco bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta"}`}>Pergunta {indice + 1} · {item.respostas.length} resposta{item.respostas.length === 1 ? "" : "s"}</button>)}
          </nav>
          {avisosDeVoz.length ? (
            <section aria-label="Régua de voz" className="rounded-md border border-borda p-2">
              <h3 className="text-sm font-medium text-tinta">Régua de voz: {avisosDeVoz.length} {avisosDeVoz.length === 1 ? "aviso" : "avisos"}</h3>
              <p className="text-xs text-tinta-fraca">O aluno lê estes textos. O aviso não impede salvar.</p>
              <ul className="mt-1 flex flex-col gap-1">
                {avisosDeVoz.map((aviso, indice) => (
                  <li key={`${aviso.onde}-${aviso.regra}-${indice}`} className="text-xs text-tinta-media">
                    <span className="font-medium text-tinta">{aviso.onde.split(" · ").slice(1).join(" · ")}</span>: {aviso.detalhe}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        {/* Um tabuleiro só (revisão de experiência, 14/9/2026): havia a pergunta e a dica em dois tabuleiros
            iguais, o de baixo passava do rodapé, e o código da posição aparecia solto. */}
        <section aria-label={`Pergunta ${indiceQuestao + 1}`} className="flex min-w-0 flex-col gap-2 lg:min-h-0 lg:overflow-y-auto">
          <h3 className="text-sm font-semibold text-tinta">Pergunta {indiceQuestao + 1}</h3>
          <div className="w-full max-w-80">
            <ChessBoard
              key={`dica-${questao.id}`}
              fen={fen}
              orientation={treino.ladoAluno}
              turnColor={toBoardColor(jogo.turn())}
              dests={destinos}
              lastMove={lanceAberto ? [lanceAberto.slice(0, 2) as Key, lanceAberto.slice(2, 4) as Key] : null}
              onMove={jogarNoTabuleiro}
              revision={giroDoTabuleiro}
              desenhavel={{ shapes: desenhoDaAutoriaV2(questao.desenhos), onChange: (formas: DrawShape[]) => atualizarQuestao((atual) => ({ ...atual, desenhos: desenhoDeFormas(formas) })) }}
              espessuraDeDesenhoUniforme
            />
          </div>
          <p className="text-xs text-tinta-fraca">Jogue o lance no tabuleiro: ele entra na resposta aberta, ou vira uma resposta correta nova. Botão direito desenha a dica.</p>
          <button type="button" onClick={() => atualizarQuestao((atual) => ({ ...atual, desenhos: undefined }))} className="foco w-fit rounded-md border border-borda px-2 py-1 text-xs text-tinta">Apagar desenho da dica</button>
          <label className="flex flex-col gap-1 text-sm text-tinta">Dica sob demanda
            <textarea value={questao.dica ?? ""} onChange={(e) => { const valor = e.currentTarget.value; atualizarQuestao((atual) => ({ ...atual, dica: valor || undefined })); }} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
        </section>

        <section ref={listaDeRespostas} aria-label="Respostas da pergunta" className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => adicionarResposta("correta")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Resposta correta</button>
            <button type="button" onClick={() => adicionarResposta("alternativa")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Correta fora do método</button>
            <button type="button" onClick={() => adicionarResposta("erro")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Erro conhecido</button>
          </div>

          {questao.respostas.map((resposta, indice) => {
            const erro = resposta.erroId ? catalogo?.erros.find((item) => item.id === resposta.erroId) : undefined;
            const aberta = resposta.id === respostaAberta;
            return <article key={resposta.id} data-resposta={resposta.id} className={`rounded-md border p-3 ${aberta ? "border-foco" : "border-borda"}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="min-w-0 flex-1 text-sm font-semibold text-tinta">
                  <button type="button" aria-expanded={aberta} onClick={() => setRespostaAberta(aberta ? null : resposta.id)} className="foco flex w-full min-w-0 items-baseline gap-2 rounded-md text-left">
                    <span aria-hidden className="text-xs text-tinta-fraca">{aberta ? "▾" : "▸"}</span>
                    <span className="shrink-0">Resposta {indice + 1}</span>
                    <span className="truncate text-xs font-normal text-tinta-media">{resumoDaResposta(fen, resposta)}</span>
                  </button>
                </h4>
                <button type="button" onClick={() => removerResposta(resposta.id)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Remover</button>
              </div>
              {aberta ? <>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-tinta">Lance(s) no formato de casas, como e2e4, separados por vírgula
                  <input value={resposta.moves.join(", ")} placeholder="Jogue no tabuleiro ou digite" onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => ({ ...atual, moves: movimentos(valor) })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-tinta">Julgamento
                  <select value={resposta.julgamento} onChange={(e) => mudarJulgamento(resposta, e.currentTarget.value as RespostaTreinoV2["julgamento"])} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm"><option value="correta">Correta no método</option><option value="alternativa">Correta fora do método</option><option value="erro">Erro conhecido</option></select>
                </label>
              </div>
              <label className="mt-2 flex flex-col gap-1 text-xs text-tinta">Feedback desta resposta
                <textarea value={resposta.feedback} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => ({ ...atual, feedback: valor })); }} rows={2} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
              </label>
              {resposta.julgamento === "erro" ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-tinta">Nome do erro conhecido
                    <input value={erro?.nome ?? ""} onChange={(e) => { const valor = e.currentTarget.value; setCatalogo((atual) => atual ? ({ ...atual, erros: atual.erros.map((item) => item.id === resposta.erroId ? { ...item, nome: valor } : item) }) : atual); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-tinta">Explicação do erro
                    <textarea value={erro?.texto ?? ""} onChange={(e) => { const valor = e.currentTarget.value; setCatalogo((atual) => atual ? ({ ...atual, erros: atual.erros.map((item) => item.id === resposta.erroId ? { ...item, texto: valor } : item) }) : atual); }} rows={2} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
                  </label>
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-borda-fraca p-2">
                  <label className="flex flex-col gap-1 text-xs text-tinta">Depois desta resposta
                    <select value={resposta.efeito.tipo} onChange={(e) => {
                      const tipo = e.currentTarget.value as RespostaTreinoV2["efeito"]["tipo"];
                      const proxima = treino.questoes[indiceQuestao + 1] ?? treino.questoes[0];
                      const noDocumento = original.questoes.flatMap((item) => item.respostas).find((item) => item.id === resposta.id)?.efeito;
                      atualizarResposta(resposta.id, (atual) => ({ ...atual, efeito: efeitoAoTrocarTipo(tipo, { proximaQuestaoId: proxima.id, original: noDocumento }) }));
                    }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm"><option value="avanca">Adversário responde e avança</option><option value="repete">Aceita e repete esta pergunta</option><option value="encerra">Encerra o ramo</option></select>
                  </label>
                  {resposta.efeito.tipo === "avanca" ? resposta.efeito.defesas.map((defesa, di, defesas) => <div key={`${resposta.id}-${di}`} className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-tinta">Resposta do adversário{defesas.length > 1 ? ` ${di + 1}` : ""}<input value={defesa.move} onChange={(e) => { const valor = e.currentTarget.value.toLowerCase(); atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "avanca" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesas: atual.efeito.defesas.map((item, i) => i === di ? { ...item, move: valor } : item) } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" /></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta">Próxima pergunta<select value={defesa.proximaQuestaoId} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "avanca" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesas: atual.efeito.defesas.map((item, i) => i === di ? { ...item, proximaQuestaoId: valor } : item) } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm">{treino.questoes.map((item, i) => <option key={item.id} value={item.id}>Pergunta {i + 1}</option>)}</select></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta md:col-span-2">O que o aluno lê quando o adversário joga {defesa.move || "este lance"} (opcional)
                      <textarea value={defesa.texto ?? ""} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "avanca" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesas: atual.efeito.defesas.map((item, i) => i === di ? { ...item, texto: valor || undefined } : item) } })); }} rows={2} placeholder="Aparece depois do feedback, só quando o defensor joga este lance" className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
                    </label>
                    {defesas.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                        {di === 0 ? (
                          <span className="text-xs text-tinta-fraca">
                            {treino.defensor.politica === "fixa" ? "Primeira da lista: é a que o defensor joga sempre." : "Primeira da lista; o defensor troca a cada tentativa."}
                          </span>
                        ) : (
                          <button type="button" onClick={() => setTreino((atual) => tornarDefesaFixa(atual, questao.id, resposta.id, di))} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Usar sempre esta</button>
                        )}
                        <button type="button" onClick={() => setTreino((atual) => removerDefesa(atual, questao.id, resposta.id, di))} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Remover defesa {di + 1}</button>
                      </div>
                    ) : null}
                  </div>) : null}
                  {resposta.efeito.tipo === "avanca" ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        aria-expanded={escolhendoFuga === resposta.id}
                        onClick={() => setEscolhendoFuga((atual) => atual === resposta.id ? null : resposta.id)}
                        className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta"
                      >
                        + Outra resposta do adversário
                      </button>
                      <span className="ml-2 text-xs text-tinta-fraca">até {MAXIMO_DE_DEFESAS} por resposta</span>
                      {escolhendoFuga === resposta.id ? (() => {
                        const { fugas, motivo } = fugasDaAnalise(aula, treino, questao.id, resposta.id, positions);
                        return (
                          <div className="mt-2 rounded-md border border-borda-fraca p-2">
                            {motivo ? <p className="text-xs text-tinta-media" role="status">Não há defesa para acrescentar: {motivo}.</p> : (
                              <>
                                <p className="text-xs text-tinta-fraca">Respostas do adversário que o capítulo já tem depois deste lance:</p>
                                <ul className="mt-1 flex flex-wrap gap-2">
                                  {fugas.map((fuga) => (
                                    <li key={fuga.nodeId}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTreino((atual) => acrescentarDefesa(atual, questao.id, resposta.id, fuga, proximoIdDeQuestao(aula, atual, fuga.nodeId)));
                                          setEscolhendoFuga(null);
                                        }}
                                        className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque"
                                      >
                                        Defensor joga {fuga.san} ({fuga.move})
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-1 text-xs text-tinta-fraca">Se a posição depois dela ainda não tem pergunta, uma nova aparece na lista à esquerda, sem resposta: escreva ali o que o aluno joga.</p>
                              </>
                            )}
                          </div>
                        );
                      })() : null}
                    </div>
                  ) : null}
                  {resposta.efeito.tipo === "encerra" ? <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-tinta">Condição final<select value={resposta.efeito.condicao} onChange={(e) => { const valor = e.currentTarget.value as Extract<RespostaTreinoV2["efeito"], { tipo: "encerra" }>["condicao"]; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "encerra" ? atual : ({ ...atual, efeito: { ...atual.efeito, condicao: valor } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm">{Object.entries(NOMES_DO_FIM).filter(([valor]) => valor !== "tablebase-win" || resposta.efeito.tipo === "encerra" && resposta.efeito.condicao === "tablebase-win").map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta">Último lance do adversário (opcional)<input value={resposta.efeito.defesaFinal ?? ""} onChange={(e) => { const valor = e.currentTarget.value.toLowerCase() || undefined; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "encerra" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesaFinal: valor } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" /></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta md:col-span-2">O que o aluno lê quando o adversário fecha com este lance (opcional)
                      <textarea value={resposta.efeito.textoDaDefesaFinal ?? ""} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "encerra" ? atual : ({ ...atual, efeito: { ...atual.efeito, textoDaDefesaFinal: valor || undefined } })); }} rows={2} placeholder="Aparece com a conclusão, depois do feedback" className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
                    </label>
                  </div> : null}
                </div>
              )}
              </> : null}
            </article>;
          })}
        </section>
      </div>
    </Dialogo>
  );
}
