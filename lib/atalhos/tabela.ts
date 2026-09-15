/**
 * A tabela única dos atalhos de teclado — fatia 10, parada 10F (§7, §25, e o pedido do Doug de
 * atalhos como Lichess e Chess.com).
 *
 * ## Por que uma tabela, e não um `addEventListener` em cada tela
 *
 * Até a fatia 9 cada tela escutava o teclado por conta própria: o editor (setas, Ctrl+Z, Esc), o
 * motor (`L`), a introdução do aluno (← →), o repertório. Duas telas montadas juntas podiam reagir à
 * mesma tecla, e o `L` ligava o motor com o menu `•••` de um lance aberto (registrado na fatia 9).
 * Uma tabela deixa três coisas verificáveis por teste: nenhuma tecla repetida no mesmo escopo, a ajuda
 * (`?`) gerada dos mesmos dados que o código usa, e o que cada escopo bloqueia.
 *
 * ## Escopos
 *
 * - `tabuleiro`: vale em toda tela com tabuleiro, do editor e do aluno (`x`, `?`).
 * - `editor`: o editor de aulas; `repertorio`: o editor do repertório; `introducao-editor`: a tela
 *   cheia da introdução.
 * - `aluno-*`: as etapas da aula do aluno.
 * - `tatica-rating`: a tela de jogo da tática com rating (Enter = próximo, depois de um erro).
 * - `janela`: com uma janela aberta, só o que é da janela funciona (Esc, Tab preso). As teclas dos
 *   escopos de baixo ficam mudas — é o que resolve o `L` com o menu `•••` aberto.
 */

export type EscopoDeAtalho =
  | "tabuleiro"
  | "editor"
  | "repertorio"
  | "introducao-editor"
  | "aluno-introducao"
  | "aluno-capitulo"
  | "aluno-treino"
  | "aluno-pratica"
  | "passada"
  | "tatica-rating"
  | "janela";

export type Atalho = {
  id: string;
  /** Como `KeyboardEvent.key` escreve, com os modificadores na frente: "x", "?", "Control+z". */
  teclas: string[];
  escopo: EscopoDeAtalho;
  descricao: string;
  /** Atalho que só está na tabela: o código dele ainda não passa pelo registro (corte registrado). */
  soNaTabela?: true;
};

export const ATALHOS: Atalho[] = [
  { id: "virar-tabuleiro", teclas: ["x"], escopo: "tabuleiro", descricao: "vira o tabuleiro (só a vista: não muda a aula nem entra no Desfazer)" },
  { id: "ajuda-atalhos", teclas: ["?"], escopo: "tabuleiro", descricao: "mostra esta lista de atalhos" },

  { id: "lance-anterior", teclas: ["ArrowLeft"], escopo: "editor", descricao: "vai ao lance anterior" },
  { id: "lance-seguinte", teclas: ["ArrowRight"], escopo: "editor", descricao: "vai ao lance seguinte da linha" },
  { id: "item-acima", teclas: ["ArrowUp"], escopo: "editor", descricao: "sobe na lista de lances, variantes incluídas" },
  { id: "item-abaixo", teclas: ["ArrowDown"], escopo: "editor", descricao: "desce na lista de lances, variantes incluídas" },
  { id: "primeiro-lance", teclas: ["Home"], escopo: "editor", descricao: "vai à posição inicial" },
  { id: "ultimo-lance", teclas: ["End"], escopo: "editor", descricao: "vai ao fim da linha" },
  { id: "desfazer", teclas: ["Control+z", "Meta+z"], escopo: "editor", descricao: "desfaz a última edição (dentro de um campo, desfaz o texto)" },
  { id: "refazer", teclas: ["Control+Shift+z", "Control+y", "Meta+Shift+z"], escopo: "editor", descricao: "refaz" },
  { id: "motor", teclas: ["l"], escopo: "editor", descricao: "liga e desliga o motor do professor" },
  { id: "sair-do-desenho", teclas: ["Escape"], escopo: "editor", descricao: "larga a seta pela metade, depois volta a mover peças" },

  { id: "repertorio-anterior", teclas: ["ArrowLeft"], escopo: "repertorio", descricao: "vai ao lance anterior" },
  { id: "repertorio-seguinte", teclas: ["ArrowRight"], escopo: "repertorio", descricao: "vai ao lance seguinte" },
  { id: "repertorio-acima", teclas: ["ArrowUp"], escopo: "repertorio", descricao: "sobe na lista de lances" },
  { id: "repertorio-abaixo", teclas: ["ArrowDown"], escopo: "repertorio", descricao: "desce na lista de lances" },
  { id: "repertorio-inicio", teclas: ["Home"], escopo: "repertorio", descricao: "vai à posição inicial" },
  { id: "repertorio-fim", teclas: ["End"], escopo: "repertorio", descricao: "vai ao fim da linha" },
  { id: "repertorio-desfazer", teclas: ["Control+z", "Meta+z"], escopo: "repertorio", descricao: "desfaz" },
  { id: "repertorio-refazer", teclas: ["Control+y", "Control+Shift+z", "Meta+Shift+z"], escopo: "repertorio", descricao: "refaz" },
  { id: "repertorio-motor", teclas: ["l"], escopo: "repertorio", descricao: "liga e desliga o motor do professor" },

  { id: "quadro-anterior", teclas: ["ArrowLeft"], escopo: "introducao-editor", descricao: "quadro anterior" },
  { id: "quadro-seguinte", teclas: ["ArrowRight"], escopo: "introducao-editor", descricao: "quadro seguinte" },

  { id: "aluno-quadro-anterior", teclas: ["ArrowLeft"], escopo: "aluno-introducao", descricao: "volta um quadro" },
  { id: "aluno-quadro-seguinte", teclas: ["ArrowRight"], escopo: "aluno-introducao", descricao: "avança um quadro" },
  { id: "aluno-continuar", teclas: [" "], escopo: "aluno-capitulo", descricao: "Continuar, quando a aula espera" },

  { id: "passada-anterior", teclas: ["ArrowLeft"], escopo: "passada", descricao: "lance anterior na linha do repertório", soNaTabela: true },
  { id: "passada-seguinte", teclas: ["ArrowRight"], escopo: "passada", descricao: "lance seguinte na linha do repertório", soNaTabela: true },

  { id: "rating-proximo", teclas: ["Enter"], escopo: "tatica-rating", descricao: "vai ao próximo problema, depois de ver a solução" },

  { id: "fechar-janela", teclas: ["Escape"], escopo: "janela", descricao: "fecha a janela e devolve o foco a quem a abriu" },
];

