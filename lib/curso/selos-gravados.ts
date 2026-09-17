import { familiaDoId, type Familia, type Selo } from "./selos.ts";

/**
 * O selo **gravado** (0018, 17/9/2026): a data em que o aluno ganhou, e o aviso de selo novo.
 *
 * ## Por que gravar, se o selo é derivado
 *
 * `selos()` deriva tudo do progresso, e continua derivando. O que a derivação não sabe é
 * **quando** — e sem o quando não há "Selo novo!", nem data na conquista. Então o servidor,
 * ao montar o painel e o perfil, grava o que acabou de derivar em `selo_conquistado`, e a
 * primeira gravação é a data.
 *
 * ## Selo gravado nunca some
 *
 * Se a derivação deixar de valer (o Base ganhou duas linhas, um curso foi despublicado), o
 * selo continua do aluno: `comDatas` o devolve ganho. Não existe "remover" no plano.
 *
 * ## A primeira vez é calada
 *
 * No dia em que a 0018 entra, todo aluno antigo tem selos derivados e nenhum gravado. Anunciar
 * seria vinte confetes pelo que ele fez há semanas. Então a primeira leitura grava tudo **já
 * visto**, e marca o início em `selo_inicio`. A marca é o que separa "primeira vez" de "ainda
 * não tem selo nenhum": sem ela, o aluno novo que abriu o painel zerado teria o **primeiro**
 * selo de verdade gravado calado, na visita seguinte.
 *
 * Tudo aqui é puro; `lib/curso/selos-banco.ts` só executa o plano.
 */

export type SeloGravado = {
  readonly selo: string;
  readonly conquistadoEm: string;
  /** Quando o aviso "Selo novo" foi mostrado. `null`: ainda não foi. */
  readonly vistoEm: string | null;
};

export type LinhaParaGravar = {
  readonly selo: string;
  readonly conquistado_em: string;
  readonly visto_em: string | null;
};

export type PlanoDosSelos = {
  /** O aluno nunca teve os selos avaliados: tudo entra calado. */
  readonly primeiraVez: boolean;
  /** As linhas novas de `selo_conquistado`. Nunca inclui um selo já gravado. */
  readonly gravar: readonly LinhaParaGravar[];
  /** Grava a marca em `selo_inicio` (depois das linhas, para uma falha no meio não virar festa). */
  readonly marcarInicio: boolean;
  /** Os ids a anunciar agora — gravados e ainda não vistos, mais os novos. */
  readonly anunciar: readonly string[];
};

export function planoDosSelos(p: {
  /** Os ids que `selos()` deu como ganhos agora, na ordem da lista. */
  readonly ganhos: readonly string[];
  readonly gravados: readonly SeloGravado[];
  /** Existe linha em `selo_inicio` para o aluno. */
  readonly iniciado: boolean;
  readonly agora: string;
}): PlanoDosSelos {
  const jaGravados = new Set(p.gravados.map((g) => g.selo));
  const novos = p.ganhos.filter((id) => !jaGravados.has(id));

  if (!p.iniciado) {
    return {
      primeiraVez: true,
      gravar: novos.map((selo) => ({ selo, conquistado_em: p.agora, visto_em: p.agora })),
      marcarInicio: true,
      anunciar: [],
    };
  }

  const naoVistos = p.gravados.filter((g) => g.vistoEm === null).map((g) => g.selo);
  return {
    primeiraVez: false,
    gravar: novos.map((selo) => ({ selo, conquistado_em: p.agora, visto_em: null })),
    marcarInicio: false,
    anunciar: [...naoVistos, ...novos],
  };
}

export type SeloComData = Selo & {
  /** Quando foi gravado. `null` no derivado que ainda não chegou ao banco. */
  readonly conquistadoEm: string | null;
};

const NOME_DA_FAMILIA: Record<Familia, string> = {
  tatica: "Tática",
  finais: "Finais",
  repertorio: "Repertório",
  nivel: "Nível",
  hora: "Tempo de treino",
  constante: "Constância",
  puzzles: "Puzzles",
  pontaria: "Pontaria",
  abertura: "Curso de abertura",
  rating: "Tática rating",
};

/**
 * Selos que saíram do catálogo e continuam gravados para quem os ganhou, com o nome que tinham.
 * Os dois de cor viraram um selo por abertura em 17/9/2026.
 */
const SELOS_ANTIGOS: Readonly<Record<string, { nome: string; conta: string }>> = {
  "repertorio-brancas": { nome: "Repertório de brancas", conta: "Todas as linhas de brancas do Base, aprendidas." },
  "repertorio-pretas": { nome: "Repertório de pretas", conta: "Todas as linhas de pretas do Base, aprendidas." },
};

/**
 * A lista de selos com a data de cada ganho, e com os gravados valendo por cima da derivação.
 *
 * - selo da lista com linha gravada: **ganho**, com a data — mesmo que a derivação diga que não;
 * - selo derivado sem linha (a gravação falhou): ganho, sem data;
 * - linha gravada cujo id a lista de hoje não conhece (curso despublicado): entra no fim, ganha,
 *   com o nome da família — some a explicação, não o selo.
 */
export function comDatas(lista: readonly Selo[], gravados: readonly SeloGravado[]): SeloComData[] {
  const porId = new Map(gravados.map((g) => [g.selo, g]));
  const conhecidos = new Set(lista.map((s) => s.id));

  const daLista: SeloComData[] = lista.map((selo) => {
    const g = porId.get(selo.id);
    return g ? { ...selo, ganho: true, falta: null, conquistadoEm: g.conquistadoEm } : { ...selo, conquistadoEm: null };
  });

  const orfaos: SeloComData[] = gravados
    .filter((g) => !conhecidos.has(g.selo))
    .flatMap((g) => {
      const familia = familiaDoId(g.selo);
      if (!familia) return [];
      return [
        {
          id: g.selo,
          familia,
          nome: SELOS_ANTIGOS[g.selo]?.nome ?? `${NOME_DA_FAMILIA[familia]}: conquista`,
          conta: SELOS_ANTIGOS[g.selo]?.conta ?? "Uma conquista que continua sua, mesmo que o conteúdo tenha mudado.",
          ganho: true,
          falta: null,
          conquistadoEm: g.conquistadoEm,
        },
      ];
    });

  return [...daLista, ...orfaos];
}

/** Quantos ids uma chamada de "marcar visto" aceita — há ~40 selos no catálogo. */
const MAXIMO_PARA_MARCAR = 60;
const ID_DE_SELO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Os ids que a server action `marcarSelosVistos` aceita do navegador: uma lista de textos no
 * formato de id, sem nada mais. O que vem do navegador pode ser qualquer coisa; o que chega ao
 * `update` é só isto (e o `update` ainda filtra pelo aluno da sessão).
 */
export function idsParaMarcarVistos(pedido: unknown): string[] {
  if (!Array.isArray(pedido)) return [];
  const ids = pedido.filter((x): x is string => typeof x === "string" && x.length <= 80 && ID_DE_SELO.test(x));
  return [...new Set(ids)].slice(0, MAXIMO_PARA_MARCAR);
}
