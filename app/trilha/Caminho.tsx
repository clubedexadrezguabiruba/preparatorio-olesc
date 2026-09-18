import Link from "next/link";
import { Professor } from "@/components/lesson/Professor";
import { IconeDoSelo } from "@/components/selos/Medalha";
import { IconeDoTema } from "@/components/tatica/IconeDoTema";
import type { ItemDoNivel } from "@/lib/curso/mapa";
import { METAL, type Nivel } from "@/lib/curso/nivel";
import { Trilho } from "./Trilho";

/**
 * O caminho de um nível — os medalhões em onda, e o troféu no fim (17/9/2026).
 *
 * É o desenho do Duolingo com a língua da `/tatica`: cada nó é um medalhão do
 * metal do nível, com o desenho do tema (tática) ou a coroa (finais); o
 * concluído acende o metal inteiro, o parcial ganha o anel verde do método, o
 * adiante fica tracejado e continua clicável, e o que está em escrita não abre.
 *
 * ## O rótulo vai ao lado, e não embaixo (Doug, 18/9: "tem que rolar muito")
 *
 * Com o nome embaixo, cada linha tinha ~165 px e cabiam três nós e meio numa
 * tela. Ao lado do nó, no lado que a onda deixou livre, a linha é a altura do
 * medalhão mais a folga — ~80 px. O `Trilho` liga os centros com o pontilhado.
 *
 * ## A onda
 *
 * Cada linha desloca o nó por `--onda × --passo` (`app/globals.css`). A onda
 * recomeça em cada nível, então todo nível começa no meio — e o troféu, que é
 * o fim do degrau, também volta ao meio.
 *
 * ## O próximo passo
 *
 * Um nó por página ganha o balão ("Começar", "Continuar", "Fazer a prova") e
 * o professor do outro lado do rótulo. Quem escolhe qual é a página; aqui só
 * se desenha. O `id="proximo"` é o alvo do `RolarAteOProximo`.
 */

const ONDA = [0, 1, 1.6, 1, 0, -1, -1.6, -1] as const;

export type Trofeu =
  | { readonly estado: "conquistado" }
  | { readonly estado: "pronto" }
  | { readonly estado: "fechado"; readonly falta: readonly string[] };

type Lado = "esquerda" | "direita";

export function Caminho({
  nivel,
  itens,
  trofeu,
  proximo,
}: {
  nivel: Nivel;
  itens: readonly ItemDoNivel[];
  trofeu: Trofeu;
  /** O id do item que é o próximo passo, `"trofeu"`, ou nada neste nível. */
  proximo: string | null;
}) {
  return (
    <div className={`trilha-caminho metal-${nivel} relative`}>
      <Trilho />
      <ol className="relative flex flex-col gap-5 pt-2 pb-2">
        {itens.map((item, i) => {
          const onda = ONDA[i % ONDA.length];
          const seguinte = ONDA[(i + 1) % ONDA.length];
          // O rótulo vai para o lado que a onda deixou livre; no meio, para o lado de onde ela vem.
          const lado: Lado = onda > 0 || (onda === 0 && seguinte > 0) ? "esquerda" : "direita";
          const eProximo = proximo === item.id;
          return (
            <li key={item.id} className={`flex justify-center ${eProximo ? "pt-9" : ""}`}>
              <div className="trilha-linha relative" style={{ "--onda": onda } as React.CSSProperties}>
                <No item={item} proximo={eProximo} lado={lado} />
                {eProximo ? <ProfessorAoLado lado={lado === "esquerda" ? "direita" : "esquerda"} /> : null}
              </div>
            </li>
          );
        })}
        <li className={`flex justify-center pt-2 ${proximo === "trofeu" ? "pt-9" : ""}`}>
          <div className="relative">
            <NoDoTrofeu nivel={nivel} trofeu={trofeu} proximo={proximo === "trofeu"} />
            {proximo === "trofeu" ? <ProfessorAoLado lado="esquerda" /> : null}
          </div>
        </li>
      </ol>
    </div>
  );
}

