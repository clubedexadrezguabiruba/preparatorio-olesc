import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/avatar/Avatares";
import { perfilAtual } from "@/lib/auth/perfil";
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
 *
 * ## O avatar e o nome, no canto (17/9/2026)
 *
 * O aluno escolhe um avatar em `/perfil`, e ele aparece aqui, em toda tela. O
 * cabeçalho **lê o perfil sozinho** em vez de recebê-lo por parâmetro: são nove
 * páginas que o chamam, e acrescentar um parâmetro a cada uma seria nove lugares
 * para esquecer. A leitura não custa consulta — `perfilAtual` tem `cache` do
 * React, e toda página que desenha o cabeçalho já o chamou antes.
 *
 * **Só o avatar, sem o nome escrito.** Medido em 17/9 a 1366 px, na moldura
 * `painel` (672 px): sem o avatar a navegação cabia numa linha (24 px); com
 * avatar e nome ela quebrava em duas (52 px) e o topo de 44 px transbordava — e
 * quebrava mesmo só com o avatar. O nome saiu (ele está no painel e em `/perfil`,
 * e no `aria-label` e no `title` do link), e o vão entre os destinos desceu de
 * 16 para 12 px: medido de novo, uma linha. A 640 px a navegação já quebrava
 * antes do avatar, e continua como estava.
 */

export type Destino = "painel" | "tatica" | "finais" | "aberturas" | "trilha" | "partidas" | "turma" | "perfil";

type Item = {
  id: Destino;
  nome: string;
  href: string;
  /** Só na gaveta "Mais" do celular: no desktop o avatar do canto já é este link. */
  soNoCelular?: boolean;
};

/** Os quatro que cabem na barra do celular, na ordem da rotina do dia. */
const PRINCIPAIS: Item[] = [
  { id: "painel", nome: "Painel", href: "/painel" },
  { id: "tatica", nome: "Tática", href: "/tatica" },
  { id: "finais", nome: "Finais", href: "/finais" },
  { id: "aberturas", nome: "Aberturas", href: "/aberturas" },
];

/** Os que entram no "Mais" no celular, e na linha inteira no desktop. */
const SECUNDARIOS: Item[] = [
  // "Meu perfil" (17/9/2026): o avatar, as conquistas e os graus numa página só — era
  // "Progresso". No desktop ele não entra na linha: o avatar no canto já leva lá, e medido a
  // 1366 px a linha com mais um nome quebrava em duas. No celular o avatar também está no topo,
  // mas um aluno de 11 anos procura a palavra, e a gaveta tem lugar.
  { id: "perfil", nome: "Meu perfil", href: "/perfil", soNoCelular: true },
  // A ordem (17/9/2026): o estudo primeiro — a trilha é o mapa das três matérias e vem logo
  // depois delas —, depois o jogo, e por último o social.
  { id: "trilha", nome: "A trilha", href: "/trilha" },
  { id: "partidas", nome: "Partidas", href: "/partidas" },
  // A turma: os colegas, em ordem alfabética, e a vitrine de cada um (17/9/2026).
  { id: "turma", nome: "Turma", href: "/turma" },
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

export async function Cabecalho({
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
  const perfil = await perfilAtual();
  return (
    <>
      {/* ------------------------------------------------------------------ *
       * O topo, numa linha só de 56 px (`h-14`), `sticky` porque o nível é a
       * informação que o aluno mais reprocura enquanto rola.
       *
       * A marca do clube (18/9/2026): o cavalo do logo — o logo inteiro fica
       * ilegível nesta altura — e o nome. **Por extenso no celular, a sigla CXG
       * no desktop**, decisão do Doug: no desktop a navegação mora ao lado, e
       * numa página de 672 px o nome inteiro a fazia quebrar e vazar. Ele
       * provou e recusou o topo em dois andares. No celular a navegação está
       * embaixo, e o nome cabe em duas linhas.
       * ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-borda-fraca bg-papel/95 backdrop-blur">
        <div className={`mx-auto flex h-14 w-full items-center gap-4 px-5 ${REGUA[largura]}`}>
          <Link
            href="/painel"
            aria-label="Clube de Xadrez Guabiruba — painel"
            title="Clube de Xadrez Guabiruba"
            className="foco flex min-w-0 items-center gap-2 sm:shrink-0"
          >
            <Image src="/cxg-cavalo.webp" alt="" width={32} height={40} className="shrink-0" />
            <span className="font-serif text-sm leading-tight font-semibold text-balance text-tinta min-[360px]:text-base sm:hidden">
              Clube de Xadrez Guabiruba
            </span>
            <span className="rotulo hidden text-metodo-tinta sm:inline">CXG</span>
          </Link>

          {/* A navegação inteira, só no desktop: lá cabe, e uma barra embaixo
              numa tela de 1366 px seria mobiliário sem função. */}
          <nav className="hidden min-w-0 flex-1 sm:block">
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {TODOS.filter((item) => !item.soNoCelular).map((item) => (
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

          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs tabular-nums">
            <span className="text-tinta-media">Nível {nivel}</span>
            {sequencia > 0 ? (
              <span className="text-metodo-tinta" title={`${sequencia} dias seguidos de treino`}>
                <span aria-hidden>🔥</span> {sequencia}
              </span>
            ) : null}
            <Link
              href="/perfil"
              aria-current={atual === "perfil" ? "page" : undefined}
              aria-label={`Meu perfil: ${perfil.nome}`}
              title={perfil.nome}
              className={`foco shrink-0 rounded-full ${atual === "perfil" ? "ring-2 ring-metodo-cheio" : ""}`}
            >
              <Avatar id={perfil.avatar} tamanho={32} decorativo />
            </Link>
          </div>
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
