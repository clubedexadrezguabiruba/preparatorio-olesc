import { aprendeu, CLASSES, daClasse, TRILHA, type ProgressoDaAula } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { PUZZLES_POR_TEMA } from "../tatica/serie.ts";
import { type Semana } from "./calendario.ts";
import {
  estaAberto,
  NIVEIS,
  nivelDaClasse,
  nivelDoBloco,
  type ItemDoNivel,
  type ModuloDoNivel,
  type Situacao,
} from "./trilha.ts";

/**
 * O curso inteiro montado por nível — a matéria-prima da página `/trilha`.
 *
 * ## Por que é uma função pura, e não a própria página
 *
 * Porque a pergunta que a `/trilha` responde ("onde eu estou, e o que vem
 * depois?") é a mesma que o painel e o relatório do professor vão querer fazer,
 * e ela é feita de **dois** progressos com donos diferentes — a view
 * `progresso_tema`, e a view `progresso_aula` mais `aula_lida`. Juntá-los
 * dentro do JSX seria uma terceira opinião sobre o que é "feito", escrita onde
 * nenhum teste alcança.
 *
 * Aqui entram os dois progressos já lidos e sai o mapa. Quem fala com o banco é
 * a página; quem decide o que os números significam é este arquivo, e o
 * `mapa.test.ts` cobra.
 *
 * ## A unidade de cada módulo é diferente, e isso é o assunto
 *
 * | módulo | um item é | `total` |
 * |---|---|---|
 * | tática | um tema | os {@link PUZZLES_POR_TEMA} puzzles dele |
 * | finais | uma aula | 1 — ela é dominada ou não |
 *
 * Não há como uniformizar isso sem mentir: um tema tem progresso parcial
 * medido, e uma aula tem um critério de domínio que a tablebase certifica. A
 * tela mostra as duas lado a lado **e** escreve o que cada barra conta — é a
 * mesma disciplina do selo de domínio.
 *
 * ## O que "aberto" quer dizer em cada um
 *
 * Tática e finais abrem por sábado, e o item fechado diz **qual** dos dois
 * motivos o fecha — a data que ainda não chegou, ou o texto que ainda não
 * existe. É a regra de {@link Situacao}, e ela mora aqui porque é a mesma nos
 * dois módulos: quem sabe a semana de hoje é a página, quem sabe o que aquilo
 * significa é este arquivo.
 *
 * O módulo de meio-jogo saiu do site em 2026-09-08, e este arquivo voltou a
 * falar de dois.
 */

export type ProgressoParaOMapa = {
  /** Tentativas por tema, da view `progresso_tema`. */
  readonly tatica: ReadonlyMap<string, number>;
  /** Um tema **tem texto escrito**? Vem de `temaAberto`, que olha o `content/`. */
  readonly temaAberto: (tag: string) => boolean;
  readonly finais: ReadonlyMap<string, ProgressoDaAula>;
  /** Os ids das aulas com JSON publicado, de `aulasPublicadas` — não as abertas. */
  readonly aulasPublicadas: ReadonlySet<string>;
  /** A semana do preparatório em que estamos, de `semanaAtual()`. */
  readonly semana: Semana;
};

/**
 * A data primeiro, o texto depois. Ver {@link Situacao} para o porquê da ordem.
 *
 * `escrito` é o único dos dois que muda de módulo para módulo: em tática é ter
 * linha em `content/temas.json`, em finais é ter JSON publicado em
 * `content/lessons/`.
 */
function situacao(sabado: Semana, semana: Semana, escrito: boolean): Situacao {
  if (sabado > semana) return "por-abrir";
  return escrito ? "aberto" : "em-escrita";
}

