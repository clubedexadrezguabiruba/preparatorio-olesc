import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { METAL, NIVEIS, type Nivel } from "@/lib/curso/nivel";

/**
 * A escada dos cinco níveis — Madeira embaixo à esquerda, Ouro no alto à
 * direita (17/9/2026).
 *
 * É o resumo da página inteira num desenho só: cada degrau é mais alto que o
 * anterior, o conquistado acende o metal, o de cima fica tracejado, e o
 * "você" marca onde o aluno está. Cada degrau leva à faixa do seu nível.
 *
 * Sem a chave "Meta da OLESC" embaixo dos degraus (Doug, 18/9): a meta já
 * está escrita na faixa de cada nível e na nota "Como ler o caminho".
 */
export function Escada({
  aqui,
  conquistado,
  destino = "",
  children,
}: {
  aqui: Nivel;
  conquistado: 0 | Nivel;
  /** A página das faixas, quando a escada mora fora dela — o painel passa `/trilha` (18/9/2026). */
  destino?: string;
  /** Uma nota embaixo dos degraus: o painel escreve ali o que o degrau atual ensina. */
  children?: React.ReactNode;
}) {
  return (
    <nav
      aria-label="Os cinco níveis"
      className={`flex flex-col gap-3 cartao px-4 pt-4 ${children ? "pb-4" : "pb-8"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-tinta">Sua escada</h2>
        <span className="text-xs text-tinta-fraca tabular-nums">
          {conquistado} de 5 conquistados
        </span>
      </div>

      <ol className="grid grid-cols-5 items-end border-b-2 border-borda-forte pt-7">
        {NIVEIS.map((n) => {
          const estado =
            n <= conquistado ? "conquistado" : n === aqui ? "atual" : "acima";
          return (
            <li key={n} className="relative flex flex-col items-center">
              {n === aqui ? <Voce /> : null}
              <a
                href={`${destino}#nivel-${n}`}
                aria-current={n === aqui ? "step" : undefined}
                aria-label={`Nível ${n}, ${METAL[n]}${estado === "conquistado" ? ", conquistado" : n === aqui ? ", você está aqui" : ""}`}
                className={`foco escada-degrau metal-${n} grid w-full place-items-center transition-[filter] hover:brightness-110`}
                data-estado={estado}
                style={{ height: `${1.5 + n * 0.85}rem` }}
              >
                <span
                  className={`font-serif text-lg leading-none font-semibold tabular-nums ${
                    estado === "conquistado"
                      ? "text-tinta-inversa"
                      : estado === "acima"
                        ? "text-tinta-fraca"
                        : COR_DO_NIVEL[n].tinta
                  }`}
                >
                  {n}
                </span>
              </a>
              <span
                className={`absolute -bottom-5 text-[11px] leading-none ${n === aqui ? "font-semibold text-tinta" : "text-tinta-fraca"}`}
              >
                {METAL[n]}
              </span>
            </li>
          );
        })}
      </ol>

      {children ? (
        <div className="mt-6 flex flex-col gap-2">{children}</div>
      ) : null}
    </nav>
  );
}

/** O marcador "você", em cima do degrau atual. */
function Voce() {
  return (
    <span aria-hidden className="absolute -top-6 flex flex-col items-center">
      <span className="rounded-full bg-metodo-cheio px-1.5 py-px text-[10px] leading-4 font-bold text-tinta-inversa uppercase">
        você
      </span>
      <span className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-metodo-cheio" />
    </span>
  );
}
