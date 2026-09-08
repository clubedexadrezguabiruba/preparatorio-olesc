"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * O comentário do professor, no painel — **paginado, nunca rolado**.
 *
 * ## Por que paginar
 *
 * O molde é o chess.com, e ele resolve o problema não resolvendo: medida ao
 * vivo na aula "Roque" em 8/9/2026, a bolha dele tem altura fixa de 128 px e
 * os treze textos da aula vão de **35 a 164 caracteres**. Nunca estoura.
 *
 * Os nossos são outra coisa. Nos 363 comentários compilados em
 * `public/repertorio/`: mínimo 80, **mediana 276**, p90 428, **máximo 853**.
 * O maior texto do chess.com é menor que a nossa mediana. Copiar a caixa de
 * 128 px cortaria quase tudo que escrevemos.
 *
 * As três saídas eram: rolar a página (é o defeito que este redesenho existe
 * para matar), rolar dentro da caixa (é o que o chess.com faz de reserva — a
 * bolha dele tem `overflow: auto` —, mas continua sendo rolagem), ou **partir
 * o texto em páginas e usar o mesmo botão "Continuar" para virar**. A terceira
 * é a única que mantém a promessa, e é gesto que o aluno já faz: o comentário
 * comprido vira dois toques em vez de um.
 *
 * ## Como a conta é feita
 *
 * A altura disponível não é escolhida — é **medida**. A caixa é `flex-1` dentro
 * de `.aula-painel`, que tem altura fechada (ver "O palco da aula" em
 * `app/globals.css`); o que sobra depois do cartão de comando e dos botões é o
 * que o texto tem. Uma sonda invisível, com a tipografia copiada da caixa de
 * verdade, recebe frase a frase até estourar, e o corte sai no ponto final
 * anterior. Frase que sozinha não cabe é partida por palavra — última linha de
 * defesa, e nenhuma frase do repertório chegou lá.
 *
 * Remede a cada `ResizeObserver`: girar o telefone, abrir o teclado virtual ou
 * arrastar a janela muda a conta, e a paginação tem de acompanhar. Isso não
 * entra em laço porque a altura da caixa vem do layout, não do conteúdo.
 */

/* ------------------------------------------------------------------ *
 * A máquina de escrever
 *
 * **Isto entrou como experimento, e a única coisa que decide se ele fica é o
 * relógio.** Os três números abaixo foram medidos no Move Trainer do chess.com
 * em 8/9/2026, e a dúvida é se a aritmética deles transfere: o texto do
 * chess.com tem **89 caracteres de mediana**, o nosso tem **276**. A 7 ms por
 * caractere isso é 1,9 s por comentário mediano, contra 0,6 s deles.
 *
 * O que atenua, e é o argumento de deixar ligado: no desenho de três etapas os
 * comentários só aparecem na **etapa 1**, que só acontece na **primeira
 * passada** de cada linha. São ~13 comentários por linha — uns 25 segundos, uma
 * vez na vida daquela linha.
 *
 * As três constantes ficam juntas e num lugar só de propósito: **mudar a
 * velocidade, ou desligar, é editar um número aqui.** Não estão em
 * `lib/tatica/tempos.ts` porque aquele arquivo é dos tempos do TABULEIRO (e o
 * `RESPOSTA_MS` de lá é teto de duração de som, cobrado por teste); estes são
 * do painel de texto, e ninguém mais os importa.
 * ------------------------------------------------------------------ */

/** Quanto cada caractere leva para aparecer. Medido: ~7 ms no chess.com. */
const MS_POR_CARACTERE = 7;
/** Do momento em que a página vira até o primeiro caractere. */
const ANTES_DO_TEXTO = 190;
/**
 * O mesmo, quando o comentário chega logo depois de um lance: espera a peça
 * pousar antes de começar a falar. Medido em 340 ms.
 */
const DEPOIS_DO_LANCE = 340;

export type Paginacao = {
  /** A camada invisível que reserva o espaço: é ela que a conta mede. */
  espacoRef: RefObject<HTMLDivElement | null>;
  /** A caixa cinza que abraça o texto: dela sai só a tipografia e o recuo. */
  caixaRef: RefObject<HTMLDivElement | null>;
  /** O pedaço que está na tela agora, inteiro. É ele que reserva a altura. */
  pagina: string;
  /** O prefixo dele que a máquina de escrever já revelou. */
  visivel: string;
  /** A digitação ainda está correndo: o próximo gesto completa em vez de avançar. */
  digitando: boolean;
  /** Põe o texto inteiro na tela agora. */
  completar: () => void;
  indice: number;
  total: number;
  /** Verdadeiro quando não há mais texto: o "Continuar" volta a avançar o lance. */
  naUltima: boolean;
  /** Vira a página. Só chame quando `naUltima` for falso. */
  virar: () => void;
};

