/**
 * O caderno escrito num arquivo de texto que o professor edita sozinho.
 *
 * ## Por que isto existe, depois de eu ter argumentado contra
 *
 * A primeira versão do caderno era um módulo TypeScript, e o argumento era bom:
 * o compilador vira o validador, e Markdown não sabe dizer "aqui vai o diagrama
 * do puzzle tal visto pelas pretas".
 *
 * O argumento estava certo e a decisão estava errada, porque faltava um dado: o
 * Doug precisa **mudar uma frase sem me chamar**. Com o texto dentro do código,
 * cada vírgula do caderno passa por mim, e um caderno que só uma pessoa
 * consegue editar não é um caderno — é um gargalo. Escrever o parser custa um
 * dia; o gargalo custaria o curso inteiro.
 *
 * O que se perdeu do argumento antigo se recupera aqui: erro de sintaxe estoura
 * **com o número da linha**, e o `@exercicios` continua indo buscar posição no
 * mesmo banco que o site serve. O que o professor escreve é o texto; as
 * posições continuam sendo dado.
 *
 * ## A sintaxe inteira, que cabe num cartão
 *
 * ```text
 * ---                       ← o cabeçalho, entre duas linhas de três traços
 * numero: 1
 * titulo: Como funciona o torneio
 * sabado: Sábado 1 · 12 de setembro de 2026
 * subtitulo: As regras que pegam em torneio...
 * ---
 *
 * # Título de seção
 * ## Subtítulo
 *
 * Um parágrafo. Linhas em branco separam parágrafos.
 * Pode ter **negrito** e *itálico*.
 *
 * - item de lista
 * 1. item de lista numerada
 *
 * > **Cuidado:** o texto da caixa em destaque.
 *
 * @folha                          ← daqui em diante, folha nova
 * @tema mateIn1                   ← o texto do tema, de content/temas.json
 * @exercicios mateIn1 6 | Ache o mate em 1.
 * @diagrama <FEN> | Brancas jogam. | legenda opcional
 * @planilha 50                    ← planilha de anotação com 50 lances
 * @tarefas 1                      ← as tarefas da semana, de content/tarefas.json
 * @gabarito                       ← as respostas de todos os @exercicios acima
 * ```
 *
 * ## Duas fases, e a razão de serem duas
 *
 * `analisar()` transforma texto em estrutura, e é **pura**: não lê disco, não
 * conhece puzzle, e por isso é testável linha a linha. `montarCaderno()` (em
 * `montar.ts`) resolve o que precisa do banco. Um parser que fosse buscar
 * puzzle no meio da análise só poderia ser testado com o banco inteiro em pé.
 */

import type { Bloco, Secao } from "./caderno.ts";

/** O que o cabeçalho traz, antes de qualquer seção. */
export type Cabecalho = {
  readonly numero: number;
  readonly titulo: string;
  readonly sabado: string;
  readonly subtitulo: string;
};

/**
 * Os blocos que só o Markdown produz — os que ainda precisam do banco de
 * puzzles ou do conteúdo do site para virarem `Bloco` de verdade.
 */
export type BlocoPendente =
  | { readonly tipo: "tema"; readonly tag: string; readonly linha: number }
  | {
      readonly tipo: "exercicios";
      readonly tag: string;
      readonly quantos: number;
      readonly pedido: string;
      readonly linha: number;
    }
  | { readonly tipo: "tarefas"; readonly semana: number; readonly linha: number }
  | { readonly tipo: "gabarito"; readonly linha: number };

export type BlocoAnalisado = Bloco | BlocoPendente;

export type SecaoAnalisada = Omit<Secao, "blocos"> & {
  readonly blocos: readonly BlocoAnalisado[];
};

export type CadernoAnalisado = {
  readonly cabecalho: Cabecalho;
  readonly secoes: readonly SecaoAnalisada[];
};

const CAMPOS = ["numero", "titulo", "sabado", "subtitulo"] as const;

class ErroDeSintaxe extends Error {
  constructor(linha: number, problema: string) {
    super(`caderno, linha ${linha}: ${problema}`);
    this.name = "ErroDeSintaxe";
  }
}

