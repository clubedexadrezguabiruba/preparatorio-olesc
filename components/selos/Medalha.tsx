import { corDoSelo, type Familia } from "@/lib/curso/selos";

/**
 * O desenho de cada família de selo, e a medalha que o emoldura (17/9/2026).
 *
 * Os selos eram pastilhas de texto com um ✓ (e um 📈 no rating). Com a data de ganho e a
 * vitrine da turma, eles passaram a ser a coisa que o aluno **mostra** — e um ✓ igual para
 * "Uma hora" e "Curso da Francesa" não diz nada. Cada família ganhou um traço desenhado, todos
 * na mesma grade de 24 e no mesmo traço de 2, para ler como um jogo só.
 *
 * `aria-hidden` sempre: quem diz o que o selo é para o leitor de tela é o nome escrito ao lado.
 *
 * ## A cor do repertório (17/9/2026)
 *
 * O repertório virou um selo por abertura, e "Londres 2.Bf4" sozinho não diz se é de brancas ou
 * de pretas. A cor vai no **desenho**, e não num nome comprido: um peão vazado é de brancas, um
 * peão cheio é de pretas — a convenção de todo diagrama de xadrez, e ela não depende do tema claro
 * ou escuro do site. O livro fica para os dois selos grandes (o Base e o Avançado).
 */

const TRACOS: Record<Familia, React.ReactNode> = {
  // Tática: o raio da combinação que decide.
  tatica: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  // Finais: a coroa do rei que sobra no tabuleiro.
  finais: (
    <>
      <path d="m4 8 4 4 4-7 4 7 4-4-2 11H6L4 8Z" />
      <path d="M6 22h12" />
    </>
  ),
  // Repertório: o caderno aberto.
  repertorio: (
    <>
      <path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5V5.5Z" />
      <path d="M12 6v13.5" />
    </>
  ),
  // Nível: a escada.
  nivel: <path d="M3 20h5v-5h5v-5h5V5h3" />,
  // Uma hora: o relógio.
  hora: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // Constância: a chama.
  constante: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.2-5 3.6-7.4.3 1.8 1.2 2.9 2.4 3.4C11.3 7.6 12.8 4.8 15.5 3c-.4 3 .6 4.9 1.8 6.6 1 1.4 1.2 2.9 1.2 4.4 0 4-2.6 7-6.5 7Z" />,
  // Puzzles: a peça de encaixe.
  puzzles: (
    <path d="M5 8h3.2a2.3 2.3 0 1 1 4.6 0H16v3.2a2.3 2.3 0 1 1 0 4.6V19H12.8a2.3 2.3 0 1 0-4.6 0H5v-3.2a2.3 2.3 0 1 0 0-4.6V8Z" />
  ),
  // Pontaria: o alvo.
  pontaria: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  // Curso de abertura: o capelo da aula concluída.
  abertura: (
    <>
      <path d="m2.5 9.5 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.8V16c3 2.3 8 2.3 11 0v-4.2" />
      <path d="M21.5 9.5v5" />
    </>
  ),
  // Tática rating: a curva que sobe — é o recorde, que não desce.
  rating: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
};

/** O peão da cor: vazado para brancas, cheio para pretas. */
function Peao({ cheio }: { cheio: boolean }) {
  return (
    <g fill={cheio ? "currentColor" : "none"}>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M9.3 11h5.4l1.8 7.5h-9L9.3 11Z" />
      <path d="M5.5 21h13" />
    </g>
  );
}

export function IconeDoSelo({
  familia,
  id,
  tamanho = 20,
  className = "",
}: {
  familia: Familia;
  /** O id do selo — só os de repertório por abertura mudam de desenho com ele (a cor). */
  id?: string;
  tamanho?: number;
  className?: string;
}) {
  const cor = id ? corDoSelo(id) : null;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {cor ? <Peao cheio={cor === "pretas"} /> : TRACOS[familia]}
    </svg>
  );
}

/**
 * A medalha: o desenho da família num disco. Ganha, é verde do método e cheia; trancada, é um
 * contorno tracejado e apagado — a mesma gramática da pastilha do painel.
 */
export function Medalha({
  familia,
  id,
  ganho,
  tamanho = "normal",
}: {
  familia: Familia;
  id?: string;
  ganho: boolean;
  tamanho?: "normal" | "grande";
}) {
  const grande = tamanho === "grande";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full ${grande ? "size-14" : "size-11"} ${
        ganho
          ? "border-2 border-metodo-cheio bg-metodo-superficie/16 text-metodo-tinta-alta"
          : "border border-dashed border-borda-forte text-tinta-fraca"
      }`}
    >
      <IconeDoSelo familia={familia} id={id} tamanho={grande ? 26 : 20} />
    </span>
  );
}
