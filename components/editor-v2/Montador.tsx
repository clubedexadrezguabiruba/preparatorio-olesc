"use client";

import { useCallback, useMemo, useState } from "react";
import type { Color, Key, Role } from "@lichess-org/chessground/types";
import { ChessBoard, type ControlesDeMontagem } from "@/components/board/ChessBoard";
import { problemaDaPosicaoMontada } from "@/lib/chess/fen";
import { fenDoMontador, roquesPossiveis, type CamposDaFenV2 } from "@/lib/editor-v2/novo-capitulo";

/**
 * O montador de posição — §9 da especificação funcional.
 *
 * ## Por que ele não tem tabuleiro próprio
 *
 * O `ChessBoard` já sabe montar: `movable.free` deixa a peça ir a qualquer casa,
 * `draggable.deleteOnDropOff` apaga quem sai pela borda, e `events.change`
 * devolve a FEN das peças. Está tudo documentado na prop `montagem` dele desde o
 * bloco B8.4. O que faltava era a **paleta**, e a paleta não é um tabuleiro: é
 * um punhado de peças que começam fora do tabuleiro. O chessground faz esse
 * gesto (`api.dragNewPiece`), e a prop `montagem` passou a entregar o punho.
 *
 * ## O estado mora fora
 *
 * Os seis campos da FEN são do diálogo, não deste componente. É o que permite o
 * professor ir à aba da FEN colada, voltar, e encontrar a posição como deixou —
 * §8.3 manda o erro preservar o que foi digitado, e trocar de porta não pode ser
 * mais destrutivo que errar.
 *
 * ## O que este montador NÃO afirma
 *
 * Que a posição é alcançável a partir do início da partida (§11 do plano final).
 * Ele confere sintaxe e coerência entre os campos — um rei de cada cor, reis não
 * adjacentes, o lado fora da vez sem xeque impossível, roque com rei e torre em
 * casa, en passant com o peão que passou. Só isso, e isso ele prova.
 */

/**
 * Os seis campos da FEN, separados. O tipo mora em `novo-capitulo.ts`, junto de
 * `fenDoMontador` e `camposDaFen`, que são os dois caminhos entre ele e a FEN
 * inteira; aqui fica só o nome pelo qual a tela o conhece.
 */
export type CamposDaMontagem = CamposDaFenV2;

export const PECAS_VAZIAS = "8/8/8/8/8/8/8/8";
export const PECAS_INICIAIS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

export const MONTAGEM_INICIAL: CamposDaMontagem = {
  pecas: PECAS_INICIAIS,
  vez: "w",
  roques: { K: true, Q: true, k: true, q: true },
  enPassant: "",
  meiosLances: 0,
  lance: 1,
};

/**
 * O nome de cada peça e o gênero dele, porque o rótulo acessível é lido em voz
 * alta: "dama preto" é o tipo de detalhe que só quem usa leitor de tela paga.
 */
const PECAS_DA_PALETA: Array<{ role: Role; nome: string; genero: "m" | "f" }> = [
  { role: "king", nome: "rei", genero: "m" },
  { role: "queen", nome: "dama", genero: "f" },
  { role: "rook", nome: "torre", genero: "f" },
  { role: "bishop", nome: "bispo", genero: "m" },
  { role: "knight", nome: "cavalo", genero: "m" },
  { role: "pawn", nome: "peão", genero: "m" },
];

const COR_NO_MASCULINO: Record<Color, string> = { white: "branco", black: "preto" };
const COR_NO_FEMININO: Record<Color, string> = { white: "branca", black: "preta" };

