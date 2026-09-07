import { chaveDe } from "../tatica/chave.ts";

/**
 * O explorer do Lichess: o que **as crianças** jogam, não o que os GM jogam.
 *
 * É o número que decide o repertório, e por isso ele subiu de bloco. As fontes
 * são draft de GM: troncos até o lance 15–17, o ramo principal escolhido pela
 * verdade teórica. Numa sala de clube a verdade é outra — na Escocesa, por
 * exemplo, o `4…Bc5` do tronco do Grigoryan aparece em 16 % dos jogos e o
 * `4…Nxd4?!`, que ele mostra numa sub-variante marcada `$2`, aparece em 52 %.
 * Escrever as linhas antes de medir seria podar 336 ramos para 40 no chute e
 * refazer depois.
 *
 * ## Vocabulário
 *
 * - **explorer** — o banco de partidas online do Lichess, com um endereço que
 *   responde "nesta posição, o que cada faixa de rating joga, e em quantos
 *   jogos".
 * - **faixa** (`ratings`) — o explorer agrupa em **baldes fixos**, nomeados
 *   pelo piso: `0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500`, cada um
 *   indo até o próximo. Duas consequências que somem fácil e mudam a leitura
 *   da tabela inteira. A primeira: pedir `1000,1200,1400` traz jogadores de
 *   **1000 a 1599**, não de 1000 a 1400. A segunda: **não existe balde abaixo
 *   de 1000** — o piso é um só, de 0 a 999, e não há como pedir "700".
 * - **a escala** — o número é o do **Lichess**, que não é o do chess.com. Lá
 *   todo mundo começa em 1500, então, para a mesma força, o número do Lichess
 *   é maior. Ler um recorte daqui como se fosse a força do clube foi o erro
 *   que gerou o ⚠13 do `docs/REPERTORIO.md`; por isso os nomes abaixo dizem
 *   `lichess-` na cara.
 * - **cache** — a resposta guardada em arquivo. O explorer é gentil mas tem
 *   limite; e uma medição que muda sozinha entre duas rodadas não serve para
 *   justificar corte de conteúdo.
 *
 * ## Nunca trava o resto
 *
 * Sem token, com 401, com a rede fora, com o formato mudado: a consulta devolve
 * `null` e quem chamou escreve "sem dados". Compilar e validar o repertório não
 * dependem disto — medir é uma coisa, e provar que os lances são legais é outra.
 *
 * **Mas "sem dados" tem de significar "o explorer não sabe", e não "o explorer
 * pediu para eu esperar".** Um 429 não é resposta: é adiamento, e virar `null`
 * ali faz a tabela mentir para quem corta conteúdo por causa dela. Por isso a
 * consulta recua e insiste nos códigos que pedem tempo — ver `recuoDe`.
 */

export type RespostaDoExplorer = {
  san: string;
  uci: string;
  jogos: number;
  /** Percentual dos jogos **daquela posição**, arredondado a uma casa. */
  pct: number;
};

export type Posicao = {
  /** Quantos jogos o explorer tem nesta posição, nas faixas pedidas. */
  jogos: number;
  respostas: RespostaDoExplorer[];
};

/**
 * As faixas candidatas, nomeadas.
 *
 * O ⚠13 pede comparar o recorte medido com o do público de verdade. Elas vivem
 * aqui juntas, e não numa constante trocada na mão, porque a comparação só vale
 * se as três puderem ser medidas **na mesma rodada** — e porque o cache em
 * disco é separado por este nome.
 */
export const RECORTES = {
  /** O que a §6 mediu até 6/9/2026, e o que está commitado no cache. */
  "lichess-1000-1599": [1000, 1200, 1400],
  /** ≈ chess.com 700–1700 — o público do clube, convertido entre as escalas. */
  "lichess-1000-1999": [1000, 1200, 1400, 1600, 1800],
  /** A leitura literal do ⚠13, que arrasta o balde do piso inteiro junto. */
  "lichess-0-1799": [0, 1000, 1200, 1400, 1600],
} as const;

export type Recorte = keyof typeof RECORTES;

export const RECORTES_NOMES = Object.keys(RECORTES) as Recorte[];

/**
 * O recorte que vale quando ninguém pede outro.
 *
 * Enquanto ele apontar para o que já está medido, a tabela da §6 continua
 * reproduzível sem tocar na rede — e é essa reprodutibilidade que dá direito de
 * comparar. Movê-lo **muda a §6**: é decisão de documento, não de código, e a
 * medição vem antes.
 */
export const RECORTE_PADRAO: Recorte = "lichess-1000-1599";

export const FAIXAS: readonly number[] = RECORTES[RECORTE_PADRAO];

export const RITMOS = ["rapid", "classical"] as const;

/** Abaixo disto o percentual é ruído, e a tabela diz "poucos jogos". */
export const JOGOS_MINIMOS = 200;

const ENDERECO = "https://explorer.lichess.ovh/lichess";

