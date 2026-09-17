/**
 * O PGN do repertório gerado a partir do estudo do curso de abertura — especificação §21, emenda de
 * 16/9/2026 (decisões do Doug 7, 8, 9, 11 e 12).
 *
 * Quando uma abertura tem curso, o `<cor>-<abertura>.pgn` deixa de ser escrito à mão: ele sai daqui,
 * a partir da leitura do estudo (`lib/editor-v2/curso-de-abertura.ts`), e o compilador o lê como lê
 * os outros dez.
 *
 * ## Um jogo por linha
 *
 * Os capítulos "Move Trainer" repetem linhas — a E22P, "Árvore completa", é a soma das outras — e o
 * compilador reprova linha repetida. Então o gerador escreve **uma partida por linha distinta**, na
 * ordem do estudo, cada uma com `[Linha]` (o título do capítulo), `[Categoria]` e `[Ordem]`. A linha
 * curta da E22A (`3.Bd3`, só a arma) sai como linha própria, embora seja o começo de todas.
 *
 * ## O que vai em cada lance
 *
 * - **O comentário:** o primeiro que o estudo inteiro dá àquele lance naquela posição, sem os
 *   marcadores e sem `[TRAIN]`, `[PROXIMO]`, `[REFERENCIA]` (§21). Lance sem comentário em
 *   capítulo nenhum sai sem comentário, e compila: desde 17/9/2026 o comentário é opcional em todo
 *   lance do move trainer (decisão do Doug, que substituiu a decisão 12).
 * - **Os símbolos:** todos os que o estudo dá ao lance, em qualquer capítulo (`AGENTS.md`, "Símbolos
 *   de lance"). O `3.Bd3!` da A00 vale na linha do esquema também.
 * - **Os irmãos nossos marcados:** em cada lance nosso, os irmãos que qualquer capítulo marca com
 *   `!`/`!?` (também vale) ou `?`/`?!` (erro nomeado) entram como variação de um lance. É assim que
 *   `5.dxc5!?` e `5.Nf3!?`, com `[REFERENCIA]` na B09, viram "também vale" (decisão 8).
 */
import {
  chaveDoLance, comentarioDoRepertorio, marcaBoa, marcaRuim, semContadores,
  type LanceDoEstudo, type LeituraDoCurso,
} from "../editor-v2/curso-de-abertura.ts";
import { escreverPartida } from "./editor/escrever.ts";
import type { LancePgn, PartidaPgn } from "./pgn.ts";

export type DadosDoRepertorio = {
  abertura: string;
  /** O nome da abertura, como o índice mostra: "Francesa 3.Bd3". */
  nome: string;
  nivel: "base" | "avancado";
};

export type PgnGerado = { texto: string; problemas: string[]; linhas: number; fonte: string };

const NUMERO: Record<string, string> = { "!": "$1", "?": "$2", "!!": "$3", "??": "$4", "!?": "$5", "?!": "$6" };

/** Os símbolos de um lance juntados de todos os capítulos, sem repetir `!` e `$1`. */
function juntarNags(listas: string[][]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const nag of listas.flat()) {
    const numero = NUMERO[nag] ?? nag;
    if (vistos.has(numero)) continue;
    vistos.add(numero);
    // Um só glifo cola no lance; o segundo glifo sai como `$n`, para o leitor não o perder.
    saida.push(saida.some((n) => !n.startsWith("$")) && !nag.startsWith("$") ? numero : nag);
  }
  return saida;
}

/** A identidade do estudo para a tag `[Fonte]`: `estudo qq2xorDl v1.5 — <nome>`. */
export function fonteDoEstudo(leitura: LeituraDoCurso): string {
  const id = leitura.estudo.link?.match(/study\/([A-Za-z0-9]{8})/)?.[1];
  const evento = leitura.capitulos[0]?.partida.tags.Event ?? "";
  const versao = evento.match(/\bv\d+(?:\.\d+)*\b/)?.[0];
  return ["estudo", id ?? "do Lichess", versao, leitura.estudo.nome ? `— ${leitura.estudo.nome}` : null].filter(Boolean).join(" ");
}

