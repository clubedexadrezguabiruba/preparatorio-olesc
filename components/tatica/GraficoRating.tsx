"use client";

import { useEffect, useId, useRef, useState } from "react";
import { escalaDoRating, type SerieDoGrafico } from "@/lib/tatica/rating-grafico";

/**
 * A evolução do rating de tática: a linha do rating, a área sob ela e o recorde
 * em degraus.
 *
 * **SVG à mão, sem biblioteca.** São duas linhas e um cursor; uma biblioteca de
 * gráfico entraria no pacote de toda rota que a importasse — o mesmo argumento
 * das barras de divs do relatório do professor.
 *
 * ## A linha sobe "em 90°, não em 180°" (Doug, 16/9)
 *
 * O eixo abraça os dados (`escalaDoRating`): um ganho de 30 pontos ocupa a
 * altura do gráfico, e não um terço dela. O gráfico é alto (260 px) e quem o usa
 * limita a largura, para a subida ficar em pé. Quem tem menos de 3 dias de jogo vê um
 * ponto por problema (`serieDoGrafico`), e não um ponto solto.
 *
 * As regras de desenho (skill `dataviz`): **uma escala só** (as duas linhas são
 * rating); a série que importa em linha cheia de 2 px na cor do método, com a
 * área clara sob ela, e o recorde como **uma linha só**, tracejada e neutra, no
 * valor do recorde, com o número escrito. Foi em degraus por um dia (16/9): a
 * escada cruzava a linha na subida e subia onde a linha nunca chegou (o pico de
 * dentro de um dia), e isso confunde quem tem 11 anos. Legenda sempre, mais
 * o rótulo direto no último ponto; grade discreta; cursor que acha o ponto
 * (ninguém mira numa linha de 2 px); e a tabela para quem não enxerga o desenho.
 * Texto sempre em tinta de texto, nunca na cor da série.
 *
 * A linha se desenha uma vez ao abrir (`.linha-desenha`, em `globals.css`, com a
 * guarda de `prefers-reduced-motion`). É o único movimento da tela.
 *
 * `compacto` é a minicurva do painel e de `/tatica`: sem eixo, sem recorde, sem
 * cursor, sem tabela — o número ao lado dela é que é lido.
 */