/** O nome da tecla para gente: "Ctrl+Z", "Espaço", "←". */
export function nomeDaTecla(tecla: string): string {
  const nomes: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Escape: "Esc", " ": "Espaço", Control: "Ctrl", Meta: "⌘", Shift: "Shift", Home: "Home", End: "End" };
  return tecla.split("+").map((parte) => nomes[parte] ?? (parte.length === 1 ? parte.toUpperCase() : parte)).join("+");
}

/**
 * A tecla de um evento na forma da tabela. Letras vão em minúscula (o `L` com Caps Lock é o mesmo
 * atalho); o `?` já vem com o Shift embutido, e por isso o Shift não entra quando a tecla é um sinal.
 */
export function teclaDoEvento(evento: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean }): string {
  const chave = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
  const letra = /^[a-z]$/.test(chave);
  const partes = [
    evento.ctrlKey ? "Control" : "",
    evento.metaKey ? "Meta" : "",
    evento.altKey ? "Alt" : "",
    evento.shiftKey && (letra || chave.length > 1) ? "Shift" : "",
    chave,
  ].filter(Boolean);
  return partes.join("+");
}

export function atalho(id: string): Atalho {
  const achado = ATALHOS.find((item) => item.id === id);
  if (!achado) throw new Error(`atalho desconhecido: ${id}`);
  return achado;
}

/** Teclas repetidas dentro de um escopo — a lista que o teste exige vazia. */
export function conflitosDaTabela(tabela: Atalho[] = ATALHOS): string[] {
  const vistos = new Map<string, string>();
  const conflitos: string[] = [];
  for (const item of tabela) {
    for (const tecla of item.teclas) {
      const chave = `${item.escopo}:${tecla}`;
      const dono = vistos.get(chave);
      if (dono && dono !== item.id) conflitos.push(`${chave} está em "${dono}" e em "${item.id}"`);
      vistos.set(chave, item.id);
    }
  }
  // O escopo `tabuleiro` convive com todos os outros: uma tecla dele não pode ser usada por nenhum.
  for (const item of tabela.filter((a) => a.escopo === "tabuleiro")) {
    for (const outro of tabela.filter((a) => a.escopo !== "tabuleiro" && a.escopo !== "janela")) {
      for (const tecla of item.teclas) if (outro.teclas.includes(tecla)) conflitos.push(`"${tecla}" do tabuleiro também está em "${outro.id}"`);
    }
  }
  return conflitos;
}