export function gerarPgnDoEstudo(leitura: LeituraDoCurso, dados: DadosDoRepertorio, agora = new Date()): PgnGerado {
  const cor = leitura.cor;
  // Tudo o que o estudo diz de cada lance, e os irmãos de cada posição, em todos os capítulos.
  const nagsDoLance = new Map<string, string[][]>();
  const irmaosNaPosicao = new Map<string, Map<string, LanceDoEstudo>>();
  const andar = (lance: LanceDoEstudo) => {
    const chave = chaveDoLance(lance);
    nagsDoLance.set(chave, [...(nagsDoLance.get(chave) ?? []), lance.nags]);
    if (lance.nosso && (marcaBoa(lance) || marcaRuim(lance))) {
      const posicao = semContadores(lance.fenAntes);
      const daqui = irmaosNaPosicao.get(posicao) ?? new Map<string, LanceDoEstudo>();
      if (!daqui.has(lance.uci)) daqui.set(lance.uci, lance);
      irmaosNaPosicao.set(posicao, daqui);
    }
    lance.filhos.forEach(andar);
  };
  for (const capitulo of leitura.capitulos) capitulo.arvore.filhos.forEach(andar);

  const fonte = fonteDoEstudo(leitura);
  const problemas: string[] = [];
  const jogos: string[] = [];
  const multiplas = new Map<string, number>();
  for (const linha of leitura.linhas) multiplas.set(linha.capitulo, (multiplas.get(linha.capitulo) ?? 0) + 1);

  for (const linha of leitura.linhas) {
    const lances: LancePgn[] = linha.lances.map((lance) => {
      const comentario = leitura.comentarios.get(chaveDoLance(lance)) ?? null;
      const variacoes = lance.nosso
        ? [...(irmaosNaPosicao.get(semContadores(lance.fenAntes))?.values() ?? [])]
          .filter((irmao) => irmao.uci !== lance.uci)
          .map((irmao) => [{
            san: irmao.san,
            nags: juntarNags(nagsDoLance.get(chaveDoLance(irmao)) ?? [irmao.nags]),
            comentario: comentarioDoRepertorio(irmao.comentario) || null,
            variacoes: [],
          }])
        : [];
      return { san: lance.san, nags: juntarNags(nagsDoLance.get(chaveDoLance(lance)) ?? [lance.nags]), comentario, variacoes };
    });
    const ultimo = linha.lances[linha.lances.length - 1];
    const titulo = (multiplas.get(linha.capitulo) ?? 0) > 1 ? `${linha.titulo} — ${ultimo.san}` : linha.titulo;
    const partida: PartidaPgn = {
      tags: {
        Abertura: dados.abertura,
        Nome: dados.nome,
        Cor: cor,
        Nivel: dados.nivel,
        Fonte: fonte,
        Linha: titulo.replace(/"/g, "'"),
        ...(linha.categoria ? { Categoria: linha.categoria } : {}),
        Ordem: String(linha.ordem),
        Capitulo: linha.capitulo,
        Result: "*",
      },
      intro: null,
      lances,
      resultado: "*",
      naoReconhecidos: [],
    };
    const escrito = escreverPartida(partida);
    problemas.push(...escrito.problemas.map((p) => `${linha.capitulo}: ${p}`));
    jogos.push(escrito.texto);
  }

  const preambulo = [
    `; GERADO — não editar. Sai de ${fonte}${leitura.estudo.link ? ` (${leitura.estudo.link})` : ""},`,
    `; por lib/repertorio/gerar-do-estudo.ts, em ${agora.toISOString().slice(0, 10)}.`,
    "; Para mudar uma linha, um comentário ou um símbolo: corrija o estudo no Lichess e",
    "; reimporte em /editor/v2/curso-de-abertura. Editar aqui se perde na próxima importação.",
  ].join("\n");
  return { texto: `${preambulo}\n\n${jogos.join("\n\n")}\n`, problemas, linhas: jogos.length, fonte };
}
