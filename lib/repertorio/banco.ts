import "server-only";
import path from "node:path";
import { criarLeitorDoBanco } from "./leitor-do-banco.ts";
import type { Cor, EntradaDoIndice, Linha } from "./linhas.ts";

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
 * Mora em `leitor-do-banco.ts`, e desde a fatia 8 do Editor v2 é por arquivo e pela
 * data de modificação: **Aplicar** no editor do repertório reescreve estes JSON com o
 * `next dev` rodando, e um cache pela vida do processo esconderia a edição do aluno
 * até alguém reiniciar o servidor.
 *
 * ## A conferência acontece na leitura, e não só na compilação
 *
 * `validarBanco` roda a cada arquivo lido. Ele já rodou no compilador — mas
 * entre o compilador e o servidor existe um JSON editado à mão, que é
 * exatamente o que ninguém confere. Estourar aqui é o comportamento certo: uma
 * linha torta que passa vira, no sábado, um aluno cobrado por um lance errado.
 */

const leitor = criarLeitorDoBanco(path.join(process.cwd(), "public", "repertorio"));

export function lerIndice(): Promise<EntradaDoIndice[]> {
  return leitor.lerIndice();
}

export function aberturaNoIndice(cor: Cor, abertura: string): Promise<EntradaDoIndice | null> {
  return leitor.aberturaNoIndice(cor, abertura);
}

/**
 * As linhas de uma abertura, **na ordem do arquivo** — que é a ordem do PGN, e
 * é pedagógica: o tronco primeiro, as variantes depois. `proximaLinha` depende
 * dela, então nada aqui reordena nada.
 */
export function linhasDaAbertura(cor: Cor, abertura: string): Promise<Linha[]> {
  return leitor.linhasDaAbertura(cor, abertura);
}

/**
 * A linha pelo id, dentro da abertura em que ela foi servida.
 *
 * A abertura entra na busca de propósito, como o tema entra na da tática: sem
 * ela, achar um id custaria abrir os doze arquivos. Quem grava a tentativa sabe
 * em que abertura o aluno estava, porque foi o servidor que o mandou para lá.
 */
export function linhaPorId(cor: Cor, abertura: string, id: string): Promise<Linha | null> {
  return leitor.linhaPorId(cor, abertura, id);
}
