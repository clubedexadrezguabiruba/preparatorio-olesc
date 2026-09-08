import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess, type Square } from "chess.js";
import { casasEntre, corDaCasa } from "../lib/meiojogo/afirmacoes.ts";
import { SEMELHANCA_MAXIMA, semelhancaDePosicoes, validarDicas } from "../lib/meiojogo/dicas.ts";
import { COR, OUTRO, respostaDaTarefa, tarefaPorId, type Lado } from "../lib/meiojogo/exercicios.ts";
import { JUIZES, type LanceUci } from "../lib/meiojogo/lances.ts";
import { RAIZ } from "./env-local.ts";

/**
 * Monta o **esqueleto** dos exercícios a partir da saída do funil de lances.
 *
 * Uso:
 *   node scripts/montar-exercicios.ts .scratch/lances-m9-m16.json --por-juiz 4 \
 *        --saida .scratch/esqueletos.json
 *
 * ## O que ele decide, e o que ele deixa para a pessoa
 *
 * Ele decide o que é **conta**: qual posição, quais lances aceitos, o custo de
 * cada um, o realce do apoio, a proveniência do puzzle, e se o material está
 * desigual. Ele **não** escreve nenhuma das frases que o aluno lê — legenda,
 * convite, solução, `perceptivel`, `adequacao`. Essas são a porta 3 do funil, a
 * curadoria humana, e um gerador que as inventasse produziria trinta itens com
 * a mesma voz e nenhuma leitura por trás.
 *
 * O esqueleto sai com essas frases marcadas como `ESCREVER: ...`, e o gate as
 * reprova pelo tamanho mínimo do esquema se alguém esquecer de trocá-las.
 *
 * ## O realce do apoio, e por que ele é derivável
 *
 * Os dois modos do apoio (`contem` e `contorno`) têm regra fechada no gate, e
 * ela é geométrica:
 *
 * - **coluna e fileira** (m9, m10, m11, m13) → `contem` com as oito casas da
 *   coluna ou da fileira de destino. Contém todo destino, é maior que o
 *   conjunto deles, e ainda deixa o aluno decidir qual peça e qual casa.
 * - **casa única e bispo** (m12, m14, m15, m16) → `contorno` com os peões que
 *   **definem** o alvo por ausência. Acender a casa de chegada seria entregar o
 *   lance; acender os peões é dizer onde olhar.
 *
 * Quando o contorno tocaria um destino — a chegada é uma captura de peão, por
 * exemplo —, o script troca para `contem` em vez de gerar um item que o gate
 * reprova. A troca fica registrada no campo `notaDoRealce`.
 */

const argv = process.argv.slice(2);
const entrada = argv.find((a) => !a.startsWith("--")) ?? ".scratch/lances-m9-m16.json";
const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};
const POR_JUIZ = numero("--por-juiz", 4);
const texto = (bandeira: string): string | null => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? argv[onde + 1] : null;
};
/**
 * Quantos centésimos entre as duas melhores linhas ainda deixam a posição
 * **quieta o bastante para um exercício de estrutura**.
 *
 * Não é o teto do funil, que é 100 e vale para publicar. É o teto da escolha:
 * a 90 centésimos há uma tática no tabuleiro, e quem foi mandado olhar a coluna
 * aberta tropeça nela antes de achá-la.
 */
const SALTO_QUIETO = numero("--salto-quieto", 50);
/**
 * Quantos peões de diferença o material ainda pode ter.
 *
 * A porta 2 do funil **não** reprova desequilíbrio, e está certa: a posição
 * final de um puzzle nasce com ele, e para reconhecer estrutura não importa
 * quem está ganhando. Para **aplicar** o tema importa: "pressione o peão na
 * coluna semiaberta" com oito pontos a menos no tabuleiro é um exercício em que
 * a resposta certa não muda nada, e o aluno de doze anos vê isso.
 *
 * O teto é uma peça menor. A frase do campo `material` continua obrigatória —
 * declarar o desequilíbrio pequeno é o que impede o aluno de gastar o exercício
 * procurando por que um dos lados tem um peão a mais.
 */
