import { DEGRAU_APRENDIDA, type ProgressoDaLinha } from "@/lib/repertorio/treino";

/**
 * Os três degraus até "aprendida", em bolinhas.
 *
 * **Um desenho só, e é por isso que ele mora fora das duas telas que o usam.**
 * A lista da abertura desenha uma por linha, no servidor; o cabeçalho do treino
 * desenha a da linha atual, no navegador, com o número que o servidor acabou de
 * devolver. Duas cópias seriam duas chances de a lista dizer duas bolinhas e o
 * cabeçalho dizer três, na mesma tela.
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
export function Bolinhas({ progresso }: { progresso: ProgressoDaLinha }) {
  const cheias = Math.min(progresso.degrau, DEGRAU_APRENDIDA);
  const pronta = progresso.aprendidaEm !== null;

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: DEGRAU_APRENDIDA }, (_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${i < cheias ? "bg-metodo-cheio" : "bg-carta-alta"}`}
          />
        ))}
      </span>
      <span
        className={`text-xs tabular-nums ${pronta ? "text-metodo-tinta" : "text-tinta-fraca"}`}
      >
        {pronta ? "aprendida" : `${cheias} de ${DEGRAU_APRENDIDA}`}
      </span>
    </span>
  );
}
