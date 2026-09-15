"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { registrarLance, type Gravado } from "@/app/partidas/acoes";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { applyUci } from "@/lib/chess/fen";
import type { MomentoComVersao } from "@/lib/partidas/carregar";
import { julgarResposta } from "@/lib/partidas/momentos";
import { sanEmPortugues } from "@/lib/repertorio/treino";
import { playForMove, playRefusal, playSuccess } from "@/lib/sound";

/**
 * Um momento de decisão: a posição, a pergunta, um lance.
 *
 * ## O que este componente decidiu, e por quê
 *
 * **O título do momento não aparece antes.** Vários entregam a resposta em três
 * palavras. Ele entra depois de resolvido, como o nome da ideia encontrada.
 *
 * **O erro não avança.** O exercício **é** este lance. O que muda a cada erro é
 * o tamanho da ajuda — primeiro o texto de ajuda, depois a casa de origem acesa,
 * e o botão de revelar sempre à mão.
 *
 * **O lance tão bom quanto o da partida não é erro** (decisão do Doug, 15/9). Ele
 * mostra "bom lance, mas na partida foi outro", devolve a peça, não conta erro e
 * não quebra o "de primeira". Só avança com o lance da partida.
 *
 * **Todo lance sobe ao servidor**, com a ordem da resposta (`tentativa`) e a
 * ajuda que estava na tela (`apoio`). O veredito da tela e o do servidor saem da
 * mesma função, `julgarResposta`.
 */

/** A partir de quantos erros a casa de origem acende sozinha. */
const ERROS_ATE_A_DICA = 2;

export type Placar = { acertouDePrimeira: boolean; erros: number; revelou: boolean };

export function Desafio({
  slug,
  momento,
  aoResolver,
  aoGravado,
}: {
  slug: string;
  momento: MomentoComVersao;
  aoResolver: (placar: Placar) => void;
  aoGravado: (resultado: Gravado) => void;
}) {
  const [erros, setErros] = useState(0);
  const [revelou, setRevelou] = useState(false);
  const [resolvido, setResolvido] = useState(false);
  const [ultimo, setUltimo] = useState<{ san: string | null; qual: "errado" | "boa" } | null>(null);
  const [marca, setMarca] = useState<{ casa: string; qual: "acerto" | "falha" | "boa" } | null>(null);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  const [ressincronizar, setRessincronizar] = useState(0);
  /** A posição na tela. Muda uma vez: quando o lance certo entra. */
  const [fen, setFen] = useState(momento.fen);
  const [feito, setFeito] = useState<[string, string] | null>(null);
  /** O instante da última resposta, para o `tempo_ms` de cada lance. */
  const desde = useRef<number | null>(null);

  const jogo = useMemo(() => new Chess(fen), [fen]);
  const meuLado = momento.lado === "brancas" ? "white" : "black";

  const gravar = useCallback(
    (uci: string, apoio: number) => {
      const agora = Date.now();
      const tempoMs = desde.current === null ? 0 : agora - desde.current;
      desde.current = agora;
      registrarLance({ partida: slug, momento: momento.n, uci, tentativa: erros + 1, apoio, tempoMs })
        .then(aoGravado)
        .catch(() => aoGravado({ erro: "sem conexão" }));
    },
    [aoGravado, erros, momento.n, slug],
  );

  const responder = useCallback(
    (uci: string) => {
      if (resolvido) return;
      if (desde.current === null) desde.current = Date.now();
      const apoio = revelou ? 3 : erros >= ERROS_ATE_A_DICA ? 2 : erros >= 1 ? 1 : 0;
      const resposta = julgarResposta(momento, uci);

      if (resposta !== "certo") {
        let comoSan: string | null = null;
        try {
          comoSan = new Chess(momento.fen).move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci.slice(4) : undefined,
          }).san;
        } catch {
          comoSan = null;
        }
        gravar(uci, apoio);
        if (resposta === "errado") setErros((n) => n + 1);
        setUltimo({ san: comoSan, qual: resposta });
        setMarca({ casa: uci.slice(2, 4), qual: resposta === "boa" ? "boa" : "falha" });
        // A peça volta: a posição da pergunta é a que tem de ficar na tela.
        setRessincronizar((n) => n + 1);
        if (resposta === "errado") playRefusal();
        return;
      }

      const depois = applyUci(momento.fen, uci);
      // Impossível por construção: `conferir.ts` aplica cada lance no `npm test`.
      if (!depois) return;

      gravar(uci, apoio);
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
    [aoResolver, erros, gravar, momento, resolvido, revelou],
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
      // Um nível só: a casa de origem, que é a pergunta "qual peça?".
      lista.push({ orig, brush: "blue" });
    }
    if (marca) {
      lista.push({
        orig: marca.casa as Key,
        brush: marca.qual === "acerto" ? "green" : marca.qual === "boa" ? "yellow" : "red",
      });
    }
    return lista;
  }, [erros, marca, momento.uci, resolvido, revelou]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 cartao px-4 py-3">
        <p className="text-sm text-tinta">{momento.pergunta}</p>
        {momento.desafioFinal && !resolvido ? (
          <p className="text-xs text-tinta-fraca">Acerte de primeira, sem ajuda, para concluir a partida.</p>
        ) : null}
      </div>

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
        <div className="flex flex-col gap-2 cartao px-4 py-3" aria-live="polite">
          <p className="text-sm font-semibold text-tinta">
            {sanEmPortugues(momento.san)}
            {momento.simbolo ?? ""} — {momento.titulo}
          </p>
          <p className="rounded-lg bg-metodo-superficie/15 px-3 py-2.5 text-sm text-metodo-tinta-alta">
            {momento.ideia}
          </p>
          {momento.alternativas ? <p className="text-xs text-tinta-fraca">{momento.alternativas}</p> : null}
        </div>
      ) : ultimo?.qual === "boa" && erros === 0 ? (
        <p className="cartao px-4 py-3 text-sm font-medium text-tinta" aria-live="polite">
          {ultimo.san ? `${sanEmPortugues(ultimo.san)} é um bom lance` : "Bom lance"}, mas na partida foi outro —
          tente achar.
        </p>
      ) : erros > 0 ? (
        <div className="flex flex-col gap-2 cartao px-4 py-3" aria-live="polite">
          <p className="text-sm font-semibold text-tinta">
            {ultimo?.qual === "boa"
              ? `${ultimo.san ? sanEmPortugues(ultimo.san) : "Esse"} é bom, mas na partida foi outro.`
              : ultimo?.san
                ? `${sanEmPortugues(ultimo.san)} não é o lance.`
                : "Não é o lance."}
          </p>
          <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2.5 text-sm text-tinta-media">{momento.feedback}</p>
          {revelou ? (
            <p className="text-sm font-semibold text-metodo-tinta-alta">
              O lance é {sanEmPortugues(momento.san)}. Jogue-o para seguir.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setRevelou(true)}
              className="foco min-h-11 w-fit rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media hover:bg-carta-toque"
            >
              Mostrar o lance
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
