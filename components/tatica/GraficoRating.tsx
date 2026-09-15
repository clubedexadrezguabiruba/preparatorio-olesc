"use client";

import { useEffect, useRef, useState } from "react";
import type { PontoDoRating } from "@/lib/tatica/rating-historico";

/**
 * A evolução do rating de tática: o último rating de cada dia, e a linha do
 * recorde.
 *
 * **SVG à mão, sem biblioteca.** São duas linhas e um cursor; uma biblioteca de
 * gráfico entraria no pacote de toda rota que a importasse — o mesmo argumento
 * das barras de divs do relatório do professor.
 *
 * As regras de desenho (skill `dataviz`): **uma escala só** (as duas linhas são
 * rating); a série que importa em linha cheia de 2 px na cor do método, e o
 * recorde como referência, tracejado e neutro — ele não é uma segunda
 * categoria, é o teto que a primeira já tocou; legenda sempre (são duas
 * séries), mais o rótulo direto no último ponto; grade discreta; cursor que
 * acha o **dia** (ninguém mira numa linha de 2 px) e uma dica com as duas
 * séries; e a tabela para quem não enxerga o desenho. Texto sempre em tinta de
 * texto, nunca na cor da série.
 *
 * `compacto` é a minicurva do painel: sem eixo, sem cursor, sem tabela — o
 * número ao lado dela é que é lido, e o link leva à versão completa.
 */
export function GraficoRating({ pontos, compacto = false }: { pontos: readonly PontoDoRating[]; compacto?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(compacto ? 160 : 600);
  const [foco, setFoco] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(120, Math.round(entrada.contentRect.width))));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  if (pontos.length === 0) return null;

  const altura = compacto ? 44 : 200;
  const margem = compacto ? { e: 2, d: 6, t: 6, b: 6 } : { e: 40, d: 48, t: 12, b: 24 };
  const w = largura - margem.e - margem.d;
  const h = altura - margem.t - margem.b;

  const valores = pontos.flatMap((p) => [p.rating, p.recorde]);
  const passo = compacto ? 1 : 50;
  let menor = Math.floor((Math.min(...valores) - (compacto ? 0 : 20)) / passo) * passo;
  let maior = Math.ceil((Math.max(...valores) + (compacto ? 0 : 20)) / passo) * passo;
  if (maior - menor < (compacto ? 20 : 100)) {
    const meio = (maior + menor) / 2;
    menor = meio - (compacto ? 10 : 50);
    maior = meio + (compacto ? 10 : 50);
  }

  const x = (i: number) => margem.e + (pontos.length === 1 ? w / 2 : (i * w) / (pontos.length - 1));
  const y = (v: number) => margem.t + h - ((v - menor) / (maior - menor)) * h;
  const caminho = (chave: "rating" | "recorde") =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[chave]).toFixed(1)}`).join(" ");

  const ultimo = pontos.length - 1;
  const marcas = compacto ? [] : [menor, (menor + maior) / 2, maior];
  const resumoFalado = `Rating de ${Math.round(pontos[0].rating)} em ${curto(pontos[0].dia)} a ${Math.round(pontos[ultimo].rating)} em ${curto(pontos[ultimo].dia)}; recorde ${Math.round(pontos[ultimo].recorde)}.`;

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
            Rating no fim do dia
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
          {marcas.map((m) => (
            <g key={m}>
              <line x1={margem.e} x2={margem.e + w} y1={y(m)} y2={y(m)} className="stroke-borda-fraca" strokeWidth="1" />
              <text x={margem.e - 6} y={y(m)} dy="0.32em" textAnchor="end" className="fill-tinta-fraca text-[10px] tabular-nums">
                {Math.round(m)}
              </text>
            </g>
          ))}

          {compacto ? null : (
            <>
              <text x={x(0)} y={altura - 6} textAnchor={pontos.length === 1 ? "middle" : "start"} className="fill-tinta-fraca text-[10px] tabular-nums">
                {curto(pontos[0].dia)}
              </text>
              {pontos.length > 1 ? (
                <text x={x(ultimo)} y={altura - 6} textAnchor="end" className="fill-tinta-fraca text-[10px] tabular-nums">
                  {curto(pontos[ultimo].dia)}
                </text>
              ) : null}
            </>
          )}

          <path d={caminho("recorde")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="text-tinta-fraca" />
          <path d={caminho("rating")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-metodo" />
          <circle cx={x(ultimo)} cy={y(pontos[ultimo].rating)} r={compacto ? 3 : 4} fill="currentColor" className="text-metodo" />

          {compacto ? null : (
            <text x={x(ultimo) + 8} y={y(pontos[ultimo].rating)} dy="0.32em" className="fill-tinta text-xs font-semibold tabular-nums">
              {Math.round(pontos[ultimo].rating)}
            </text>
          )}

          {!compacto && foco !== null ? (
            <g aria-hidden>
              <line x1={x(foco)} x2={x(foco)} y1={margem.t} y2={margem.t + h} className="stroke-tinta-fraca" strokeWidth="1" />
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
            <span className="font-semibold">{curto(pontos[foco].dia)}</span>
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
                  <th className="py-1 pr-4 font-medium">Dia</th>
                  <th className="py-1 pr-4 font-medium">Rating no fim do dia</th>
                  <th className="py-1 font-medium">Recorde</th>
                </tr>
              </thead>
              <tbody>
                {[...pontos].reverse().map((p) => (
                  <tr key={p.dia} className="border-t border-borda-fraca">
                    <td className="py-1 pr-4">{curto(p.dia)}</td>
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
