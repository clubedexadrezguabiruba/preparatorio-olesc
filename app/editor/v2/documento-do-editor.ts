import { abrirRascunhoDeAula, caminhoDaPublicada, caminhoDoRascunho, lerConteudo } from "@/lib/editor/rascunhos";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { lerPosicoesDoConteudoV2 } from "@/lib/editor-v2/gate";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import { idsDePosicoesDaAulaV2, montarPacoteV2 } from "@/lib/editor-v2/pacote";
import { pacoteAtivoV2 } from "@/lib/editor-v2/publicar";
import { documentoInicialV2, lerDocumentoV2 } from "@/lib/editor-v2/rascunhos";
import { lerAula, pacoteDaAula } from "@/lib/finais/conteudo";
import { lessonIdSchema, lessonSchema } from "@/lib/lesson/schema";
import type { Position } from "@/lib/lesson/schema";

/**
 * O documento que o Editor v2 abre para uma aula — o mesmo para editar e para "Assistir como aluno"
 * (16/9/2026), para as duas telas nunca mostrarem aulas diferentes. `null` se a aula não existe.
 *
 * O id já tem de ter passado pelo `aulaIdV2Schema`: é ele que impede um `../` de sair da pasta.
 */
export function documentoDoEditorV2(aula: string, { soLer = false } = {}): { aula: AulaV2; hash: string; positions: Record<string, Position> } | null {
  /*
   * Uma aula extra (`EX-…`) não tem — e não pode ter — arquivo v1: as pastas do
   * v1 só aceitam o id do curso, e pedir o rascunho v1 de uma extra estouraria
   * dentro do guardião de caminho. A pergunta "existe v1?" só faz sentido para
   * quem podia ter um.
   *
   * `soLer`: assistir não abre a aula para edição. `abrirRascunhoDeAula` copia a publicada para
   * rascunho na primeira abertura; aqui lê-se o mesmo par (rascunho, senão publicada) sem gravar.
   */
  const doCurso = lessonIdSchema.safeParse(aula).success;
  const aberto = !doCurso ? null
    : soLer ? lerConteudo(caminhoDoRascunho(aula)) ?? lerConteudo(caminhoDaPublicada(aula))
    : abrirRascunhoDeAula(aula);

  /*
   * ## As aulas que só existem no v2
   *
   * Uma aula criada por "Nova aula" não tem arquivo v1 por trás — não há o que
   * adaptar, e `pacoteDaAula` não tem lesson para ler. Ela é aberta direto do
   * documento v2, com as posições que o documento referencia, lidas de `content/positions/`.
   * Até a fatia 8 ia um pacote vazio, com a premissa de que "uma aula nova não referencia
   * posição revisada" — falsa para uma extra montada sobre uma posição do curso: o painel
   * acusava "a posição não está no pacote" e o tabuleiro não montava, enquanto o Conferir
   * (que lê o disco) dava verde. Achado no roteiro da 8F, com a EX-ENSAIO.
   */
  if (!aberto) {
    const documento = lerDocumentoV2(aula);
    if (!documento) return null;
    const todas = lerPosicoesDoConteudoV2();
    const positions = Object.fromEntries(idsDePosicoesDaAulaV2(documento.aula).filter((id) => todas[id]).map((id) => [id, todas[id]]));
    return { aula: documento.aula, hash: documento.hash, positions };
  }

  const lesson = lessonSchema.parse(JSON.parse(aberto.texto));
  const { positions } = pacoteDaAula(lesson);
  const documento = documentoInicialV2(aula, adaptarLessonV1(lesson, positions));
  return { aula: documento.aula, hash: documento.hash, positions };
}

export type ComparacaoComAPublicada = "igual" | "mudou" | "nunca-publicada";

/** O id que a aula teria se fosse publicada agora; `null` se ela ainda não monta um pacote. */
function idSePublicasseAgora(aula: AulaV2): string | null {
  try { return montarPacoteV2(aula, lerPosicoesDoConteudoV2()).publicationId; }
  catch { return null; }
}

/**
 * A versão do editor é a mesma que o aluno recebe? Compara pelo `publicationId`, que é o hash do
 * conteúdo: é a mesma régua que faz "Republicar igual". A aula do curso ainda sem publicação v2
 * é comparada com a v1 de `content/lessons/`, adaptada do mesmo jeito que o editor a abre.
 */
export function comparacaoComAPublicada(aula: string, documento: AulaV2): ComparacaoComAPublicada {
  const ativa = pacoteAtivoV2(aula);
  const agora = idSePublicasseAgora(documento);
  if (ativa) return agora === ativa.publicationId ? "igual" : "mudou";
  const v1 = lessonIdSchema.safeParse(aula).success ? lerAula(aula) : null;
  if (!v1) return "nunca-publicada";
  const publicada = idSePublicasseAgora(adaptarLessonV1(v1, pacoteDaAula(v1).positions));
  return agora !== null && agora === publicada ? "igual" : "mudou";
}
