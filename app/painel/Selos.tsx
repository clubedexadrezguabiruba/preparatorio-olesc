import { ganhos, proximos, type Familia, type Selo } from "@/lib/curso/selos";

/**
 * O sinal na frente do selo ganho. Todas as famílias usam o ✓, menos a tática
 * rating, que ganha o 📈 — é a única em que o número pode descer, e o sinal diz
 * que o selo é do recorde, que não desce.
 */
const ICONE: Partial<Record<Familia, string>> = { rating: "📈" };

/**
 * Os selos: o que o aluno já conquistou, e os dois que estão mais perto.
 *
 * ## Só os ganhos, e dois trancados
 *
 * A lista inteira são vinte e um. Mostrá-los todos faria da conquista um
 * inventário do que falta — vinte pastilhas apagadas em volta de uma acesa é
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
 * ## Nada aqui é uma ação
 *
 * Nenhuma pastilha é link, e é de propósito. Quem diz o que fazer é o cartão
 * AGORA, uma vez, no topo. Um selo que levasse a algum lugar seria a segunda
 * resposta para "o que eu faço agora?" — que é exatamente o defeito que esta
 * rodada veio matar.
 */
export function Selos({ lista }: { lista: readonly Selo[] }) {
  const tem = ganhos(lista);
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
        <span className="text-xs text-tinta-fraca tabular-nums">
          {tem.length} de {lista.length}
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {tem.map((selo) => (
          <li
            key={selo.id}
            title={selo.conta}
            className="flex items-center gap-1.5 rounded-full border border-metodo-cheio bg-metodo-superficie/12 px-3 py-1.5 text-xs font-medium text-metodo-tinta-alta"
          >
            <span aria-hidden>{ICONE[selo.familia] ?? "✓"}</span>
            {selo.nome}
          </li>
        ))}

        {perto.map((selo) => (
          <li
            key={selo.id}
            title={selo.conta}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-borda px-3 py-1.5 text-xs text-tinta-fraca"
          >
            {ICONE[selo.familia] ? <span aria-hidden>{ICONE[selo.familia]}</span> : null}
            {selo.nome}
            <span className="text-tinta-fraca">— {selo.falta}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
