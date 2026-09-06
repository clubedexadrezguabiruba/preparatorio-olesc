import { hojeNoBrasil } from "../curso/calendario.ts";
import type { Cor, Linha } from "./linhas.ts";

/**
 * O juiz do repertório e a ordem em que as linhas voltam.
 *
 * **Roda nos dois lados, e é por isso que este arquivo não é `server-only`.**
 * O tabuleiro precisa dele para recusar o lance no instante em que a peça
 * encosta na casa; o servidor precisa dele porque o navegador é do aluno. Uma
 * cópia só, nenhuma chance de a tela dizer "certo" e o relatório contar
 * "errado" — a mesma regra de `lib/tatica/conferir.ts`.
 *
 * ## Por que não é a `conferir.ts` da tática
 *
 * Porque lá **qualquer mate conta**, e é a regra certa lá: dizer "errado" para
 * um xeque-mate ensinaria o aluno a desconfiar do acerto. Aqui a pergunta é
 * outra. Uma abertura não tem solução: tem uma linha escolhida, e decorá-la é
 * o exercício inteiro. Um lance bom que não é o do repertório é **errado para
 * este fim** — senão o treinador aprovaria a partida do aluno em vez de ensinar
 * a linha do clube.
 *
 * O que existe no lugar do "mate conta" são os dois canais explícitos do
 * arquivo: `alternativas`, que o autor marcou como igualmente boas, e
 * `errosNomeados`, que a fonte mostra **de propósito como errados** — para o
 * treinador dar o aviso certo em vez de só dizer "não".
 */

/**
 * Quantas vezes seguidas a linha inteira, sem erro, para ela virar "aprendida".
 *
 * Três, e não uma: acertar uma vez logo depois de ver a linha na tela é
 * memória de curtíssimo prazo, e não é o que o aluno vai ter no tabuleiro no
 * sábado. Errar **zera** — é o que faz o número querer dizer alguma coisa.
 *
 * **O número continua três, mas o que ele conta mudou.** Até 6/9/2026 três
 * passadas limpas na mesma tarde bastavam, e isso era uma mentira: o aluno
 * fechava a linha três vezes seguidas com a posição ainda na retina. Agora os
 * três acertos são **três degraus da escada abaixo**, e um degrau só sobe numa
 * linha vencida — o que exige três dias diferentes e espaçados. Ver
 * `DEGRAU_APRENDIDA`, que é este mesmo número visto do outro lado.
 */
export const ACERTOS_PARA_APRENDER = 3;

/* ------------------------------------------------------------------ *
 * O juiz de um lance
 * ------------------------------------------------------------------ */

export type Veredito =
  /** O lance da linha. */
  | "certo"
  /** Outro lance nosso que o autor marcou como igualmente bom. */
  | "alternativa"
  /** Um lance que a fonte mostra de propósito como errado. */
  | "erro-nomeado"
  /** Nem um nem outro. */
  | "errado";

/** Comparação de UCI, sem tabuleiro: os três canais do arquivo, nesta ordem. */
export function vereditoDoLance(linha: Linha, ply: number, uci: string): Veredito {
  if (linha.lances[ply] === uci) return "certo";
  const chave = String(ply);
  if (linha.alternativas[chave]?.includes(uci)) return "alternativa";
  if (linha.errosNomeados[chave]?.includes(uci)) return "erro-nomeado";
  return "errado";
}

/**
 * O lance passa? É o nome que o contrato usa: certo e alternativa contam
 * igual, e é só isso que o servidor precisa saber para gravar.
 */
export function lanceCerto(linha: Linha, ply: number, uci: string): boolean {
  const veredito = vereditoDoLance(linha, ply, uci);
  return veredito === "certo" || veredito === "alternativa";
}

/**
 * A sequência que o aluno jogou fecha a linha?
 *
 * `jogados` traz **só os lances nossos**, na ordem de `meus` — os do adversário
 * são automáticos e nunca sobem ao servidor. Um lance a menos reprova tanto
 * quanto um lance errado: parar no meio não é acertar a linha.
 *
 * Sem chess.js de propósito. Comparar strings de UCI é a conta inteira, e
 * carregar um motor de regras para isso custaria no celular do aluno o que não
 * compra nada: a legalidade de `lances[ply]` já foi conferida no compilador, e
 * um UCI que não bate com nenhum dos três canais é errado de qualquer jeito.
 */
export function conferirLinha(linha: Linha, jogados: readonly string[]): boolean {
  if (jogados.length !== linha.meus.length) return false;
  return linha.meus.every((ply, k) => lanceCerto(linha, ply, jogados[k]));
}

