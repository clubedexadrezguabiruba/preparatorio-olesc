/**
 * As aulas v2 publicadas, lidas do disco para o aluno — fatia 7 do Editor v2.
 *
 * Irmão de `conteudo.ts`, sem `server-only` pelo mesmo motivo que ele não importa o alias
 * `@/`: roda também em teste e em script. A raiz é injetável para o teste montar uma pasta
 * de conteúdo própria.
 *
 * ## O que "ativa" quer dizer aqui
 *
 * A aula tem `content/aulas-v2/<AULA>/ativa.json`, e o pacote para onde ele aponta está
 * inteiro (`problemasDoPacoteV2` vazio). Pacote adulterado **lança**: cair em silêncio para
 * a aula v1 esconderia o estrago do professor e do CI.
 */
import path from "node:path";
import { problemasDoPacoteV2, type PacoteV2 } from "../editor-v2/pacote.ts";
import { idsDeAulasV2, lerPonteiroV2, lerPublicacaoCruaV2 } from "../editor-v2/publicacoes.ts";

const CONTENT = path.join(process.cwd(), "content");

function pacoteIntegro(cru: unknown, onde: string): PacoteV2 {
  const problemas = problemasDoPacoteV2(cru);
  if (problemas.length) throw new Error(`${onde}: o pacote publicado não está íntegro — ${problemas[0]}`);
  return cru as PacoteV2;
}

/** O pacote que o aluno recebe hoje nesta aula, ou `null` se ela não tem publicação v2 ativa. */
export function pacoteAtivoDoAluno(id: string, contentDir = CONTENT): PacoteV2 | null {
  let ponteiro;
  try {
    ponteiro = lerPonteiroV2(contentDir, id);
  } catch (erro) {
    // Id fora do padrão é "não é aula v2"; ponteiro ilegível é defeito e sobe.
    if (erro instanceof Error && /id de aula inválido/.test(erro.message)) return null;
    throw erro;
  }
  if (!ponteiro) return null;
  const cru = lerPublicacaoCruaV2(contentDir, id, ponteiro.publicationId);
  if (!cru) throw new Error(`aula v2 ${id}: ativa.json aponta para ${ponteiro.publicationId}, que não está publicado`);
  const pacote = pacoteIntegro(cru, `aula v2 ${id}`);
  if (pacote.aula.id !== id) throw new Error(`aula v2 ${id}: o pacote ativo é de outra aula`);
  return pacote;
}

/**
 * Uma publicação guardada, ativa ou não — o snapshot contra o qual uma aba antiga é
 * rejulgada (§10). `null` quando ela não está no servidor: a tentativa é guardada e o aluno
 * é mandado reabrir a aula, nunca julgado contra a publicação nova.
 */
export function pacoteDaPublicacao(id: string, publicationId: string, contentDir = CONTENT): PacoteV2 | null {
  let cru: unknown;
  try {
    cru = lerPublicacaoCruaV2(contentDir, id, publicationId);
  } catch {
    return null;
  }
  if (!cru) return null;
  const pacote = pacoteIntegro(cru, `aula v2 ${id} / ${publicationId}`);
  return pacote.aula.id === id && pacote.publicationId === publicationId ? pacote : null;
}

/** Os ids das aulas com publicação v2 ativa. */
export function idsDeAulasV2Ativas(contentDir = CONTENT): string[] {
  return idsDeAulasV2(contentDir).filter((id) => {
    try {
      return lerPonteiroV2(contentDir, id) !== null;
    } catch {
      return true; // ponteiro ilegível: a aula existe, e abri-la mostra o defeito
    }
  });
}
