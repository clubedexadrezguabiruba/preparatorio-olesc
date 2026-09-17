import path from "node:path";
import { aberturaDoId, dominioDaAulaV2 } from "../editor-v2/dominio.ts";
import { idsDeAulasV2Ativas, pacoteAtivoDoAluno } from "../finais/conteudo-v2.ts";
import type { EtapaDaRodada } from "./rodada.ts";

/**
 * As aulas publicadas do curso de uma abertura, na ordem dos blocos — especificação §13.3.
 *
 * Sem `server-only` e com a pasta injetável, como `conteudo-v2.ts`: a página lê, e o teste monta a
 * pasta dele. A trilha do curso sai **dos dados** (§21: "nova abertura nasce por dados"): publicar
 * `AB-BRANCAS-CARO-KANN-A` faz a faixa aparecer na Caro-Kann sem mexer em rota.
 *
 * ## As linhas de cada aula (17/9/2026)
 *
 * A trava por aula (`lib/aberturas/trava.ts`) precisa saber **de quem é cada linha** do move
 * trainer, e a resposta está no pacote publicado: `aula.treinadores[].linhaIds`. Lida aqui, uma vez,
 * junto com o título — é a mesma leitura do disco, e duas funções abrindo o mesmo pacote para
 * perguntas diferentes seriam duas chances de discordarem sobre qual publicação está ativa.
 */

export type AulaDoCurso = {
  id: string;
  cor: string;
  abertura: string;
  bloco: string;
  rotulo: string;
  titulo: string;
  href: string;
  /** Os ids das linhas dos move trainers da aula, na ordem declarada e sem repetir. */
  linhaIds: readonly string[];
  /** As etapas do fluxo publicado — o que a rodada conta para dizer "8 de 9". */
  etapas: readonly EtapaDaRodada[];
};

const ORDEM = ["A", "B", "C", "D", "EF"];
const posicao = (bloco: string) => {
  const indice = ORDEM.indexOf(bloco);
  return indice < 0 ? ORDEM.length : indice;
};

/** Todas as aulas de abertura publicadas, de todos os cursos, cada curso na ordem A → E+F. */
export function todasAsAulasDeAbertura(contentDir = path.join(process.cwd(), "content")): AulaDoCurso[] {
  return idsDeAulasV2Ativas(contentDir)
    .filter((id) => dominioDaAulaV2(id) === "abertura")
    .flatMap((id) => {
      const curso = aberturaDoId(id);
      if (!curso) return [];
      let titulo = id;
      let linhaIds: string[] = [];
      let etapas: EtapaDaRodada[] = [];
      try {
        const pacote = pacoteAtivoDoAluno(id, contentDir);
        titulo = pacote?.aula.titulo ?? id;
        linhaIds = [...new Set((pacote?.aula.treinadores ?? []).flatMap((t) => t.linhaIds))];
        etapas = (pacote?.aula.fluxo ?? []).map((etapa) => ({ id: etapa.id, tipo: etapa.tipo }));
      } catch {
        // Pacote quebrado: a página da aula acusa; a faixa só não mostra o título.
      }
      const { cor, abertura, bloco } = curso;
      return [{
        id,
        cor,
        abertura,
        bloco,
        rotulo: bloco === "EF" ? "E+F" : bloco,
        titulo,
        href: `/aberturas/${cor}/${abertura}/aulas/${bloco.toLowerCase()}`,
        linhaIds,
        etapas,
      }];
    })
    .sort((a, b) =>
      `${a.cor}/${a.abertura}`.localeCompare(`${b.cor}/${b.abertura}`) ||
      posicao(a.bloco) - posicao(b.bloco) ||
      a.bloco.localeCompare(b.bloco),
    );
}

export function aulasDoCurso(cor: string, abertura: string, contentDir = path.join(process.cwd(), "content")): AulaDoCurso[] {
  return todasAsAulasDeAbertura(contentDir).filter((aula) => aula.cor === cor && aula.abertura === abertura);
}

/** As aulas agrupadas por curso (`cor/abertura`), cada grupo em ordem. */
export function cursosDeAbertura(aulas: readonly AulaDoCurso[]): Map<string, AulaDoCurso[]> {
  const mapa = new Map<string, AulaDoCurso[]>();
  for (const aula of aulas) {
    const chave = `${aula.cor}/${aula.abertura}`;
    mapa.set(chave, [...(mapa.get(chave) ?? []), aula]);
  }
  return mapa;
}
