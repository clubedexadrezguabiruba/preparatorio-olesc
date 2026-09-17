import Link from "next/link";
import { dataDoSelo, maisRecentes } from "@/components/selos/ListaDeSelos";
import { IconeDoSelo } from "@/components/selos/Medalha";
import type { SeloComData } from "@/lib/curso/selos-gravados";
import { ganhos, proximos } from "@/lib/curso/selos";

/** Quantos ganhos o painel mostra — os mais recentes. O resto mora em "Meu perfil". */
const RECENTES = 6;
const RECENTES_NO_CELULAR = 4;

/**
 * Os selos: o que o aluno já conquistou, e os dois que estão mais perto.
 *
 * ## Só os ganhos, e dois trancados
 *
 * A lista inteira passa de quarenta desde 17/9/2026 (puzzles, pontaria e as aulas
 * de abertura entraram). Mostrá-los todos faria da conquista um
 * inventário do que falta — quarenta pastilhas apagadas em volta de uma acesa é
 * uma tela que diz *"você quase não fez nada"* a quem acabou de fazer alguma
 * coisa. Então: os ganhos, coloridos, e **dois** próximos.
 *
 * Os dois vêm de famílias diferentes (`proximos` cuida disso). Sem essa regra
 * eles seriam sempre os dois degraus seguintes de tática, e o aluno nunca
 * ficaria sabendo que existe um selo de constância.
 *
 * ## Selo trancado diz o que falta
 *
 * *"faltam 2 temas"*, *"faltam 12 dias seguidos"*. Um selo apagado sem condição
 * escrita é decoração: mostra que existe uma coisa boa e esconde como chegar
 * lá. A frase vem de `lib/curso/selos.ts`, junto com a regra que a produz.
 *
 * ## A data e o desenho (17/9/2026)
 *
 * Cada selo ganho tem a data gravada (0018): ela aparece no `title` da pastilha
 * e, por extenso, em "Meu perfil". O ✓ igual para todos deu lugar ao desenho da
 * família (`components/selos/Medalha.tsx`), o mesmo do perfil e da turma.
 *
 * ## Só os mais recentes (17/9/2026)
 *
 * Com os 45 ganhos, as pastilhas todas mediam 1.050 px no celular. O painel mostra as **seis**
 * mais recentes (quatro no celular); "Ver todas", ao lado da contagem, leva à coleção inteira em
 * "Meu perfil".
 *
 * ## Nada aqui é uma ação
 *
 * Nenhuma pastilha é link, e é de propósito. Quem diz o que fazer é o cartão
 * AGORA, uma vez, no topo. Um selo que levasse a algum lugar seria a segunda
 * resposta para "o que eu faço agora?" — que é exatamente o defeito que esta
 * rodada veio matar.
 */
export function Selos({ lista }: { lista: readonly SeloComData[] }) {
  const tem = ganhos(lista);
  const recentes = maisRecentes(tem, RECENTES);
  const perto = proximos(lista, 2);

  // Um aluno sem nenhum selo e sem nada perto não existe (sempre há um próximo),
  // mas a guarda evita uma seção vazia se a V2 mexer nas famílias.
  if (tem.length === 0 && perto.length === 0) return null;

  return (
    <section aria-labelledby="selos" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="selos" className="rotulo text-tinta-fraca">
          Conquistas
        </h2>
        {/* O único link da seção leva às conquistas inteiras, com data — não a um lugar de treino. */}
        <span className="flex items-baseline gap-3 text-xs">
          <span className="text-tinta-fraca tabular-nums">
            {tem.length} de {lista.length}
          </span>
          <Link href="/perfil" className="foco -my-3 inline-flex min-h-11 items-center font-medium text-metodo-tinta hover:underline">
            Ver todas
          </Link>
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {recentes.map((selo, i) => (
          <li
            key={selo.id}
            title={selo.conquistadoEm ? `${selo.conta} Ganho em ${dataDoSelo(selo.conquistadoEm)}.` : selo.conta}
            className={`${i >= RECENTES_NO_CELULAR ? "hidden sm:flex" : "flex"} items-center gap-1.5 rounded-full border border-metodo-cheio bg-metodo-superficie/12 px-3 py-1.5 text-xs font-medium text-metodo-tinta-alta`}
          >
            <IconeDoSelo familia={selo.familia} id={selo.id} tamanho={14} />
            {selo.nome}
          </li>
        ))}

        {perto.map((selo) => (
          <li
            key={selo.id}
            title={selo.conta}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-borda px-3 py-1.5 text-xs text-tinta-fraca"
          >
            <IconeDoSelo familia={selo.familia} id={selo.id} tamanho={14} />
            {selo.nome}
            <span className="text-tinta-fraca">— {selo.falta}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