/** Junta as linhas de um parágrafo num texto só, sem as quebras do editor. */
const juntar = (linhas: string[]): string => linhas.join(" ").replace(/\s+/g, " ").trim();

function lerCabecalho(linhas: string[]): { cabecalho: Cabecalho; resto: number } {
  if (linhas[0]?.trim() !== "---") {
    throw new ErroDeSintaxe(1, 'o caderno tem de começar com "---" e o cabeçalho');
  }

  const bruto = new Map<string, string>();
  let i = 1;
  for (; i < linhas.length; i += 1) {
    const linha = linhas[i];
    if (linha.trim() === "---") break;
    if (linha.trim() === "") continue;

    const corte = linha.indexOf(":");
    if (corte < 0) throw new ErroDeSintaxe(i + 1, `esperava "campo: valor", veio "${linha.trim()}"`);
    bruto.set(linha.slice(0, corte).trim(), linha.slice(corte + 1).trim());
  }
  if (i >= linhas.length) throw new ErroDeSintaxe(1, 'o cabeçalho não foi fechado com "---"');

  for (const campo of CAMPOS) {
    if (!bruto.has(campo)) throw new ErroDeSintaxe(1, `falta "${campo}" no cabeçalho`);
  }
  const numero = Number(bruto.get("numero"));
  if (!Number.isInteger(numero)) {
    throw new ErroDeSintaxe(1, `"numero" tem de ser um número inteiro, veio "${bruto.get("numero")}"`);
  }

  return {
    cabecalho: {
      numero,
      titulo: bruto.get("titulo")!,
      sabado: bruto.get("sabado")!,
      subtitulo: bruto.get("subtitulo")!,
    },
    resto: i + 1,
  };
}

/** `@comando resto` → `["comando", "resto"]`, ou `null` se a linha não é comando. */
function comando(linha: string): [string, string] | null {
  const t = linha.trim();
  if (!t.startsWith("@")) return null;
  const espaco = t.indexOf(" ");
  return espaco < 0 ? [t.slice(1), ""] : [t.slice(1, espaco), t.slice(espaco + 1).trim()];
}

/** Os campos de um comando, separados por `|`. */
const campos = (resto: string): string[] => resto.split("|").map((c) => c.trim());

function blocoDeComando(nome: string, resto: string, linha: number): BlocoAnalisado {
  switch (nome) {
    case "folha":
      return { tipo: "quebra" };

    case "tema": {
      if (resto === "") throw new ErroDeSintaxe(linha, "@tema precisa do nome do tema");
      return { tipo: "tema", tag: resto, linha };
    }

    case "exercicios": {
      const [alvo, pedido] = campos(resto);
      const partes = (alvo ?? "").split(/\s+/);
      const quantos = Number(partes[1]);
      if (partes[0] === undefined || partes[0] === "" || !Number.isInteger(quantos)) {
        throw new ErroDeSintaxe(linha, "@exercicios precisa de: tema quantidade | o que se pede");
      }
      if (pedido === undefined || pedido === "") {
        throw new ErroDeSintaxe(linha, '@exercicios precisa do enunciado depois de "|"');
      }
      return { tipo: "exercicios", tag: partes[0], quantos, pedido, linha };
    }

    case "diagrama": {
      const [fen, vez, legenda] = campos(resto);
      if (fen === undefined || fen === "") {
        throw new ErroDeSintaxe(linha, "@diagrama precisa da FEN da posição");
      }
      return {
        tipo: "diagramas",
        pedido: legenda ?? "",
        itens: [{ fen, vez: vez === "" ? undefined : vez }],
      };
    }

    case "planilha": {
      const lances = Number(resto);
      if (!Number.isInteger(lances) || lances < 1) {
        throw new ErroDeSintaxe(linha, `@planilha precisa do número de lances, veio "${resto}"`);
      }
      return { tipo: "planilha", lances };
    }

    case "tarefas": {
      // `Number("")` é zero, e zero é inteiro: sem esta guarda um `@tarefas`
      // pelado viraria "a semana 0", que não existe, e o erro só apareceria
      // depois, longe daqui.
      const semana = resto === "" ? Number.NaN : Number(resto);
      if (!Number.isInteger(semana) || semana < 1) {
        throw new ErroDeSintaxe(linha, `@tarefas precisa do número da semana, veio "${resto}"`);
      }
      return { tipo: "tarefas", semana, linha };
    }

    case "gabarito":
      return { tipo: "gabarito", linha };

    default:
      throw new ErroDeSintaxe(linha, `não conheço o comando "@${nome}"`);
  }
}

