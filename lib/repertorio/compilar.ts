import { expandir } from "./arvore.ts";
import {
  aberturasInchadas,
  CORES,
  NIVEIS,
  placarDeFechamento,
  validarBanco,
  type Cor,
  type EntradaDoIndice,
  type Linha,
  type Nivel,
} from "./linhas.ts";
import type { Nota } from "./notas.ts";
import { lerPgns } from "./pgn.ts";

/**
 * Dos PGN revisados para os bytes exatos de `public/repertorio/` — a compilação
 * inteira, **sem disco**.
 *
 * Até a fatia 8 do Editor v2 isto morava dentro de `scripts/compilar-repertorio.ts`,
 * misturado com a leitura da pasta e a escrita no fim. Dois defeitos saíam dessa
 * mistura:
 *
 * 1. **O `--check` nunca comparava com o disco.** Ele compilava, via que os PGN
 *    passavam, e saía verde — com o JSON publicado divergindo da fonte. Medido em
 *    13/9/2026: os onze JSON carregavam **1.099** quebras `\r\n` dentro dos
 *    comentários, de uma compilação feita quando os PGN ainda eram CRLF no
 *    Windows. Os PGN são LF desde o `.gitattributes`; o derivado nunca foi refeito
 *    e nenhum portão viu.
 * 2. **O editor do repertório não teria como compilar um candidato.** Aplicar uma
 *    edição exige compilar os onze com o arquivo novo no lugar, **antes** de tocar
 *    `content/`, e isso só é possível se compilar for uma função que recebe texto.
 *
 * Então: quem lê a pasta é o chamador, e a saída é um mapa `caminho → texto` com
 * os bytes que devem estar em disco. Conferir vira comparar esse mapa com a pasta;
 * escrever vira gravar o mapa.
 */

/** Um `.pgn` de `content/repertorio/`, pelo nome do arquivo e o texto. */

/** As categorias que a tag `[Categoria]` aceita — as do `LinhaSchema`. */
const CATEGORIAS_DA_LINHA: readonly NonNullable<Linha["categoria"]>[] = ["arma", "esquema", "preparacao", "golpe", "nao-funciona", "defesa", "linha-critica", "desvio", "se-esquecer", "arvore"];
export type FonteDoRepertorio = { nome: string; texto: string };

export type ResumoDoArquivo = { nome: string; linhas: number; base: number; avancado: number };

export type Compilacao = {
  /** O que impede publicar. Com um só, `saida` vem vazia. */
  problemas: string[];
  avisos: string[];
  /** A régua do término, que sai **sempre** — inclusive quando reprova. */
  placar: string;
  porArquivo: ResumoDoArquivo[];
  linhas: Linha[];
  /**
   * Caminho relativo a `public/repertorio/` (com `/`) → o texto exato do arquivo.
   * `index.json` e um `<cor>/<abertura>.json` por abertura. Vazio se há problema.
   */
  saida: Map<string, string>;
};

/** Os PGN da pasta, na ordem de nome — a ordem é parte do resultado. */
export const ehFonteDoRepertorio = (nome: string): boolean => nome.toLowerCase().endsWith(".pgn");

/**
 * Compila os PGN do repertório.
 *
 * `notas` entra por parâmetro, e não por importação, porque a regra "a página de
 * princípios aponta para abertura viva" depende de quais aberturas **este**
 * conjunto de fontes tem — e o editor compila candidatos em que uma abertura pode
 * nascer ou morrer.
 */