export function montarMapa(p: ProgressoParaOMapa): Map<string, ModuloDoNivel[]> {
  const porNivel = new Map<string, ModuloDoNivel[]>();

  const guardar = (nivel: string, modulo: ModuloDoNivel["modulo"], item: ItemDoNivel) => {
    const modulos = porNivel.get(nivel) ?? [];
    const existente = modulos.find((m) => m.modulo === modulo);
    if (existente) {
      (existente.itens as ItemDoNivel[]).push(item);
    } else {
      modulos.push({ modulo, itens: [item] });
    }
    porNivel.set(nivel, modulos);
  };

  for (const bloco of BLOCOS) {
    const nivel = nivelDoBloco(bloco.faixa);
    for (const tema of bloco.temas) {
      // `Math.min` porque a prova serve puzzles repetidos e a revisão grava no
      // mesmo tema: o contador passa de 24 sem o aluno ter feito nada a mais.
      // Documentar em vez de filtrar é a decisão da F2 — mas uma barra em 130%
      // seria a documentação chegando tarde demais.
      const feitos = Math.min(p.tatica.get(tema.tag) ?? 0, PUZZLES_POR_TEMA);
      guardar(nivel, "tatica", {
        id: tema.tag,
        nome: tema.nome,
        href: `/tatica/${tema.tag}`,
        total: PUZZLES_POR_TEMA,
        feitos,
        situacao: situacao(bloco.sabado, p.semana, p.temaAberto(tema.tag)),
        sabado: bloco.sabado,
      });
    }
  }

  for (const classe of CLASSES) {
    const nivel = nivelDaClasse(classe);
    for (const aula of daClasse(TRILHA, classe)) {
      const progresso = p.finais.get(aula.id);
      guardar(nivel, "finais", {
        id: aula.id,
        nome: aula.nome,
        href: `/finais/${aula.id}`,
        total: 1,
        feitos: progresso && aprendeu(aula.formato, progresso) ? 1 : 0,
        situacao: situacao(aula.sabado, p.semana, p.aulasPublicadas.has(aula.id)),
        sabado: aula.sabado,
      });
    }
  }


  // A ordem dos módulos dentro do nível é a da rotina de treino do aluno —
  // tática e depois finais —, a mesma do cartão "Hoje". Sair da ordem de
  // inserção evitaria que um nível sem tema de tática mostrasse finais
  // primeiro e o de baixo mostrasse tática primeiro.
  const ORDEM: ModuloDoNivel["modulo"][] = ["tatica", "finais"];
  for (const [nivel, modulos] of porNivel) {
    porNivel.set(nivel, [...modulos].sort((a, b) => ORDEM.indexOf(a.modulo) - ORDEM.indexOf(b.modulo)));
  }
  // E todo nível aparece no mapa, mesmo vazio: a tela desenha os quatro degraus
  // da escada, e um buraco no meio dela leria como erro.
  for (const nivel of NIVEIS) {
    if (!porNivel.has(nivel.id)) porNivel.set(nivel.id, []);
  }

  return porNivel;
}

/** Quanto de um módulo já está feito, contando só o que abriu. */
export function contarAberto(modulo: ModuloDoNivel): {
  feitos: number;
  total: number;
  /** Fechados porque o sábado deles ainda não chegou. */
  porAbrir: number;
  /** Fechados porque o texto ainda não existe. */
  emEscrita: number;
} {
  const abertos = modulo.itens.filter(estaAberto);
  return {
    feitos: abertos.reduce((s, i) => s + i.feitos, 0),
    total: abertos.reduce((s, i) => s + i.total, 0),
    porAbrir: modulo.itens.filter((i) => i.situacao === "por-abrir").length,
    emEscrita: modulo.itens.filter((i) => i.situacao === "em-escrita").length,
  };
}

/**
 * Os três módulos na ordem da rotina de treino do aluno.
 *
 * A tela desenha as **três** colunas em todo degrau, mesmo nos degraus em que
 * um dos módulos não tem item nenhum — senão a coluna do meio de um degrau fica
 * embaixo da coluna da direita do degrau de cima, e a escada deixa de ser
 * legível de relance. O que preenche a coluna vazia é o `vazio` de cada módulo,
 * que diz **por que** ela está vazia.
 */
export const MODULOS_EM_ORDEM = ["tatica", "finais"] as const;

/** O nome do módulo na tela, e o que a barra dele conta. */
export const MODULO: Record<
  ModuloDoNivel["modulo"],
  { nome: string; unidade: string; conta: string; href: string; vazio: string }
> = {
  tatica: {
    nome: "Tática",
    unidade: "puzzles",
    conta: "Puzzles resolvidos, conferidos pelo servidor lance a lance.",
    href: "/tatica",
    // Os oito blocos começam entre 600 e 1100 de rating de puzzle do Lichess,
    // que `PUZZLE_ACIMA_DO_RAPIDO` converte para 300 a 800 de rápidas: todos
    // cabem no primeiro degrau, e é o que `nivelDoBloco` diz. Não é defeito da
    // conta — é o desenho do curso, e a tela escreve isso em vez de deixar um
    // buraco branco onde o cabeçalho prometeu três colunas.
    vazio: "Os oito blocos são de base: todos começam abaixo de 1000 de rápidas, e por isso moram no degrau 1.",
  },
  finais: {
    nome: "Finais",
    unidade: "aulas",
    conta: "Aulas aprendidas — três passadas em dias distintos, cada uma certificada pela tablebase.",
    href: "/finais",
    vazio: "Nenhuma aula de finais nesta faixa.",
  },
};