export function GraficoRating({
  serie,
  compacto = false,
  inicio,
  altura = compacto ? 72 : 260,
}: {
  serie: SerieDoGrafico;
  compacto?: boolean;
  /** O rating de partida do aluno; vira uma marca discreta quando cai dentro do eixo. */
  inicio?: number;
  /**
   * A altura do desenho. A inclinação da linha depende da **proporção**, e não
   * só da escala: um gráfico largo e baixo deita qualquer subida. Por isso quem
   * usa o gráfico também limita a largura dele (medido em 16/9: a 850 px de
   * largura e 200 de altura, nenhuma subida passava de 13°).
   */
  altura?: number;
}) {
  const { pontos, eixo } = serie;
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(compacto ? 160 : 600);
  const [foco, setFoco] = useState<number | null>(null);
  const idDoDegrade = useId();

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(120, Math.round(entrada.contentRect.width))));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  if (pontos.length === 0) return null;

  const margem = compacto ? { e: 2, d: 6, t: 6, b: 4 } : { e: 40, d: 44, t: 14, b: 24 };
  const w = largura - margem.e - margem.d;
  const h = altura - margem.t - margem.b;

  const escala = escalaDoRating(
    pontos.flatMap((p) => (compacto ? [p.rating] : [p.rating, p.recorde])),
    { compacto },
  );

  const x = (i: number) => margem.e + (pontos.length === 1 ? w / 2 : (i * w) / (pontos.length - 1));
  const y = (v: number) => margem.t + h - ((v - escala.menor) / (escala.maior - escala.menor)) * h;
  const base = margem.t + h;

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
  const ultimo = pontos.length - 1;
  const recorde = pontos[ultimo].recorde;
  // A linha do início só quando não coincide com uma marca do eixo — senão são dois 600.
  const inicioVisivel =
    !compacto && inicio !== undefined && inicio > escala.menor && inicio < escala.maior && !escala.marcas.includes(inicio);
  const nomeDoPonto = (i: number) => (eixo === "dia" ? curto(pontos[i].dia) : i === 0 ? "Início" : `Problema ${i}`);
  const resumoFalado = `Rating de ${Math.round(pontos[0].rating)} (${nomeDoPonto(0)}) a ${Math.round(pontos[ultimo].rating)} (${nomeDoPonto(ultimo)}); recorde ${Math.round(pontos[ultimo].recorde)}.`;

  const aoApontar = (evento: React.PointerEvent<SVGRectElement>) => {
    const caixaDoSvg = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!caixaDoSvg) return;
    const px = evento.clientX - caixaDoSvg.left;
    const i = pontos.length === 1 ? 0 : Math.round(((px - margem.e) / w) * (pontos.length - 1));
    setFoco(Math.min(ultimo, Math.max(0, i)));
  };

  return (
    <figure className="flex flex-col gap-2">
      {compacto ? null : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-media" aria-hidden>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" className="text-metodo">
              <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {eixo === "dia" ? "Rating no fim do dia" : "Rating a cada problema"}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" className="text-tinta-fraca">
              <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            Recorde
          </span>
        </div>
      )}

      <div ref={caixa} className="relative w-full">
        <svg width={largura} height={altura} role="img" aria-label={resumoFalado} className="block overflow-visible">
          <defs>
            <linearGradient id={idDoDegrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-metodo)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-metodo)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {escala.marcas.map((m) => (
            <g key={m}>
              <line x1={margem.e} x2={margem.e + w} y1={y(m)} y2={y(m)} className="stroke-borda-fraca" strokeWidth="1" />
              <text x={margem.e - 6} y={y(m)} dy="0.32em" textAnchor="end" className="fill-tinta-fraca text-[10px] tabular-nums">
                {Math.round(m)}
              </text>
            </g>
          ))}

          {inicioVisivel ? (
            <line aria-hidden x1={margem.e} x2={margem.e + w} y1={y(inicio)} y2={y(inicio)} className="stroke-tinta-muda" strokeWidth="1" strokeDasharray="1 3" />
          ) : null}

          {compacto ? null : (
            <>
              <text x={x(0)} y={altura - 6} textAnchor={pontos.length === 1 ? "middle" : "start"} className="fill-tinta-fraca text-[10px] tabular-nums">
                {nomeDoPonto(0)}
              </text>
              {pontos.length > 1 ? (
                <text x={x(ultimo)} y={altura - 6} textAnchor="end" className="fill-tinta-fraca text-[10px] tabular-nums">
                  {nomeDoPonto(ultimo)}
                </text>
              ) : null}
            </>
          )}

          <path d={area} fill={`url(#${idDoDegrade})`} className="area-surge" />
          {compacto ? null : (
            <g aria-hidden>
              <line x1={margem.e} x2={margem.e + w} y1={y(recorde)} y2={y(recorde)} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="text-tinta-fraca" />
              <text x={margem.e + 4} y={y(recorde) - 6} className="fill-tinta-media text-[11px] tabular-nums">
                recorde {Math.round(recorde)}
              </text>
            </g>
          )}
          <path
            d={linha}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={compacto ? 2 : 2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="linha-desenha text-metodo"
          />
          <circle cx={x(ultimo)} cy={y(pontos[ultimo].rating)} r={compacto ? 3 : 4.5} fill="currentColor" className="text-metodo" />

          {compacto ? null : (
            <text x={x(ultimo) + 9} y={y(pontos[ultimo].rating)} dy="0.32em" className="fill-tinta text-xs font-semibold tabular-nums">
              {Math.round(pontos[ultimo].rating)}
            </text>
          )}

          {!compacto && foco !== null ? (
            <g aria-hidden>
              <line x1={x(foco)} x2={x(foco)} y1={margem.t} y2={base} className="stroke-tinta-fraca" strokeWidth="1" />
              <circle cx={x(foco)} cy={y(pontos[foco].rating)} r="4" fill="currentColor" className="text-metodo" />
            </g>
          ) : null}

          {compacto ? null : (
            <rect
              x={margem.e - 8}
              y={0}
              width={w + 16}
              height={altura}
              fill="transparent"
              onPointerMove={aoApontar}
              onPointerDown={aoApontar}
              onPointerLeave={() => setFoco(null)}
            />
          )}
        </svg>

        {!compacto && foco !== null ? (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-md border border-borda bg-tinta px-2.5 py-1.5 text-xs text-tinta-inversa shadow tabular-nums"
            style={{ left: Math.min(Math.max(x(foco), 70), largura - 70) }}
          >
            <span className="font-semibold">{nomeDoPonto(foco)}</span>
            <span>Rating {Math.round(pontos[foco].rating)}</span>
            <span>Recorde {Math.round(pontos[foco].recorde)}</span>
          </div>
        ) : null}
      </div>

      {compacto ? null : (
        <details className="text-xs text-tinta-media">
          <summary className="foco w-fit cursor-pointer">Ver em tabela</summary>
          <div className="mt-2 max-h-56 overflow-auto">
            <table className="w-full tabular-nums">
              <thead>
                <tr className="text-left text-tinta-fraca">
                  <th className="py-1 pr-4 font-medium">{eixo === "dia" ? "Dia" : "Problema"}</th>
                  <th className="py-1 pr-4 font-medium">{eixo === "dia" ? "Rating no fim do dia" : "Rating"}</th>
                  <th className="py-1 font-medium">Recorde</th>
                </tr>
              </thead>
              <tbody>
                {pontos
                  .map((p, i) => ({ p, i }))
                  .reverse()
                  .map(({ p, i }) => (
                    <tr key={i} className="border-t border-borda-fraca">
                      <td className="py-1 pr-4">{nomeDoPonto(i)}</td>
                      <td className="py-1 pr-4 text-tinta">{Math.round(p.rating)}</td>
                      <td className="py-1">{Math.round(p.recorde)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

/** "2026-09-15" → "15/09". */
function curto(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}