/* ------------------------------------------------------------------ *
 * Os contadores
 * ------------------------------------------------------------------ */

export type ProgressoDaLinha = {
  readonly acertosSeguidos: number;
  readonly tentativas: number;
  readonly erros: number;
  /** ISO, ou nulo se a linha ainda não chegou ao degrau 3. **Nunca volta a nulo.** */
  readonly aprendidaEm: string | null;
  readonly ultimaEm: string | null;
  /** O degrau da escada. **0 é "fora da escada"**, e é onde o erro joga a linha. */
  readonly degrau: number;
  /** Quando a linha volta a valer degrau. Nulo **se e só se** `degrau` é 0. */
  readonly revisarEm: string | null;
};

export function zerado(): ProgressoDaLinha {
  return {
    acertosSeguidos: 0,
    tentativas: 0,
    erros: 0,
    aprendidaEm: null,
    ultimaEm: null,
    degrau: 0,
    revisarEm: null,
  };
}

export function aprendida(p: ProgressoDaLinha): boolean {
  return p.aprendidaEm !== null;
}

/* ------------------------------------------------------------------ *
 * A escada da revisão
 * ------------------------------------------------------------------ */

/**
 * Quantos dias cada degrau compra. **O índice é o degrau**, e o zero é o
 * "fora da escada" — linha nunca treinada, ou derrubada por um erro.
 *
 * Os intervalos moram aqui e **não no banco**, pelo mesmo motivo de
 * `ACERTOS_PARA_APRENDER`: quem faz a conta é o TypeScript testado, e uma
 * cópia em SQL seria uma segunda opinião sem teste. O `check` da migration
 * 0005 confere só a coerência entre `degrau` e `revisar_em`.
 *
 * O teto de 30 dias é deliberado: o preparatório inteiro dura quatro semanas,
 * então "30 dias" é o jeito de dizer "esta linha está pronta" com um número em
 * vez de com um estado especial.
 */
export const DEGRAUS_EM_DIAS = [0, 1, 3, 7, 14, 30] as const;

export const DEGRAU_MAXIMO = DEGRAUS_EM_DIAS.length - 1;

/**
 * O degrau em que a linha vira "aprendida" — e é o mesmo três de
 * `ACERTOS_PARA_APRENDER`, visto pelo outro lado. Alcançá-lo exige subir três
 * vezes, e só se sobe numa linha **vencida**: três dias distintos e espaçados.
 */
export const DEGRAU_APRENDIDA = ACERTOS_PARA_APRENDER;

/**
 * Quantos degraus um erro derruba **depois** de a linha estar aprendida.
 *
 * Dois, e não um nem tudo. Um só era pouco — o aluno que esqueceu uma linha de
 * 30 dias voltaria a 14, e 14 dias é tempo demais para uma linha que ele
 * acabou de errar. Zerar apagaria um mês de intervalo por um dedo errado no
 * celular, que é o acidente mais provável do público.
 */
export const QUEDA_POR_ERRO = 2;

/** A meia-noite em Guabiruba do dia a que este instante pertence. */
function meiaNoiteNoBrasil(agora: string): number {
  return Date.parse(`${hojeNoBrasil(new Date(agora))}T00:00:00-03:00`);
}

/**
 * Quando uma linha neste degrau volta a valer.
 *
 * Conta a partir da **meia-noite de hoje no Brasil**, e não do instante em que
 * o aluno terminou. Sem isso, uma linha fechada às 22h de sábado com um dia de
 * intervalo venceria às 22h de domingo — e o aluno que abre o site depois do
 * almoço de domingo não a veria. O piso de um dia é o que impede uma linha
 * errada de voltar a vencer na mesma sentada.
 */
function venceEm(degrau: number, agora: string): string {
  const dias = Math.max(1, DEGRAUS_EM_DIAS[degrau] ?? 1);
  return new Date(meiaNoiteNoBrasil(agora) + dias * 86_400_000).toISOString();
}

/**
 * A linha está vencida?
 *
 * A comparação é de **instantes** (`Date.parse`), e não de texto: o Postgres
 * devolve `2026-09-07T03:00:00+00:00` e o TypeScript escreve
 * `2026-09-07T03:00:00.000Z`. As duas strings são o mesmo momento e são
 * diferentes byte a byte — um `localeCompare` aqui erraria calado.
 */
export function vencida(p: ProgressoDaLinha, agora: string): boolean {
  if (p.degrau === 0 || p.revisarEm === null) return false;
  return Date.parse(p.revisarEm) <= Date.parse(agora);
}