/**
 * O aluno pediu para o sistema não animar nada.
 *
 * `useSyncExternalStore` e não `useEffect`: a preferência mora no sistema
 * operacional, que é um sistema externo, e o instantâneo do servidor é
 * **"não animar"** — assim o HTML que chega já traz o texto inteiro, e não há
 * um quadro de caixa vazia antes de a hidratação decidir.
 */
function usePrefereSemMovimento(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function useComentarioPaginado(texto: string | null): Paginacao {
  const espacoRef = useRef<HTMLDivElement | null>(null);
  const caixaRef = useRef<HTMLDivElement | null>(null);

  /**
   * O corte, **carimbado com o texto de onde saiu**.
   *
   * Quem escreve é o callback do `ResizeObserver` — nunca o corpo do efeito.
   * A diferença não é de estilo: `setState` no corpo do efeito encadeia um
   * render extra a cada montagem (`react-hooks/set-state-in-effect`), e ler a
   * caixa durante o render quebraria o modo concorrente (`react-hooks/refs`).
   * O observador é um sistema externo, e é o lugar certo para os dois.
   *
   * O carimbo resolve a janela de um quadro entre "o lance mudou" e "o
   * observador remediu": enquanto os carimbos não batem, vale o texto inteiro.
   */
  const [corte, setCorte] = useState<{ para: string; paginas: string[] } | null>(null);

  useLayoutEffect(() => {
    const espaco = espacoRef.current;
    const caixa = caixaRef.current;
    if (!espaco || !caixa || !texto) return;
    const observador = new ResizeObserver(() => {
      const novas = paginar(texto, espaco, caixa);
      setCorte((antes) =>
        antes &&
        antes.para === texto &&
        antes.paginas.length === novas.length &&
        antes.paginas.every((p, i) => p === novas[i])
          ? antes
          : { para: texto, paginas: novas },
      );
    });
    // Observa o ESPAÇO, e não a caixa. A caixa muda de altura com o texto, e
    // observá-la seria realimentar a conta com o resultado dela mesma; a
    // altura do espaço vem do layout, e não do conteúdo.
    //
    // `observe` dispara uma vez sozinho, com o tamanho inicial — é assim que a
    // primeira medição chega sem uma chamada solta no corpo do efeito. Trocar
    // de lance refaz o observador, e a medida sai de novo.
    observador.observe(espaco);
    return () => observador.disconnect();
  }, [texto]);

  const paginas = texto ? (corte?.para === texto ? corte.paginas : [texto]) : [];

  /**
   * A página corrente, também carimbada.
   *
   * Comparar o carimbo no render zera a paginação quando o lance muda, sem um
   * efeito só para isso — e sem o quadro intermediário em que o comentário
   * novo apareceria aberto na página 2 do comentário velho.
   */
  const [posicao, setPosicao] = useState<{ para: string | null; n: number }>({ para: texto, n: 0 });
  const total = Math.max(paginas.length, texto ? 1 : 0);
  const n = posicao.para === texto ? Math.min(posicao.n, Math.max(total - 1, 0)) : 0;

  const pagina = paginas[n] ?? texto ?? "";
  const digitacao = useDigitacao(pagina, n === 0);

  return {
    espacoRef,
    caixaRef,
    pagina,
    visivel: digitacao.visivel,
    digitando: digitacao.digitando,
    completar: digitacao.completar,
    indice: n,
    total,
    naUltima: n >= total - 1,
    virar: () => setPosicao({ para: texto, n: n + 1 }),
  };
}

/**
 * O texto aparecendo caractere a caractere.
 *
 * ## Como a conta corre
 *
 * Um `requestAnimationFrame` só, e o quanto revelar sai do **relógio**, não de
 * um contador incrementado a cada quadro: `caracteres = (agora - começo -
 * espera) / MS_POR_CARACTERE`. A 7 ms por caractere, um `setInterval` bateria
 * 143 vezes por segundo ao lado de um tabuleiro que anima peça — e ficaria
 * devendo caracteres em qualquer engasgo, porque contador não recupera tempo
 * perdido. Com o relógio, um quadro atrasado revela dois caracteres e a
 * duração total continua sendo a que a constante promete.
 *
 * `setState` só de dentro do quadro, nunca no corpo do efeito — é a mesma regra
 * que o `ResizeObserver` da paginação segue, e pelo mesmo motivo
 * (`react-hooks/set-state-in-effect`). O **carimbo** com o texto de origem é o
 * que zera a digitação quando a página muda, sem um efeito só para isso.
 *
 * ## Pular é obrigatório
 *
 * Qualquer toque, clique ou tecla completa o texto na hora. Sem isso o aluno
 * fica refém da animação — e, num comentário de 428 caracteres (o p90 do
 * repertório), refém por três segundos.
 *
 * **Botões e links ficam de fora do ouvinte**, e é o que impede o "Continuar"
 * de fazer duas coisas com um toque só: quem trata o gesto neles é o próprio
 * `continuarLeitura` (em `Passada.tsx`), que lê `digitando` e completa antes de
 * virar a página. Sem essa exceção, o mesmo clique completaria o texto **e**
 * avançaria — e o aluno veria o comentário inteiro por um quadro.
 */
function useDigitacao(pagina: string, primeiraPagina: boolean) {
  const semMovimento = usePrefereSemMovimento();
  const [ate, setAte] = useState<{ para: string; n: number }>({ para: "", n: 0 });

  const revelados = ate.para === pagina ? ate.n : 0;
  const digitando = !semMovimento && pagina.length > 0 && revelados < pagina.length;

  const completar = useCallback(() => {
    setAte({ para: pagina, n: pagina.length });
  }, [pagina]);

  useEffect(() => {
    if (semMovimento || !pagina) return;
    const espera = primeiraPagina ? DEPOIS_DO_LANCE : ANTES_DO_TEXTO;
    const total = espera + pagina.length * MS_POR_CARACTERE;
    let comeco = 0;
    let quadro = 0;

    const passo = (agora: number) => {
      if (!comeco) comeco = agora;
      const decorrido = agora - comeco;
      const n = Math.max(0, Math.floor((decorrido - espera) / MS_POR_CARACTERE));
      setAte({ para: pagina, n: Math.min(n, pagina.length) });
      if (decorrido < total) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [pagina, primeiraPagina, semMovimento]);

  // O atalho: qualquer gesto na página completa. Só enquanto há o que
  // completar, para a aula não carregar três ouvintes de janela à toa.
  useEffect(() => {
    if (!digitando) return;
    function pular(evento: Event) {
      const alvo = evento.target;
      // Botão e link têm dono: `continuarLeitura` decide o que o gesto faz
      // neles. Interceptar aqui faria o mesmo toque completar E avançar.
      if (alvo instanceof Element && alvo.closest("button, a, input, select, textarea")) return;
      setAte({ para: pagina, n: pagina.length });
    }
    window.addEventListener("pointerdown", pular);
    window.addEventListener("keydown", pular);
    return () => {
      window.removeEventListener("pointerdown", pular);
      window.removeEventListener("keydown", pular);
    };
  }, [digitando, pagina]);

  return {
    visivel: semMovimento ? pagina : pagina.slice(0, revelados),
    digitando,
    completar,
  };
}

/**
 * Parte o texto no maior pedaço que couber, respeitando as frases.
 *
 * Mede em dois lugares porque eles dizem coisas diferentes. O `espaco` dá a
 * ALTURA que sobrou, e ele a tem inteira mesmo quando o texto é curto. A
 * `caixa` dá a tipografia e o recuo REAIS — que precisam ser descontados da
 * altura e da largura, porque o texto vive dentro deles. Medir numa largura
 * chutada erraria por pouco, e errar por pouco aqui é uma linha cortada ao
 * meio na tela do aluno.
 */
function paginar(texto: string, espaco: HTMLElement, caixa: HTMLElement): string[] {
  const estilo = getComputedStyle(caixa);
  const recuoY = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
  const recuoX = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight);
  const teto = espaco.clientHeight - recuoY;
  const largura = espaco.clientWidth - recuoX;
  if (teto <= 0 || largura <= 0) return [texto];

  const sonda = document.createElement("div");
  sonda.setAttribute("aria-hidden", "true");
  sonda.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    `width:${largura}px`,
    `font:${estilo.font}`,
    `line-height:${estilo.lineHeight}`,
    `letter-spacing:${estilo.letterSpacing}`,
    `word-spacing:${estilo.wordSpacing}`,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
  ].join(";");
  document.body.appendChild(sonda);

  const cabe = (t: string) => {
    sonda.textContent = t;
    return sonda.scrollHeight <= teto;
  };

  try {
    if (cabe(texto)) return [texto];

    const paginas: string[] = [];
    let atual = "";
    for (const pedaco of emFrases(texto)) {
      const tentativa = atual ? atual + pedaco : pedaco;
      if (cabe(tentativa)) {
        atual = tentativa;
        continue;
      }
      if (atual) {
        paginas.push(atual.trim());
        atual = "";
      }
      // A frase sozinha ainda não cabe: parte por palavra.
      if (!cabe(pedaco)) {
        for (const palavra of pedaco.split(/(\s+)/)) {
          const t2 = atual ? atual + palavra : palavra;
          if (cabe(t2)) {
            atual = t2;
          } else {
            if (atual.trim()) paginas.push(atual.trim());
            atual = palavra.trimStart();
          }
        }
      } else {
        atual = pedaco;
      }
    }
    if (atual.trim()) paginas.push(atual.trim());
    return paginas.length > 0 ? paginas : [texto];
  } finally {
    sonda.remove();
  }
}

/** Corta em frases, mantendo a pontuação e o espaço que vem depois dela. */
function emFrases(texto: string): string[] {
  return texto.match(/[^.!?…]+(?:[.!?…]+["'”’)]*\s*|$)/g) ?? [texto];
}

/**
 * A caixa do texto.
 *
 * `flex-1` com `min-h-0` é o par que faz a medição valer: sem o `min-h-0` o
 * filho de um flex nunca encolhe abaixo do próprio conteúdo, e a caixa mediria
 * a altura do texto em vez do espaço que sobrou.
 *
 * A caixa **não some quando não há comentário** — ela fica vazia, ocupando o
 * lugar. É de propósito: some, e o botão "Continuar" sobe uns 100 px e depois
 * desce, a cada lance. O alvo que o aluno mais aperta não pode andar.
 */
export function Comentario({
  paginacao,
  retrato,
}: {
  paginacao: Paginacao;
  retrato?: ReactNode;
}) {
  const { espacoRef, caixaRef, pagina, visivel, indice, total } = paginacao;
  return (
    /*
     * A linha do professor: ele à esquerda, a fala dele à direita.
     *
     * **A ordem é a informação.** O texto vem DEPOIS do desenho, e num balão
     * com bico apontando para ele, porque é assim que a instrução lê como
     * alguém falando em vez de como aviso de sistema. É o que o chess.com faz
     * na aula deles, e é a razão de o retrato existir.
     *
     * **O retrato não sai do texto — o painel é que é maior.** O painel passou
     * de 410 para 522 px justamente para pagar a figura (ver o bloco do palco
     * em `app/globals.css`); ela ocupa 112, o vão é 16, e sobram **394 px** de
     * caixa. Enfiar o retrato dentro dos 410 originais deixaria o texto com
     * 266 px e ~37 caracteres por linha, abaixo da faixa legível de 45 a 75;
     * assim ele fica com ~52, dentro da faixa.
     *
     * 112 px e não 96: a 96 a figura lia como miniatura ao lado de um bloco
     * grande de texto, e deixava de parecer a **emissora** da fala. 112 põe a
     * proporção na do chess.com — lá o treinador tem ~100 px ao lado de um
     * balão de 437.
     *
     * **`lg:max-h-88` mora aqui, e não na caixa de texto.** É o teto da LINHA
     * inteira: o painel é uma coluna de altura fechada, este bloco é o `flex-1`
     * dela, e o que sobrar depois do teto cai abaixo do botão — que é borda de
     * coluna, e não rasgo no meio dela (ver `AulaShell`). Com o teto na caixa e
     * não na linha, a linha comeria a altura toda e o botão iria para o pé.
     *
     * **Abaixo de `lg` o retrato e o bico somem.** Lá o painel tem 328 px e 96
     * deles seriam um quarto da tela do telefone, tirados justamente do texto.
     */
    <div className="flex min-h-0 flex-1 gap-4 lg:max-h-88">
      {retrato ? <div className="hidden shrink-0 lg:block">{retrato}</div> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
        {/*
         * Duas camadas, e a de fora é invisível.
         *
         * A de fora (`espacoRef`) **reserva** todo o espaço que sobrou, e é ela
         * que a paginação mede. A de dentro pinta o cinza e tem altura de
         * conteúdo — abraça o texto.
         *
         * Fossem uma só, o cinza pintaria a altura reservada inteira e um
         * comentário curto deixaria uma poça de fundo vazio embaixo dele: medido
         * na tela, 100 px de cinza sem nada, um quinto da caixa. O espaço tem de
         * ficar guardado — é ele que impede o botão de andar —, mas guardado não
         * quer dizer pintado.
         */}
        <div ref={espacoRef} className="relative min-h-0 flex-1">
          {/*
           * O bico do balão: um quadrado de 16 px virado 45°, com duas bordas,
           * metade dele para fora da caixa.
           *
           * Ele mora AQUI, no espaço, e não dentro da caixa — a caixa tem
           * `overflow-hidden` para o texto nunca vazar, e um bico desenhado lá
           * dentro seria cortado exatamente na metade que aparece.
           *
           * **A altura é 44 px, e ela é uma conta, não um gosto.** Centrar o
           * bico no balão seria o certo se o balão tivesse altura fixa; o nosso
           * cresce com o texto, e num comentário curto (o menor do repertório
           * tem 80 caracteres, duas linhas, ~62 px) um bico centrado no espaço
           * reservado ficaria pendurado fora dele. 44 px está dentro do balão
           * em qualquer comentário que exista.
           *
           * E cai onde deve: a figura tem 130 px de altura, então 44 é 34% dela
           * — a altura do nariz. É a mesma proporção do chess.com, onde o bico
           * nasce a ~30% da altura do treinador. Aos 20 px da primeira versão
           * ele nascia na altura do cabelo, e lia como enfeite em vez de fala.
           */}
          {retrato && pagina ? (
            <span
              aria-hidden
              className="absolute left-0 top-11 hidden size-4 -translate-x-1/2 rotate-45 border-b border-l border-borda-fraca bg-carta-alta lg:block"
            />
          ) : null}
          <div
            ref={caixaRef}
            className="relative max-h-full overflow-hidden rounded-lg border border-borda-fraca bg-carta-alta px-4 py-3.5 text-sm leading-relaxed text-tinta-media empty:hidden"
          >
            {pagina ? (
              /*
               * Duas cópias do texto empilhadas, e a de baixo é invisível.
               *
               * A invisível é a página INTEIRA, e é ela que dá altura ao balão:
               * sem ela o balão cresceria linha a linha enquanto a máquina de
               * escrever digita, e o texto pularia na tela a cada frase. É o
               * mesmo cuidado que o chess.com tem — a bolha deles assume a
               * altura final antes de o primeiro caractere sair.
               *
               * `visibility: hidden` e não `opacity: 0`: a invisível continua
               * ocupando o espaço (que é a razão de ela existir) e some para o
               * leitor de tela.
               *
               * A de cima, absoluta, mostra o prefixo já revelado. Ela é
               * `aria-hidden` porque um leitor de tela que a lesse anunciaria
               * fragmentos de palavra a cada quadro — quem fala com ele é a
               * região abaixo, uma vez só, com o texto pronto.
               */
              <>
                <span className="invisible" aria-hidden>
                  {pagina}
                </span>
                <span className="absolute inset-0 px-4 py-3.5" aria-hidden>
                  {visivel}
                </span>
                {/*
                 * O `aria-live` mora aqui, e não na caixa — era da caixa desde
                 * o balão de recado que este bloco substituiu. Ele anuncia o
                 * texto **inteiro**, e só quando ele termina de sair: fragmento
                 * anunciado é pior que silêncio.
                 */}
                <span className="sr-only" aria-live="polite">
                  {visivel === pagina ? pagina : ""}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {total > 1 ? <Regua indice={indice} total={total} /> : null}
      </div>
    </div>
  );
}

/**
 * Os pontinhos de página.
 *
 * Só aparecem quando há mais de uma página, e não são clicáveis: quem vira é o
 * "Continuar", que já é o gesto da aula. Um segundo controle para o mesmo
 * movimento daria duas maneiras de fazer a mesma coisa numa tela cuja regra é
 * ter um caminho só.
 */
function Regua({ indice, total }: { indice: number; total: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-tinta-muda">
      <span className="sr-only">
        Parte {indice + 1} de {total} do comentário
      </span>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-1 rounded-full transition-[width] ${
            i === indice ? "w-4 bg-tinta-fraca" : "w-1 bg-borda-forte"
          }`}
        />
      ))}
    </p>
  );
}
