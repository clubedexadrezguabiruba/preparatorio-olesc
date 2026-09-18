import {
  fechamentoDoNivel,
  provaDeNivelDisponivel,
  type Nivel,
  type ProgressoParaONivel,
} from "../../lib/curso/nivel.ts";
import type { Trofeu } from "./Caminho";

/**
 * O troféu do fim do nível — o mesmo em `/trilha` e em `/finais`. Conquistado é
 * o que está gravado; pronto é o que `prontoParaProva` libera, e só para o
 * degrau seguinte ao conquistado — a progressão é sequencial. Fechado diz o que
 * falta, nas três trilhas.
 */
export function trofeuDoNivel(
  n: Nivel,
  conquistado: 0 | Nivel,
  pronto: 0 | Nivel,
  estado: ProgressoParaONivel,
): Trofeu {
  if (n <= conquistado) return { estado: "conquistado" };
  if (n <= pronto && n === conquistado + 1) {
    return provaDeNivelDisponivel(n) ? { estado: "pronto" } : { estado: "aguardando" };
  }
  const f = fechamentoDoNivel(n, estado);
  const falta = [
    f.tatica.feitos < f.tatica.total
      ? plural(f.tatica.total - f.tatica.feitos, "tema", "temas")
      : null,
    f.finais.feitos < f.finais.exigidas
      ? plural(f.finais.exigidas - f.finais.feitos, "aula", "aulas")
      : null,
    f.repertorio.feitas < f.repertorio.exigidas
      ? plural(
          f.repertorio.exigidas - f.repertorio.feitas,
          "linha do repertório",
          "linhas do repertório",
        )
      : null,
  ].filter((x): x is string => x !== null);
  return { estado: "fechado", falta };
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