/**
 * Quantos dias faltam para a próxima prática, ou nulo se a linha está fora da
 * escada. Zero quer dizer "vencida"; um, "na próxima vez que você abrir".
 */
export function diasAteRevisar(p: ProgressoDaLinha, agora: string): number | null {
  if (p.degrau === 0 || p.revisarEm === null) return null;
  const falta = Date.parse(p.revisarEm) - meiaNoiteNoBrasil(agora);
  return Math.max(0, Math.ceil(falta / 86_400_000));
}

/**
 * O degrau e a data depois de uma passada. É a regra inteira da memória.
 *
 * **Só sobe quem acertou numa linha vencida.** É isto que faz "três dias
 * distintos" sem comparar datas de calendário: vencer exige que a data tenha
 * passado, e a data mínima é amanhã. "Jogar de novo" oito vezes numa tarde soma
 * oito tentativas e oito acertos seguidos, e não move o degrau nem a data — o
 * que é o comportamento certo, porque repetir com a posição ainda na retina não
 * é lembrar.
 */
function escadaDepois(
  anterior: ProgressoDaLinha,
  acertou: boolean,
  agora: string,
): { degrau: number; revisarEm: string | null } {
  if (!acertou) {
    // Antes de aprendida, errar é recomeçar. Depois, é descer dois com piso no
    // 1: o aluno aprendeu aquilo um dia, e a linha volta como revisão curta.
    const degrau =
      anterior.degrau >= DEGRAU_APRENDIDA ? Math.max(1, anterior.degrau - QUEDA_POR_ERRO) : 0;
    return { degrau, revisarEm: degrau === 0 ? null : venceEm(degrau, agora) };
  }

  if (anterior.degrau === 0) return { degrau: 1, revisarEm: venceEm(1, agora) };

  // Acerto adiantado: o degrau e a data ficam onde estavam. A guarda do
  // `revisarEm` não nulo conserta um estado impossível — degrau acima de zero
  // sem data —, que aqui se cura sozinho reagendando em vez de propagar.
  if (anterior.revisarEm !== null && !vencida(anterior, agora)) {
    return { degrau: anterior.degrau, revisarEm: anterior.revisarEm };
  }

  // Vencida e acertada: sobe. No teto, o número não muda e a data anda — é a
  // diferença entre "esta linha está pronta" e "esta linha saiu da rotação".
  const degrau = Math.min(DEGRAU_MAXIMO, anterior.degrau + 1);
  return { degrau, revisarEm: venceEm(degrau, agora) };
}

/**
 * Os contadores depois de uma passada pela linha. **É a única aritmética do
 * progresso no projeto**, e o servidor a usa: a alternativa seria escrevê-la em
 * SQL dentro de uma função do banco, e aí ela ficaria em dois lugares — um
 * testado e um não.
 *
 * `aprendidaEm` marca a primeira vez que a linha chegou ao `DEGRAU_APRENDIDA`,
 * e fica. Errar depois zera os seguidos e derruba o degrau, não a data: o aluno
 * aprendeu aquilo um dia, e a tela tem de mostrar revisão, não recomeço do zero.
 */
export function depoisDoTreino(
  anterior: ProgressoDaLinha,
  acertou: boolean,
  agora: string,
): ProgressoDaLinha {
  const { degrau, revisarEm } = escadaDepois(anterior, acertou, agora);
  return {
    acertosSeguidos: acertou ? anterior.acertosSeguidos + 1 : 0,
    tentativas: anterior.tentativas + 1,
    erros: anterior.erros + (acertou ? 0 : 1),
    aprendidaEm: anterior.aprendidaEm ?? (degrau >= DEGRAU_APRENDIDA ? agora : null),
    ultimaEm: agora,
    degrau,
    revisarEm,
  };
}

/* ------------------------------------------------------------------ *
 * A ordem das linhas
 * ------------------------------------------------------------------ */

type Progresso = ReadonlyMap<string, ProgressoDaLinha>;

function progressoDe(progresso: Progresso, id: string): ProgressoDaLinha {
  return progresso.get(id) ?? zerado();
}

/** O instante de `ultimaEm`; nunca treinada é zero, que ordena antes de tudo. */
function instante(iso: string | null): number {
  return iso === null ? 0 : Date.parse(iso);
}

/**
 * Data mais antiga primeiro; sem data (nunca treinada) vem antes de tudo.
 *
 * Compara **instantes**, e não texto: as datas chegam aqui de duas escritas
 * diferentes do mesmo momento — `+00:00` do Postgres e `Z` do TypeScript —, e
 * um `localeCompare` põe todas as do banco antes de todas as do cliente.
 */
