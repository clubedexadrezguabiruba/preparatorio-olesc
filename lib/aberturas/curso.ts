import path from "node:path";
import { aberturaDoId, dominioDaAulaV2 } from "../editor-v2/dominio.ts";
import { idsDeAulasV2Ativas, pacoteAtivoDoAluno } from "../finais/conteudo-v2.ts";

/**
 * As aulas publicadas do curso de uma abertura, na ordem dos blocos — especificação §13.3.
 *
 * Sem `server-only` e com a pasta injetável, como `conteudo-v2.ts`: a página lê, e o teste monta a
 * pasta dele. A trilha do curso sai **dos dados** (§21: "nova abertura nasce por dados"): publicar
 * `AB-BRANCAS-CARO-KANN-A` faz a faixa aparecer na Caro-Kann sem mexer em rota.
 */

export type AulaDoCurso = { id: string; bloco: string; rotulo: string; titulo: string; href: string };

const ORDEM = ["A", "B", "C", "D", "EF"];
const posicao = (bloco: string) => {
  const indice = ORDEM.indexOf(bloco);
  return indice < 0 ? ORDEM.length : indice;
};

export function aulasDoCurso(cor: string, abertura: string, contentDir = path.join(process.cwd(), "content")): AulaDoCurso[] {
  return idsDeAulasV2Ativas(contentDir)
    .filter((id) => dominioDaAulaV2(id) === "abertura")
    .flatMap((id) => {
      const curso = aberturaDoId(id);
      if (!curso || curso.cor !== cor || curso.abertura !== abertura) return [];
      let titulo = id;
      try {
        titulo = pacoteAtivoDoAluno(id, contentDir)?.aula.titulo ?? id;
      } catch {
        // Pacote quebrado: a página da aula acusa; a faixa só não mostra o título.
      }
      const bloco = curso.bloco;
      return [{ id, bloco, rotulo: bloco === "EF" ? "E+F" : bloco, titulo, href: `/aberturas/${cor}/${abertura}/aulas/${bloco.toLowerCase()}` }];
    })
    .sort((a, b) => posicao(a.bloco) - posicao(b.bloco) || a.bloco.localeCompare(b.bloco));
}