export function compilarRepertorio(
  fontes: readonly FonteDoRepertorio[],
  notas: readonly Pick<Nota, "slug" | "cor" | "abertura">[],
): Compilacao {
  const problemas: string[] = [];
  const avisos: string[] = [];
  const porNome = new Map<string, Linha[]>();
  const ordenadas = [...fontes].filter((f) => ehFonteDoRepertorio(f.nome)).sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));

  for (const { nome, texto } of ordenadas) {
    const onde = `content/repertorio/${nome}`;

    // Parênteses sem fechar: o leitor não acusa — ele fecha tudo no fim do texto
    // e a árvore sai torta, com ramos pendurados no lugar errado. Contar antes é
    // barato e transforma um bug silencioso numa mensagem.
    const abre = (texto.match(/\(/g) ?? []).length;
    const fecha = (texto.match(/\)/g) ?? []).length;
    if (abre !== fecha) {
      problemas.push(`${onde}: ${abre} parênteses abertos e ${fecha} fechados.`);
      continue;
    }

    const linhas: Linha[] = [];
    for (const [i, jogo] of lerPgns(texto).entries()) {
      const emQual = `${onde} (jogo ${i + 1})`;
      const cor = jogo.tags.Cor as Cor | undefined;
      const nivel = jogo.tags.Nivel as Nivel | undefined;
      const { Abertura: abertura, Nome: nomeDaArvore, Fonte: fonte } = jogo.tags;

      const faltando = [
        !abertura && "Abertura",
        !nomeDaArvore && "Nome",
        !cor && "Cor",
        !nivel && "Nivel",
        !fonte && "Fonte",
      ].filter(Boolean);
      if (faltando.length > 0) {
        problemas.push(`${emQual}: faltam as tags ${faltando.join(", ")}.`);
        continue;
      }
      if (!CORES.includes(cor!)) {
        problemas.push(`${emQual}: [Cor "${cor}"] — tem de ser brancas ou pretas.`);
        continue;
      }
      if (!NIVEIS.includes(nivel!)) {
        problemas.push(`${emQual}: [Nivel "${nivel}"] — tem de ser base ou avancado.`);
        continue;
      }

      // O PGN gerado a partir do estudo (16/9/2026) diz a categoria e a ordem de cada linha.
      const { Categoria: categoria, Ordem: ordemEmTexto, Linha: titulo } = jogo.tags;
      if (categoria && !CATEGORIAS_DA_LINHA.includes(categoria as NonNullable<Linha["categoria"]>)) {
        problemas.push(`${emQual}: [Categoria "${categoria}"] — tem de ser uma de ${CATEGORIAS_DA_LINHA.join(", ")}.`);
        continue;
      }
      const ordem = ordemEmTexto === undefined ? undefined : Number(ordemEmTexto);
      if (ordem !== undefined && (!Number.isInteger(ordem) || ordem < 1)) {
        problemas.push(`${emQual}: [Ordem "${ordemEmTexto}"] — tem de ser um número inteiro a partir de 1.`);
        continue;
      }
      const expansao = expandir(jogo, {
        abertura: abertura!,
        nome: nomeDaArvore!,
        cor: cor!,
        nivel: nivel!,
        fonte: fonte!,
        ...(titulo ? { titulo } : {}),
        ...(categoria ? { categoria: categoria as NonNullable<Linha["categoria"]> } : {}),
        ...(ordem !== undefined ? { ordem } : {}),
      });
      problemas.push(...expansao.problemas.map((p) => `${emQual}: ${p}`));
      for (const aviso of expansao.avisos) {
        // Os outros avisos do rascunho viram erro em `validarBanco`: no PGN
        // revisado, uma linha que termina no lance do adversário é trabalho que
        // ficou por fazer.
        if (aviso.tipo === "irmao-sem-marca") avisos.push(`${emQual}: ${aviso.detalhe}`);
      }
      linhas.push(...expansao.linhas);
    }
    porNome.set(nome, linhas);
  }

  const todas = [...porNome.values()].flat();

  if (problemas.length === 0) {
    try {
      validarBanco(todas, "content/repertorio/");
    } catch (erro) {
      problemas.push(String(erro instanceof Error ? erro.message : erro));
    }
  }

  avisos.push(...aberturasInchadas(todas).map((a) => `acima da meta do Base — ${a}`));

  // O campo `abertura` das páginas de princípios aponta para abertura viva. Um
  // slug errado não quebra a página: o link para ela simplesmente some da tela da
  // abertura, calado. É aqui porque o par cor+abertura só existe depois de compilar.
  const aberturasVivas = new Set(todas.map((l) => `${l.cor}/${l.abertura}`));
  for (const nota of notas) {
    if (nota.abertura && !aberturasVivas.has(`${nota.cor}/${nota.abertura}`)) {
      problemas.push(
        `a página de princípios "${nota.slug}" aponta para ${nota.cor}/${nota.abertura}, ` +
          "que não é abertura do repertório. O link para ela sumiria calado da tela da abertura.",
      );
    }
  }

  const porArquivo = [...porNome].map(([nome, linhas]) => {
    const base = linhas.filter((l) => l.nivel === "base").length;
    return { nome, linhas: linhas.length, base, avancado: linhas.length - base };
  });

  return {
    problemas,
    avisos,
    placar: placarDeFechamento(todas),
    porArquivo,
    linhas: todas,
    saida: problemas.length > 0 ? new Map() : saidaDoBanco(todas),
  };
}

/** Os arquivos de `public/repertorio/` para um banco já conferido. */
function saidaDoBanco(todas: readonly Linha[]): Map<string, string> {
  const saida = new Map<string, string>();
  const indice: EntradaDoIndice[] = [];

  const grupos = new Map<string, Linha[]>();
  for (const linha of todas) {
    const chave = `${linha.cor}/${linha.abertura}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), linha]);
  }

  for (const [chave, linhas] of [...grupos].sort()) {
    saida.set(`${chave}.json`, `${JSON.stringify(linhas, null, 2)}\n`);
    indice.push({
      cor: linhas[0].cor,
      abertura: linhas[0].abertura,
      nome: linhas[0].nome.split(" — ")[0],
      linhas: linhas.length,
      ids: linhas.map((l) => l.id) as [string, ...string[]],
      // O `nivel` de cada linha só chega à tela por aqui: o índice é o único
      // arquivo que `/aberturas` abre, e sem esta lista marcar uma linha como
      // `avancado` não a esconde de ninguém. Ver o schema em `linhas.ts`.
      idsAvancado: linhas.filter((l) => l.nivel === "avancado").map((l) => l.id),
      arquivo: `/repertorio/${chave}.json`,
    });
  }

  saida.set("index.json", `${JSON.stringify(indice, null, 2)}\n`);
  return saida;
}

/**
 * O que difere entre a compilação e o que está em disco, em frases.
 *
 * `emDisco` é o mesmo formato de `saida` (caminho relativo → texto). Três casos:
 * arquivo que falta, arquivo com bytes diferentes e arquivo **sobrando** — um JSON
 * de abertura que saiu do repertório e ficou em `public/`, que o servidor não abre
 * mas o deploy continua servindo.
 */
export function diferencasDoCompilado(
  saida: ReadonlyMap<string, string>,
  emDisco: ReadonlyMap<string, string>,
): string[] {
  const diferencas: string[] = [];
  for (const [caminho, texto] of [...saida].sort()) {
    const atual = emDisco.get(caminho);
    if (atual === undefined) diferencas.push(`public/repertorio/${caminho}: falta`);
    else if (atual !== texto) diferencas.push(`public/repertorio/${caminho}: desatualizado`);
  }
  for (const caminho of [...emDisco.keys()].sort()) {
    if (!saida.has(caminho)) diferencas.push(`public/repertorio/${caminho}: sobrando`);
  }
  return diferencas;
}