function maisAntiga(a: ProgressoDaLinha, b: ProgressoDaLinha): number {
  const x = instante(a.ultimaEm);
  const y = instante(b.ultimaEm);
  return x === y ? 0 : x < y ? -1 : 1;
}

/** As linhas cuja data de revisão já passou, da mais vencida para a menos. */
export function vencidas(
  linhas: readonly Linha[],
  progresso: Progresso,
  agora: string,
): Linha[] {
  return linhas
    .filter((l) => vencida(progressoDe(progresso, l.id), agora))
    .sort(
      (a, b) =>
        Date.parse(progressoDe(progresso, a.id).revisarEm!) -
        Date.parse(progressoDe(progresso, b.id).revisarEm!),
    );
}

/**
 * A última linha treinada foi uma **revisão**?
 *
 * Não há campo que diga isso, e não precisa haver: o rastro de "esta linha já
 * estava na escada antes desta passada" é `degrau ≥ 1` com mais de uma
 * tentativa. Uma linha nunca-vista que acabou de entrar na escada tem
 * `tentativas === 1` e degrau 1.
 *
 * O caso que este critério "erra" é o "Jogar de novo" numa linha nova, na mesma
 * sentada: a segunda passada dela conta como revisão, e a sugestão seguinte é
 * uma nunca-vista. É exatamente o que se quer — o aluno já viu aquela linha
 * duas vezes.
 */
function foiRevisao(p: ProgressoDaLinha): boolean {
  return p.degrau >= 1 && p.tentativas > 1;
}

/**
 * Qual linha o site abre quando o aluno entra na abertura.
 *
 * **É o site que escolhe, e não o aluno.** A lista continua na tela para
 * trocar — mas o padrão tem de ser a linha certa, senão o aluno treina três
 * vezes a primeira da lista e nunca chega na décima.
 *
 * ## O dilema, e a alternância que o resolve
 *
 * A ~4 linhas por sessão, ver as 42 leva ~10 sessões — e as revisões começam a
 * vencer já na segunda. Os dois extremos quebram: **nunca-vista sempre
 * primeiro** e as revisões nunca acontecem, porque sempre há linha nova;
 * **vencida sempre primeiro** e o aluno nunca chega à linha 30.
 *
 * Então ela alterna, e **sem estado de sessão**: se a linha treinada mais
 * recentemente era uma revisão, a próxima é uma nunca-vista; senão, é a
 * vencida há mais tempo. Tudo isso sai do progresso que já está gravado, o que
 * mantém a função pura e testável — e faz a mesma escolha no servidor e num
 * teste.
 *
 * Sem nenhuma vencida, valem os três grupos de sempre:
 *
 * 1. **Nunca vistas**, na ordem do arquivo. A ordem do arquivo é a ordem do
 *    PGN, que é pedagógica: o tronco primeiro, as variantes depois. Sortear
 *    aqui jogaria fora a única ordenação que um professor escreveu à mão.
 * 2. **Não aprendidas**, pelas que estão mais longe do degrau 3, e entre
 *    empatadas a que faz mais tempo que não aparece.
 * 3. **Aprendidas**, a mais antiga primeiro. É a revisão.
 *
 * ## A linha recém-treinada não volta
 *
 * Ela sai da disputa, e é isso que impede o loop: errar uma linha nova a
 * derruba para o degrau 0, e o grupo 2 — "mais longe do degrau 3" — a
 * devolveria na hora, para sempre. A exceção é a abertura de uma linha só, onde
 * não há outra para servir.
 */
export function proximaLinha(
  linhas: readonly Linha[],
  progresso: Progresso,
  agora: string = new Date().toISOString(),
): Linha | null {
  if (linhas.length === 0) return null;
  const de = (l: Linha) => progressoDe(progresso, l.id);

  const treinadas = linhas.filter((l) => de(l).ultimaEm !== null);
  const recente =
    treinadas.length > 0
      ? treinadas.reduce((a, b) => (maisAntiga(de(a), de(b)) >= 0 ? a : b))
      : null;

  const pool =
    recente && linhas.length > 1 ? linhas.filter((l) => l.id !== recente.id) : [...linhas];

  const nunca = pool.find((l) => de(l).tentativas === 0) ?? null;
  const devida = vencidas(pool, progresso, agora)[0] ?? null;

  if (recente && foiRevisao(de(recente)) && nunca) return nunca;
  if (devida) return devida;
  if (nunca) return nunca;

  const restantes = pool.filter((l) => !aprendida(de(l)));
  if (restantes.length > 0) {
    return [...restantes].sort(
      (a, b) => de(a).acertosSeguidos - de(b).acertosSeguidos || maisAntiga(de(a), de(b)),
    )[0];
  }

  return [...pool].sort((a, b) => maisAntiga(de(a), de(b)))[0] ?? null;
}

