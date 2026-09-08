import { lerPlano } from "@/lib/repertorio/esquema";
import type { Linha } from "@/lib/repertorio/linhas";

/**
 * "O que ainda falta" — o painel do fim de uma linha que não fechou.
 *
 * ## Por que ele existe
 *
 * A régua do repertório (§24 de `docs/REVISAO-FONTES.md`) é que a abertura
 * acaba com o rei rocado e as quatro peças menores fora. Quase toda linha chega
 * lá dentro do teto de 14 lances; algumas não chegam, e aí a saída **não** é
 * encurtar a régua nem esticar a linha inventando lance: é o autor declarar,
 * num bloco `[%plano]` do PGN, o que ficou faltando e por quê.
 *
 * Este painel é onde essa declaração encontra o aluno. Ele lê "Bispo de c1 →
 * b2 — só sai depois do b3", vê a seta roxa no tabuleiro, e sai da abertura
 * sabendo o endereço da peça que ainda não saiu. É o que a linha ensinaria se
 * coubesse.
 *
 * ## Ele some quando não tem o que dizer
 *
 * Linha que fecha inteira não mostra nada além do comentário final — mesma
 * regra do `Comentario`: caixa vazia não é informação, e um painel que aparece
 * sempre vira moldura, não aviso.
 *
 * ## O roxo, e por que não é vermelho
 *
 * As setas usam o pincel `plano` (`--color-pincel-plano`), que não é veredito
 * nenhum. Vermelho diria que o aluno errou; ele não errou — a linha é que
 * acabou antes. Ver o bloco do token em `app/globals.css`.
 */
export function OQueAindaFalta({ linha }: { linha: Linha }) {
  const itens = lerPlano(linha.plano);
  if (itens.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-borda-fraca bg-carta-alta px-3 py-2.5">
      <h3 className="text-sm font-semibold text-tinta">O que ainda falta</h3>
      <ul className="flex flex-col gap-1.5">
        {itens.map((item) => (
          <li key={item.chave} className="text-sm text-tinta-media">
            <strong className="font-semibold text-tinta">{item.titulo}</strong> — {item.motivo}
          </li>
        ))}
      </ul>
    </section>
  );
}
