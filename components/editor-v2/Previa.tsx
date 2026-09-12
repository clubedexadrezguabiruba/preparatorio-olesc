"use client";

import { useMemo, useRef, useState } from "react";
import { ObjectiveStage } from "@/components/lesson/ObjectiveStage";
import { desenhoDaAutoriaV2 } from "@/lib/chess/annotations";
import { pausaDoPasso } from "@/lib/lesson/roteiro";
import type { ObjectiveStage as ObjectiveStageData, Position, RoteiroPasso } from "@/lib/lesson/schema";
import {
  animacaoDaPrevia,
  pausaDaPrevia,
  VELOCIDADES,
  type Previa as PreviaV2,
  type Velocidade,
} from "@/lib/editor-v2/previa";
import { usePrisaoDeFoco } from "./foco";

/**
 * A prévia do Editor v2 — §15.
 *
 * ## O que este arquivo **não** faz
 *
 * Ele não toca a aula. O player é o do aluno (`ObjectiveStage`), o relógio de leitura é
 * o do aluno (`pausaDoPasso`), o tabuleiro é o do aluno e o palco é o do aluno. §15.1 é
 * um requisito literal — *"usa o mesmo runtime do aluno, nunca um segundo player
 * aproximado"* —, e a razão dele é simples: um segundo player seria consertado uma vez
 * e divergiria da aula na segunda.
 *
 * O que este arquivo faz é a **moldura**: qual trecho está tocando, a barra de
 * controles de §15.2, e a passagem de um capítulo ao seguinte.
 *
 * ## Isolada da autoria, e sem gravar nada
 *
 * §15.1 pede três isolamentos, e os três são baratos aqui:
 *
 * - **da seleção e do Undo**: a prévia recebe um `Previa` já calculado do documento de
 *   agora e não tem como escrever nele — não há comando, não há `aplicar`;
 * - **do progresso**: o `onStageDone` do runtime do aluno simplesmente não é passado.
 *   Não existe caminho daqui até `registrarEtapa`;
 * - **do contexto**: fechar devolve o foco ao botão que abriu, e o editor atrás não
 *   mudou de capítulo nem de lance enquanto isso.
 *
 * ## Por que a tela inteira, e não uma janela
 *
 * O palco da aula (`.aula-palco`) é dimensionado pela **altura da janela**, e a
 * promessa dele é rolagem zero. Espremido dentro do casco do `Dialogo` — que é
 * centrado, rola por dentro e tem rodapé grudado — o professor veria um palco que o
 * aluno nunca vê. O contrato de teclado é o mesmo (`foco.ts`); o casco é outro.
 */