/**
 * Texto → estrutura. Pura: nenhum disco, nenhum puzzle, nenhuma rede.
 *
 * Todo erro sai com o número da linha, porque quem vai ler a mensagem é quem
 * estava editando o arquivo — e "esperava campo: valor" sem linha nenhuma, num
 * arquivo de 400 linhas, é o mesmo que não avisar.
 */
export function analisar(fonte: string): CadernoAnalisado {
  const linhas = fonte.replace(/\r\n?/g, "\n").split("\n");
  const { cabecalho, resto } = lerCabecalho(linhas);

  const secoes: SecaoAnalisada[] = [];
  let titulo: string | null = null;
  let blocos: BlocoAnalisado[] = [];
  let paragrafo: string[] = [];
  let lista: { itens: string[]; ordenada: boolean } | null = null;

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) blocos.push({ tipo: "paragrafo", texto: juntar(paragrafo) });
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista !== null) blocos.push({ tipo: "lista", itens: lista.itens, ordenada: lista.ordenada });
    lista = null;
  };
  const fecharTudo = () => {
    fecharParagrafo();
    fecharLista();
  };
  const fecharSecao = () => {
    fecharTudo();
    if (titulo !== null) secoes.push({ titulo, blocos });
    else if (blocos.length > 0) throw new ErroDeSintaxe(resto + 1, 'há texto antes do primeiro "# título"');
    titulo = null;
    blocos = [];
  };

  for (let i = resto; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const numero = i + 1;
    const t = linha.trim();

    if (t === "") {
      fecharTudo();
      continue;
    }

    if (t.startsWith("# ")) {
      fecharSecao();
      titulo = t.slice(2).trim();
      continue;
    }

    if (t.startsWith("## ")) {
      fecharTudo();
      blocos.push({ tipo: "subtitulo", texto: t.slice(3).trim() });
      continue;
    }

    if (t.startsWith("> ")) {
      fecharTudo();
      const corpo = t.slice(2).trim();
      // O rótulo é o negrito da frente. Sem ele a caixa não tem do que ser a
      // caixa — "Cuidado:", "Vale saber:" — e vira só um parágrafo com barra.
      const rotulo = corpo.match(/^\*\*(.+?)\*\*\s*/);
      if (rotulo === null) {
        throw new ErroDeSintaxe(numero, 'a caixa "> " começa com o rótulo em **negrito**');
      }
      blocos.push({ tipo: "destaque", rotulo: rotulo[1], texto: corpo.slice(rotulo[0].length) });
      continue;
    }

    const marcador = t.match(/^(-|\d+\.)\s+(.*)$/);
    if (marcador !== null) {
      fecharParagrafo();
      const ordenada = marcador[1] !== "-";
      if (lista !== null && lista.ordenada !== ordenada) fecharLista();
      lista ??= { itens: [], ordenada };
      lista.itens.push(marcador[2].trim());
      continue;
    }

    const cmd = comando(t);
    if (cmd !== null) {
      fecharTudo();
      blocos.push(blocoDeComando(cmd[0], cmd[1], numero));
      continue;
    }

    if (lista !== null) {
      // Continuação de um item de lista quebrado em duas linhas no editor.
      lista.itens[lista.itens.length - 1] += ` ${t}`;
      continue;
    }
    paragrafo.push(t);
  }

  fecharSecao();

  if (secoes.length === 0) throw new ErroDeSintaxe(resto + 1, "o caderno não tem nenhuma seção");
  return { cabecalho, secoes };
}
