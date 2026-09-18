/**
 * O leitor do curso de abertura — especificação §13.3 (decisões do Doug, 16/9/2026).
 *
 * Um estudo do Lichess escrito na *Estrutura Didática v3.1* entra aqui como texto e sai **lido**:
 * cada capítulo com o código, a aula a que pertence, o papel, os ramos que ensinam, as paradas e as
 * linhas do move trainer. Ninguém é escrito: quem monta as `AulaV2` é o planejador
 * (`planejar-curso.ts`), e quem gera o PGN do repertório é `lib/repertorio/gerar-do-estudo.ts`.
 *
 * Módulo puro. O xadrez é da `chess.js`; a pontuação do PGN é de `lib/repertorio/pgn.ts`.
 *
 * ## Os dois caminhos dão o mesmo curso
 *
 * O export do Lichess traz `[ChapterName "B05A - título"]`; o arquivo local traz o código em
 * `[White]` e o título em `[Black]`, e nenhum `ChapterName` (achado da P0). O leitor aceita os dois,
 * e sintetiza o `ChapterName` quando só o par existe — o que o resto do editor lê é o mesmo.
 *
 * ## A orientação vem da cor do curso
 *
 * O export da v1.5 traz `Orientation "black"` nos 38 capítulos de um curso das brancas. A tag é
 * ignorada, com um aviso: quem joga é a cor do curso.
 */
import { Chess } from "chess.js";
import { lerPgnsDoEstudo, type LancePgn, type PartidaPgn } from "../repertorio/pgn.ts";
import { sanEmPortugues } from "../repertorio/treino.ts";
import type { CorDoCurso } from "./dominio.ts";

export const FEN_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ---------------------------------------------------------------------------------------------
// Código, título e aula
// ---------------------------------------------------------------------------------------------

/** `00`, `A00`, `B05A`, `E22P`, `F23`. */
const CODIGO = /^(?:\d{2}|[A-Z]\d{2}[A-Z]?)$/;
const CHAPTER_NAME = /^\s*(\d{2}|[A-Z]\d{2}[A-Z]?)\s*[-–—]\s*(.+?)\s*$/;

export type CodigoDoCapitulo = { codigo: string; titulo: string };

/** O código e o título: primeiro do `ChapterName`, depois do par `White`/`Black`. */
export function codigoDoCapitulo(tags: Record<string, string>): CodigoDoCapitulo | null {
  const doNome = tags.ChapterName ? CHAPTER_NAME.exec(tags.ChapterName) : null;
  if (doNome) return { codigo: doNome[1], titulo: doNome[2] };
  const codigo = tags.White?.trim();
  const titulo = tags.Black?.trim();
  if (codigo && CODIGO.test(codigo) && titulo && titulo !== "?") return { codigo, titulo };
  return null;
}

/**
 * A partida com o `ChapterName` que o arquivo local não traz. O resto do editor (`lerEstudo`,
 * `importarJogo`) lê o nome do capítulo por esta tag — e é por ela que o `00` não perde o código.
 */
export function comNomeDoCapitulo(partida: PartidaPgn): PartidaPgn {
  if (partida.tags.ChapterName) return partida;
  const lido = codigoDoCapitulo(partida.tags);
  return lido ? { ...partida, tags: { ...partida.tags, ChapterName: `${lido.codigo} - ${lido.titulo}` } } : partida;
}

export type AulaDoCurso = "A" | "B" | "C" | "D" | "EF";
export const AULAS_DO_CURSO: AulaDoCurso[] = ["A", "B", "C", "D", "EF"];

/** O bloco da Estrutura Didática vira aula: `00` e A na A; E e F juntos na E+F. */
export function aulaDoCodigo(codigo: string): AulaDoCurso | null {
  if (/^\d{2}$/.test(codigo)) return "A";
  const letra = codigo[0];
  if (letra === "A" || letra === "B" || letra === "C" || letra === "D") return letra;
  if (letra === "E" || letra === "F") return "EF";
  return null;
}

/** O adversário do curso, como o aluno lê: "as Pretas" num curso das brancas, e vice-versa. */
export const adversarioDo = (cor: CorDoCurso) => (cor === "brancas" ? "Pretas" : "Brancas");

/** O título de cada aula depende da cor: num curso das pretas, quem "joga bem" são as Brancas. */
export function tituloDaAula(bloco: AulaDoCurso, cor: CorDoCurso): string {
  const titulos: Record<AulaDoCurso, string> = {
    A: cor === "brancas" ? "A defesa e nossa arma" : "Nossa defesa e nossa arma",
    B: "Armadilhas e punições",
    C: `Quando as ${adversarioDo(cor)} jogam bem`,
    D: "Partida modelo",
    EF: "Treino final e revisão",
  };
  return titulos[bloco];
}

