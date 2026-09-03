import { diagrama, type Orientacao } from "../diagrama/tabuleiro.ts";
import { enfase, escaparHtml } from "./enfase.ts";

/**
 * A forma de um caderno da apostila, e como ela vira HTML de impressão.
 *
 * ## Por que o caderno é um módulo TypeScript, e não um `.md`
 *
 * O plano previa Markdown. Markdown não sabe dizer "aqui vai o diagrama do
 * puzzle `02KS2` do Lichess, visto do lado das pretas" — só saberia com uma
 * sintaxe inventada, e uma sintaxe inventada precisa de um parser, de um
 * validador e de mensagens de erro próprias. Isso é uma semana que o Sábado 1
 * não tem.
 *
 * Com o caderno como módulo, o compilador é o validador: FEN vem do banco de
 * puzzles pela mesma função que a tela usa, diagrama sem legenda não compila, e
 * `orientacao: "pretass"` é erro de tipo em vez de um tabuleiro girado errado
 * na folha do aluno. O texto continua vindo de `content/`, que é onde ele deve
 * estar — o módulo **monta**, não **guarda**.
 *
 * ## Um arquivo só, sem nada para buscar
 *
 * O HTML sai com o CSS embutido e os diagramas em SVG inline. Nenhuma
 * referência a arquivo, nenhuma fonte da web, nenhum script. Um `page.pdf()`
 * não espera por recurso que não chegou: ele imprime o que estiver na tela
 * naquele instante — e um caderno com dezesseis quadrados vazios sairia sem
 * erro nenhum.
 */

export type BlocoDiagrama = {
  readonly fen: string;
  readonly orientacao?: Orientacao;
  /**
   * De quem é a vez, e o aviso de tabuleiro virado quando houver.
   *
   * Vai **logo abaixo das coordenadas**, em semibold, colado na borda de baixo
   * do tabuleiro — que é para onde o olho vai quando o aluno conta casa. De
   * quem é a vez não é acessório: sem ela o exercício é insolúvel, e numa
   * versão anterior ela tinha descido para depois da linha de escrever, no peso
   * mais leve da figura. Aquilo era regressão, não ajuste.
   */
  readonly vez?: string;
  /** A proveniência, que sai impressa: "Lichess 02KS2 · CC0". */
  readonly fonte?: string;
  /**
   * Uma pauta em branco para o aluno escrever o lance.
   *
   * O caderno **pede** que ele escreva o lance em notação; até aqui não havia
   * onde. Prometer no texto e não entregar no papel é o tipo de furo que só
   * aparece com a folha na mão, no domingo.
   */
  readonly pauta?: boolean;
};

export type Bloco =
  | { readonly tipo: "paragrafo"; readonly texto: string }
  | { readonly tipo: "subtitulo"; readonly texto: string }
  | { readonly tipo: "lista"; readonly itens: readonly string[]; readonly ordenada?: boolean }
  | { readonly tipo: "destaque"; readonly rotulo: string; readonly texto: string }
  | {
      readonly tipo: "diagramas";
      /**
       * O que se pede, **uma vez, acima da grade inteira** — e não repetido
       * embaixo de cada tabuleiro.
       *
       * Os quatro problemas de um tema pedem a mesma coisa. Repetir "Ache o
       * mate do gancho." em negrito quatro vezes na mesma página fazia duas
       * coisas ruins ao mesmo tempo: o negrito repetido deixa de ser lido a
       * partir da segunda vez, e a linha extra em cada célula engordou a seção
       * em 21 mm — o bastante para ela passar a ocupar a folha inteira sozinha.
       */
      readonly pedido: string;
      readonly itens: readonly BlocoDiagrama[];
    }
  /**
   * Uma planilha de anotação em branco, para o aluno recortar e levar.
   *
   * É bloco próprio, e não uma tabela genérica, porque ela tem uma forma só e
   * ela é a mesma em todo caderno: cabeçalho de identificação da partida e
   * `lances` linhas numeradas em duas colunas. Uma tabela genérica exigiria
   * declarar linhas e colunas à mão em cada caderno — e a quarta planilha
   * sairia com uma coluna a menos que as outras três.
   */
  | { readonly tipo: "planilha"; readonly lances: number };

export type Secao = {
  readonly titulo: string;
  /**
   * A seção começa em folha nova?
   *
   * O padrão é **não**. A primeira versão quebrava em toda seção, e o caderno
   * saiu com 27 páginas — várias delas com um terço de texto e dois terços de
   * branco, porque um tema de tática curto não enche uma folha. Papel em branco
   * num caderno que vai ser fotocopiado para doze alunos é custo real.
   *
   * Quem ganha a quebra é a seção que o aluno **procura**: as regras, a
   * anotação, a tarefa da semana, a planilha que ele vai destacar. Os temas de
   * tática correm em sequência, como capítulo de livro.
   */
  readonly novaPagina?: boolean;
  readonly blocos: readonly Bloco[];
};

