"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { applyUci } from "@/lib/chess/fen";
import type { Momento } from "@/lib/partidas/momentos";
import { sanEmPortugues } from "@/lib/repertorio/treino";
import { playForMove, playRefusal, playSuccess } from "@/lib/sound";

/**
 * **TESTE.** Um momento de decisão: a posição, a pergunta, um lance.
 *
 * ## O que este componente decidiu, e por quê
 *
 * **O título do momento não aparece antes.** A ficha os escreve para o
 * professor — "Roque como lance de ataque", "Remover o bloqueador" — e vários
 * entregam a resposta em três palavras. Ele entra depois de resolvido, onde
 * vira o nome da ideia que o aluno acabou de encontrar.
 *
 * **O erro não avança.** É o contrário do treinador de repertório, e de
 * propósito: lá a linha inteira é o exercício, e parar no meio quebraria a
 * passada; aqui o exercício **é** este lance. O que muda a cada erro é o
 * tamanho da ajuda — primeiro o texto de "feedback para erro típico" da ficha,
 * depois a casa de origem acesa, e o botão de revelar sempre à mão.
 *
 * **O acerto conta só de primeira.** É o único número honesto: acertar depois
 * de ler o feedback é ter entendido o feedback, o que é ótimo e não é a mesma
 * coisa.
 */

/** A partir de quantos erros a casa de origem acende sozinha. */
const ERROS_ATE_A_DICA = 2;

export type Placar = { acertouDePrimeira: boolean; erros: number; revelou: boolean };

export function Desafio({
  momento,
  aoResolver,
}: {
  momento: Momento;
  aoResolver: (placar: Placar) => void;
}) {
  const [erros, setErros] = useState(0);
  const [revelou, setRevelou] = useState(false);
  const [resolvido, setResolvido] = useState(false);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);
  const [marca, setMarca] = useState<{ casa: string; qual: "acerto" | "falha" } | null>(null);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  const [ressincronizar, setRessincronizar] = useState(0);
  /** A posição na tela. Muda uma vez: quando o lance certo entra. */
  const [fen, setFen] = useState(momento.fen);
  const [feito, setFeito] = useState<[string, string] | null>(null);

  const jogo = useMemo(() => new Chess(fen), [fen]);
  const meuLado = momento.lado === "brancas" ? "white" : "black";

  const responder = useCallback(
    (uci: string) => {
      if (resolvido) return;

      if (uci !== momento.uci) {
        const prova = new Chess(momento.fen);
        let comoSan: string | null = null;
        try {
          comoSan = prova.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci.slice(4) : undefined,
          }).san;
        } catch {
          comoSan = null;
        }
        setErros((n) => n + 1);
        setUltimoErro(comoSan);
        setMarca({ casa: uci.slice(2, 4), qual: "falha" });
        // A peça volta: a posição da pergunta é a que tem de ficar na tela.
        setRessincronizar((n) => n + 1);
        playRefusal();
        return;
      }

      const depois = applyUci(momento.fen, uci);
      // Impossível por construção: `lib/partidas/momentos.ts` aplica os 28
      // lances na importação, e um que não entrasse derrubaria a build.
      if (!depois) return;

      setFen(depois.fen);
      setFeito([uci.slice(0, 2), uci.slice(2, 4)]);
      setMarca({ casa: uci.slice(2, 4), qual: "acerto" });
      setResolvido(true);
      const lance = depois.game.history({ verbose: true }).at(-1);
      const limpo = erros === 0 && !revelou;
      if (limpo) playSuccess();
      else playForMove({ capture: Boolean(lance?.captured), check: depois.game.inCheck() });
      aoResolver({ acertouDePrimeira: limpo, erros, revelou });
    },
    [aoResolver, erros, momento.fen, momento.uci, resolvido, revelou],
  );

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      if (resolvido) {
        setRessincronizar((n) => n + 1);
        return;
      }
      const peca = jogo.get(orig as Square);
      if (peca?.type === "p" && (dest[1] === "8" || dest[1] === "1")) {
        setPromocao({ orig, dest });
        return;
      }
      responder(`${orig}${dest}`);
    },
    [jogo, responder, resolvido],
  );

  const shapes: DrawShape[] = useMemo(() => {
    const lista: DrawShape[] = [];
    const orig = momento.uci.slice(0, 2) as Key;
    if (!resolvido && revelou) {
      lista.push({ orig, dest: momento.uci.slice(2, 4) as Key, brush: "blue" });
    } else if (!resolvido && erros >= ERROS_ATE_A_DICA) {
      // Um nível só: a casa de origem, que é a pergunta "qual peça?". A seta
      // inteira daria o lance — mesma regra da dica do repertório.
      lista.push({ orig, brush: "blue" });
    }
    if (marca) {
      lista.push({ orig: marca.casa as Key, brush: marca.qual === "acerto" ? "green" : "red" });
    }
    return lista;
  }, [erros, marca, momento.uci, resolvido, revelou]);

  return (
    <div className="flex flex-col gap-3">
      <p className="cartao px-4 py-3 text-sm text-tinta">
        {momento.pergunta}
      </p>

      <div className="relative">
        <ChessBoard
          fen={fen}
          orientation={meuLado}
          turnColor={toBoardColor(jogo.turn())}
          dests={resolvido ? new Map() : legalDests(jogo)}
          lastMove={feito ? [feito[0] as Key, feito[1] as Key] : null}
          check={jogo.inCheck()}
          viewOnly={resolvido}
          revision={ressincronizar}
          shapes={shapes}
          onMove={aoMover}
        />
        {promocao ? (
          <PromotionPicker
            color={meuLado}
            onChoose={(peca: PromotionChoice) => {
              const { orig, dest } = promocao;
              setPromocao(null);
              responder(`${orig}${dest}${peca}`);
            }}
            onCancel={() => {
              setPromocao(null);
              setRessincronizar((n) => n + 1);
            }}
          />
        ) : null}
      </div>

      {resolvido ? (
        <div className="flex flex-col gap-2 cartao px-4 py-3">
          <p className="text-sm font-semibold text-tinta">
            {sanEmPortugues(momento.san)} — {momento.titulo}
          </p>
          {momento.ideia ? (
            <p className="rounded-lg bg-metodo-superficie/15 px-3 py-2.5 text-sm text-metodo-tinta-alta">
              {momento.ideia}
            </p>
          ) : null}
          {momento.alternativas ? (
            <p className="text-xs text-tinta-fraca">
              <span className="rotulo text-tinta-muda">e os outros lances · </span>
              {momento.alternativas}
            </p>
          ) : null}
          {momento.fonte ? <p className="text-xs text-tinta-muda">{momento.fonte}</p> : null}
        </div>
      ) : erros > 0 ? (
        <div className="flex flex-col gap-2 cartao px-4 py-3">
          <p className="text-sm font-semibold text-tinta">
            {ultimoErro ? `${sanEmPortugues(ultimoErro)} não é o lance.` : "Não é o lance."}
          </p>
          <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2.5 text-sm text-tinta-media">
            {momento.feedback}
          </p>
          {revelou ? (
            <p className="text-sm font-semibold text-metodo-tinta-alta">
              O lance é {sanEmPortugues(momento.san)}. Jogue-o para seguir.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setRevelou(true)}
              className="foco w-fit rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media hover:bg-carta-toque"
            >
              Mostrar o lance
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
