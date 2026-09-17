import { hojeNoBrasil, porExtenso } from "@/lib/curso/calendario";
import { corDoSelo, type Familia } from "@/lib/curso/selos";
import { Medalha } from "./Medalha";

type SeloNaLista = {
  readonly id: string;
  readonly familia: Familia;
  readonly nome: string;
  readonly conta: string;
  /** A data do ganho; ausente na vitrine de um colega, e nula no derivado ainda não gravado. */
  readonly conquistadoEm?: string | null;
};

/** `2026-09-12T18:00:00Z` → "12 de setembro", no dia de Guabiruba e não no de Greenwich. */
export function dataDoSelo(instante: string): string {
  return porExtenso(hojeNoBrasil(new Date(instante)));
}

type Grupo<T> = { readonly titulo: string | null; readonly selos: readonly T[] };

/**
 * Os selos em grupos, na ordem em que chegam: os de repertório por abertura ficam juntos sob
 * "Repertório de brancas" e "Repertório de pretas" (são onze, e soltos no meio dos outros viravam
 * uma lista de nomes de abertura sem contexto); os outros ficam num grupo sem título, na ordem do
 * catálogo.
 */
export function emGrupos<T extends { readonly id: string }>(selos: readonly T[]): Grupo<T>[] {
  const outros: T[] = [];
  const brancas: T[] = [];
  const pretas: T[] = [];
  for (const selo of selos) {
    const cor = corDoSelo(selo.id);
    (cor === "brancas" ? brancas : cor === "pretas" ? pretas : outros).push(selo);
  }
  return [
    { titulo: null, selos: outros },
    { titulo: "Repertório de brancas", selos: brancas },
    { titulo: "Repertório de pretas", selos: pretas },
  ].filter((g) => g.selos.length > 0);
}

/**
 * Os selos ganhos, em lista de medalhas: o desenho da família, o nome, a explicação e o dia em
 * que ele ganhou. Desde 17/9/2026 só o relatório do professor a usa — o perfil e a vitrine usam
 * a grade compacta abaixo.
 *
 * Uma coluna no celular e duas a partir de `sm`. Sem cartão em volta de cada um: a medalha já
 * é a forma, e doze cartões iguais empilhados seriam a grade de mobília que a página não quer.
 */
export function ListaDeSelos({ selos, rotulo }: { selos: readonly SeloNaLista[]; rotulo: string }) {
  return (
    <div className="flex flex-col gap-5">
      {emGrupos(selos).map((grupo) => (
        <div key={grupo.titulo ?? "selos"} className="flex flex-col gap-3">
          {grupo.titulo ? <h3 className="text-xs font-semibold text-tinta-media">{grupo.titulo}</h3> : null}
          <MedalhasGanhas selos={grupo.selos} rotulo={grupo.titulo ? `${rotulo}: ${grupo.titulo}` : rotulo} />
        </div>
      ))}
    </div>
  );
}

