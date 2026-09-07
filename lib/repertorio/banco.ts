import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  IndiceSchema,
  validarBanco,
  type Cor,
  type EntradaDoIndice,
  type Linha,
} from "./linhas.ts";

/**
 * O banco de linhas, lido **do disco pelo servidor** — a cópia de
 * `lib/tatica/banco.ts`, pelos mesmos motivos.
 *
 * ## Por que o servidor lê o mesmo arquivo que o celular baixaria
 *
 * `public/repertorio/` está em `public/` porque foi para lá que o compilador
 * escreveu, e porque um dia a lista impressa pode querer o JSON. Mas quem julga
 * o lance antes de gravar é o servidor, e ele precisa dos mesmos bytes. Duas
 * cópias seriam dois arquivos que podem divergir: o aluno treinando por uma
 * linha e o servidor julgando por outra.
 *
 * **A tela não faz `fetch` daqui.** A linha desce como prop da página, já
 * escolhida — por isso `repertorio/` não precisa da isenção que `puzzles/` tem
 * no `proxy.ts`.
 *
 * ## O cache
 *
 * São 43 linhas em doze arquivos de poucos KB. O cache não existe pelo tamanho:
 * existe porque cada lance conferido reabriria o arquivo, e o conteúdo só muda
 * quando alguém roda `npm run repertorio:compilar` e sobe um deploy novo — e um
 * deploy novo é um processo novo.
 *
 * Promessa **rejeitada não fica guardada**: um erro de leitura passageiro
 * viraria uma abertura quebrada até o fim da vida do processo.
 *
 * ## A conferência acontece na leitura, e não só na compilação
 *
 * `validarBanco` roda aqui, a cada arquivo. Ele já rodou no compilador — mas
 * entre o compilador e o servidor existe um JSON editado à mão, que é
 * exatamente o que ninguém confere. Estourar aqui é o comportamento certo: uma
 * linha torta que passa vira, no sábado, um aluno cobrado por um lance errado.
 */

const RAIZ = path.join(process.cwd(), "public", "repertorio");

let indiceEmMemoria: Promise<EntradaDoIndice[]> | null = null;
const aberturasEmMemoria = new Map<string, Promise<Linha[]>>();

async function lerJson(relativo: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(RAIZ, relativo), "utf8")) as unknown;
}

export function lerIndice(): Promise<EntradaDoIndice[]> {
  indiceEmMemoria ??= lerJson("index.json")
    .then((dados) => IndiceSchema.parse(dados))
    .catch((erro: unknown) => {
      indiceEmMemoria = null;
      throw erro;
    });
  return indiceEmMemoria;
}

export async function aberturaNoIndice(
  cor: Cor,
  abertura: string,
): Promise<EntradaDoIndice | null> {
  const indice = await lerIndice();
  return indice.find((e) => e.cor === cor && e.abertura === abertura) ?? null;
}

/**
 * As linhas de uma abertura, **na ordem do arquivo** — que é a ordem do PGN, e
 * é pedagógica: o tronco primeiro, as variantes depois. `proximaLinha` depende
 * dela, então nada aqui reordena nada.
 */
export async function linhasDaAbertura(cor: Cor, abertura: string): Promise<Linha[]> {
  const entrada = await aberturaNoIndice(cor, abertura);
  if (!entrada) return [];

  const chave = `${cor}/${abertura}`;
  let promessa = aberturasEmMemoria.get(chave);
  if (!promessa) {
    // O `arquivo` do índice é URL a partir da raiz do site, porque foi escrito
    // pensando no navegador. Em disco, a raiz é `public/repertorio/`.
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    promessa = lerJson(relativo)
      .then((dados) => validarBanco(dados, `public/repertorio/${relativo}`))
      .catch((erro: unknown) => {
        aberturasEmMemoria.delete(chave);
        throw erro;
      });
    aberturasEmMemoria.set(chave, promessa);
  }
  return promessa;
}

/**
 * A linha pelo id, dentro da abertura em que ela foi servida.
 *
 * A abertura entra na busca de propósito, como o tema entra na da tática: sem
 * ela, achar um id custaria abrir os doze arquivos. Quem grava a tentativa sabe
 * em que abertura o aluno estava, porque foi o servidor que o mandou para lá.
 */
export async function linhaPorId(cor: Cor, abertura: string, id: string): Promise<Linha | null> {
  return (await linhasDaAbertura(cor, abertura)).find((l) => l.id === id) ?? null;
}
