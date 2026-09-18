import Link from "next/link";
import { Escada as EscadaDeMetal } from "@/app/trilha/Escada";
import { faixaFide } from "@/app/trilha/Faixa";
import { NIVEL, type Nivel } from "@/lib/curso/nivel";

/**
 * A escada dos cinco níveis no painel: **você está aqui**.
 *
 * ## A mesma escada da `/trilha` (18/9/2026)
 *
 * O painel tinha a sua própria escada — cinco pastilhas redondas num trilho verde —, e ela
 * era o único lugar do site onde os níveis não tinham metal. Na `/trilha` e nos `/finais`
 * a Madeira é marrom e o Ouro é dourado; aqui eram todos cinza. O aluno aprendia duas
 * escadas para a mesma coisa. Agora é o mesmo desenho, e cada degrau leva à faixa do seu
 * nível na `/trilha`.
 *
 * ## O que só o painel acrescenta
 *
 * A frase do que o degrau atual ensina, em corpo de leitura: é a única do painel que diz
 * **o que o aluno está aprendendo a fazer**. E a faixa FIDE, que na trilha mora na faixa
 * do nível.
 *
 * Apagado continua não sendo trancado: `TRANCA_DURA` é `false` em `lib/curso/nivel.ts`.
 */
export function Escada({
  nivel,
  conquistado,
}: {
  nivel: Nivel;
  conquistado: 0 | Nivel;
}) {
  return (
    <EscadaDeMetal aqui={nivel} conquistado={conquistado} destino="/trilha">
      <p className="text-sm text-tinta-media">{NIVEL[nivel].resumo}</p>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-borda-fraca pt-3 text-xs">
        <span className="text-tinta-fraca tabular-nums">
          FIDE {faixaFide(nivel)}
        </span>
        <Link
          href="/trilha"
          className="foco -my-3 inline-flex min-h-11 items-center font-medium text-metodo-tinta hover:underline"
        >
          Ver a trilha inteira →
        </Link>
      </p>
    </EscadaDeMetal>
  );
}