function MedalhasGanhas({ selos, rotulo }: { selos: readonly SeloNaLista[]; rotulo: string }) {
  return (
    <ul aria-label={rotulo} className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {selos.map((selo) => (
        <li key={selo.id} className="flex items-start gap-3">
          <Medalha familia={selo.familia} id={selo.id} ganho />
          <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            <span className="text-sm font-semibold text-tinta">{selo.nome}</span>
            <span className="text-xs text-tinta-media">{selo.conta}</span>
            {selo.conquistadoEm ? (
              <span className="text-xs text-tinta-fraca">
                Ganho em <time dateTime={selo.conquistadoEm}>{dataDoSelo(selo.conquistadoEm)}</time>
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------------------------ *
 * A grade compacta (17/9/2026)
 *
 * A pergunta do Doug: "se o aluno tiver as 45 conquistas, vai ocupar a tela inteira?" Ocupava —
 * a lista acima, uma linha de 64 px por selo, media 4.258 px no celular e 2.230 px no notebook
 * com as 45, e empurrava "A revisar hoje" para o fim do perfil. Daqui para baixo, o selo é uma
 * medalha com o nome curto embaixo, quatro por linha no celular e seis a partir de `sm`.
 *
 * - **O nome cabe em duas linhas**, e o que passar vira reticências. O nome inteiro continua no
 *   HTML (o `line-clamp` só recorta o desenho), então o leitor de tela lê tudo.
 * - **A conta e a data não aparecem escritas** na grade: vão para o `title` (quem tem mouse) e
 *   para um texto só de leitor de tela. Na lista das mais recentes, a data curta fica visível —
 *   é ela que diz por que aquelas seis estão ali.
 * - A `ListaDeSelos` acima fica para o relatório do professor, que quer a conta e a data de cada
 *   um por escrito.
 * ------------------------------------------------------------------------------------------ */

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** `2026-09-12T18:00:00Z` → "12 set", no dia de Guabiruba. */
function dataCurta(instante: string): string {
  const [, mes, dia] = hojeNoBrasil(new Date(instante)).split("-");
  return `${Number(dia)} ${MESES_CURTOS[Number(mes) - 1]}`;
}

/**
 * Os `quantos` ganhos mais recentes, do mais novo ao mais velho. O selo ainda sem data (derivado
 * que não chegou ao banco) acabou de ser ganho, então vem primeiro. Empate de instante — os que
 * a primeira gravação escreveu juntos — fica na ordem do catálogo.
 */
export function maisRecentes<T extends { readonly conquistadoEm?: string | null }>(selos: readonly T[], quantos: number): T[] {
  const tempo = (s: T) => (s.conquistadoEm ? Date.parse(s.conquistadoEm) : Number.POSITIVE_INFINITY);
  return [...selos].sort((a, b) => tempo(b) - tempo(a)).slice(0, quantos);
}

type GrupoDeFamilia = "nivel" | "tatica" | "rating" | "finais" | "aberturas" | "brancas" | "pretas" | "constancia";

const TITULO_DO_GRUPO: Record<GrupoDeFamilia, string> = {
  nivel: "Níveis",
  tatica: "Tática",
  rating: "Tática rating",
  finais: "Finais",
  aberturas: "Aberturas",
  brancas: "Repertório de brancas",
  pretas: "Repertório de pretas",
  constancia: "Constância",
};

const GRUPO_DA_FAMILIA: Record<Familia, GrupoDeFamilia> = {
  nivel: "nivel",
  tatica: "tatica",
  puzzles: "tatica",
  pontaria: "tatica",
  rating: "rating",
  finais: "finais",
  repertorio: "aberturas",
  abertura: "aberturas",
  hora: "constancia",
  constante: "constancia",
};

/**
 * A coleção inteira em famílias, cada uma com título. Algumas famílias pequenas moram juntas
 * — puzzles e pontaria em "Tática"; o Base, o Avançado e o curso em "Aberturas"; a hora e os
 * dias seguidos em "Constância" — para a coleção não virar dez títulos com uma medalha cada.
 * Os selos de repertório por abertura continuam separados por cor, como na lista.
 */
export function porFamilia<T extends { readonly id: string; readonly familia: Familia }>(
  selos: readonly T[],
): { readonly titulo: string; readonly selos: readonly T[] }[] {
  const grupos = new Map<GrupoDeFamilia, T[]>(Object.keys(TITULO_DO_GRUPO).map((g) => [g as GrupoDeFamilia, []]));
  for (const selo of selos) {
    grupos.get(corDoSelo(selo.id) ?? GRUPO_DA_FAMILIA[selo.familia])?.push(selo);
  }
  return [...grupos]
    .filter(([, lista]) => lista.length > 0)
    .map(([grupo, lista]) => ({ titulo: TITULO_DO_GRUPO[grupo], selos: lista }));
}

/** A grade de medalhas: quatro por linha no celular, seis a partir de `sm`. */
export function MedalhasCompactas({
  selos,
  rotulo,
  comData = false,
  className = "",
}: {
  selos: readonly SeloNaLista[];
  rotulo: string;
  /** Mostra a data curta embaixo do nome — só na lista das mais recentes. */
  comData?: boolean;
  className?: string;
}) {
  return (
    <ul aria-label={rotulo} className={`grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 ${className}`}>
      {selos.map((selo) => {
        const data = selo.conquistadoEm ? dataDoSelo(selo.conquistadoEm) : null;
        return (
          <li
            key={selo.id}
            title={`${selo.nome}. ${selo.conta}${data ? ` Ganho em ${data}.` : ""}`}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            <Medalha familia={selo.familia} id={selo.id} ganho />
            <span className="line-clamp-2 w-full text-xs leading-4 font-medium wrap-break-word hyphens-auto text-tinta">
              {selo.nome}
            </span>
            <span className="sr-only">
              {selo.conta}
              {data ? ` Ganho em ${data}.` : ""}
            </span>
            {comData && selo.conquistadoEm ? (
              <time
                aria-hidden
                dateTime={selo.conquistadoEm}
                className="-mt-1 text-xs leading-4 text-tinta-fraca tabular-nums"
              >
                {dataCurta(selo.conquistadoEm)}
              </time>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** A coleção inteira, família por família, na grade compacta. */
export function GradeDeSelos({ selos, rotulo }: { selos: readonly SeloNaLista[]; rotulo: string }) {
  return (
    <div className="flex flex-col gap-5">
      {porFamilia(selos).map((grupo) => (
        <div key={grupo.titulo} className="flex flex-col gap-2.5">
          <h3 className="text-xs font-semibold text-tinta-media">{grupo.titulo}</h3>
          <MedalhasCompactas selos={grupo.selos} rotulo={`${rotulo}: ${grupo.titulo}`} />
        </div>
      ))}
    </div>
  );
}

const ULTIMAS = 6;

/**
 * As conquistas de "Meu perfil": as seis mais recentes à vista e, se houver mais, "Ver todas as N"
 * abre a coleção inteira **nesta** página.
 *
 * `<details>`, e não um estado de React: abre sem JavaScript, e o leitor de tela já anuncia
 * "expandido" e "recolhido" no `<summary>`. Aberta, a coleção **substitui** as seis recentes (o
 * `:has` esconde a lista de cima), para a mesma medalha não aparecer duas vezes seguidas.
 */
export function ConquistasDoPerfil({ selos }: { selos: readonly SeloNaLista[] }) {
  if (selos.length <= ULTIMAS) {
    return <MedalhasCompactas selos={maisRecentes(selos, ULTIMAS)} rotulo="Selos ganhos, do mais recente" comData />;
  }
  return (
    <div className="group/conquistas flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 group-has-[details[open]]/conquistas:hidden">
        <h3 className="text-xs font-semibold text-tinta-media">As mais recentes</h3>
        <MedalhasCompactas selos={maisRecentes(selos, ULTIMAS)} rotulo="As conquistas mais recentes" comData />
      </div>
      <details className="group/todas">
        <summary className="foco -mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-metodo-tinta hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open/todas:hidden">Ver todas as {selos.length}</span>
          <span className="hidden group-open/todas:inline">Mostrar só as mais recentes</span>
          <svg
            aria-hidden
            focusable="false"
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 group-open/todas:rotate-180 motion-safe:transition-transform"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="mt-3">
          <GradeDeSelos selos={selos} rotulo="Selos ganhos" />
        </div>
      </details>
    </div>
  );
}

/** Os próximos, trancados: a medalha apagada e o que falta, escrito. */
export function SelosPerto({ selos }: { selos: readonly (SeloNaLista & { readonly falta: string | null })[] }) {
  return (
    <ul aria-label="Selos mais perto" className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {selos.map((selo) => (
        <li key={selo.id} className="flex items-start gap-3">
          <Medalha familia={selo.familia} id={selo.id} ganho={false} />
          <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            <span className="text-sm font-medium text-tinta-media">{selo.nome}</span>
            <span className="text-xs text-tinta-fraca">{selo.falta}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
