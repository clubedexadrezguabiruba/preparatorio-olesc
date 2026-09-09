import Link from "next/link";
import type { LarguraDaMoldura } from "./Moldura";

/**
 * A navegação do aluno: onde ele está, e para onde mais pode ir.
 *
 * ## O buraco que ela tapa
 *
 * Até 2026-09-09 o site tinha **zero** páginas com navegação: cada tela levava
 * um "← Painel" e mais nada. Medido, o custo era este — `/trilha`, que é a
 * página feita para responder *"o que vem depois?"*, tinha **um** link de
 * entrada, enterrado dentro de `/finais`; e `/partidas`, com três partidas e 28
 * momentos funcionando, tinha **zero**: a página era inalcançável pelo site.
 *
 * ## Por que ela não mora no `app/layout.tsx`
 *
 * Porque o layout raiz envolve `/`, `/entrar` e `/professor` também, e "global
 * exceto nestas rotas" começa ao contrário — a primeira exceção é uma condição,
 * a terceira é um `if` com três braços dentro de um layout. A forma certa no
 * Next 16 são grupos de rota (`app/(aluno)/layout.tsx`), mas mover 18
 * diretórios logo depois de um merge produz ruído que esconde erro. Então:
 * componente aplicado nas páginas de aluno, e os grupos de rota ficam para
 * depois, como uma mudança que só mexe em estrutura.
 *
 * ## As telas de aula não recebem nem topo nem barra
 *
 * `/finais/[aula]`, `/tatica/[tema]`, `/tatica/revisao`, `/nivel/[n]/prova` e o
 * treino de repertório têm **altura fechada**: o tabuleiro é medido pela altura
 * da janela, e cada pixel de casca sai dele. A invariante está documentada, e
 * este componente a respeita não sendo chamado lá.
 *
 * ## O celular, especificado
 *
 * Marca + 6 destinos + nível + sequência não é uma "barra fina", e cada pixel
 * dela sai da primeira dobra — que é a outra meta do redesenho. Então a 360 px
 * a navegação se parte em duas:
 *
 * ```
 * TOPO     ┌────────────────────────┐   ← 44 px, e nada mais
 *          │ OLESC     Nível 2  🔥7 │
 *          └────────────────────────┘
 *
 * EMBAIXO  ┌────────────────────────┐   ← fixa, fora da dobra
 *          │ Painel Tática Finais ⋯ │
 *          └────────────────────────┘
 * ```
 *
 * Quatro destinos principais embaixo e um "Mais" com Aberturas, Trilha e
 * Partidas. O "Mais" é um `<details>`, e não um menu de JavaScript: ele abre
 * sem estado, sem hidratação e sem componente de cliente, e o teclado já sabe
 * operá-lo. Um menu de três itens não paga um `useState`.
 *
 * ## A rota atual chega por parâmetro, e não por `usePathname`
 *
 * `usePathname` obrigaria este componente a ser de cliente, e a navegação
 * inteira atravessaria a fronteira só para acender um item. Como ele já é
 * aplicado página a página, a página que o chama sabe quem ela é — e dizê-lo é
 * uma palavra.
 */

export type Destino = "painel" | "tatica" | "finais" | "aberturas" | "trilha" | "partidas";

type Item = { id: Destino; nome: string; href: string };

/** Os quatro que cabem na barra do celular, na ordem da rotina do dia. */
const PRINCIPAIS: Item[] = [
  { id: "painel", nome: "Painel", href: "/painel" },
  { id: "tatica", nome: "Tática", href: "/tatica" },
  { id: "finais", nome: "Finais", href: "/finais" },
  { id: "aberturas", nome: "Aberturas", href: "/aberturas" },
];

/** Os que entram no "Mais" no celular, e na linha inteira no desktop. */
const SECUNDARIOS: Item[] = [
  { id: "trilha", nome: "A trilha", href: "/trilha" },
  { id: "partidas", nome: "Partidas", href: "/partidas" },
];

const TODOS = [...PRINCIPAIS, ...SECUNDARIOS];

/**
 * A régua interna do cabeçalho é a mesma da `Moldura` da página.
 *
 * Sem isto a barra tinha largura própria, e no desktop o "OLESC" começava 114 px
 * à esquerda da coluna de texto: dois eixos verticais na mesma tela, e a fileira
 * de links pendurada fora do prumo do conteúdo. É uma palavra em cada sítio, e
 * ela mantém o alinhamento honesto quando a página troca de largura.
 */
