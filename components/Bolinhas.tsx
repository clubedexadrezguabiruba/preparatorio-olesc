/**
 * Os degraus até "aprendida", em bolinhas.
 *
 * **Um desenho só, e é por isso que ele mora fora das telas que o usam.** A
 * lista da abertura desenha uma por linha, no servidor; o cabeçalho do treino
 * desenha a da linha atual, no navegador, com o número que o servidor acabou de
 * devolver; a trilha de finais desenha uma por aula. Cópias seriam chances de
 * uma tela dizer duas bolinhas e a outra dizer três, para o mesmo progresso.
 *
 * Ele saiu de `app/aberturas/` em 2026-09-08, quando os finais ganharam a mesma
 * escada. **Não** importa constante nenhuma: `total` vem de quem chama, com o
 * `DEGRAU_APRENDIDA` do próprio módulo — as duas escadas usam hoje o mesmo três
 * por escolha editorial, não por necessidade, e um número compartilhado aqui
 * amarraria as duas sem que ninguém tivesse pedido.
 *
 * ## Elas contam o degrau, e não os acertos seguidos
 *
 * Contavam `acertosSeguidos` até 6/9/2026, e passaram a contar o **degrau da
 * escada** no dia em que ele virou o que decide "aprendida". Sem a troca, o
 * aluno que fechasse a mesma linha três vezes numa tarde veria "3 de 3" numa
 * linha que não está aprendida — a bolinha diria uma coisa e a palavra ao lado
 * dela diria outra, na mesma linha da tela. É a mesma mentira que a escada veio
 * consertar, escondida num círculo de 8 px.
 *
 * Acima do terceiro degrau elas ficam cheias e o texto passa a dizer
 * "aprendida": os degraus 4 e 5 são intervalo de revisão, não progresso para
 * aprender, e uma quarta bolinha prometeria uma meta que não existe.
 *
 * As bolinhas são `aria-hidden` e o texto ao lado diz a mesma coisa em palavra
 * — "2 de 3" não é informação que caiba num círculo, e um leitor de tela que
 * lesse os dois diria tudo duas vezes. É a mesma regra da `components/Barra`.
 */
export function Bolinhas({
  progresso,
  total,
}: {
  /** Só o que se desenha: o degrau e se já esteve aprendida alguma vez. */
  progresso: { readonly degrau: number; readonly aprendidaEm: string | null };
  /** Quantas bolinhas, e é o degrau em que a coisa fica aprendida. */
  total: number;
}) {
  const cheias = Math.min(progresso.degrau, total);
  const pronta = progresso.aprendidaEm !== null;

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${i < cheias ? "bg-metodo-cheio" : "bg-carta-alta"}`}
          />
        ))}
      </span>
      <span
        className={`text-xs tabular-nums ${pronta ? "text-metodo-tinta" : "text-tinta-fraca"}`}
      >
        {pronta ? "aprendida" : `${cheias} de ${total}`}
      </span>
    </span>
  );
}
