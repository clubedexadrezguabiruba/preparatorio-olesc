"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Linha } from "@/lib/repertorio/linhas";
import type { Modo } from "@/lib/repertorio/passada";
import { semQuebras } from "@/lib/repertorio/treino";
import { armAudioOnFirstGesture } from "@/lib/sound";
import { Passada } from "@/app/aberturas/[cor]/[abertura]/Passada";

/**
 * **TESTE.** A casca de uma sessão numa partida instrutiva.
 *
 * É o `Treino.tsx` do repertório com **a metade de baixo arrancada**: mesma
 * `Passada`, mesmas duas fases (assistida e depois de memória), e nenhum
 * servidor. `aoDecidir` recebe os lances e os joga fora — nada de
 * `registrarTreino`, nada de `repertorio_progresso`, nada de escada de
 * revisão. O teste é sobre **como é jogar uma partida inteira no treinador**;
 * medir e gravar é a pergunta seguinte, e ela só vale a pena se esta primeira
 * for respondida com sim.
 *
 * A `key` da `Passada` é o que zera uma passada: trocar de fase ou pedir "de
 * novo" desmonta o componente, que é o jeito do React de voltar tudo ao zero.
 * Mesma decisão do repertório, e pelo mesmo motivo.
 */
export function Sessao({ linha, resumo }: { linha: Linha; resumo: string | null }) {
  useEffect(() => armAudioOnFirstGesture(), []);

  const [modo, setModo] = useState<Modo>("assistido");
  const [rodada, setRodada] = useState(0);
  const [placar, setPlacar] = useState<{
    acertos: number;
    total: number;
    acertou: boolean;
    /** O lance certo, quando foi o erro que parou a passada. Ver `Passada.tsx`. */
    revelado: { passo: number; uci: string; san: string } | null;
  } | null>(null);

  const recomecar = useCallback((qual: Modo) => {
    setModo(qual);
    setPlacar(null);
    setRodada((r) => r + 1);
  }, []);

  const deMemoria = useCallback(() => recomecar("quiz"), [recomecar]);
  const comASeta = useCallback(() => recomecar("assistido"), [recomecar]);

  const fechou = placar !== null && modo === "quiz";

  return (
    <div className="flex flex-col gap-3">
      {resumo && rodada === 0 ? (
        <p className="cartao px-4 py-3 text-sm text-tinta-media">
          {semQuebras(resumo)}
        </p>
      ) : null}

      <Passada
        key={`${modo}:${rodada}`}
        linha={linha}
        modo={modo}
        aoDecidir={() => {
          /* o teste não grava nada. */
        }}
        aoTerminar={setPlacar}
        /*
         * Este teste continua com **duas** etapas, e não com as três do
         * repertório: aqui não há escada de revisão nem gravação, e a etapa do
         * meio existe para separar "praticar" de "ser medido" — uma distinção
         * que não faz sentido onde nada é medido. Por isso `aoAvancarEtapa`
         * emenda direto o de memória. A trilha, pelo mesmo motivo, fica de fora.
         */
        aoAvancarEtapa={deMemoria}
      />

      {fechou ? (
        <div className="flex flex-col gap-3 cartao px-4 py-4">
          {/*
           * Três finais desde 8/9/2026, e não dois: o erro agora **para** a
           * passada em vez de levá-la até o fim (ver `lib/repertorio/passada.ts`).
           * Dizer "você chegou ao fim" numa partida que parou no quarto lance
           * seria a tela contando outra história.
           */}
          <p className="text-sm font-semibold text-tinta">
            {placar.revelado
              ? `Não era esse lance: a partida seguia com ${placar.revelado.san}.`
              : placar.acertou
                ? "Partida inteira, de memória, sem erro."
                : `Você chegou ao fim: ${placar.acertos} de ${placar.total} lances certos.`}
          </p>
          <Comentario
            texto={
              placar.revelado
                ? linha.comentarios[String(placar.revelado.passo)]
                : linha.comentarios[String(linha.lances.length - 1)]
            }
          />
          <p className="text-xs text-tinta-fraca">
            Este é um teste: nada foi gravado, e esta partida não conta em lugar nenhum.
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao principal onClick={deMemoria}>
              Jogar de novo
            </Botao>
            <Botao onClick={comASeta}>Rever com a seta</Botao>
            <Link
              href="/partidas"
              className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
            >
              Outra partida
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={comASeta}
            className="foco rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media hover:bg-carta-toque"
          >
            Recomeçar com a seta
          </button>
          <Link
            href="/partidas"
            className="foco text-xs font-medium text-metodo-tinta hover:underline"
          >
            Escolher outra partida →
          </Link>
        </div>
      )}
    </div>
  );
}

function Comentario({ texto }: { texto: string | undefined }) {
  if (!texto?.trim()) return null;
  return (
    <p className="rounded-lg bg-metodo-superficie/15 px-3 py-2.5 text-sm text-metodo-tinta-alta">
      {semQuebras(texto)}
    </p>
  );
}

function Botao({
  onClick,
  principal,
  children,
}: {
  onClick: () => void;
  principal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        principal
          ? "foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          : "foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
      }
    >
      {children}
    </button>
  );
}
