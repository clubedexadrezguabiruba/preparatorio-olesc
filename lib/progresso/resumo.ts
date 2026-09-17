import type { TravaDoAluno } from "@/lib/aberturas/trava-banco";
import { aulasVencidas, diasAteRevisar } from "@/lib/finais/escada";
import { AULA_ZERADA, type AulaDaTrilha, type ProgressoDaAula } from "@/lib/finais/trilha";
import { grauDaAulaDeFinais, grauDaEscada, type Grau } from "@/lib/progresso/grau";
import type { GrauDoTema } from "@/lib/progresso/tatica-banco";
import type { EntradaDoIndice } from "@/lib/repertorio/linhas";
import { diasAteRevisar as diasAteRevisarALinha, idsLiberados, vencida, zerado, type ProgressoDaLinha } from "@/lib/repertorio/treino";
import { BLOCOS, contaNoCurso, type Tema } from "@/lib/tatica/blocos";

/**
 * O grau de cada linha, aula e tema — a conta que era da página `/progresso` (17/9/2026).
 *
 * Saiu da página quando ela virou "Meu perfil" e o relatório do professor passou a mostrar os
 * mesmos graus: duas telas, uma conta. Puro sobre o que a página já leu; as leituras são as de
 * sempre (`progressoDoRepertorio`, `progressoDeFinais`, `grausDosTemas`, `travaDoAluno`).
 */

export type AberturaNoResumo = {
  readonly entrada: EntradaDoIndice;
  readonly total: number;
  readonly treinadas: number;
  readonly porGrau: ReadonlyMap<Grau, number>;
  /** Linhas vencidas hoje, entre as abertas. */
  readonly hoje: number;
  readonly proxima: number | null;
  readonly aulas: number;
  readonly aulasFeitas: number;
};

export type ResumoDosGraus = {
  readonly aberturas: readonly AberturaNoResumo[];
  readonly linhasHoje: number;
  readonly finaisComecadas: readonly { aula: AulaDaTrilha; grau: Grau; dias: number | null }[];
  readonly finaisHoje: readonly string[];
  readonly temas: readonly { tema: Tema; g: GrauDoTema }[];
  /** Quantos itens em cada grau, somando linhas, aulas e temas. */
  readonly contagem: ReadonlyMap<Grau, number>;
  /** O mesmo, por frente — o relatório do professor mostra as três separadas. */
  readonly porFrente: {
    readonly aberturas: ReadonlyMap<Grau, number>;
    readonly finais: ReadonlyMap<Grau, number>;
    readonly tatica: ReadonlyMap<Grau, number>;
  };
};

/** O menor número de dias entre os que existem; `null` se nenhum existe. */
export function menorDia(dias: readonly (number | null)[]): number | null {
  const validos = dias.filter((d): d is number => d !== null);
  return validos.length > 0 ? Math.min(...validos) : null;
}

export function resumoDosGraus(d: {
  readonly indice: readonly EntradaDoIndice[];
  readonly repertorio: ReadonlyMap<string, ProgressoDaLinha>;
  readonly trava: Pick<TravaDoAluno, "cursos" | "concluidas" | "trancadas">;
  readonly finais: ReadonlyMap<string, ProgressoDaAula>;
  readonly abertasDeFinais: readonly AulaDaTrilha[];
  readonly comPratica: ReadonlySet<string>;
  readonly grausDeTatica: ReadonlyMap<string, GrauDoTema>;
  readonly agora: string;
}): ResumoDosGraus {
  const { agora, trava } = d;

  const aberturas = d.indice
    .map((entrada) => {
      const ids = idsLiberados(entrada, true);
      const abertas = ids.filter((id) => !trava.trancadas.has(id));
      const porGrau = new Map<Grau, number>();
      let treinadas = 0;
      for (const id of ids) {
        const p = d.repertorio.get(id);
        if (!p || p.tentativas === 0) continue;
        treinadas += 1;
        const g = grauDaEscada(p);
        porGrau.set(g, (porGrau.get(g) ?? 0) + 1);
      }
      const hoje = abertas.filter((id) => vencida(d.repertorio.get(id) ?? zerado(), agora)).length;
      const proxima = menorDia(abertas.map((id) => diasAteRevisarALinha(d.repertorio.get(id) ?? zerado(), agora)));
      const aulas = trava.cursos.get(`${entrada.cor}/${entrada.abertura}`) ?? [];
      const aulasFeitas = aulas.filter((a) => trava.concluidas.has(a.id)).length;
      return { entrada, total: ids.length, treinadas, porGrau, hoje, proxima, aulas: aulas.length, aulasFeitas };
    })
    .filter((a) => a.treinadas > 0 || a.aulasFeitas > 0 || trava.cursos.has(`${a.entrada.cor}/${a.entrada.abertura}`));

  const finaisComecadas = d.abertasDeFinais
    .map((aula) => ({ aula, p: d.finais.get(aula.id) ?? AULA_ZERADA }))
    .filter(({ p }) => p.tentativas > 0 || p.lida)
    .map(({ aula, p }) => ({
      aula,
      grau: grauDaAulaDeFinais(d.comPratica.has(aula.id), p),
      dias: diasAteRevisar(p.escada, agora),
    }));
  const finaisHoje = aulasVencidas(
    d.abertasDeFinais.map((a) => a.id),
    new Map([...d.finais].map(([id, p]) => [id, p.escada])),
    agora,
  );

  const temas = BLOCOS.flatMap((bloco) => bloco.temas.filter(contaNoCurso)).flatMap((tema) => {
    const g = d.grausDeTatica.get(tema.tag);
    return g ? [{ tema, g }] : [];
  });

  const somar = (mapa: Map<Grau, number>, g: Grau, n = 1) => mapa.set(g, (mapa.get(g) ?? 0) + n);
  const deAberturas = new Map<Grau, number>();
  const deFinais = new Map<Grau, number>();
  const deTatica = new Map<Grau, number>();
  const contagem = new Map<Grau, number>();
  for (const a of aberturas) {
    for (const [g, n] of a.porGrau) {
      somar(deAberturas, g, n);
      somar(contagem, g, n);
    }
  }
  for (const f of finaisComecadas) {
    somar(deFinais, f.grau);
    somar(contagem, f.grau);
  }
  for (const t of temas) {
    somar(deTatica, t.g.grau);
    somar(contagem, t.g.grau);
  }

  return {
    aberturas,
    linhasHoje: aberturas.reduce((soma, a) => soma + a.hoje, 0),
    finaisComecadas,
    finaisHoje,
    temas,
    contagem,
    porFrente: { aberturas: deAberturas, finais: deFinais, tatica: deTatica },
  };
}
