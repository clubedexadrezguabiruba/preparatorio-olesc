import Link from "next/link";
import { GraficoRating } from "@/components/tatica/GraficoRating";
import type { EstadoDoRating } from "@/lib/tatica/rating";
import type { PontoDoRating } from "@/lib/tatica/rating-historico";

/**
 * A tática rating no painel: o número, a minicurva dos últimos 30 dias e o link
 * para a evolução — ou, para quem nunca jogou, o convite.
 *
 * Fica **depois dos módulos e antes da prova**: é contexto, como o cartão Hoje,
 * e não uma quarta frente do degrau. O que o aluno tem de fazer agora continua
 * sendo o cartão AGORA, e este cartão não disputa com ele — por isso não há
 * botão cheio aqui, só links.
 *
 * O `prefetch={false}` do "Jogar" pelo motivo do cartão de `/tatica`: a página
 * do modo grava o problema pendente e a hora em que ele foi servido.
 */
export function RatingDeTatica({ estado, pontos }: { estado: EstadoDoRating | null; pontos: readonly PontoDoRating[] }) {
  return (
    <section aria-labelledby="rating-de-tatica" className="flex flex-col gap-3">
      <h2 id="rating-de-tatica" className="rotulo text-tinta-fraca">
        Tática rating
      </h2>

      {estado ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 cartao px-4 py-3">
          <div className="flex flex-col">
            <span className="text-3xl font-semibold text-tinta tabular-nums">{Math.round(estado.rating)}</span>
            <span className="text-xs text-tinta-fraca tabular-nums">
              recorde {Math.round(estado.ratingMaximo)} · {estado.resolvidos}{" "}
              {estado.resolvidos === 1 ? "problema" : "problemas"}
            </span>
          </div>
          {pontos.length > 1 ? (
            <div className="min-w-32 flex-1">
              <GraficoRating pontos={pontos} compacto />
              <p className="text-[11px] text-tinta-fraca">últimos 30 dias</p>
            </div>
          ) : (
            <p className="flex-1 text-xs text-tinta-fraca">A curva aparece a partir do segundo dia de jogo.</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <Link href="/tatica/rating/evolucao" className="foco font-medium text-metodo-tinta underline">
              Ver evolução
            </Link>
            <Link href="/tatica/rating" prefetch={false} className="foco font-medium text-metodo-tinta underline">
              Jogar
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 cartao-vazio px-4 py-3">
          <p className="text-sm text-tinta-media">
            Problemas misturados, e um rating que sobe e desce a cada um. Você começa em 400.
          </p>
          <Link href="/tatica/rating" prefetch={false} className="foco text-sm font-medium text-metodo-tinta underline">
            Experimentar
          </Link>
        </div>
      )}
    </section>
  );
}
