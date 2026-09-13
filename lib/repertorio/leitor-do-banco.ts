import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { IndiceSchema, validarBanco, type Cor, type EntradaDoIndice, type Linha } from "./linhas.ts";

/**
 * O leitor do banco de linhas com o cache — separado de `banco.ts` para poder ser testado
 * fora do Next (aquele é `server-only`, e importá-lo no `npm test` estoura).
 *
 * ## O cache é por arquivo e pela data de modificação
 *
 * Até a fatia 8 do Editor v2 o cache valia pela vida do processo, com a justificativa de
 * que o conteúdo só mudava num deploy novo — que é um processo novo. O editor do
 * repertório quebrou essa premissa: **Aplicar** reescreve `public/repertorio/` com o
 * `next dev` rodando, e o aluno continuaria vendo o comentário velho até alguém reiniciar
 * o servidor, sem nenhum aviso.
 *
 * Agora cada leitura faz um `stat` (barato) e só relê quando `mtimeMs` ou o tamanho
 * mudaram. Na Vercel os arquivos não mudam, e o `stat` devolve sempre o mesmo.
 *
 * Promessa **rejeitada não fica guardada**: um erro de leitura passageiro viraria uma
 * abertura quebrada até o arquivo mudar de novo.
 */

type Guardado<T> = { marca: string; promessa: Promise<T> };

export type LeitorDoBanco = {
  lerIndice(): Promise<EntradaDoIndice[]>;
  aberturaNoIndice(cor: Cor, abertura: string): Promise<EntradaDoIndice | null>;
  linhasDaAbertura(cor: Cor, abertura: string): Promise<Linha[]>;
  linhaPorId(cor: Cor, abertura: string, id: string): Promise<Linha | null>;
};

export function criarLeitorDoBanco(pasta: string): LeitorDoBanco {
  const guardados = new Map<string, Guardado<unknown>>();

  async function lerComCache<T>(relativo: string, conferir: (dados: unknown) => T): Promise<T> {
    const caminho = path.join(pasta, relativo);
    const info = await stat(caminho);
    const marca = `${info.mtimeMs}:${info.size}`;
    const guardado = guardados.get(relativo) as Guardado<T> | undefined;
    if (guardado && guardado.marca === marca) return guardado.promessa;

    const promessa = readFile(caminho, "utf8")
      .then((texto) => conferir(JSON.parse(texto) as unknown))
      .catch((erro: unknown) => {
        if (guardados.get(relativo)?.promessa === promessa) guardados.delete(relativo);
        throw erro;
      });
    guardados.set(relativo, { marca, promessa });
    return promessa;
  }

  const lerIndice = () => lerComCache("index.json", (dados) => IndiceSchema.parse(dados));

  async function aberturaNoIndice(cor: Cor, abertura: string): Promise<EntradaDoIndice | null> {
    const indice = await lerIndice();
    return indice.find((e) => e.cor === cor && e.abertura === abertura) ?? null;
  }

  async function linhasDaAbertura(cor: Cor, abertura: string): Promise<Linha[]> {
    const entrada = await aberturaNoIndice(cor, abertura);
    if (!entrada) return [];
    // O `arquivo` do índice é URL a partir da raiz do site, porque foi escrito
    // pensando no navegador. Em disco, a raiz é `public/repertorio/`.
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    return lerComCache(relativo, (dados) => validarBanco(dados, `public/repertorio/${relativo}`));
  }

  async function linhaPorId(cor: Cor, abertura: string, id: string): Promise<Linha | null> {
    return (await linhasDaAbertura(cor, abertura)).find((l) => l.id === id) ?? null;
  }

  return { lerIndice, aberturaNoIndice, linhasDaAbertura, linhaPorId };
}
