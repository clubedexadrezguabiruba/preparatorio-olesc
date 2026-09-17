/**
 * O cartão de comando: duas linhas, sempre no mesmo lugar, sempre dizendo o
 * que fazer.
 *
 * ## A tradução, que é uma inversão
 *
 * No Move Trainer do chess.com o painel é escuro e **um** elemento é branco: o
 * cartão de comando, 410×64 px, no mesmo canto da tela do começo ao fim. Ele
 * funciona porque é a única superfície clara — o olho o acha sem ler nada.
 *
 * Nosso tema é claro (`colorScheme: "light"`, ~32 tokens em português, testes
 * de contraste em `lib/tema/guardas.test.ts`), então copiar a cor copiaria o
 * pixel e jogaria fora a ideia. A tradução é a inversão: aqui o cartão é a
 * única superfície **escura**. Mesma função, tema oposto.
 *
 * ## Por que ele não é monocromático
 *
 * O cartão do chess.com pode ser branco puro em todo estado porque o veredito
 * do lance mora noutro lugar — um disco colorido na casa de destino, que dura
 * menos de um segundo. Nós desenhamos esse disco também (o `selo` de
 * `Passada.tsx`), mas ele é transitório e some; um aluno que olhava para o
 * texto perde o único sinal de "acertei". Então o `tom` entra em dois canais
 * quietos, a borda de 2 px e o ícone, e o texto continua sendo o comando.
 *
 * ## O que ele **não** faz
 *
 * Não carrega o comentário do professor. Alguns têm três parágrafos, e um
 * cartão de altura fixa com prosa dentro deixa de ser um cartão. Quando há
 * comentário, o cartão diz "leia e continue" e o texto vai no bloco próprio,
 * logo abaixo.
 *
 * ## Por que ele mora em `components/lesson/`
 *
 * Nasceu em `app/aberturas/` e subiu quando a **tática** adotou o palco. Ele
 * não sabe nada de repertório: recebe as três coisas que desenha e pronto. É
 * por isso que as props são declaradas aqui, e não importadas de
 * `lib/repertorio/passada` — o tipo `Cartao` de lá as satisfaz
 * estruturalmente, e a tática monta as suas em `lib/tatica/fala.ts` sem passar
 * pelo repertório.
 */

export type TomDoCartao = "calma" | "bom" | "aviso" | "ruim";

const BORDA: Record<TomDoCartao, string> = {
  calma: "border-tinta-muda",
  bom: "border-metodo-superficie",
  aviso: "border-aviso-superficie",
  ruim: "border-erro-superficie",
};

const ICONE: Record<TomDoCartao, string> = {
  calma: "text-tinta-muda",
  bom: "text-metodo-superficie",
  aviso: "text-aviso-superficie",
  ruim: "text-erro-superficie",
};

export function CartaoDeComando({
  comando,
  estado,
  tom,
  espaco = false,
}: {
  comando: string;
  /**
   * A fase aceita Espaço para seguir (feedback do aluno, 17/9/2026): o cartão diz isso numa linha
   * própria, porque "Continue quando estiver pronto" não conta **como**.
   */
  espaco?: boolean;
  /** Onde a passada está. Opcional: na tática nem toda fase tem o que dizer. */
  estado?: string;
  tom: TomDoCartao;
}) {
  return (
    <div
      // O `aria-live` herdado do balão de recado que este cartão substituiu:
      // sem ele, o leitor de tela do aluno não é avisado de que a instrução
      // mudou — e a instrução muda a cada lance.
      aria-live="polite"
      // Mais baixo desde 17/9/2026: o aluno achou o balão grande demais para o que diz. Eram
      // `min-h-16`, `py-2.5`, ícone de 24 e comando em `text-sm`.
      className={`flex min-h-12 items-center gap-2.5 rounded-lg border-2 bg-tinta px-3 py-1.5 text-tinta-inversa ${BORDA[tom]}`}
    >
      <span className={`shrink-0 ${ICONE[tom]}`} aria-hidden>
        <Icone tom={tom} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold leading-snug">{comando}</span>
        {estado ? <span className="text-xs leading-snug opacity-90">{estado}</span> : null}
        {espaco ? (
          <span className="text-xs leading-snug opacity-90">
            Aperte <kbd className="rounded border border-current/40 px-1 font-sans font-semibold">Espaço</kbd> para continuar
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Quatro glifos, desenhados à mão em 24 unidades e mostrados a 18 px (17/9/2026).
 *
 * Traço e não preenchimento: o cartão é escuro, e uma forma cheia neste
 * tamanho vira um borrão. `stroke-width` 2 é o mesmo peso da borda do cartão —
 * os dois canais do tom têm de parecer o mesmo canal.
 */
function Icone({ tom }: { tom: TomDoCartao }) {
  const comum = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (tom === "bom") {
    return (
      <svg {...comum}>
        <path d="M4 12.5 9.5 18 20 6.5" />
      </svg>
    );
  }
  if (tom === "ruim") {
    return (
      <svg {...comum}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }
  if (tom === "aviso") {
    return (
      <svg {...comum}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5.5M12 16.4v.1" />
      </svg>
    );
  }
  // O tom calmo é o do comando: uma seta, que é o gesto de "vá".
  return (
    <svg {...comum}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
