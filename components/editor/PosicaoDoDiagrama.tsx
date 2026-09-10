"use client";

import { useState } from "react";
import { fenProblem, samePosition } from "@/lib/chess/fen";

/**
 * "Que posição este diagrama mostra?" — e ele só existe na **apresentação**.
 *
 * ## Por que só ali
 *
 * Na aula assistida não existe "a posição deste diagrama": os quadros são
 * derivados de UMA posição jogando o roteiro, e trocar a posição de um diagrama
 * do meio seria trocar a aula inteira dali para a frente. Na apresentação cada
 * passo pode carregar a sua (`introPassoSchema.fen`), e o gate a trata como o
 * que ela é — **ilustração**: ninguém joga nela, ela pode ter mais de sete
 * peças de propósito, não vira arquivo de posição e não se consulta a tablebase
 * sobre ela. É essa folga que torna a "galeria" barata: uma aula do que dá mate
 * e do que não dá é uma apresentação de N posições diferentes.
 *
 * **O que nenhuma máquina cobra, e por isso está escrito na tela:** um diagrama
 * tirado de um LIVRO deixa de ser ilustração e vira posição, com os nove campos
 * de proveniência (§7 de `docs/VOZ-DO-CURSO.md`). Quem cobra é o olho do
 * professor, e ele só cobra o que leu.
 *
 * ## Por que uma FEN colada, e não um montador
 *
 * O montador de peças é o Bloco 3. Este atalho existe porque o caminho real do
 * professor já é esse: ele arma a posição no Lichess e copia a FEN de lá. O
 * montador, quando chegar, entra por esta mesma porta — quem grava continua
 * sendo `comFenDoDiagrama`.
 *
 * ## O juízo é o mesmo dos dois lados
 *
 * `fenProblem` é a função que o gate usa (`lib/chess/fen.ts`), rodando aqui
 * antes de gravar. Não é uma segunda validação para divergir da primeira: é a
 * mesma, adiantada — o professor lê "reis adjacentes (c6 e c7)" enquanto digita,
 * em vez de descobrir na conferência. E `samePosition` pega o caso que o gate
 * recusaria por `INTRO_FEN_REDUNDANTE`: mostrar a posição da aula se diz
 * omitindo o campo, não copiando a FEN dela.
 */
export function PosicaoDoDiagrama({
  numero,
  fen,
  fenDaAula,
  aoTrocar,
}: {
  /**
   * O número que o professor vê na coluna — 1 para o primeiro.
   *
   * Quem monta este componente passa `key={numero}`: trocar de diagrama tem de
   * FECHAR o campo, porque o que estava digitado era sobre o outro diagrama, e
   * remontar é como se diz isso em React. Zerar o estado num efeito faria a
   * mesma coisa com um quadro de atraso — e a regra `set-state-in-effect` do
   * lint recusa, com razão.
   */
  numero: number;
  /** A FEN própria deste diagrama, ou `null` quando ele mostra a da aula. */
  fen: string | null;
  /** A posição da aula, para pegar a cópia redundante antes do gate. */
  fenDaAula: string;
  /** `null` devolve o diagrama à posição da aula, omitindo o campo. */
  aoTrocar: (fen: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState("");

  const limpo = rascunho.trim();
  const problema =
    limpo === ""
      ? null
      : (fenProblem(limpo) ??
        (samePosition(limpo, fenDaAula)
          ? 'esta é a própria posição da aula — para mostrá-la, use "voltar à posição da aula"'
          : null));

  function aplicar() {
    if (limpo === "" || problema) return;
    aoTrocar(limpo);
    setAberto(false);
  }

  return (
    <div className="rounded-lg border border-borda-fraca bg-carta px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rotulo text-tinta-fraca">Diagrama {numero}</span>
        <span className="text-tinta-media">
          {fen ? "mostra uma posição própria" : "mostra a posição da aula"}
        </span>

        {!aberto && (
          <button
            type="button"
            onClick={() => {
              setRascunho(fen ?? "");
              setAberto(true);
            }}
            className="foco rotulo underline"
          >
            {fen ? "trocar a posição" : "mostrar outra posição"}
          </button>
        )}

        {fen && (
          <button
            type="button"
            onClick={() => {
              aoTrocar(null);
              setAberto(false);
            }}
            className="foco rotulo underline"
          >
            voltar à posição da aula
          </button>
        )}
      </div>

      {aberto && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex-1 basis-80">
            <span className="sr-only">A FEN da posição do diagrama {numero}</span>
            <input
              type="text"
              autoFocus
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  aplicar();
                }
                // `Escape` fecha sem gravar. Ele não sobe para a janela porque
                // lá em cima ele é da prévia, e fechar as duas com uma tecla
                // faria o professor perder o lugar sem ter pedido.
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setAberto(false);
                }
              }}
              placeholder="cole aqui a FEN da posição"
              spellCheck={false}
              className="foco w-full rounded-md border border-borda bg-carta-alta px-2 py-1 font-mono text-xs"
            />
          </label>
          <button
            type="button"
            onClick={aplicar}
            disabled={limpo === "" || problema !== null}
            className="foco rounded-md border border-borda px-3 py-1 text-sm disabled:opacity-50"
          >
            Usar esta posição
          </button>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="foco rotulo underline"
          >
            cancelar
          </button>

          {problema && (
            <p role="alert" className="w-full text-xs text-erro-tinta">
              Esta posição não serve: {problema}.
            </p>
          )}
          {!problema && (
            <p className="w-full text-xs text-tinta-fraca">
              No Lichess: análise → o campo FEN embaixo do tabuleiro. Se o diagrama vier de um
              livro, ele deixa de ser ilustração e precisa de proveniência.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