export function Previa({ previa, aoFechar }: { previa: PreviaV2; aoFechar: () => void }) {
  const camada = useRef<HTMLDivElement>(null);
  usePrisaoDeFoco(camada, aoFechar);

  const [indice, setIndice] = useState(0);
  const [velocidade, setVelocidade] = useState<Velocidade>(1);
  /** Sobe a cada "Reiniciar": é o que faz o player voltar ao primeiro passo por `key`. */
  const [rodada, setRodada] = useState(0);

  const trecho = previa.trechos[indice];
  const total = previa.trechos.length;

  const resumo = useMemo(() => {
    if (!trecho) return "";
    if (trecho.comparacao) {
      return `A alternativa a «${trecho.comparacao.comTitulo}», a partir de ${trecho.comparacao.rotulo}.`;
    }
    return total > 1 ? `Capítulo ${indice + 1} de ${total}` : "";
  }, [trecho, indice, total]);

  const stage = useMemo(() => {
    if (!trecho) return null;
    return {
      technique: { name: trecho.titulo, summary: resumo },
      roteiro: trecho.passos.map((passo) => ({ fala: passo.fala, lance: passo.lance }) as RoteiroPasso),
    } as unknown as ObjectiveStageData;
  }, [trecho, resumo]);

  const position = useMemo(() => ({ fen: trecho?.fen ?? "" }) as unknown as Position, [trecho?.fen]);

  const irParaTrecho = (n: number) => {
    setIndice(Math.min(Math.max(n, 0), total - 1));
    setRodada((r) => r + 1);
  };

  const contrato = useMemo(() => {
    if (!trecho) return undefined;
    return {
      relogio: (n: number) => {
        const passo = trecho.passos[n];
        if (!passo) return null;
        // A régua de leitura é a do aluno, e é passada por dentro em vez de copiada:
        // §15.2 manda que a velocidade **não** a comprima, e uma segunda cópia dela
        // divergiria no dia em que a primeira fosse calibrada.
        return pausaDaPrevia(passo, velocidade, (fala) => pausaDoPasso({ fala } as RoteiroPasso));
      },
      autoria: (n: number) => desenhoDaAutoriaV2(trecho.passos[n]?.desenhos),
      animacaoMs: animacaoDaPrevia(velocidade),
      aoTerminar: () => {
        if (indice + 1 < total) irParaTrecho(indice + 1);
      },
      controles: (api: {
        passo: number;
        total: number;
        tocando: boolean;
        alternar: () => void;
        irPara: (passo: number) => void;
        reiniciar: () => void;
      }) => (
        <BarraDaPrevia
          api={api}
          manual={Boolean(trecho.passos[api.passo]?.pausaManual)}
          temAnterior={api.passo > 0 || indice > 0}
          temSeguinte={api.passo < api.total - 1 || indice + 1 < total}
          velocidade={velocidade}
          aoTrocarVelocidade={setVelocidade}
          aoVoltar={() => (api.passo > 0 ? api.irPara(api.passo - 1) : irParaTrecho(indice - 1))}
          aoAvancar={() => (api.passo < api.total - 1 ? api.irPara(api.passo + 1) : irParaTrecho(indice + 1))}
          aoReiniciarTudo={() => irParaTrecho(0)}
        />
      ),
    };
    // `irParaTrecho` é estável o bastante para o que ela faz aqui, e incluí-la na lista
    // recriaria o contrato a cada render — o que reinstalaria o relógio do player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trecho, velocidade, indice, total]);

  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label={`Prévia: ${previa.rotulo}`} className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-tinta">Prévia — {previa.rotulo}</p>
          {/* §15.1 e §20.2: a prévia não grava tentativa. Dizer isso na tela evita a
              pergunta que o professor faria depois, quando não desse para desfazer. */}
          <p className="text-xs text-tinta-fraca">É o que o aluno vê. Nada aqui é gravado no progresso, e a aula atrás não muda.</p>
        </div>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">
          Fechar prévia
        </button>
      </header>

      <div className="min-h-0 flex-1">
        {stage && trecho && trecho.passos.length > 0 && contrato ? (
          <ObjectiveStage
            // O `key` troca o capítulo **e** conta a rodada: sem a contagem, "Reiniciar"
            // no primeiro capítulo não devolveria o player ao primeiro passo.
            key={`${trecho.capituloId}-${rodada}`}
            stage={stage}
            position={position}
            orientation={trecho.orientacao}
            previa={contrato}
          />
        ) : (
          <p className="p-8 text-center text-sm text-tinta-media">
            Não há nada para reproduzir: este capítulo ainda não tem lance nem narração. Escreva uma
            narração na posição inicial, ou acrescente um lance ao percurso.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Os controles de §15.2, e só eles.
 *
 * O botão de **Continuar** aparece no lugar do play quando o professor marcou a pausa
 * manual naquela narração: ali quem anda é ele, e um ⏵ ao lado de uma aula que não anda
 * seria um botão que parece quebrado.
 */
function BarraDaPrevia({ api, manual, temAnterior, temSeguinte, velocidade, aoTrocarVelocidade, aoVoltar, aoAvancar, aoReiniciarTudo }: {
  api: { passo: number; total: number; tocando: boolean; alternar: () => void; reiniciar: () => void };
  manual: boolean;
  temAnterior: boolean;
  temSeguinte: boolean;
  velocidade: Velocidade;
  aoTrocarVelocidade: (v: Velocidade) => void;
  aoVoltar: () => void;
  aoAvancar: () => void;
  aoReiniciarTudo: () => void;
}) {
  const botao = "foco rounded-md border border-borda px-2 py-1.5 text-xs text-tinta hover:bg-carta-toque disabled:opacity-40";
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {manual ? (
        <button type="button" onClick={aoAvancar} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie px-3 py-1.5 text-xs text-metodo-tinta-alta">
          Continuar
        </button>
      ) : (
        <button type="button" onClick={api.alternar} className={botao} aria-pressed={api.tocando}>
          {api.tocando ? "⏸ Pausar" : "⏵ Reproduzir"}
        </button>
      )}
      <button type="button" onClick={aoVoltar} disabled={!temAnterior} className={botao}>◀ Voltar</button>
      <button type="button" onClick={aoAvancar} disabled={!temSeguinte} className={botao}>Avançar ▶</button>
      <button type="button" onClick={api.reiniciar} className={botao}>↻ Repetir capítulo</button>
      <button type="button" onClick={aoReiniciarTudo} className={botao}>⏮ Reiniciar</button>

      <div role="group" aria-label="Velocidade" className="ml-auto flex items-center gap-1">
        {VELOCIDADES.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={velocidade === v}
            onClick={() => aoTrocarVelocidade(v)}
            className={`foco rounded-md border px-2 py-1.5 text-xs ${velocidade === v ? "border-tinta text-tinta" : "border-borda text-tinta-fraca hover:bg-carta-toque"}`}
          >
            {v === 0.5 ? "0,5×" : `${v}×`}
            {velocidade === v ? <span aria-hidden> ✓</span> : null}
          </button>
        ))}
      </div>

      <p className="w-full text-xs text-tinta-fraca">
        Passo {api.passo + 1} de {api.total}. A velocidade muda o movimento e o intervalo; o tempo de
        leitura da narração continua o do aluno.
      </p>
    </div>
  );
}