// ---------------------------------------------------------------------------------------------
// Marcadores (§13.3.5)
// ---------------------------------------------------------------------------------------------

/** Os marcadores que mudam o que a aula faz com o texto. */
const FUNCIONAIS = new Set(["OBJETIVO", "PERGUNTA", "TRAIN", "REFERENCIA", "RESUMO", "PROXIMO", "DICA", "SECAO"]);

/**
 * A capa de seção do capítulo (feedback do aluno, 17/9/2026): `[SECAO] Título | subtítulo`, no
 * comentário de abertura. O aluno vê a capa antes da primeira fala; nunca vira fala nem vai ao
 * repertório.
 */
export type SecaoDoCapitulo = { titulo: string; subtitulo?: string };

export function secaoDoTexto(texto: string): SecaoDoCapitulo | null {
  const [titulo, ...resto] = texto.split("|").map((parte) => parte.trim());
  if (!titulo) return null;
  const subtitulo = resto.join(" | ").trim();
  return subtitulo ? { titulo, subtitulo } : { titulo };
}

/** Os marcadores que viram rótulo da fala. */
export const ROTULOS: Record<string, string> = {
  ENTENDER: "Entender",
  PLANO: "Plano",
  MEMORIZAR: "Memorizar",
  ARMADILHA: "Armadilha",
  PUNICAO: "Punição",
  GOLPE: "Golpe",
  "ERRO COMUM": "Erro comum",
  "NAO FUNCIONA": "Não funciona",
  TEORIA: "Teoria",
  "LINHA CRITICA": "Linha crítica",
  DEFESA: "Defesa",
  ESQUEMA: "Esquema",
  ATENCAO: "Atenção",
  CONEXAO: "Conexão",
  "COMO USAR": "Como usar",
  "PARTIDA REAL": "Partida real",
  RESUMO: "Resumo",
  PROXIMO: "A seguir",
};

const MARCADOR = /\[([A-ZÀ-Ý][A-ZÀ-Ý ]*[A-ZÀ-Ý]|[A-ZÀ-Ý])\]/g;

/** Um pedaço do comentário: o marcador que o abre (ou nenhum), os rótulos acumulados e o texto. */
export type Trecho = { marcador: string | null; rotulos: string[]; texto: string };