const SALDO_MAXIMO = numero("--saldo-maximo", 3);
/** Só estas dicas, quando dado — o resto do conteúdo fica como está. */
const SO = (texto("--dicas") ?? "").split(",").filter(Boolean);
const ondeSaida = argv.indexOf("--saida");
const SAIDA = ondeSaida >= 0 && argv[ondeSaida + 1] ? argv[ondeSaida + 1] : ".scratch/esqueletos.json";

type Posicao = {
  juiz: string;
  dicas: string[];
  puzzle: string;
  origem: string;
  ratingDoPuzzle: number;
  fen: string;
  lado: Lado;
  quemJoga: Lado;
  lancesAceitos: LanceUci[];
  custos: number[];
  lancesRecusados: { lance: LanceUci; custo: number }[];
  saltoDaPorta2: number;
};

const dados = JSON.parse(readFileSync(path.join(RAIZ, entrada), "utf8")) as {
  posicoes: Posicao[];
};

const COLUNAS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function saldo(fen: string): number {
  let total = 0;
  for (const fileira of new Chess(fen).board()) {
    for (const casa of fileira) {
      if (casa === null || casa.type === "k") continue;
      total += (casa.color === "w" ? 1 : -1) * (VALOR[casa.type] ?? 0);
    }
  }
  return total;
}

/** As quatro casas do meio — o contorno de m3. */
const CENTRO_DO_TABULEIRO = ["d4", "d5", "e4", "e5"] as const;

type Realce = { modo: "contem" | "contorno"; realce: string[]; notaDoRealce: string };

/**
 * O realce do nível 2 do apoio, por juiz.
 *
 * Os dois modos têm regra fechada no gate e ela é geométrica: `contem` acende um
 * conjunto que **inclui** toda casa de chegada e é maior que elas; `contorno`
 * acende o que **define** a resposta por ausência e não toca em chegada nenhuma.
 *
 * Cada juiz precisa da sua regra, e a primeira versão deste script provou por
 * que: os seis de m1 a m8 caíam num ramo genérico que acendia os peões do
 * adversário, e "acendi os peões pretos" não ajuda ninguém a achar qual peça
 * branca ainda não saiu de casa.
 *
 * Quando a regra escolhida tocaria uma casa de chegada — a chegada é uma
 * captura de peão, por exemplo —, o script troca para `contem` com a vizinhança
 * da chegada, em vez de gerar um item que o gate reprova. A troca fica
 * registrada em `notaDoRealce`.
 */