export type Caderno = {
  /** 1 a 4, ou 0 para o caderno do torneio. Sai na capa e no nome do arquivo. */
  readonly numero: number;
  readonly titulo: string;
  readonly subtitulo: string;
  /** O sábado a que ele pertence, para o cabeçalho. */
  readonly sabado: string;
  readonly secoes: readonly Secao[];
};

/**
 * O crédito das peças. Sai na capa de todo caderno que tem diagrama, porque a
 * licença das cburnett (CC BY-SA 3.0) exige atribuição, e um PDF que circula
 * entre pais e alunos circula sem o repositório junto.
 */
export const CREDITOS = [
  "Peças: cburnett, de Colin M.L. Burnett (CC BY-SA 3.0), as mesmas do Lichess.",
  "Posições: banco público de problemas do Lichess (CC0).",
];

function paragrafo(texto: string): string {
  return `<p>${enfase(texto)}</p>`;
}

function figura(d: BlocoDiagrama): string {
  // A ordem é a de quem resolve: o tabuleiro, de quem é a vez, onde escrever, e
  // só então de onde veio a posição.
  const vez = d.vez === undefined ? "" : `<figcaption class="vez">${enfase(d.vez)}</figcaption>`;
  const pauta =
    d.pauta === true ? `<div class="pauta"><span class="rotulo">Lance:</span></div>` : "";
  const fonte = d.fonte === undefined ? "" : `<p class="fonte">${escaparHtml(d.fonte)}</p>`;

  return (
    `<figure>` +
    diagrama(d.fen, { orientacao: d.orientacao, titulo: d.vez ?? "Diagrama" }) +
    vez +
    pauta +
    fonte +
    `</figure>`
  );
}

function bloco(b: Bloco): string {
  switch (b.tipo) {
    case "paragrafo":
      return paragrafo(b.texto);
    case "subtitulo":
      return `<h3>${enfase(b.texto)}</h3>`;
    case "lista": {
      const tag = b.ordenada === true ? "ol" : "ul";
      const itens = b.itens.map((i) => `<li>${enfase(i)}</li>`).join("");
      return `<${tag}>${itens}</${tag}>`;
    }
    case "destaque":
      return (
        `<div class="destaque"><p><span class="rotulo">${enfase(b.rotulo)}</span> ` +
        `${enfase(b.texto)}</p></div>`
      );
    case "diagramas": {
      const sozinho = b.itens.length === 1 ? " sozinho" : "";
      return (
        `<div class="diagramas${sozinho}">` +
        `<p class="pedido">${enfase(b.pedido)}</p>` +
        `<div class="grade">${b.itens.map(figura).join("")}</div>` +
        `</div>`
      );
    }
    case "planilha":
      return planilha(b.lances);
  }
}

/** Os campos de cima da planilha, na ordem em que a árbitra os confere. */
const CAMPOS_DA_PLANILHA = ["Data", "Rodada", "Brancas", "Pretas", "Resultado"];

function planilha(lances: number): string {
  const campos = CAMPOS_DA_PLANILHA.map(
    (nome) => `<div class="campo"><span>${nome}</span></div>`,
  ).join("");

  // Duas colunas de metade dos lances cada, e não uma coluna longa: a planilha
  // do torneio tem essa forma, e treinar na forma certa é metade do ponto.
  const metade = Math.ceil(lances / 2);
  const coluna = (comeco: number): string =>
    `<table><thead><tr><th>#</th><th>Brancas</th><th>Pretas</th></tr></thead><tbody>` +
    Array.from({ length: metade }, (_, i) => comeco + i)
      .filter((n) => n <= lances)
      .map((n) => `<tr><td class="n">${n}</td><td></td><td></td></tr>`)
      .join("") +
    `</tbody></table>`;

  return (
    `<div class="planilha"><div class="campos">${campos}</div>` +
    `<div class="colunas">${coluna(1)}${coluna(metade + 1)}</div></div>`
  );
}

function capa(c: Caderno): string {
  return (
    `<div class="capa">` +
    `<div class="numero">Caderno ${c.numero} · ${escaparHtml(c.sabado)}</div>` +
    `<h1>${escaparHtml(c.titulo)}</h1>` +
    `<div class="regua"></div>` +
    `<p class="subtitulo">${enfase(c.subtitulo)}</p>` +
    `<div class="rodape">${CREDITOS.map(escaparHtml).join("<br>")}</div>` +
    `</div>`
  );
}

/** O documento inteiro, com o CSS embutido. É o que o Chromium recebe. */
export function cadernoEmHtml(c: Caderno, css: string): string {
  const corpo = c.secoes
    .map((s) => {
      const classe = s.novaPagina === true ? ' class="folha-nova"' : "";
      return `<section${classe}><h2>${escaparHtml(s.titulo)}</h2>${s.blocos.map(bloco).join("")}</section>`;
    })
    .join("");

  return (
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
    `<title>Caderno ${c.numero} — ${escaparHtml(c.titulo)}</title>` +
    `<style>${css}</style></head><body>${capa(c)}${corpo}</body></html>`
  );
}

/** O nome do arquivo, para o script e para o link da tarefa apontarem ao mesmo. */
export function nomeDoArquivo(c: Caderno): string {
  return `caderno-${c.numero}.pdf`;
}
