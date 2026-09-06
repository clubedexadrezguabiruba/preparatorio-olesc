import { ACERTOS_PARA_APRENDER, type ProgressoDaLinha } from "@/lib/repertorio/treino";

/**
 * Os três acertos seguidos, em bolinhas.
 *
 * **Um desenho só, e é por isso que ele mora fora das duas telas que o usam.**
 * A lista da abertura desenha uma por linha, no servidor; o cabeçalho do treino
 * desenha a da linha atual, no navegador, com o número que o servidor acabou de
 * devolver. Duas cópias seriam duas chances de a lista dizer duas bolinhas e o
 * cabeçalho dizer três, na mesma tela.
 *
 * As bolinhas são `aria-hidden` e o texto ao lado diz a mesma coisa em palavra
 * — "2 de 3" não é informação que caiba num círculo, e um leitor de tela que
 * lesse os dois diria tudo duas vezes. É a mesma regra da `components/Barra`.
 */
export function Bolinhas({ progresso }: { progresso: ProgressoDaLinha }) {
  const cheias = Math.min(progresso.acertosSeguidos, ACERTOS_PARA_APRENDER);
  const pronta = progresso.aprendidaEm !== null;

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: ACERTOS_PARA_APRENDER }, (_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${
              i < cheias ? "bg-metodo-cheio" : "bg-carta-alta"
            }`}
          />
        ))}
      </span>
      <span
        className={`text-xs tabular-nums ${pronta ? "text-metodo-tinta" : "text-tinta-fraca"}`}
      >
        {pronta ? "aprendida" : `${cheias} de ${ACERTOS_PARA_APRENDER}`}
      </span>
    </span>
  );
}