function realceDe(p: Posicao): Realce {
  const destinos = [...new Set(p.lancesAceitos.map((l) => l.slice(2, 4)))];
  const jogo = new Chess(p.fen);
  const oito = (letraOuFileira: string | number): string[] =>
    typeof letraOuFileira === "string"
      ? [1, 2, 3, 4, 5, 6, 7, 8].map((f) => `${letraOuFileira}${f}`)
      : COLUNAS.map((c) => `${c}${letraOuFileira}`);

  const contem = (casas: string[], nota: string): Realce => ({
    modo: "contem",
    realce: [...new Set(casas)].sort().slice(0, 8),
    notaDoRealce: nota,
  });
  /** Contorno, se ele não tocar chegada nenhuma; senão a vizinhança da chegada. */
  const contorno = (casas: string[], nota: string): Realce => {
    // A comparação é sobre o conjunto **sem repetição**: a mesma casa pode
    // entrar duas vezes na lista (a peça que sofre é também a que resolve), e
    // comparar os tamanhos crus faria o script achar que ela tocou a chegada.
    const unicas = [...new Set(casas)];
    const limpo = unicas.filter((c) => !destinos.includes(c)).sort();
    const tocou = unicas.length !== limpo.length;
    if (!tocou && limpo.length >= 2) {
      return { modo: "contorno", realce: limpo.slice(0, 8), notaDoRealce: nota };
    }
    return contem(vizinhanca(destinos), tocou ? "o contorno tocaria a chegada" : "contorno curto");
  };

  const casasDe = (lado: Lado, tipos: string): string[] => {
    const lista: string[] = [];
    for (const fileira of jogo.board()) {
      for (const casa of fileira) {
        if (casa?.color === COR[lado] && tipos.includes(casa.type)) lista.push(casa.square);
      }
    }
    return lista.sort();
  };

  switch (p.juiz) {
    // Coluna e fileira: a coluna (ou a fileira) inteira de chegada contém todo
    // destino, é maior que eles, e ainda deixa o aluno decidir peça e casa.
    case "coluna-aberta":
    case "peao-na-semiaberta":
    case "peao-dobrado":
      return contem(oito(destinos[0][0]), "a coluna inteira de destino");
    case "torre-na-setima":
      return contem(oito(p.lado === "brancas" ? 7 : 2), "a sétima fileira inteira");

    // Casa única: os peões dele definem o alvo por ausência (o isolado que não
    // tem vizinho, o passado que ninguém alcança, o posto que peão nenhum ataca).
    case "peao-isolado":
    case "casa-de-bloqueio":
    case "posto":
      return contorno(casasDe(OUTRO[p.quemJoga], "p"), "os peões que definem o alvo");

    // O bispo: os peões **seus** que estão na cor dele são o que atrapalha.
    case "bispo-com-peoes-na-propria-cor": {
      const bispo = respostaDaTarefa(p.fen, tarefaPorId(p.juiz)!, p.lado)[0];
      const cor = corDaCasa(bispo);
      return contorno(
        casasDe(p.lado, "p").filter((c) => corDaCasa(c) === cor),
        "os seus peões na cor do bispo",
      );
    }

    // m1: acende as peças que **já** saíram. A que falta é a que não acendeu —
    // e casa ocupada por peça sua nunca é destino de lance seu.
    case "peca-na-casa-de-origem": {
      const casa1 = p.quemJoga === "brancas" ? "1" : "8";
      return contorno(
        casasDe(p.quemJoga, "nbrq").filter((c) => c[1] !== casa1),
        "as peças que já saíram — a que falta é a que não acendeu",
      );
    }

    // m2: o rei e as torres. São as duas peças que o roque mexe, e nenhuma das
    // três casas é destino — o rei sai de e1 e as torres saem de a1 e h1.
    case "roque":
      return contorno(
        [...casasDe(p.quemJoga, "k"), ...casasDe(p.quemJoga, "r")],
        "o rei e as torres, que são as peças que o lance mexe",
      );

    // m3: as quatro casas do meio. O lance não precisa chegar nelas — precisa
    // passar a mirá-las —, e é por isso que acendê-las não entrega nada.
    case "peca-no-centro":
      return contorno([...CENTRO_DO_TABULEIRO], "as quatro casas do meio");

    // m4: as peças dele que já têm um atacante seu, **e o atacante**. O lance
    // não vai até nenhuma das duas: ele traz a segunda peça para a mesma linha.
    // Acender o par é o que faz o apoio dizer "olhe esta dupla" em vez de
    // "olhe esta peça", e é o que salva o item de uma posição com um alvo só.
    case "segunda-peca-no-alvo": {
      const alvos = casasDe(OUTRO[p.quemJoga], "pnbrq").filter(
        (c) => jogo.attackers(c as Square, COR[p.quemJoga]).length === 1,
      );
      const atacantes = alvos.flatMap((c) => jogo.attackers(c as Square, COR[p.quemJoga]));
      return contorno([...alvos, ...atacantes], "o alvo que já tem um atacante, e o atacante");
    }

    // m6: o que está entre as duas torres. É a peça que tem de sair.
    case "torres-ligadas": {
      const torres = casasDe(p.quemJoga, "r");
      const caminho = torres.length === 2 ? (casasEntre(torres[0], torres[1]) ?? []) : [];
      return contorno(
        [...torres, ...caminho.filter((c) => jogo.get(c) !== undefined)],
        "as duas torres e o que está entre elas",
      );
    }

    // m8: as **suas** peças que estão sendo atacadas — e não a dele, que é a
    // casa de chegada. Acender o atacante seria acender a resposta; acender
    // quem sofre é dizer onde olhar, e quem ataca aquelas casas o aluno acha.
    case "trocar-o-atacante": {
      const incomodadas = casasDe(p.quemJoga, "nbrq").filter(
        (c) => jogo.attackers(c as Square, COR[OUTRO[p.quemJoga]]).length > 0,
      );
      // Só a peça que sofre quase nunca dá duas casas — a peça dele costuma
      // incomodar uma só. Entram junto as **origens** dos lances que resolvem:
      // origem não é chegada, e o aluno continua tendo de ver qual peça dele
      // tirar do tabuleiro.
      const origens = p.lancesAceitos.map((l) => l.slice(0, 2));
      return contorno(
        [...incomodadas, ...origens],
        "a sua peça que sofre, e as suas que resolvem",
      );
    }

    default:
      return contem(vizinhanca(destinos), "vizinhança da chegada");
  }
}

