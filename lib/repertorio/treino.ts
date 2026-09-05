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
  /** ISO, ou nulo se a linha ainda não chegou aos três. **Nunca volta a nulo.** */
  readonly aprendidaEm: string | null;
  readonly ultimaEm: string | null;
};

export function zerado(): ProgressoDaLinha {
  return { acertosSeguidos: 0, tentativas: 0, erros: 0, aprendidaEm: null, ultimaEm: null };
}

export function aprendida(p: ProgressoDaLinha): boolean {
  return p.aprendidaEm !== null;
}

/**
 * Os contadores depois de uma passada pela linha. **É a única aritmética do
 * progresso no projeto**, e o servidor a usa: a alternativa seria escrevê-la em
 * SQL dentro de uma função do banco, e aí ela ficaria em dois lugares — um
 * testado e um não.
 *
 * `aprendidaEm` marca a primeira vez que os acertos seguidos chegaram a três, e
 * fica. Errar depois zera os seguidos, não a data: o aluno aprendeu aquilo um
 * dia, e a tela tem de mostrar revisão, não recomeço do zero.
 */
export function depoisDoTreino(
  anterior: ProgressoDaLinha,
  acertou: boolean,
  agora: string,
): ProgressoDaLinha {
  const acertosSeguidos = acertou ? anterior.acertosSeguidos + 1 : 0;
  return {
    acertosSeguidos,
    tentativas: anterior.tentativas + 1,
    erros: anterior.erros + (acertou ? 0 : 1),
    aprendidaEm:
      anterior.aprendidaEm ?? (acertosSeguidos >= ACERTOS_PARA_APRENDER ? agora : null),
    ultimaEm: agora,
  };
}

/* ------------------------------------------------------------------ *
 * A ordem das linhas
 * ------------------------------------------------------------------ */

type Progresso = ReadonlyMap<string, ProgressoDaLinha>;

function progressoDe(progresso: Progresso, id: string): ProgressoDaLinha {
  return progresso.get(id) ?? zerado();
}

/** Data mais antiga primeiro; sem data (nunca treinada) vem antes de tudo. */
function maisAntiga(a: ProgressoDaLinha, b: ProgressoDaLinha): number {
  return (a.ultimaEm ?? "").localeCompare(b.ultimaEm ?? "");
}

/**
 * Qual linha o site abre quando o aluno entra na abertura.
 *
 * **É o site que escolhe, e não o aluno.** A lista continua na tela para
 * trocar — mas o padrão tem de ser a linha certa, senão o aluno de 10 anos
 * treina três vezes a primeira da lista e nunca chega na décima.
 *
 * Três grupos, nesta ordem:
 *
 * 1. **Nunca vistas**, na ordem do arquivo. A ordem do arquivo é a ordem do
 *    PGN, que é pedagógica: o tronco primeiro, as variantes depois. Sortear
 *    aqui jogaria fora a única ordenação que um professor escreveu à mão.
 * 2. **Não aprendidas**, pelas que estão mais longe dos três acertos, e entre
 *    empatadas a que faz mais tempo que não aparece.
 * 3. **Aprendidas**, a mais antiga primeiro. É a revisão.
 */
export function proximaLinha(linhas: readonly Linha[], progresso: Progresso): Linha | null {
  const nunca = linhas.find((l) => progressoDe(progresso, l.id).tentativas === 0);
  if (nunca) return nunca;

  const restantes = linhas.filter((l) => !aprendida(progressoDe(progresso, l.id)));
  if (restantes.length > 0) {
    return [...restantes].sort((a, b) => {
      const pa = progressoDe(progresso, a.id);
      const pb = progressoDe(progresso, b.id);
      return pa.acertosSeguidos - pb.acertosSeguidos || maisAntiga(pa, pb);
    })[0];
  }

  const revisao = [...linhas].sort((a, b) =>
    maisAntiga(progressoDe(progresso, a.id), progressoDe(progresso, b.id)),
  );
  return revisao[0] ?? null;
}

export function todasAprendidas(linhas: readonly Linha[], progresso: Progresso): boolean {
  return linhas.length > 0 && linhas.every((l) => aprendida(progressoDe(progresso, l.id)));
}

/** Quantas destas linhas o aluno já aprendeu. */
export function resumo(
  linhas: readonly Linha[],
  progresso: Progresso,
): { aprendidas: number; total: number } {
  return {
    aprendidas: linhas.filter((l) => aprendida(progressoDe(progresso, l.id))).length,
    total: linhas.length,
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
