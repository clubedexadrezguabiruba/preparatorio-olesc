import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import {
  contarAberto,
  MODULO,
  MODULOS_EM_ORDEM,
  type ModuloDoNivel,
} from "@/lib/curso/mapa";
import { META_DA_OLESC, METAL, NIVEL, type Nivel } from "@/lib/curso/nivel";

/**
 * A faixa do nível, no metal dele — dividida entre `/trilha` e `/finais` (17/9/2026).
 *
 * Na trilha ela mostra as duas barras (tática e finais); em `/finais`, só a de
 * finais. Quem escolhe é o `mostrar`: a faixa não sabe em que página está.
 */

/** "800 a 1000", "1400+" — o rótulo do degrau, sem o `null` do teto na tela. */
export function faixaFide(nivel: Nivel): string {
  const [piso, teto] = NIVEL[nivel].fide;
  if (teto === null) return `${piso}+`;
  return piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
}

/**
 * O nome, a faixa FIDE, o resumo, e uma barra por módulo — cada uma com a sua
 * unidade, porque puzzle e aula não se somam.
 */
export function FaixaDoNivel({
  nivel,
  modulos,
  voceEstaAqui,
  conquistado,
  mostrar = MODULOS_EM_ORDEM,
}: {
  nivel: Nivel;
  modulos: readonly ModuloDoNivel[];
  voceEstaAqui: boolean;
  conquistado: boolean;
  /** Quais barras a faixa desenha, na ordem da rotina. */
  mostrar?: readonly ModuloDoNivel["modulo"][];
}) {
  const cor = COR_DO_NIVEL[nivel];
  return (
    <header
      className={`trilha-faixa metal-${nivel} flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5`}
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2
            id={`titulo-nivel-${nivel}`}
            className={`font-serif text-2xl leading-tight font-semibold ${cor.tinta}`}
          >
            Nível {nivel} · {METAL[nivel]}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs tabular-nums">
            <span className="text-tinta-media">FIDE {faixaFide(nivel)}</span>
            {voceEstaAqui ? (
              <span className="rounded-full bg-metodo-cheio px-2 py-0.5 font-semibold text-tinta-inversa">
                Você está aqui
              </span>
            ) : null}
            {conquistado ? (
              <span className="rounded-full border border-metodo-cheio px-2 py-0.5 font-semibold text-metodo-tinta-alta">
                Conquistado
              </span>
            ) : null}
            {META_DA_OLESC.includes(nivel) ? (
              <span className="rounded-full border border-tinta-fraca px-2 py-0.5 font-medium text-tinta-media">
                Meta da OLESC
              </span>
            ) : null}
          </div>
          <p className="max-w-prose text-sm text-tinta-media">
            {NIVEL[nivel].resumo}
          </p>
        </div>
        <span
          aria-hidden
          className={`grid size-14 shrink-0 place-items-center rounded-full border-2 bg-papel/35 font-serif text-2xl font-semibold ${cor.borda} ${cor.tinta}`}
        >
          {nivel}
        </span>
      </div>

      <dl className={`grid gap-3 ${mostrar.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {mostrar.map((nome) => (
          <Contagem
            key={nome}
            modulo={
              modulos.find((m) => m.modulo === nome) ?? {
                modulo: nome,
                itens: [],
              }
            }
          />
        ))}
      </dl>
    </header>
  );
}

/** Uma barra por módulo, na unidade dele. Sem nada aberto, conta os itens. */
function Contagem({ modulo }: { modulo: ModuloDoNivel }) {
  const { feitos, total, trancados, emEscrita } = contarAberto(modulo);
  const rotulo = MODULO[modulo.modulo];
  const itens = modulo.itens.length;
  const completos = modulo.itens.filter((i) => i.feitos >= i.total).length;
  const texto =
    itens === 0
      ? rotulo.vazio
      : total > 0
        ? `${feitos} de ${total} ${rotulo.unidade}`
        : trancados > 0
          ? `${itens} ${itens === 1 ? "trancado" : "trancados"}`
          : `${emEscrita} em escrita`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <dt className="font-semibold text-tinta">{rotulo.nome}</dt>
        <dd className="text-right text-tinta-media tabular-nums">{texto}</dd>
      </div>
      {itens > 0 ? (
        <BarraDaFaixa
          feitos={total > 0 ? feitos : completos}
          de={total > 0 ? total : itens}
        />
      ) : null}
    </div>
  );
}

/**
 * A barra da faixa do nível. Não é a `Barra` do site porque ela mora sobre o
 * metal: o trilho `carta-toque` sumia no marrom da Madeira, e 2 de 117 virava
 * um ponto de 5 px. Aqui o trilho é o papel escurecido com um fio claro, e o
 * começo tem largura mínima — quem começou vê que começou.
 */
function BarraDaFaixa({ feitos, de }: { feitos: number; de: number }) {
  const parte = de > 0 ? Math.min(1, feitos / de) : 0;
  return (
    <div
      aria-hidden
      className="h-2 w-full overflow-hidden rounded-full bg-papel/60 ring-1 ring-tinta/15 ring-inset"
    >
      {parte > 0 ? (
        <div
          className={`h-full min-w-2.5 rounded-full ${parte >= 1 ? "bg-metodo-cheio" : "bg-metodo-superficie"}`}
          style={{ width: `${parte * 100}%` }}
        />
      ) : null}
    </div>
  );
}

/** A seta do "Ver o caminho". */
export function Seta() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
