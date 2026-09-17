"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { aulaComoAlunoV2Acao } from "@/app/editor/v2/acoes";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { formatarDuracao, gastoAte, iniciarRelogio, resumoDaAulaComoAluno, trocarEtapa, type ResumoDaAulaComoAluno } from "@/lib/editor-v2/aula-como-aluno";
import type { AulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import { useLessonStore } from "@/lib/lesson/store";
import { usePrisaoDeFoco } from "./foco";

/**
 * "Fazer a aula inteira como aluno" — pedido do Doug no teste humano de 14/9/2026 (§15.1).
 *
 * ## A aula de verdade, e nada gravado
 *
 * O servidor monta a aula **da tela** como a publicação montaria e a traduz pela mesma função que
 * serve o aluno (`aulaComoAlunoV2Acao`); aqui ela toca no `LessonPlayer` do aluno, com introdução,
 * capítulos, treinos e prática. O player recebe **nenhum** gancho de gravação (`onEtapaFeita`), e o
 * resumo lê o que foi jogado da própria store. Nenhuma tentativa chega ao banco — uma aula não
 * publicada não pode deixar progresso.
 *
 * ## O relógio
 *
 * A etapa aberta vem da store do aluno; cada troca fecha o tempo da anterior
 * (`lib/editor-v2/aula-como-aluno.ts`). No fim — ou quando o professor quiser — o resumo mostra o
 * tempo de cada etapa, a tentativa de cada treino e prática, e o total.
 *
 * ## Sair
 *
 * `Esc` e "← Sair da aula" levam ao resumo, e não direto ao editor: no meio de uma prática, uma
 * tecla não pode jogar fora o tempo medido. Do resumo dá para continuar de onde parou.
 */
export function AulaComoAluno({ aulaId, documento, podePublicar, aoTerminar, aoFechar, aoPublicar, textoDeVolta = "Voltar ao editor", aviso }: {
  aulaId: string;
  /** "Assistir como aluno", da lista de aulas (16/9/2026): a volta é para a lista, não para o editor. */
  textoDeVolta?: string;
  /** Uma linha no cabeçalho — hoje, o aviso de mudanças ainda não publicadas. */
  aviso?: ReactNode;
  documento: AulaV2;
  /** A conferência verde é deste mesmo documento: o resumo pode oferecer "Publicar agora". */
  podePublicar: boolean;
  aoTerminar: (resumo: ResumoDaAulaComoAluno) => void;
  aoFechar: () => void;
  aoPublicar: () => void;
}) {
  const [aula, setAula] = useState<AulaDoAlunoV2 | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoDaAulaComoAluno | null>(null);
  const [parcialDoRelogio, setParcialDoRelogio] = useState<ResumoDaAulaComoAluno | null>(null);
  const relogio = useRef(iniciarRelogio());
  const camada = useRef<HTMLDivElement>(null);

  const stage = useLessonStore((s) => s.stage);
  const lessonId = useLessonStore((s) => s.lessonId);
  const trees = useLessonStore((s) => s.trees);
  const practices = useLessonStore((s) => s.practices);

  // A aula é montada uma vez, com o documento de quando a tela abriu.
  const documentoDaAbertura = useRef(documento);
  useEffect(() => {
    let ativo = true;
    aulaComoAlunoV2Acao(aulaId, JSON.stringify(documentoDaAbertura.current))
      .then((resposta) => {
        if (!ativo) return;
        // Um id de publicação próprio por abertura: a store do aluno recomeça do zero a cada vez.
        if (resposta.ok) setAula({ ...resposta.aula, publicationId: `como-aluno-${Date.now()}` });
        else setFalha(resposta.motivo);
      })
      .catch(() => { if (ativo) setFalha("o servidor não respondeu — tente de novo"); });
    return () => {
      ativo = false;
      useLessonStore.setState({ lessonId: null, trees: {}, practices: {}, message: null });
    };
  }, [aulaId]);

  const idNaStore = aula ? `${aula.id}@${aula.publicationId}` : null;
  const tocando = aula !== null && lessonId === idNaStore && resumo === null;

  // Cada troca de etapa fecha o tempo da anterior.
  useEffect(() => {
    if (tocando && stage) relogio.current = trocarEtapa(relogio.current, stage, Date.now());
  }, [stage, tocando]);

  const montarResumo = useCallback((momento: number): ResumoDaAulaComoAluno | null => {
    if (!aula) return null;
    const jogadas: Record<string, { tentativas: number; concluida: boolean }> = {};
    for (const etapa of aula.etapas) {
      const arvore = etapa.tipo === "treino" ? trees[etapa.id] : undefined;
      const partida = etapa.tipo === "pratica" ? practices[etapa.id] : undefined;
      if (arvore) jogadas[etapa.id] = { tentativas: arvore.attempt, concluida: arvore.status === "done" };
      if (partida) jogadas[etapa.id] = { tentativas: partida.attempt, concluida: partida.status === "passed" };
    }
    return resumoDaAulaComoAluno(aula.etapas, gastoAte(relogio.current, momento), jogadas);
  }, [aula, practices, trees]);

  const parar = useCallback(() => {
    if (resumo || !aula) { aoFechar(); return; }
    const momento = Date.now();
    const feito = montarResumo(momento);
    if (!feito) { aoFechar(); return; }
    // Pausa o relógio: a etapa aberta fecha aqui, e "Continuar" reabre a contagem.
    relogio.current = { atual: null, desde: 0, gasto: gastoAte(relogio.current, momento) };
    setResumo(feito);
    aoTerminar(feito);
  }, [aoFechar, aoTerminar, aula, montarResumo, resumo]);

  const continuar = () => {
    setResumo(null);
    if (stage) relogio.current = trocarEtapa(relogio.current, stage, Date.now());
  };

  const camadaDeAtalhos = usePrisaoDeFoco(camada, parar);

  // O relógio da barra anda de segundo em segundo enquanto a aula toca.
  useEffect(() => {
    if (!tocando) return;
    const intervalo = setInterval(() => setParcialDoRelogio(montarResumo(Date.now())), 1000);
    return () => clearInterval(intervalo);
  }, [montarResumo, tocando]);
  const parcial = tocando ? parcialDoRelogio : null;

  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label="Fazer a aula inteira como aluno" className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-tinta">Fazendo a aula como aluno</p>
          <p className="text-xs text-tinta-fraca">A aula que está no editor agora, do jeito que o aluno vai fazer. Nada é gravado no progresso.</p>
          {aviso}
        </div>
        <div className="flex items-center gap-3">
          {parcial ? (
            <span className="font-mono text-sm text-tinta" aria-label={`Tempo até agora: ${formatarDuracao(parcial.totalMs)}`}>⏱ {formatarDuracao(parcial.totalMs)}</span>
          ) : null}
          {resumo ? null : (
            <button
              type="button"
              onClick={parar}
              className={`foco rounded-md px-3 py-2 text-sm ${parcial?.concluida ? "border border-metodo-superficie bg-metodo-superficie/25 font-medium text-metodo-tinta-alta" : "border border-borda text-tinta hover:bg-carta-toque"}`}
            >
              {parcial?.concluida ? "✓ Aula concluída — ver o tempo" : "Terminar e ver o tempo"}
            </button>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {/* O player continua montado **e visível** atrás do resumo: "Continuar" volta exatamente onde
            parou, e um tabuleiro escondido (`display: none`) desenharia a seta com tamanho zero — "NaN"
            no console, medido no ensaio. `inert` tira o player do teclado e do leitor de tela. */}
        {aula && !falha ? (
          <div inert={resumo !== null} className="flex h-full flex-col overflow-y-auto p-4">
            <LessonPlayer aulaV2={aula} aoSair={parar} camadaDeAtalhos={camadaDeAtalhos} />
          </div>
        ) : null}
        {falha ? (
          <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
            <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">Não deu para abrir a aula como aluno: {falha}.</p>
            <button type="button" onClick={aoFechar} className="foco w-fit rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">{textoDeVolta}</button>
          </div>
        ) : !aula ? (
          <p role="status" className="p-4 text-sm text-tinta-media">Montando a aula…</p>
        ) : resumo ? (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-papel p-4">
            <ResumoDaAula resumo={resumo} podePublicar={podePublicar} aoContinuar={continuar} aoFechar={aoFechar} aoPublicar={aoPublicar} textoDeVolta={textoDeVolta} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const SITUACAO: Record<ResumoDaAulaComoAluno["linhas"][number]["situacao"], string> = {
  concluida: "concluída",
  "nao-concluida": "não concluída",
  vista: "vista",
  "nao-visitada": "não aberta",
};

function ResumoDaAula({ resumo, podePublicar, aoContinuar, aoFechar, aoPublicar, textoDeVolta }: {
  resumo: ResumoDaAulaComoAluno;
  textoDeVolta: string;
  podePublicar: boolean;
  aoContinuar: () => void;
  aoFechar: () => void;
  aoPublicar: () => void;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  return (
    <section aria-labelledby="resumo-como-aluno" className="mx-auto flex max-w-xl flex-col gap-4">
      <h2 id="resumo-como-aluno" ref={titulo} tabIndex={-1} className="text-base font-semibold text-tinta">
        {resumo.concluida ? "Aula concluída" : "Aula interrompida"} em {formatarDuracao(resumo.totalMs)}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borda-fraca text-left text-xs text-tinta-fraca">
            <th className="py-1 font-normal">Etapa</th>
            <th className="py-1 font-normal">Tempo</th>
            <th className="py-1 font-normal">Situação</th>
          </tr>
        </thead>
        <tbody>
          {resumo.linhas.map((linha) => (
            <tr key={linha.etapaId} className="border-b border-borda-fraca">
              <td className="py-1.5 text-tinta">{linha.rotulo}</td>
              <td className="py-1.5 font-mono text-tinta">{formatarDuracao(linha.ms)}</td>
              <td className={`py-1.5 ${linha.situacao === "nao-concluida" || linha.situacao === "nao-visitada" ? "text-aviso-tinta" : "text-tinta-media"}`}>
                {SITUACAO[linha.situacao]}
                {linha.tentativas ? ` · ${linha.tentativas === 1 ? "1.ª tentativa" : `${linha.tentativas} tentativas`}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-1.5 font-medium text-tinta">Total</td>
            <td className="py-1.5 font-mono font-medium text-tinta">{formatarDuracao(resumo.totalMs)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-tinta-fraca">O tempo é o que cada etapa ficou aberta. Nada disso foi gravado.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={aoContinuar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Continuar de onde parei</button>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">{textoDeVolta}</button>
        {podePublicar ? (
          <button type="button" onClick={aoPublicar} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta">Publicar agora</button>
        ) : null}
      </div>
    </section>
  );
}