export function Montador({
  campos,
  orientacao,
  aoTrocar,
  aoVirar,
}: {
  campos: CamposDaMontagem;
  orientacao: Color;
  aoTrocar: (campos: CamposDaMontagem) => void;
  aoVirar: () => void;
}) {
  const [controles, setControles] = useState<ControlesDeMontagem | null>(null);
  /** A peça escolhida na paleta para o caminho sem arrasto. `"apagar"` é a borracha. */
  const [armada, setArmada] = useState<{ role: Role; color: Color } | "apagar" | null>(null);

  /**
   * Cada mudança de peça reavalia os roques: arrastar a torre de h1 para fora
   * torna o roque curto impossível, e deixar a caixinha marcada produziria uma
   * recusa que a tela já sabia evitar. Desmarcar sozinho é honesto — a marca
   * dizia uma coisa que deixou de ser verdade.
   */
  const trocarPecas = useCallback((pecas: string) => {
    const possiveis = roquesPossiveis(pecas);
    aoTrocar({
      ...campos,
      pecas,
      roques: {
        K: campos.roques.K && possiveis.K,
        Q: campos.roques.Q && possiveis.Q,
        k: campos.roques.k && possiveis.k,
        q: campos.roques.q && possiveis.q,
      },
    });
  }, [aoTrocar, campos]);

  const montagem = useMemo(
    () => ({ onChange: trocarPecas, aoLigar: setControles }),
    [trocarPecas],
  );

  const aoTocarNaCasa = useCallback((casa: Key) => {
    if (!armada || !controles) return;
    controles.porPeca(armada === "apagar" ? null : armada, casa);
    // A escolha continua armada: pôr seis peões exige seis cliques, não doze.
  }, [armada, controles]);

  const possiveis = roquesPossiveis(campos.pecas);
  const fen = fenDoMontador(campos);
  const problema = problemaDaPosicaoMontada(fen);

  const paleta = (color: Color) => (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Peças ${COR_NO_FEMININO[color]}s`}>
      {PECAS_DA_PALETA.map(({ role, nome, genero }) => {
        const escolhida = armada !== null && armada !== "apagar" && armada.role === role && armada.color === color;
        return (
          <button
            key={`${color}-${role}`}
            type="button"
            aria-label={`${nome} ${(genero === "f" ? COR_NO_FEMININO : COR_NO_MASCULINO)[color]}`}
            aria-pressed={escolhida}
            title={`Arraste para o tabuleiro, ou clique aqui e depois na casa`}
            onMouseDown={(evento) => {
              // `preventDefault` para o navegador não iniciar a sua própria
              // seleção de texto por cima do arrasto do chessground.
              evento.preventDefault();
              controles?.arrastarNovaPeca({ role, color }, evento.nativeEvent);
            }}
            onTouchStart={(evento) => controles?.arrastarNovaPeca({ role, color }, evento.nativeEvent)}
            onClick={() => setArmada(escolhida ? null : { role, color })}
            className={`cg-wrap paleta-de-pecas foco h-10 w-10 shrink-0 cursor-grab rounded border ${
              escolhida ? "border-foco bg-metodo-superficie/20" : "border-borda-fraca hover:bg-carta-toque"
            }`}
          >
            {/* O `<piece>` é escrito como HTML cru, e não por `createElement`,
                porque o React reclama no console de uma etiqueta que ele não
                conhece ("The tag <piece> is unrecognized in this browser") — e
                console vermelho ensina a ignorar console. O conteúdo aqui é
                constante: `role` e `color` vêm de duas listas fechadas deste
                arquivo, nunca de texto do professor. */}
            <span className="block h-full w-full" dangerouslySetInnerHTML={{ __html: `<piece class="${role} ${color}"></piece>` }} />
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={armada === "apagar"}
        onClick={() => setArmada(armada === "apagar" ? null : "apagar")}
        className={`foco h-10 rounded border px-2 text-xs ${
          armada === "apagar" ? "border-foco bg-metodo-superficie/20 text-metodo-tinta-alta" : "border-borda-fraca text-tinta hover:bg-carta-toque"
        }`}
      >
        Apagar casa
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-tinta-fraca">
        Arraste as peças da paleta para o tabuleiro, mova-as livremente e arraste para fora
        para remover. Sem arrastar: clique na peça e depois na casa.
      </p>

      {paleta(orientacao === "white" ? "black" : "white")}

      <div className="mx-auto w-full max-w-[22rem]">
        <ChessBoard
          fen={campos.pecas}
          orientation={orientacao}
          montagem={montagem}
          onSelect={aoTocarNaCasa}
        />
      </div>

      {paleta(orientacao)}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => trocarPecas(PECAS_VAZIAS)} className="foco rounded border border-borda px-2 py-1 text-tinta hover:bg-carta-toque">Limpar</button>
        <button type="button" onClick={() => aoTrocar({ ...MONTAGEM_INICIAL })} className="foco rounded border border-borda px-2 py-1 text-tinta hover:bg-carta-toque">Posição inicial</button>
        <button type="button" onClick={aoVirar} className="foco rounded border border-borda px-2 py-1 text-tinta hover:bg-carta-toque">Virar tabuleiro</button>
        <span className="ml-2 flex items-center gap-2 text-tinta-fraca">
          Joga:
          {(["w", "b"] as const).map((lado) => (
            <label key={lado} className="flex items-center gap-1 text-tinta">
              <input
                type="radio"
                name="montador-vez"
                checked={campos.vez === lado}
                onChange={() => aoTrocar({ ...campos, vez: lado, enPassant: "" })}
                className="foco"
              />
              {lado === "w" ? "brancas" : "pretas"}
            </label>
          ))}
        </span>
      </div>

      {/* As opções avançadas ficam fechadas porque a maioria das posições de
          final não usa nenhuma delas — e um formulário que começa com seis
          campos técnicos abertos ensina o professor a fechar a janela. */}
      <details className="rounded-md border border-borda-fraca p-2 text-xs">
        <summary className="foco cursor-pointer text-tinta">Opções avançadas — roques, en passant e contadores</summary>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-tinta-fraca">Roques ainda possíveis:</span>
            {([
              ["K", "brancas, curto"],
              ["Q", "brancas, longo"],
              ["k", "pretas, curto"],
              ["q", "pretas, longo"],
            ] as const).map(([letra, rotulo]) => (
              <label key={letra} className={`flex items-center gap-1 ${possiveis[letra] ? "text-tinta" : "text-tinta-fraca"}`}>
                <input
                  type="checkbox"
                  checked={campos.roques[letra]}
                  disabled={!possiveis[letra]}
                  onChange={(evento) => aoTrocar({ ...campos, roques: { ...campos.roques, [letra]: evento.currentTarget.checked } })}
                  className="foco"
                />
                {rotulo}
                {possiveis[letra] ? null : <span className="text-tinta-fraca"> (sem rei e torre em casa)</span>}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-tinta">
            Casa de en passant
            <input
              type="text"
              value={campos.enPassant}
              onChange={(evento) => aoTrocar({ ...campos, enPassant: evento.currentTarget.value.trim().toLowerCase() })}
              placeholder={campos.vez === "w" ? "ex.: e6" : "ex.: e3"}
              spellCheck={false}
              className="foco w-20 rounded border border-borda bg-papel px-2 py-1 font-mono"
            />
            <span className="text-tinta-fraca">vazio = nenhuma</span>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-tinta">
            <label className="flex items-center gap-2">
              Meios-lances desde captura ou lance de peão
              <input type="number" min={0} value={campos.meiosLances} onChange={(evento) => aoTrocar({ ...campos, meiosLances: Math.max(0, Number(evento.currentTarget.value) || 0) })} className="foco w-20 rounded border border-borda bg-papel px-2 py-1" />
            </label>
            <label className="flex items-center gap-2">
              Número do lance
              <input type="number" min={1} value={campos.lance} onChange={(evento) => aoTrocar({ ...campos, lance: Math.max(1, Number(evento.currentTarget.value) || 1) })} className="foco w-20 rounded border border-borda bg-papel px-2 py-1" />
            </label>
          </div>
        </div>
      </details>

      <p className={`text-xs ${problema ? "text-erro-texto" : "text-tinta-fraca"}`}>
        {problema ? `Esta posição ainda não serve: ${problema}.` : "Posição válida."}
        {" "}
        <code className="font-mono">{fen}</code>
      </p>
    </div>
  );
}
