/**
 * O leitor do que `scripts/validate-content.ts --jsonl` fala.
 *
 * O editor **nunca** lê o texto humano do gate. O terminal imprime uma linha
 * vermelha com o código entre colchetes e a mensagem embaixo; isso é para o
 * Doug ler no terminal, e `scripts/mutation-check.ts` depende do formato exato.
 * Um analisador de tela em cima dele quebraria na primeira vez que alguém
 * mexesse numa cor. A flag `--jsonl` existe para isto, e este arquivo é o único
 * lugar do editor que sabe o formato dela.
 *
 * ## Por que o `stdout` vem misturado
 *
 * Os eventos JSON saem **junto** com a saída humana, na mesma torneira (a
 * decisão está explicada no gate, junto de `emitir`). Então o leitor pula toda
 * linha que não seja um objeto JSON com `tipo`: as linhas de terminal, as
 * linhas em branco, e qualquer coisa que um `console.log` esquecido escreva.
 *
 * ## Por que a aula é extraída de `onde`
 *
 * O gate identifica o problema por uma string composta à mão, em pelo menos
 * cinco formatos: `aula N1-KPK`, `N1-KPK / guided`, `N1-KPK / guided / n3`,
 * `posição pos-n1-kpk-dlv-1-3`, ou um caminho de arquivo. Não há campo `aula`,
 * e criar um custaria tocar em ~60 pontos de chamada dentro do gate, cada um
 * uma chance de errar em silêncio. O id de aula tem forma própria e distinta
 * (`N` + número + maiúsculas), então achá-lo dentro da string é confiável e,
 * mais importante, é **testável aqui** em vez de espalhado lá.
 */

export type Problema = {
  tipo: "problema";
  code: string;
  onde: string;
  message: string;
};

export type Progresso = {
  tipo: "progresso";
  texto: string;
};

export type Resumo = {
  tipo: "resumo";
  posicoes: number;
  aulas: number;
  tablebase: { consultadas: number; doCache: number; pelaRede: number };
  rascunhos: { aulas: number; posicoes: number } | null;
  promovidos: string[];
  problemas: number;
};

export type Fim = {
  tipo: "fim";
  exit: number;
};

export type EventoDoGate = Problema | Progresso | Resumo | Fim;

/**
 * O id de aula escondido numa string do gate, ou `null`.
 *
 * A forma é a de `lessonIdSchema` (`lib/lesson/schema.ts:837`): `N`, um número,
 * um hífen, e maiúsculas com números e hífens. Os ids de posição são
 * minúsculos (`pos-…`), então não há como confundir os dois.
 */
export function aulaDoOnde(onde: string): string | null {
  const achado = /\bN[0-9]+-[A-Z0-9-]+/.exec(onde);
  if (!achado) return null;
  // Um hífen no fim viria de um `where` como "N1-KPK - alguma coisa"; o id não
  // termina em hífen.
  return achado[0].replace(/-+$/, "");
}

/**
 * O diagrama que este problema aponta, ou `null`.
 *
 * O gate escreve o passo dentro do `onde`, em dois formatos, um por etapa:
 * `aula N1-KPK / treino / roteiro[3]` (a aula assistida, `validate-content.ts`
 * linha 1153) e `aula N1-KPK / intro / passos[2]` (a apresentação, linha 1334).
 * É com isto que a tela acende a borda vermelha **no selo do diagrama** em vez
 * de despejar uma lista de códigos embaixo da aula: `TREINO_SEM_NO` não quer
 * dizer nada para quem não escreveu o gate, mas "este diagrama aqui" quer.
 */
export function diagramaDoOnde(
  onde: string,
): { etapa: "intro" | "objective"; indice: number } | null {
  const roteiro = /roteiro\[(\d+)\]/.exec(onde);
  if (roteiro) return { etapa: "objective", indice: Number(roteiro[1]) };
  const passos = /passos\[(\d+)\]/.exec(onde);
  if (passos) return { etapa: "intro", indice: Number(passos[1]) };
  return null;
}

function numero(valor: unknown, padrao = 0): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : padrao;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Uma linha vira evento, ou `null` se ela não é nossa. */
function evento(linha: string): EventoDoGate | null {
  const cru = linha.trim();
  if (!cru.startsWith("{")) return null;

  let obj: Record<string, unknown>;
  try {
    const lido: unknown = JSON.parse(cru);
    if (typeof lido !== "object" || lido === null || Array.isArray(lido)) return null;
    obj = lido as Record<string, unknown>;
  } catch {
    return null;
  }

  switch (obj.tipo) {
    case "problema":
      return {
        tipo: "problema",
        code: texto(obj.code),
        onde: texto(obj.onde),
        message: texto(obj.message),
      };
    case "progresso":
      return { tipo: "progresso", texto: texto(obj.texto) };
    case "resumo": {
      const tb = (obj.tablebase ?? {}) as Record<string, unknown>;
      const ra = obj.rascunhos as Record<string, unknown> | null | undefined;
      return {
        tipo: "resumo",
        posicoes: numero(obj.posicoes),
        aulas: numero(obj.aulas),
        tablebase: {
          consultadas: numero(tb.consultadas),
          doCache: numero(tb.doCache),
          pelaRede: numero(tb.pelaRede),
        },
        rascunhos:
          ra && typeof ra === "object"
            ? { aulas: numero(ra.aulas), posicoes: numero(ra.posicoes) }
            : null,
        promovidos: Array.isArray(obj.promovidos) ? obj.promovidos.map(texto) : [],
        problemas: numero(obj.problemas),
      };
    }
    case "fim":
      return { tipo: "fim", exit: numero(obj.exit, 1) };
    default:
      return null;
  }
}

export function lerJsonl(saida: string): EventoDoGate[] {
  const eventos: EventoDoGate[] = [];
  for (const linha of saida.split("\n")) {
    const e = evento(linha);
    if (e) eventos.push(e);
  }
  return eventos;
}

export type Passada = {
  /** O código de saída: 0 verde, 1 conteúdo recusado, 2 erro de argumento. */
  exit: number;
  /** Verde é `exit === 0` **e** nenhum problema. Os dois, porque um sem o outro seria bug. */
  verde: boolean;
  problemas: Array<
    Problema & {
      aula: string | null;
      diagrama: { etapa: "intro" | "objective"; indice: number } | null;
    }
  >;
  progresso: string[];
  resumo: Resumo | null;
};

/**
 * A conferência inteira, a partir do que saiu no cano.
 *
 * `exitDoProcesso` entra porque um gate que morre de verdade (exceção não
 * tratada, processo derrubado) não emite `fim` nenhum, e o silêncio não pode
 * ser lido como verde. Sem evento de fim, vale o código do processo; e se nem
 * ele existir, é vermelho.
 */
export function lerPassada(saida: string, exitDoProcesso: number | null): Passada {
  const eventos = lerJsonl(saida);
  const fim = eventos.find((e): e is Fim => e.tipo === "fim");
  const exit = fim ? fim.exit : (exitDoProcesso ?? 1);
  const problemas = eventos
    .filter((e): e is Problema => e.tipo === "problema")
    .map((p) => ({ ...p, aula: aulaDoOnde(p.onde), diagrama: diagramaDoOnde(p.onde) }));
  return {
    exit,
    verde: exit === 0 && problemas.length === 0,
    problemas,
    progresso: eventos.filter((e): e is Progresso => e.tipo === "progresso").map((e) => e.texto),
    resumo: eventos.find((e): e is Resumo => e.tipo === "resumo") ?? null,
  };
}