/** O endereço completo de uma consulta. É também a chave do cache. */
export function enderecoDe(
  play: readonly string[],
  faixas: readonly number[] = FAIXAS,
): string {
  const busca = new URLSearchParams({
    variant: "standard",
    speeds: RITMOS.join(","),
    ratings: faixas.join(","),
    play: play.join(","),
    moves: "12",
    topGames: "0",
    recentGames: "0",
  });
  return `${ENDERECO}?${busca}`;
}

type Bruto = {
  white?: number;
  draws?: number;
  black?: number;
  moves?: Array<{ san?: string; uci?: string; white?: number; draws?: number; black?: number }>;
};

/**
 * Da resposta crua do explorer para o que a tabela usa.
 *
 * O explorer devolve vitórias/empates/derrotas separados; o que interessa aqui
 * é só **quantas vezes o lance foi jogado**, que é a soma dos três. Quem ganhou
 * não entra na decisão: a pergunta é "o aluno vai ver isto?", não "isto é bom?".
 */
export function resumir(bruto: unknown): Posicao | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const dados = bruto as Bruto;
  if (!Array.isArray(dados.moves)) return null;

  const soma = (x: { white?: number; draws?: number; black?: number }): number =>
    (x.white ?? 0) + (x.draws ?? 0) + (x.black ?? 0);

  const jogos = soma(dados);
  const respostas = dados.moves
    .filter((m): m is { san: string; uci: string } & typeof m => Boolean(m.san && m.uci))
    .map((m) => ({
      san: m.san,
      uci: m.uci,
      jogos: soma(m),
      pct: jogos === 0 ? 0 : Math.round((soma(m) / jogos) * 1000) / 10,
    }))
    .sort((a, b) => b.jogos - a.jogos);

  return { jogos, respostas };
}

/**
 * As respostas que o nível precisa cobrir, e as que sobram.
 *
 * **A definição operacional do corte**, que o plano deixara em aberto. Ele dizia
 * "≥ 10 % de frequência", sem dizer de quê: medido contra o nó pai, esse corte
 * joga a Caro-Kann inteira (4,7 % das respostas a 1.e4) para fora do Base;
 * medido em absoluto, sobram só 1…e5 e 1…c5. Nenhum dos dois é o que se quer.
 *
 * O que se quer é: **numa posição em que o adversário escolhe, o aluno tem de
 * ter resposta para a maior parte do que ele vai ver.** Então as respostas
 * entram em ordem de frequência até cobrir a fatia pedida daquela posição, com
 * um teto de quantas cabem — porque "poucas ideias" é o critério pedagógico, e
 * seis respostas numa posição só já é decoreba.
 */
export function aCobrir(
  posicao: Posicao,
  { fatia = 0.8, teto = 4 }: { fatia?: number; teto?: number } = {},
): { entram: RespostaDoExplorer[]; sobram: RespostaDoExplorer[]; coberto: number } {
  const entram: RespostaDoExplorer[] = [];
  let acumulado = 0;
  for (const resposta of posicao.respostas) {
    if (entram.length >= teto || acumulado >= fatia * 100) break;
    entram.push(resposta);
    acumulado += resposta.pct;
  }
  return {
    entram,
    sobram: posicao.respostas.slice(entram.length),
    coberto: Math.round(acumulado * 10) / 10,
  };
}

/* ------------------------------------------------------------------ *
 * A consulta, com cache
 * ------------------------------------------------------------------ */

export type Cache = {
  ler(chave: string): unknown | undefined;
  gravar(chave: string, valor: unknown): void;
};

export type Opcoes = {
  cache?: Cache;
  token?: string | undefined;
  /** Injetável para o teste não tocar na rede. */
  buscar?: typeof fetch;
  /** Milissegundos entre duas idas à rede. */
  intervalo?: number;
  /** Para onde vão os avisos. */
  avisar?: (mensagem: string) => void;
  /** A faixa de rating desta consulta. Entra na chave do cache. */
  faixas?: readonly number[];
  /**
   * Só o cache: nem token, nem rede, e nenhum aviso — foi escolha de quem
   * rodou, não falha. Diferente de `token: undefined`, que **é** falha e avisa.
   */
  semRede?: boolean;
  /** Quantas idas à rede no máximo, contando a primeira. */
  tentativas?: number;
  /** O recuo depois de um 429 que não diz quanto esperar. Zero no teste. */
  recuo?: number;
};

/**
 * Um nome de arquivo estável para a consulta.
 *
 * O hash é do **endereço inteiro**, que carrega `ratings=` — então dois
 * recortes nunca colidem, e nenhum lê o cache do outro. O hash não conhece o
 * caminho em disco: mover os arquivos para uma subpasta por recorte não muda
 * chave nenhuma.
 */