/** As casas de chegada mais o que está em volta delas, até o teto de oito. */
function vizinhanca(destinos: readonly string[]): string[] {
  const volta = new Set(destinos);
  for (const d of destinos) {
    const c = d.charCodeAt(0) - 97;
    const f = Number(d[1]);
    for (const [dc, df] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ]) {
      const nc = c + dc;
      const nf = f + df;
      if (nc < 0 || nc > 7 || nf < 1 || nf > 8) continue;
      if (volta.size < 8) volta.add(`${String.fromCharCode(97 + nc)}${nf}`);
    }
  }
  return [...volta].sort();
}

/* ------------------------------------------------------------------ *
 * A escolha
 * ------------------------------------------------------------------ */

const LETRAS = "abcde";
const escolhidos: Record<string, unknown[]> = {};
/**
 * As posições já gastas, **entre juízes**.
 *
 * A mesma FEN serve a dois temas com frequência — uma posição com peão dobrado
 * costuma ter a coluna aberta que a dobra abriu —, e sem esta lista o mesmo
 * tabuleiro apareceria em m9 e em m13. O aluno responderia o segundo pela
 * memória do primeiro, e `problemasEntreDicas` reprovaria no gate de qualquer
 * jeito (POSICOES_QUASE_IGUAIS).
 */
const gastas: string[] = [];

// As posições que **já estão publicadas** entram na lista de gastas antes de
// tudo. Sem isto, uma rodada para as dicas novas poderia escolher o mesmo
// tabuleiro que já está numa dica antiga, e `problemasEntreDicas` reprovaria o
// conteúdo inteiro por POSICOES_QUASE_IGUAIS depois de a prosa estar escrita.
for (const dica of validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content", "meio-jogo.json"), "utf8")),
)) {
  for (const item of dica.treino?.exercicios ?? []) {
    if (SO.length > 0 && SO.includes(dica.id)) continue;
    gastas.push(item.fen);
  }
}