/**
 * A abertura inteira está em dia?
 *
 * **Aprendida deixou de querer dizer "nada a fazer".** Com a escada, uma
 * abertura com as 12 linhas aprendidas ainda tem linhas vencendo todo dia — e
 * um cartão de "abertura aprendida" ali seria o site escondendo do aluno
 * exatamente o que ele veio fazer.
 */
export function todasAprendidas(
  linhas: readonly Linha[],
  progresso: Progresso,
  agora: string = new Date().toISOString(),
): boolean {
  return (
    linhas.length > 0 &&
    linhas.every((l) => aprendida(progressoDe(progresso, l.id))) &&
    vencidas(linhas, progresso, agora).length === 0
  );
}

/** Quantas destas linhas o aluno já aprendeu, e quantas vencem hoje. */
export function resumo(
  linhas: readonly Linha[],
  progresso: Progresso,
  agora: string = new Date().toISOString(),
): { aprendidas: number; total: number; aRevisar: number } {
  return {
    aprendidas: linhas.filter((l) => aprendida(progressoDe(progresso, l.id))).length,
    total: linhas.length,
    aRevisar: vencidas(linhas, progresso, agora).length,
  };
}

/**
 * O mesmo resumo para quem **não carregou as linhas**: a lista de aberturas
 * sabe quantas linhas cada uma tem pelo `index.json`, e não precisa abrir os
 * doze arquivos para desenhar doze barrinhas.
 *
 * O filtro é o prefixo do id (`brancas-petroff-`), que é como `idDaLinha` o
 * monta. Cor e abertura entram as duas porque o slug pode repetir entre as
 * cores — há uma "francesa" de brancas e poderia haver uma de pretas.
 */
export function aprendidasDaAbertura(progresso: Progresso, cor: Cor, abertura: string): number {
  const prefixo = `${cor}-${abertura}-`;
  let conta = 0;
  for (const [id, p] of progresso) if (id.startsWith(prefixo) && aprendida(p)) conta++;
  return conta;
}

/** Quantas linhas desta abertura vencem hoje. Mesmo filtro, outra pergunta. */
export function aRevisarNaAbertura(
  progresso: Progresso,
  cor: Cor,
  abertura: string,
  agora: string,
): number {
  const prefixo = `${cor}-${abertura}-`;
  let conta = 0;
  for (const [id, p] of progresso) if (id.startsWith(prefixo) && vencida(p, agora)) conta++;
  return conta;
}

/* ------------------------------------------------------------------ *
 * O texto
 * ------------------------------------------------------------------ */

/**
 * Os comentários vêm do PGN, e o PGN quebra as linhas onde a coluna 80 cai —
 * no meio de uma frase, às vezes entre o artigo e o substantivo. Renderizados
 * como estão, num balão estreito de celular, viram parágrafos tortos.
 *
 * A quebra é do formato de origem, não do texto: quem escreveu não pediu
 * nenhuma delas.
 */
export function semQuebras(texto: string): string {
  return texto.replace(/\s*\n\s*/g, " ").trim();
}

/** A inicial de cada peça em português. O bispo é o que não muda. */
const PECAS: Record<string, string> = { N: "C", B: "B", R: "T", Q: "D", K: "R" };

/**
 * O SAN em português: `Nf6` vira `Cf6`, `Rxd8` vira `Txd8`.
 *
 * **Existe porque o cartão de comando fala em duas línguas ao mesmo tempo.** Os
 * `sans` do JSON são chess.js canônico, que é inglês; os comentários do
 * professor, três centímetros abaixo, falam em "cavalo" e escrevem `Cxd4`. Na
 * faixa de lances isso convivia — ninguém lê a faixa procurando o cavalo. No
 * cartão que diz **"Jogue Nf6"** não convive: é uma ordem, e ela tem de estar
 * na língua do aluno.
 *
 * O `B` é a armadilha: bishop e bispo têm a mesma inicial, e uma tabela
 * "esperta" que omitisse o par `B → B` faria o próximo leitor achar que é um
 * esquecimento.
 */
export function sanEmPortugues(san: string): string {
  return san
    .replace(/^[NBRQK]/, (letra) => PECAS[letra])
    .replace(/=([NBRQK])/, (_, letra: string) => `=${PECAS[letra]}`);
}