const REGUA = {
  leitura: "max-w-xl",
  painel: "max-w-2xl",
  larga: "max-w-4xl",
} as const;

export function Cabecalho({
  atual,
  nivel,
  sequencia,
  largura = "painel",
}: {
  atual: Destino;
  /** A mesma largura da `<Moldura>` desta página, para os dois eixos baterem. */
  largura?: LarguraDaMoldura;
  nivel: number;
  /** Dias seguidos de treino. Zero não desenha nada — 🔥0 seria uma acusação. */
  sequencia: number;
}) {
  return (
    <>
      {/* ------------------------------------------------------------------ *
       * O topo. `h-11` são os 44 px medidos, e ele é `sticky` porque o nível
       * é a informação que o aluno mais reprocura enquanto rola.
       * ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-borda-fraca bg-papel/95 backdrop-blur">
        <div className={`mx-auto flex h-11 w-full items-center gap-4 px-5 ${REGUA[largura]}`}>
          <Link href="/painel" className="foco rotulo shrink-0 text-metodo-tinta">
            OLESC
          </Link>

          {/* A navegação inteira, só no desktop: lá cabe, e uma barra embaixo
              numa tela de 1366 px seria mobiliário sem função. */}
          <nav className="hidden min-w-0 flex-1 sm:block">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {TODOS.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={item.id === atual ? "page" : undefined}
                    className={`foco text-sm transition-colors ${
                      item.id === atual
                        ? "font-semibold text-tinta"
                        : "text-tinta-fraca hover:text-tinta"
                    }`}
                  >
                    {item.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="ml-auto flex shrink-0 items-center gap-3 text-xs tabular-nums">
            <span className="text-tinta-media">Nível {nivel}</span>
            {sequencia > 0 ? (
              <span className="text-metodo-tinta" title={`${sequencia} dias seguidos de treino`}>
                <span aria-hidden>🔥</span> {sequencia}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------------ *
       * A barra de baixo, só no celular.
       *
       * `fixed`, e o respiro que a compensa vem de `<Moldura barraInferior>` —
       * é lá que a página sabe quanto conteúdo tem embaixo dela.
       * ------------------------------------------------------------------ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borda-fraca bg-papel/95 backdrop-blur sm:hidden">
        <ul className="flex items-stretch">
          {PRINCIPAIS.map((item) => (
            <li key={item.id} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={item.id === atual ? "page" : undefined}
                className={`foco flex h-14 flex-col items-center justify-center gap-1 px-1 text-xs ${
                  item.id === atual ? "font-semibold text-tinta" : "text-tinta-fraca"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-0.5 w-6 rounded-full ${
                    item.id === atual ? "bg-metodo-cheio" : "bg-transparent"
                  }`}
                />
                <span className="truncate">{item.nome}</span>
              </Link>
            </li>
          ))}

          <li className="min-w-0 flex-1">
            <details className="group relative h-full">
              <summary className="foco flex h-14 cursor-pointer list-none flex-col items-center justify-center gap-1 text-xs text-tinta-fraca [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className={`h-0.5 w-6 rounded-full ${
                    SECUNDARIOS.some((i) => i.id === atual) ? "bg-metodo-cheio" : "bg-transparent"
                  }`}
                />
                <span>Mais</span>
              </summary>
              {/* A gaveta **não** usa a utilitária `cartao`, e é a única exceção
                  do site: ela cobre um cartão, e com a mesma superfície do que
                  cobre a separação vira uma borda de 1 px. No escuro a sombra
                  quase não trabalha — sobre um fundo a 13% de claridade não há
                  para onde descer —, então quem levanta é a superfície um
                  degrau acima e a borda forte. */}
              <ul className="absolute right-2 bottom-14 w-44 overflow-hidden rounded-xl border border-borda-forte bg-carta-alta p-1 shadow-lg">
                {SECUNDARIOS.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={item.id === atual ? "page" : undefined}
                      className={`foco block rounded-lg px-3 py-2.5 text-sm ${
                        item.id === atual ? "font-semibold text-tinta" : "text-tinta-media"
                      }`}
                    >
                      {item.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </>
  );
}