for (const juiz of JUIZES) {
  if (SO.length > 0 && !juiz.dicas.some((d) => SO.includes(d))) continue;
  const doJuiz = dados.posicoes
    .filter((p) => p.juiz === juiz.id)
    // Mais de quatro lances do tema não é riqueza, é vagueza: o item deixa de
    // perguntar "qual é o lance da dica" e passa a perguntar "mexa qualquer
    // peça pesada".
    .filter((p) => p.lancesAceitos.length <= 4)
    // O teto do funil é 100, e é o que o conteúdo **pode** publicar. O que faz
    // um exercício de estrutura é a posição estar quieta, e 90 centésimos entre
    // as duas melhores linhas é uma tática esperando ser achada — o aluno
    // mandado a olhar a coluna tropeça nela.
    .filter((p) => p.saltoDaPorta2 <= SALTO_QUIETO)
    // Mais de dois lances do tema que o motor reprova é uma posição em que o
    // tema quase sempre perde. Ela ensina a exceção antes da regra.
    .filter((p) => p.lancesRecusados.length <= 2)
    .filter((p) => Math.abs(saldo(p.fen)) <= SALDO_MAXIMO);
  // O lance do tema tem de ser **quase o melhor**, e não só tolerável. O teto
  // de 100 centésimos é o que o conteúdo pode publicar; o que faz um bom
  // exercício é o tema e o motor concordarem, e por isso a ordem é pelo pior
  // custo da posição, do menor para o maior. Em empate, menos lances primeiro.
  const pior = (p: Posicao) => Math.max(...p.custos);
  const ordenados = [...doJuiz].sort(
    (a, b) =>
      pior(a) - pior(b) ||
      a.saltoDaPorta2 - b.saltoDaPorta2 ||
      a.lancesAceitos.length - b.lancesAceitos.length,
  );

  const pegos: Posicao[] = [];
  for (const p of ordenados) {
    if (pegos.length >= POR_JUIZ) break;
    // Duas telas parecidas fazem o aluno responder a segunda pela memória da
    // primeira, e o registro chama isso de aprendizado.
    if (gastas.some((fen) => semelhancaDePosicoes(fen, p.fen) >= SEMELHANCA_MAXIMA)) continue;
    pegos.push(p);
    gastas.push(p.fen);
  }

  const dica = juiz.dicas[0];
  escolhidos[dica] = pegos.map((p, i) => {
    const { modo, realce, notaDoRealce } = realceDe(p);
    const s = saldo(p.fen);
    return {
      id: `${dica}-${LETRAS[i]}`,
      fen: p.fen,
      lado: p.lado,
      tarefa: p.juiz,
      lancesAceitos: p.lancesAceitos,
      lancesRecusados: p.lancesRecusados,
      porqueAceitos: null,
      legenda: "ESCREVER: o contexto, sem citar a casa de chegada.",
      material:
        Math.abs(s) >= 1
          ? `ESCREVER: material desigual em ${Math.abs(s)} peão(ões) a favor das ${s > 0 ? "brancas" : "pretas"}.`
          : null,
      apoio: {
        convite: "ESCREVER: a pergunta que reorganiza a busca, sem entregar nada.",
        modo,
        realce,
        solucao: `ESCREVER: a solução, nomeando origem e destino (${p.lancesAceitos
          .map((l) => `${l.slice(0, 2)}-${l.slice(2, 4)}`)
          .join(" ou ")}).`,
      },
      curadoria: {
        perceptivel: "ESCREVER: por que o tema é aplicável nesta posição, para este aluno.",
        portas: {
          porta1: "passou",
          profundidade: 12,
          salto: p.saltoDaPorta2,
          custos: p.custos,
        },
        adequacao: "ESCREVER: por que ela serve a um aluno de 12 a 15 anos.",
      },
      provenance: {
        bibliographicSource:
          `Recorte CC0 da base aberta do Lichess, puzzle ${p.puzzle} (${p.origem}): posição ao ` +
          `fim da linha tática do puzzle, quando a combinação já acabou. Os jogadores não são ` +
          `identificados no recorte.`,
        citacaoCurta: `Lichess, puzzle ${p.puzzle} — posição ao fim da linha`,
        editionFile: "lichess-open-database",
        capitulo: null,
        originalGame: `lichess.org/training/${p.puzzle}`,
        fenMethod:
          `A FEN guardada no recorte é a posição antes do erro do adversário; esta é a do fim da ` +
          `linha, obtida jogando os lances do puzzle na chess.js (scripts/escolher-lances.ts). ` +
          `Passou pela porta 1 — sem xeque, sem mate em 1 e sem peça de cavalo ou mais pendurada ` +
          `— e pela porta 2, com Stockfish 18 na profundidade 12 medindo ${p.saltoDaPorta2} ` +
          `centésimos entre a melhor linha e a segunda. Cada lance aceito foi medido no mesmo ` +
          `motor e custa ${p.custos.join(", ")} centésimo(s) sobre o melhor lance da posição.`,
      },
      _nota: { realce: notaDoRealce, rating: p.ratingDoPuzzle, quemJoga: p.quemJoga },
    };
  });
}

const destino = path.join(RAIZ, SAIDA);
writeFileSync(destino, `${JSON.stringify(escolhidos, null, 1)}\n`, "utf8");

for (const juiz of JUIZES) {
  const lista = escolhidos[juiz.dicas[0]] as { id: string }[] | undefined;
  if (!lista) continue;
  console.log(`${juiz.dicas[0].padEnd(4)} ${juiz.id.padEnd(32)} ${lista.length} exercício(s)`);
}
console.log(`\nEsqueletos em ${SAIDA}. As frases marcadas ESCREVER são a curadoria humana.`);