/** Tira do comentário as diretivas `[%cal …]`, `[%csl …]`: são desenho, não fala. */
export function semDiretivas(comentario: string): string {
  return comentario.replace(/\[%[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Corta o comentário nos marcadores. Marcador sem texto antes do próximo empresta o nome ao
 * seguinte: `[GOLPE] [PUNICAO] Sim.` é **um** trecho, com os dois rótulos; `[NAO FUNCIONA]
 * [PERGUNTA] A dama saiu?` é uma pergunta.
 */
export function lerMarcadores(comentario: string | null): Trecho[] {
  if (!comentario) return [];
  const texto = semDiretivas(comentario);
  const trechos: Trecho[] = [];
  const achados = [...texto.matchAll(MARCADOR)];
  const antes = texto.slice(0, achados[0]?.index ?? texto.length).trim();
  if (antes) trechos.push({ marcador: null, rotulos: [], texto: antes });
  let pendentes: string[] = [];
  achados.forEach((achado, i) => {
    const inicio = achado.index! + achado[0].length;
    const fim = achados[i + 1]?.index ?? texto.length;
    const corpo = texto.slice(inicio, fim).trim();
    const marcador = achado[1];
    if (!corpo) {
      pendentes.push(marcador);
      return;
    }
    trechos.push({ marcador, rotulos: [...pendentes, marcador], texto: corpo });
    pendentes = [];
  });
  return trechos;
}

export type Fala = { texto: string; rotulo?: string; pausaManual: boolean };

export type LeituraDoComentario = {
  falas: Fala[];
  /** As falas e as perguntas na ordem em que o professor as escreveu. */
  sequencia: Array<Fala & { pergunta?: true; fechamento?: true }>;
  objetivos: string[];
  perguntas: string[];
  dicas: string[];
  treinos: string[];
  referencias: string[];
  /** O texto cru de cada `[SECAO]` (ver `secaoDoTexto`). */
  secoes: string[];
  /** Marcadores que o leitor não conhece: o texto fica, e o relatório avisa. */
  desconhecidos: string[];
};

const nomeDoRotulo = (marcador: string) =>
  ROTULOS[marcador] ?? marcador.charAt(0) + marcador.slice(1).toLowerCase();

/** O que o comentário vira na aula: falas com rótulo, objetivo, pergunta, dica, treino. */
export function lerComentario(comentario: string | null): LeituraDoComentario {
  const leitura: LeituraDoComentario = { falas: [], sequencia: [], objetivos: [], perguntas: [], dicas: [], treinos: [], referencias: [], secoes: [], desconhecidos: [] };
  for (const trecho of lerMarcadores(comentario)) {
    for (const marcador of trecho.rotulos) {
      if (!FUNCIONAIS.has(marcador) && !ROTULOS[marcador] && !leitura.desconhecidos.includes(marcador)) leitura.desconhecidos.push(marcador);
    }
    switch (trecho.marcador) {
      case "OBJETIVO": leitura.objetivos.push(trecho.texto); break;
      case "PERGUNTA":
        leitura.perguntas.push(trecho.texto);
        leitura.sequencia.push({ texto: trecho.texto, rotulo: "Pergunta", pausaManual: true, pergunta: true });
        break;
      case "DICA": leitura.dicas.push(trecho.texto); break;
      case "TRAIN": leitura.treinos.push(trecho.texto); break;
      case "REFERENCIA": leitura.referencias.push(trecho.texto); break;
      case "SECAO": leitura.secoes.push(trecho.texto); break;
      default: {
        const rotulos = trecho.rotulos.filter((m) => !FUNCIONAIS.has(m) || m === "RESUMO" || m === "PROXIMO").map(nomeDoRotulo);
        const fechamento = trecho.marcador === "RESUMO" || trecho.marcador === "PROXIMO";
        const fala: Fala = {
          texto: trecho.texto,
          ...(rotulos.length ? { rotulo: [...new Set(rotulos)].join(" · ") } : {}),
          pausaManual: fechamento,
        };
        leitura.falas.push(fala);
        leitura.sequencia.push(fechamento ? { ...fala, fechamento: true } : fala);
      }
    }
  }
  return leitura;
}

/**
 * O comentário como o repertório o guarda (§21): sem marcador nenhum, e sem o que é da aula —
 * `[TRAIN]`, `[PROXIMO]`, `[REFERENCIA]`, `[OBJETIVO]`, `[DICA]`, `[SECAO]`. A pergunta fica: num lance nosso,
 * ela costuma ser a explicação ("Podemos entregar a dama? Sim.").
 */
export function comentarioDoRepertorio(comentario: string | null): string {
  return lerMarcadores(comentario)
    .filter((t) => !["TRAIN", "PROXIMO", "REFERENCIA", "OBJETIVO", "DICA", "SECAO"].includes(t.marcador ?? ""))
    .map((t) => t.texto)
    .join(" ")
    .trim();
}

// ---------------------------------------------------------------------------------------------
// A árvore de um capítulo
// ---------------------------------------------------------------------------------------------

export type LanceDoEstudo = {
  uci: string;
  san: string;
  nags: string[];
  comentario: string | null;
  fenAntes: string;
  fen: string;
  /** É lance da cor do curso? */
  nosso: boolean;
  /** O primeiro é a continuação principal; os outros, as alternativas a ela. */
  filhos: LanceDoEstudo[];
  pai: LanceDoEstudo | null;
};

export type ArvoreDoEstudo = { fen: string; intro: string | null; filhos: LanceDoEstudo[]; perdas: string[] };

const uciDe = (lance: { from: string; to: string; promotion?: string }) => `${lance.from}${lance.to}${lance.promotion ?? ""}`;
export const semContadores = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
/** A chave de um lance em qualquer capítulo: a posição (sem contadores) e o lance. */
export const chaveDoLance = (lance: Pick<LanceDoEstudo, "fenAntes" | "uci">) => `${semContadores(lance.fenAntes)}|${lance.uci}`;

export function arvoreDaPartida(partida: PartidaPgn, cor: CorDoCurso): ArvoreDoEstudo {
  const fen = partida.tags.SetUp === "1" && partida.tags.FEN ? partida.tags.FEN : FEN_INICIAL;
  const arvore: ArvoreDoEstudo = { fen, intro: partida.intro, filhos: [], perdas: [] };
  const lado = cor === "brancas" ? "w" : "b";

  const inserir = (lances: LancePgn[], fenInicial: string, pai: LanceDoEstudo | null, irmaos: LanceDoEstudo[]) => {
    let fenAtual = fenInicial;
    let dono = pai;
    let lista = irmaos;
    for (const lance of lances) {
      const tabuleiro = new Chess(fenAtual);
      let jogado;
      try {
        jogado = tabuleiro.move(lance.san);
      } catch {
        arvore.perdas.push(`lance ilegal ${lance.san} — a linha para aí`);
        return;
      }
      const uci = uciDe(jogado);
      let no = lista.find((item) => item.uci === uci);
      if (no) {
        if (lance.comentario && no.comentario !== lance.comentario) no.comentario = [no.comentario, lance.comentario].filter(Boolean).join(" ");
        for (const nag of lance.nags) if (!no.nags.includes(nag)) no.nags.push(nag);
      } else {
        no = { uci, san: jogado.san, nags: [...lance.nags], comentario: lance.comentario, fenAntes: fenAtual, fen: tabuleiro.fen(), nosso: fenAtual.split(" ")[1] === lado, filhos: [], pai: dono };
        lista.push(no);
      }
      // As variações são alternativas a ESTE lance: saem da mesma posição, na mesma lista.
      for (const variacao of lance.variacoes) inserir(variacao, fenAtual, dono, lista);
      fenAtual = no.fen;
      dono = no;
      lista = no.filhos;
    }
  };
  inserir(partida.lances, fen, null, arvore.filhos);
  return arvore;
}

/** A continuação principal a partir de um lance, ele incluso. */
function linhaPrincipal(lance: LanceDoEstudo): LanceDoEstudo[] {
  const linha = [lance];
  while (linha[linha.length - 1].filhos[0]) linha.push(linha[linha.length - 1].filhos[0]);
  return linha;
}

/**
 * O número do lance como o professor escreve: `9...Be7`, `11.gxf3`, `5.Cc3`.
 *
 * **Em português, e aqui vale o `R` também** (Doug, 17/9/2026). O `lance.san`
 * vem da `chess.js`, que só produz inglês — então `Rg1` é torre com certeza, e
 * sai `Tg1`. A dúvida entre *rook* e rei que faz `textoEmPortugues` deixar o
 * `R` quieto é da prosa solta, onde não há tabuleiro para desempatar; aqui há.
 *
 * Isto alimenta o que o aluno lê ao acertar uma parada ("Isso: 5.Cc3."), o
 * "também vale" do lance irmão e o `— depois de 5.Cc3` do título do capítulo.
 * Vale **da próxima publicação em diante**; o que já está publicado é traduzido
 * na leitura, em `naLinguaDoAluno` (`fluxo-do-aluno.ts`).
 */
export function lanceEscrito(lance: LanceDoEstudo): string {
  const [, vez, , , , numero] = lance.fenAntes.split(" ");
  return vez === "w" ? `${numero}.${sanEmPortugues(lance.san)}` : `${numero}...${sanEmPortugues(lance.san)}`;
}

// ---------------------------------------------------------------------------------------------
// Percursos: a linha principal e os ramos que ensinam
// ---------------------------------------------------------------------------------------------

export type Percurso = {
  tipo: "principal" | "ramo";
  /** Da raiz até a ponta. */
  lances: LanceDoEstudo[];
  /** Onde o ramo sai da linha de onde nasceu (índice em `lances`); 0 na principal. */
  desde: number;
  titulo: string | null;
  caso: number | null;
  /** Tem texto nos lances próprios: é um ramo que ensina algo. */
  didatico: boolean;
};

const temTexto = (lance: LanceDoEstudo) => {
  const lido = lerComentario(lance.comentario);
  return lido.falas.length > 0 || lido.perguntas.length > 0;
};

const TITULO_DO_RAMO = /^(CASO\s+(\d+)\s*[—–-]\s*[^.:]+|Regra\s+(\d+))/i;

function tituloDoRamo(proprios: LanceDoEstudo[]): { titulo: string | null; caso: number | null } {
  for (const lance of proprios) {
    for (const fala of lerComentario(lance.comentario).falas) {
      const achado = TITULO_DO_RAMO.exec(fala.texto);
      if (!achado) continue;
      if (achado[2]) {
        const corpo = achado[1].replace(/\s+/g, " ").trim();
        const [cabeca, ...resto] = corpo.split(/\s*[—–-]\s*/);
        const nome = resto.join(" — ").toLowerCase();
        return { titulo: `${cabeca.charAt(0)}${cabeca.slice(1).toLowerCase()} — ${nome}`, caso: Number(achado[2]) };
      }
      return { titulo: `Regra ${achado[3]}`, caso: null };
    }
  }
  return { titulo: null, caso: null };
}

/**
 * A linha principal e os ramos, em ordem de PGN. Ramo é alternativa a um lance **do adversário**;
 * alternativa a lance nosso não é ramo, é irmão (alternativa aceita, erro nomeado ou referência).
 * Quando todos os ramos de um capítulo são "CASO N", a ordem é a dos números (B08).
 */
export function percursosDoCapitulo(arvore: ArvoreDoEstudo): Percurso[] {
  if (!arvore.filhos.length) return [];
  const principal: Percurso = { tipo: "principal", lances: linhaPrincipal(arvore.filhos[0]), desde: 0, titulo: null, caso: null, didatico: true };
  const ramos: Percurso[] = [];
  const visitar = (percurso: Percurso) => {
    for (let i = percurso.desde; i < percurso.lances.length; i++) {
      const lance = percurso.lances[i];
      const irmaos = lance.pai ? lance.pai.filhos : arvore.filhos;
      if (irmaos[0] !== lance) continue;
      for (const alternativa of irmaos.slice(1)) {
        if (alternativa.nosso) continue;
        const proprios = linhaPrincipal(alternativa);
        const { titulo, caso } = tituloDoRamo(proprios);
        const ramo: Percurso = { tipo: "ramo", lances: [...percurso.lances.slice(0, i), ...proprios], desde: i, titulo, caso, didatico: proprios.some(temTexto) };
        if (ramo.didatico) ramos.push(ramo);
        visitar(ramo);
      }
    }
  };
  visitar(principal);
  // O próprio ramo também começa num lance que é alternativa: `visitar` pula esse lance porque ele
  // não é o primeiro irmão, e é isso que evita contar o ramo duas vezes.
  if (ramos.length > 1 && ramos.every((r) => r.caso !== null)) ramos.sort((a, b) => a.caso! - b.caso!);
  return [principal, ...ramos];
}

// ---------------------------------------------------------------------------------------------
// Paradas (§13.3.4)
// ---------------------------------------------------------------------------------------------

export type Parada = {
  percurso: number;
  /** Onde a pergunta está escrita (índice em `lances`). */
  pergunta: number;
  /** O lance que o aluno joga (índice em `lances`). */
  resposta: number;
  texto: string;
  dica: string | null;
  /** Irmãos nossos da resposta com `!`, `!!`, `!?`: "vale, mas a aula segue por…". */
  alternativas: LanceDoEstudo[];
  /** Irmãos nossos com `?`, `?!`, `??`: erro nomeado. */
  erros: LanceDoEstudo[];
  /** Irmãos nossos sem símbolo: não viram nada, e o relatório avisa. */
  semMarca: LanceDoEstudo[];
};

const BONS = new Set(["!", "!!", "!?", "$1", "$3", "$5"]);
const RUINS = new Set(["?", "??", "?!", "$2", "$4", "$6"]);
export const marcaBoa = (lance: Pick<LanceDoEstudo, "nags">) => lance.nags.some((nag) => BONS.has(nag));
export const marcaRuim = (lance: Pick<LanceDoEstudo, "nags">) => lance.nags.some((nag) => RUINS.has(nag));

// ---------------------------------------------------------------------------------------------
// Move trainer
// ---------------------------------------------------------------------------------------------

export type CategoriaDaLinha = "arma" | "esquema" | "preparacao" | "golpe" | "nao-funciona" | "defesa" | "linha-critica" | "desvio" | "se-esquecer" | "arvore";

export const CATEGORIAS: CategoriaDaLinha[] = ["arma", "esquema", "preparacao", "golpe", "nao-funciona", "defesa", "linha-critica", "desvio", "se-esquecer", "arvore"];

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * O prefixo do capítulo de treinador no estudo: "Move Trainer — …" (o nome antigo, que os estudos
 * publicados usam) ou "Treinador de lances — …" (o nome do site desde 18/9/2026). Os dois valem.
 */
const PREFIXO_DO_TREINADOR = /^(move trainer|treinador de lances)\s*[—–-]\s*/i;

/** A categoria sai do rótulo do título: "Move Trainer — Golpe 1: …" é golpe. */
export function categoriaDoTitulo(titulo: string): CategoriaDaLinha | null {
  const rotulo = normalizar(titulo.replace(PREFIXO_DO_TREINADOR, ""));
  if (/nao funciona/.test(rotulo)) return "nao-funciona";
  if (/desvio/.test(rotulo)) return "desvio";
  if (/^arma\b/.test(rotulo)) return "arma";
  if (/^esquema\b/.test(rotulo)) return "esquema";
  if (/^preparacao\b/.test(rotulo)) return "preparacao";
  // "Imprecisão" é o golpe que o motor mede abaixo de +2 (Doug, 18/9/2026): a mesma categoria de linha.
  if (/^(golpe|imprecis(ao|oes))\b/.test(rotulo)) return "golpe";
  if (/^defesa\b/.test(rotulo)) return "defesa";
  if (/linha (mais dificil|critica)/.test(rotulo)) return "linha-critica";
  if (/esquecer/.test(rotulo)) return "se-esquecer";
  if (/arvore/.test(rotulo)) return "arvore";
  return null;
}

/** As linhas de um capítulo de move trainer: da raiz a cada ponta. */
function pontasDaArvore(arvore: ArvoreDoEstudo): LanceDoEstudo[][] {
  const linhas: LanceDoEstudo[][] = [];
  const andar = (lance: LanceDoEstudo, antes: LanceDoEstudo[]) => {
    const caminho = [...antes, lance];
    if (!lance.filhos.length) linhas.push(caminho);
    for (const filho of lance.filhos) andar(filho, caminho);
  };
  for (const filho of arvore.filhos) andar(filho, []);
  return linhas;
}

// ---------------------------------------------------------------------------------------------
// A leitura inteira
// ---------------------------------------------------------------------------------------------

export type PapelDoCapitulo = "aula" | "treinador" | "partida-modelo" | "revisao" | "vazio";

export type AvisoDoCurso = { codigo: string; capitulo?: string; mensagem: string };

export type CapituloDoCurso = {
  numero: number;
  codigo: string;
  titulo: string;
  aula: AulaDoCurso | null;
  papel: PapelDoCapitulo;
  /** Com o `ChapterName` sintetizado quando o arquivo não o trazia. */
  partida: PartidaPgn;
  arvore: ArvoreDoEstudo;
  objetivo: string | null;
  /** A capa de seção, quando o comentário de abertura traz `[SECAO]`. */
  secao?: SecaoDoCapitulo;
  percursos: Percurso[];
  perguntas: number;
  paradas: Parada[];
  categoria: CategoriaDaLinha | null;
  /** No capítulo de move trainer: as linhas da raiz a cada ponta. */
  linhas: LanceDoEstudo[][];
  /** Na partida modelo: o cabeçalho que as tags `Model*` dão. */
  partidaModelo?: { brancas: string; pretas: string; evento?: string; data?: string };
};

export type LinhaDoCurso = {
  /** Os UCI da raiz à ponta, separados por espaço: é a identidade da linha. */
  chave: string;
  lances: LanceDoEstudo[];
  capitulo: string;
  titulo: string;
  objetivo: string | null;
  categoria: CategoriaDaLinha | null;
  ordem: number;
  /** Nenhuma outra linha começa por ela. */
  completa: boolean;
};

export type LeituraDoCurso = {
  cor: CorDoCurso;
  estudo: { nome: string | null; link: string | null };
  capitulos: CapituloDoCurso[];
  aulas: Record<AulaDoCurso, { capitulos: string[]; treinadores: string[] }>;
  /** Todas as linhas dos capítulos de move trainer, sem repetição, na ordem do estudo. */
  linhas: LinhaDoCurso[];
  /** Para cada lance (posição + UCI), o primeiro comentário do estudo, no texto do repertório. */
  comentarios: Map<string, string>;
  avisos: AvisoDoCurso[];
};

export function lerCursoDeAbertura(texto: string, cor: CorDoCurso): LeituraDoCurso {
  const avisos: AvisoDoCurso[] = [];
  const desconhecidos = new Set<string>();
  const partidas = lerPgnsDoEstudo(texto);
  const orientacaoDoCurso = cor === "brancas" ? "white" : "black";
  const orientacoesErradas = partidas.filter((p) => p.tags.Orientation && p.tags.Orientation.toLowerCase() !== orientacaoDoCurso).length;
  if (orientacoesErradas) {
    avisos.push({ codigo: "ORIENTACAO_IGNORADA", mensagem: `${orientacoesErradas} capítulo(s) dizem Orientation "${orientacaoDoCurso === "white" ? "black" : "white"}" — ignorado: o tabuleiro fica do lado das ${cor}, a cor do curso` });
  }

  const capitulos: CapituloDoCurso[] = [];
  partidas.forEach((original, indice) => {
    const numero = indice + 1;
    const lido = codigoDoCapitulo(original.tags);
    if (!lido) {
      avisos.push({ codigo: "CAPITULO_SEM_CODIGO", mensagem: `o capítulo ${numero} não tem código (ChapterName "B05A - título" ou White/Black) — fica fora do curso` });
      return;
    }
    const partida = comNomeDoCapitulo(original);
    const { codigo, titulo } = lido;
    const aula = aulaDoCodigo(codigo);
    const arvore = arvoreDaPartida(partida, cor);
    for (const perda of arvore.perdas) avisos.push({ codigo: "LANCE_ILEGAL", capitulo: codigo, mensagem: perda });
    const intro = lerComentario(partida.intro);
    const objetivo = intro.objetivos[0] ?? null;
    const secao = intro.secoes[0] ? secaoDoTexto(intro.secoes[0]) : null;
    const temPartidaReal = /\[PARTIDA REAL\]/.test(partida.intro ?? "") || (partida.resultado !== null && partida.resultado !== "*");

    const ehTreinador = /^E22/.test(codigo) || PREFIXO_DO_TREINADOR.test(titulo);
    const papel: PapelDoCapitulo = !arvore.filhos.length ? "vazio"
      : ehTreinador ? "treinador"
        : aula === "D" ? (temPartidaReal ? "partida-modelo" : "vazio")
          : codigo.startsWith("F") ? "revisao"
            : "aula";
    if (papel === "vazio") avisos.push({ codigo: "CAPITULO_VAZIO", capitulo: codigo, mensagem: aula === "D" ? `«${titulo}» não tem partida (só a abertura) — fica fora da aula de partida modelo` : `«${titulo}» não tem lances — fica fora` });
    if (!aula) avisos.push({ codigo: "BLOCO_DESCONHECIDO", capitulo: codigo, mensagem: `o código ${codigo} não é de bloco da Estrutura Didática (00, A–F) — fica fora` });

    const percursos = papel === "aula" || papel === "partida-modelo" || papel === "revisao" ? percursosDoCapitulo(arvore) : [];
    const paradas: Parada[] = [];
    let perguntas = 0;
    const lerDesconhecidos = (comentario: string | null) => {
      for (const marcador of lerComentario(comentario).desconhecidos) {
        if (desconhecidos.has(marcador)) continue;
        desconhecidos.add(marcador);
        avisos.push({ codigo: "MARCADOR_DESCONHECIDO", capitulo: codigo, mensagem: `[${marcador}] não é marcador conhecido — o texto fica, com o rótulo «${nomeDoRotulo(marcador)}»` });
      }
    };
    lerDesconhecidos(partida.intro);
    // Pergunta antes do primeiro lance é pergunta de reflexão: fala com pausa, sem parada e sem aviso.
    if (papel === "aula") perguntas += intro.perguntas.length;
    percursos.forEach((percurso, p) => {
      for (let k = percurso.desde; k < percurso.lances.length; k++) {
        const lance = percurso.lances[k];
        lerDesconhecidos(lance.comentario);
        const lido = lerComentario(lance.comentario);
        if (!lido.perguntas.length) continue;
        perguntas += lido.perguntas.length;
        if (papel !== "aula") {
          avisos.push({ codigo: "PERGUNTA_FORA_DE_AULA", capitulo: codigo, mensagem: `[PERGUNTA] em ${lanceEscrito(lance)} num capítulo de ${papel} — a partida modelo e a revisão não têm parada` });
          continue;
        }
        const resposta = lance.nosso ? k + 2 : k + 1;
        const alvo = percurso.lances[resposta];
        // Pergunta sem lance nosso para jogar é pergunta de reflexão (Doug, 17/9/2026): o aluno lê,
        // pensa e segue — ela prepara o capítulo seguinte. Fica como fala com pausa, sem parada e sem aviso.
        if (!alvo || !alvo.nosso) continue;
        if (lance.nosso) {
          avisos.push({ codigo: "PERGUNTA_NO_LANCE_NOSSO", capitulo: codigo, mensagem: `a [PERGUNTA] de ${lanceEscrito(lance)} está escrita no nosso lance — a parada fica no lance nosso seguinte (${lanceEscrito(alvo)})` });
        }
        const irmaos = (alvo.pai ? alvo.pai.filhos : arvore.filhos).filter((item) => item !== alvo && item.nosso);
        const semMarca = irmaos.filter((item) => !marcaBoa(item) && !marcaRuim(item));
        for (const item of semMarca) avisos.push({ codigo: "IRMAO_SEM_MARCA", capitulo: codigo, mensagem: `na parada de ${lanceEscrito(alvo)}, ${lanceEscrito(item)} não tem símbolo — não vira alternativa nem erro; decida no Lichess` });
        paradas.push({
          percurso: p,
          pergunta: k,
          resposta,
          texto: lido.perguntas.join(" "),
          dica: lido.dicas[0] ?? null,
          alternativas: irmaos.filter(marcaBoa),
          erros: irmaos.filter((item) => marcaRuim(item) && !marcaBoa(item)),
          semMarca,
        });
      }
    });

    const categoria = papel === "treinador" ? categoriaDoTitulo(titulo) : null;
    if (papel === "treinador" && !categoria) avisos.push({ codigo: "CATEGORIA_DESCONHECIDA", capitulo: codigo, mensagem: `«${titulo}»: o rótulo do título não diz a categoria (arma, esquema, golpe, defesa…)` });
    const linhas = papel === "treinador" ? pontasDaArvore(arvore) : [];
    for (const linha of linhas) {
      if (!linha[linha.length - 1].nosso) avisos.push({ codigo: "LINHA_TERMINA_NO_ADVERSARIO", capitulo: codigo, mensagem: `a linha que termina em ${lanceEscrito(linha[linha.length - 1])} acaba num lance do adversário — o repertório não a aceita` });
    }
    const t = partida.tags;
    capitulos.push({
      numero, codigo, titulo, aula, papel, partida, arvore, objetivo, percursos, perguntas, paradas, categoria, linhas,
      ...(secao ? { secao } : {}),
      ...(papel === "partida-modelo" && t.ModelWhite && t.ModelBlack
        ? { partidaModelo: { brancas: t.ModelWhite, pretas: t.ModelBlack, ...(t.ModelEvent ? { evento: t.ModelEvent } : {}), ...(t.ModelDate ? { data: t.ModelDate } : {}) } }
        : {}),
    });
  });

  // ---- de que aula é cada capítulo de move trainer -----------------------------------------
  const didaticos = capitulos.filter((c) => c.papel === "aula" && (c.aula === "A" || c.aula === "B" || c.aula === "C"));
  const chaveDe = (lances: LanceDoEstudo[]) => lances.map((l) => l.uci).join(" ");
  const aulas = Object.fromEntries(AULAS_DO_CURSO.map((a) => [a, { capitulos: [] as string[], treinadores: [] as string[] }])) as LeituraDoCurso["aulas"];
  for (const capitulo of capitulos) {
    if (!capitulo.aula || capitulo.papel === "vazio") continue;
    if (capitulo.papel !== "treinador") {
      aulas[capitulo.aula].capitulos.push(capitulo.codigo);
      continue;
    }
    aulas.EF.treinadores.push(capitulo.codigo);
    if (capitulo.categoria === "arvore") continue;
    const principal = chaveDe(linhaPrincipal(capitulo.arvore.filhos[0]));
    const dono = didaticos.find((d) => [...percursosDoCapitulo(d.arvore)].some((p) => chaveDe(p.lances) === principal))
      ?? didaticos.find((d) => pontasDaArvore(d.arvore).some((linha) => chaveDe(linha) === principal));
    if (!dono) {
      avisos.push({ codigo: "TREINADOR_SEM_CAPITULO", capitulo: capitulo.codigo, mensagem: `nenhum capítulo didático tem a linha de «${capitulo.titulo}» — ela entra só na aula E+F` });
      continue;
    }
    if (dono.aula !== "EF" && !aulas[dono.aula!].treinadores.includes(capitulo.codigo)) aulas[dono.aula!].treinadores.push(capitulo.codigo);
  }

  // ---- as linhas, sem repetição, na ordem do estudo ----------------------------------------
  const linhas: LinhaDoCurso[] = [];
  const vistas = new Map<string, LinhaDoCurso>();
  for (const capitulo of capitulos.filter((c) => c.papel === "treinador")) {
    for (const lances of capitulo.linhas) {
      const chave = chaveDe(lances);
      if (vistas.has(chave)) continue;
      const linha: LinhaDoCurso = { chave, lances, capitulo: capitulo.codigo, titulo: capitulo.titulo.replace(PREFIXO_DO_TREINADOR, ""), objetivo: capitulo.objetivo, categoria: capitulo.categoria, ordem: linhas.length + 1, completa: true };
      vistas.set(chave, linha);
      linhas.push(linha);
    }
  }
  for (const linha of linhas) linha.completa = !linhas.some((outra) => outra !== linha && outra.chave.startsWith(`${linha.chave} `));

  // ---- o comentário de cada lance, o primeiro do estudo ------------------------------------
  const comentarios = new Map<string, string>();
  const colher = (lance: LanceDoEstudo) => {
    const texto = comentarioDoRepertorio(lance.comentario);
    if (texto && !comentarios.has(chaveDoLance(lance))) comentarios.set(chaveDoLance(lance), texto);
    for (const filho of lance.filhos) colher(filho);
  };
  for (const capitulo of capitulos) for (const filho of capitulo.arvore.filhos) colher(filho);

  // ---- frases de bastidor: o que o aluno leria e é conversa de quem escreveu --------------
  const BASTIDOR = /\b(curso atual|draft antigo|o draft)\b/gi;
  const bastidor = (codigo: string, onde: string, comentario: string | null) => {
    for (const fala of lerComentario(comentario).falas) {
      for (const achado of fala.texto.matchAll(BASTIDOR)) {
        avisos.push({ codigo: "FRASE_DE_BASTIDOR", capitulo: codigo, mensagem: `${onde}: «${achado[0]}» fora de [REFERENCIA] — o aluno leria isso` });
      }
    }
  };
  for (const capitulo of capitulos.filter((c) => c.papel !== "treinador" && c.papel !== "vazio")) {
    bastidor(capitulo.codigo, "introdução", capitulo.partida.intro);
    const andar = (lance: LanceDoEstudo) => {
      bastidor(capitulo.codigo, lanceEscrito(lance), lance.comentario);
      lance.filhos.forEach(andar);
    };
    capitulo.arvore.filhos.forEach(andar);
  }

  const primeira = partidas[0]?.tags ?? {};
  const leitura: LeituraDoCurso = {
    cor,
    estudo: { nome: primeira.StudyName ?? primeira.Event ?? null, link: primeira.ChapterURL?.replace(/\/[^/]+$/, "") ?? null },
    capitulos,
    aulas,
    linhas,
    comentarios,
    avisos,
  };
  // Lance do move trainer sem comentário não gera aviso: comentário é opcional (Doug, 17/9/2026).
  return leitura;
}