export const chaveDoCache = (
  play: readonly string[],
  faixas: readonly number[] = FAIXAS,
): string =>
  `${play.length}-${chaveDe(enderecoDe(play, faixas)).toString(16).padStart(8, "0")}`;

/* ------------------------------------------------------------------ *
 * Quando o explorer manda esperar
 * ------------------------------------------------------------------ */

/**
 * Os códigos em que insistir faz sentido.
 *
 * `429` é o explorer dizendo "devagar" — a documentação do Lichess pede um
 * minuto inteiro de pausa antes de voltar. `5xx` é o servidor tropeçando, que
 * por definição é passageiro. Todo o resto (401 com token ruim, 404) é
 * resposta definitiva: repetir daria a mesma coisa, mais devagar.
 */
const pedeTempo = (status: number): boolean => status === 429 || status >= 500;

/** Nenhum recuo passa disto, nem que o servidor peça. */
export const TETO_DO_RECUO = 120_000;

/** O recuo padrão de um 429 — o minuto que a documentação do Lichess pede. */
export const RECUO_PADRAO = 60_000;

/**
 * Quanto esperar antes de tentar de novo.
 *
 * O `Retry-After` do servidor ganha de qualquer palpite nosso, quando vem em
 * segundos; ele também aceita uma **data** HTTP, e aí `Number` dá `NaN` e a
 * conta cai no padrão em vez de virar espera de tempo indefinido.
 */
export function recuoDe(
  resposta: { status: number; headers: { get(nome: string): string | null } },
  tentativa: number,
  base: number,
): number {
  const pedido = Number(resposta.headers.get("retry-after"));
  if (Number.isFinite(pedido) && pedido > 0) return Math.min(pedido * 1000, TETO_DO_RECUO);
  // O 429 custa o minuto cheio; o tropeço de servidor não merece tanto.
  return resposta.status === 429 ? base : Math.min(base, 2_000 * tentativa);
}

const dormir = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((pronto) => setTimeout(pronto, ms));

let ultimaIda = 0;

/**
 * Consulta uma posição, pelo caminho de lances em UCI a partir do início.
 *
 * Cache primeiro, rede depois — e a espera do intervalo só acontece quando a
 * rede é mesmo necessária. Uma segunda rodada do script não faz requisição
 * nenhuma, que é o que torna a tabela reproduzível.
 *
 * **Um 429 não é resposta, é adiamento.** Antes, ele virava `null` e a posição
 * saía "sem dados" — indistinguível, na tabela, de uma posição que o explorer
 * realmente não conhece. Quem lesse a tabela cortaria conteúdo por causa de um
 * limite de requisições. Agora a consulta espera o que o servidor pedir e
 * insiste; só desiste depois de `tentativas` idas, e aí o aviso diz o código.
 */
export async function consultar(
  play: readonly string[],
  opcoes: Opcoes = {},
): Promise<Posicao | null> {
  const {
    cache,
    token = process.env.LICHESS_TOKEN,
    buscar = fetch,
    intervalo = 1500,
    avisar = () => {},
    faixas = FAIXAS,
    semRede = false,
    tentativas = 3,
    recuo: recuoBase = RECUO_PADRAO,
  } = opcoes;

  const chave = chaveDoCache(play, faixas);
  const guardado = cache?.ler(chave);
  if (guardado !== undefined) return resumir(guardado);

  if (semRede) return null;

  if (!token) {
    avisar("sem LICHESS_TOKEN no .env.local — a cobertura sai como “sem dados”");
    return null;
  }

  const onde = play.join(",") || "(início)";

  for (let tentativa = 1; ; tentativa += 1) {
    const espera = ultimaIda + intervalo - Date.now();
    if (espera > 0) await dormir(espera);
    ultimaIda = Date.now();

    let resposta: Awaited<ReturnType<typeof fetch>>;
    try {
      resposta = await buscar(enderecoDe(play, faixas), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch (erro) {
      avisar(`o explorer não respondeu (${String(erro)})`);
      return null;
    }

    if (resposta.ok) {
      let bruto: unknown;
      try {
        bruto = await resposta.json();
      } catch (erro) {
        avisar(`o explorer não respondeu (${String(erro)})`);
        return null;
      }
      const lido = resumir(bruto);
      if (lido) cache?.gravar(chave, bruto);
      else avisar(`resposta do explorer em formato inesperado em ${onde}`);
      return lido;
    }

    if (!pedeTempo(resposta.status) || tentativa >= tentativas) {
      const insistiu = tentativa > 1 ? ` (desisti depois de ${tentativa} tentativas)` : "";
      avisar(`o explorer respondeu ${resposta.status} em ${onde}${insistiu}`);
      return null;
    }

    const quanto = recuoDe(resposta, tentativa, recuoBase);
    avisar(
      `o explorer respondeu ${resposta.status} — esperando ${Math.round(quanto / 1000)} s ` +
        `e tentando de novo (${tentativa} de ${tentativas - 1})`,
    );
    await dormir(quanto);
  }
}