function ProfessorAoLado({ lado }: { lado: Lado }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -bottom-2 w-15 ${lado === "esquerda" ? "right-full mr-8" : "left-full ml-8"}`}
    >
      <Professor largura={60} />
    </div>
  );
}

/** O balão do próximo passo, em cima do nó, sem ocupar altura na linha. */
function Balao({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="trilha-balao absolute bottom-full z-10 left-1/2 mb-4 -translate-x-1/2 px-4 py-1.5 text-sm font-bold tracking-wide whitespace-nowrap uppercase"
    >
      {children}
    </span>
  );
}

function No({ item, proximo, lado }: { item: ItemDoNivel; proximo: boolean; lado: Lado }) {
  const tatica = item.href.startsWith("/tatica");
  const feito = item.feitos >= item.total;
  const estado = item.situacao === "aberto" ? (feito ? "feito" : "aberto") : item.situacao;
  const parte = item.total > 0 ? Math.min(1, item.feitos / item.total) : 0;

  const legenda =
    item.situacao === "em-escrita"
      ? "em escrita"
      : item.situacao === "adiante" && !feito
        ? "pode adiantar"
        : tatica
          ? feito
            ? "tema concluído"
            : item.feitos > 0
              ? `${item.feitos} de ${item.total} puzzles`
              : "tática"
          : feito
            ? "aula aprendida"
            : "finais";
  // A linha de baixo só aparece quando diz algo que o desenho não diz sozinho.
  const mostraLegenda = feito || proximo || item.feitos > 0 || item.situacao === "em-escrita";

  const icone =
    item.situacao === "em-escrita" ? (
      <Cadeado />
    ) : tatica ? (
      <IconeDoTema tag={item.id} tamanho={46} />
    ) : (
      <IconeDoSelo familia="finais" tamanho={28} />
    );

  const medalhao = (
    <span className={`trilha-no metal-${item.nivel}`} data-estado={estado} data-proximo={proximo || undefined}>
      {icone}
      {parte > 0 && !feito && item.situacao !== "em-escrita" ? <Anel parte={parte} /> : null}
      {feito ? <Marca /> : null}
    </span>
  );

  const rotulo = (
    <span
      className={`absolute top-1/2 flex w-28 -translate-y-1/2 flex-col sm:w-44 ${
        lado === "esquerda" ? "right-full mr-3 items-end text-right" : "left-full ml-3 items-start text-left"
      }`}
    >
      <span
        className={`line-clamp-3 text-sm leading-tight font-semibold sm:line-clamp-2 ${
          item.situacao === "aberto" ? "text-tinta" : "text-tinta-fraca"
        }`}
      >
        {item.nome}
      </span>
      {mostraLegenda ? (
        <span className={`mt-0.5 text-xs tabular-nums ${feito ? "font-medium text-metodo-tinta" : "text-tinta-fraca"}`}>
          {legenda}
        </span>
      ) : null}
    </span>
  );

  if (item.situacao === "em-escrita") {
    return (
      <div className="relative" title={`${item.nome} — ainda não foi escrita`}>
        {medalhao}
        {rotulo}
      </div>
    );
  }

  const acao = item.feitos > 0 ? "Continuar" : "Começar";
  return (
    <Link
      href={item.href}
      id={proximo ? "proximo" : undefined}
      aria-label={`${item.nome} — ${tatica ? "tática" : "finais"}, ${legenda}${proximo ? `. ${acao} aqui` : ""}`}
      className="foco relative block scroll-mt-40 rounded-full"
    >
      {proximo ? <Balao>{acao}</Balao> : null}
      {medalhao}
      {rotulo}
    </Link>
  );
}

function NoDoTrofeu({ nivel, trofeu, proximo }: { nivel: Nivel; trofeu: Trofeu; proximo: boolean }) {
  const titulo = `Prova do Nível ${nivel}`;
  const legenda =
    trofeu.estado === "conquistado"
      ? `Medalha de ${METAL[nivel]} conquistada`
      : trofeu.estado === "pronto"
        ? "Pronta: 12 puzzles, passa com 9"
        : trofeu.falta.length > 0
          ? `Falta ${trofeu.falta.join(", ")}`
          : "Abre quando o nível fechar";

  const estado = trofeu.estado === "conquistado" ? "feito" : trofeu.estado === "pronto" ? "aberto" : "fechado";
  const medalhao = (
    <span className={`trilha-no trilha-trofeu metal-${nivel}`} data-estado={estado} data-proximo={proximo || undefined}>
      <Taca />
      {trofeu.estado === "conquistado" ? <Marca /> : null}
    </span>
  );
  const rotulo = (
    <span className="mt-3 flex w-52 flex-col items-center text-center">
      <span className={`text-sm font-semibold ${trofeu.estado === "fechado" ? "text-tinta-fraca" : "text-tinta"}`}>
        {titulo}
      </span>
      <span
        className={`mt-0.5 text-xs ${trofeu.estado === "conquistado" ? "font-medium text-metodo-tinta" : "text-tinta-fraca"}`}
      >
        {legenda}
      </span>
    </span>
  );

  if (trofeu.estado !== "pronto") {
    return (
      <div className="flex flex-col items-center">
        {medalhao}
        {rotulo}
      </div>
    );
  }
  return (
    <Link
      href={`/nivel/${nivel}/prova`}
      prefetch={false}
      id={proximo ? "proximo" : undefined}
      aria-label={`${titulo} — ${legenda}`}
      className="foco relative flex scroll-mt-40 flex-col items-center rounded-2xl"
    >
      {proximo ? <Balao>Fazer a prova</Balao> : null}
      {medalhao}
      {rotulo}
    </Link>
  );
}

/** O anel verde do progresso parcial, que começa no alto e anda no sentido do relógio. */
function Anel({ parte }: { parte: number }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className="trilha-anel -rotate-90">
      <circle cx="50" cy="50" r="46" fill="none" strokeWidth="6" className="stroke-carta-toque" />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${(parte * 100).toFixed(2)} 100`}
        className="stroke-metodo-cheio"
      />
    </svg>
  );
}

/** O visto do concluído, no canto do medalhão. */
function Marca() {
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-papel bg-metodo-cheio text-tinta-inversa"
    >
      <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </span>
  );
}

function Cadeado() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** A taça do fim do nível. */
function Taca() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h10v5.5a5 5 0 0 1-10 0V3.5Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M7 5.5H4.5v1a3.5 3.5 0 0 0 3.2 3.5M17 5.5h2.5v1a3.5 3.5 0 0 1-3.2 3.5" />
      <path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" />
    </svg>
  );
}
