"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import { Miniatura } from "@/components/editor/Miniatura";
import type { Apagavel, Movivel } from "@/lib/editor/edicoes";

export type Diagrama = {
  fen: string;
  fala: string;
  /** Os códigos que a conferência acusou neste diagrama. Vazio é diagrama limpo. */
  problemas: string[];
};

/** O diagrama que acabou de sair, e o direito de trazê-lo de volta. */
export type Desfazer = { indice: number; numero: number };

/**
 * A coluna de diagramas, no modelo dos capítulos de um estudo do Lichess.
 *
 * Cada passo da etapa é um selo numerado com a posição dele. Clicar leva o
 * tabuleiro àquele diagrama — que é como o professor escreve a fala do passo 7
 * olhando para a posição do passo 7, em vez de contar os cliques a partir do
 * começo.
 *
 * ## O "+" mora no vão, e não numa barra
 *
 * O gesto que o Doug pediu é "acrescentar um diagrama **aqui**", e "aqui" é um
 * lugar entre dois selos. Um botão único no alto da coluna não teria esse
 * "aqui": ele acrescentaria sempre no fim, e mover o passo até o meio seria um
 * segundo gesto — o de arrastar, que ainda não existe. Então cada vão da coluna
 * é um alvo, inclusive o de cima e o de baixo.
 *
 * Eles ficam quase invisíveis até o ponteiro passar por cima, senão treze
 * sinais de mais competiriam com os treze diagramas pela atenção de quem só
 * quer escolher um. Mas ficam no DOM e recebem foco: um "+" que só existe no
 * `:hover` é um botão que não existe para quem anda de Tab.
 *
 * ## A lixeira mora no selo, pelo mesmo motivo
 *
 * O "+" ficou semanas sem gesto contrário, e um diagrama posto por engano só
 * saía editando o JSON à mão — a única coisa que o editor existe para não
 * pedir. A lixeira responde a isso, e responde no mesmo lugar: dentro do selo,
 * invisível até o ponteiro chegar, e no DOM para quem anda de Tab.
 *
 * **Ela nunca some, nem quando não pode apagar.** É o contrário da regra do vão
 * — e a diferença é que ali a recusa é uma só, global, explicada por uma frase
 * no pé da coluna; aqui ela é de ESTE diagrama, e muda de selo para selo. Um
 * selo sem lixeira ao lado de um selo com lixeira não diz por quê, e o
 * professor conclui a regra errada. Então a lixeira fica, apagada, e diz o
 * motivo ao ser apontada ou focada.
 *
 * ## O arrastar: o gesto de mudar um slide de lugar
 *
 * O terceiro gesto da coluna, e o Doug o escolheu contra a alternativa das
 * setinhas para cima e para baixo, com a frase que decidiu: *como mudar um
 * slide de lugar quando estamos criando*. A escolha melhorou o desenho, e por
 * um motivo que as setinhas não alcançavam: **o arrasto mostra a regra enquanto
 * ela vale**.
 *
 * Nem todo diagrama pode mudar de lugar. Os passos com `lance` são uma partida,
 * jogada um atrás do outro; embaralhá-los é embaralhar os lances, e a aula sai
 * inválida (ver `podeMoverPasso`). Em vez de escrever isso numa frase que o
 * professor leria uma vez e esqueceria, **os vãos onde este diagrama pode cair
 * se acendem enquanto ele está no ar**, e os outros não aceitam o solte. A
 * regra não é lida: é vista, e só no momento em que interessa.
 *
 * ### O punho existe para dizer que o selo se arrasta
 *
 * Um selo arrastável e um selo parado são pixel a pixel iguais, e "tente
 * arrastar e veja" não é interface. O punho é o sinal — e ele segue a regra da
 * lixeira, não a do vão: **nunca some**. Onde o diagrama não pode sair do
 * lugar, ele fica apagado e diz o motivo ao ser apontado, porque a recusa é
 * deste diagrama e muda de selo para selo.
 *
 * ### O alvo do solte é o selo inteiro, não o vão
 *
 * O vão tem 12 px de altura. Mirar 12 px com um selo pendurado no ponteiro é o
 * tipo de precisão que faz o professor achar que o gesto não funciona. Então
 * quem recebe o solte é o **selo**: metade de cima quer dizer "acima dele",
 * metade de baixo quer dizer "abaixo dele". O vão só desenha a linha, e nunca
 * muda de altura no meio do arrasto — uma coluna que reflui debaixo do ponteiro
 * move o alvo que a pessoa está mirando.
 *
 * ### O que este gesto não tem, e é sabido
 *
 * **Caminho pelo teclado.** O "+" e a lixeira têm; este não. Foi decidido com o
 * Doug em 10/9/2026: ele preferiu o arrasto, e um segundo par de botões em cada
 * selo pagaria a acessibilidade com a clareza do que a coluna faz. Fica
 * declarado como dívida, e é meia hora de trabalho no dia em que incomodar.
 *
 * ## O erro aparece no diagrama, não numa lista de códigos
 *
 * Quando a conferência acusa alguma coisa, o selo do passo ganha três marcas: o
 * código vira frase ao lado, uma bolinha vermelha aparece no canto, e a moldura
 * fica vermelha. Uma lista de erros embaixo da tela obrigaria o professor a
 * traduzir `roteiro[3]` para "o terceiro diagrama" com o dedo — e
 * `TREINO_SEM_NO` não quer dizer nada para quem não escreveu o gate.
 *
 * **A moldura vermelha só vale no selo que NÃO está selecionado**, e isso foi
 * decidido depois de a rodada de navegador de 10/9/2026 descobrir que ela nunca
 * existiu: este comentário a prometia, e o `className` punha
 * `border-transparent` no selo acusado, igual ao selo limpo do lado. Uma
 * moldura tem uma cor só, e ela já tinha dono — dizer qual selo está
 * selecionado. Ao selecionar o selo com problema, a moldura volta ao verde e o
 * aviso segue pela bolinha e pelo código, que estão à vista justamente porque o
 * professor foi olhar. As outras duas saídas foram recusadas: "sempre vermelha"
 * pede uma terceira forma para o selo que é os dois ao mesmo tempo (anel duplo,
 * sombra), e "só bolinha" manda procurar uma marca de 8 px numa coluna que
 * agora pode ter 40 selos.
 */
export function ListaDeDiagramas({
  diagramas,
  atual,
  etapa,
  orientation,
  aoEscolher,
  aoAcrescentar,
  cabeMais,
  apagavel,
  aoApagar,
  movivel,
  aoMover,
  desfazer,
  aoDesfazer,
}: {
  diagramas: Diagrama[];
  atual: number;
  etapa: "intro" | "objective";
  orientation: "white" | "black";
  aoEscolher: (indice: number) => void;
  /** Acrescenta um diagrama **antes** do índice pedido. */
  aoAcrescentar: (indice: number) => void;
  /** Falso quando a etapa chegou ao teto do schema — o vão vira frase. */
  cabeMais: boolean;
  /** O veredicto da lixeira deste diagrama. Ver `podeApagarPasso`. */
  apagavel: (indice: number) => Apagavel;
  aoApagar: (indice: number) => void;
  /** O veredicto do arrastar deste diagrama. Ver `podeMoverPasso`. */
  movivel: (indice: number) => Movivel;
  /** Solta o diagrama `de` no vão `vao`, contado na lista de antes do gesto. */
  aoMover: (de: number, vao: number) => void;
  /** O diagrama recém-apagado, ou `null`. A linha nasce no buraco que ele deixou. */
  desfazer: Desfazer | null;
  aoDesfazer: () => void;
}) {
  /** O diagrama que está no ar, ou `null`. */
  const [arrastando, setArrastando] = useState<number | null>(null);
  /** O vão que receberia o solte agora, ou `null`. */
  const [vaoAlvo, setVaoAlvo] = useState<number | null>(null);

  /*
   * Os vãos legais deste arrasto, calculados uma vez por render. Fora do
   * arrasto é `null`, e a coluna inteira volta a ser a de sempre — o "+" nos
   * vãos, nenhuma linha acesa.
   */
  const veredicto = arrastando === null ? null : movivel(arrastando);
  const vaosLegais = veredicto?.pode ? veredicto.vaos : null;

  /** Metade de cima do selo quer dizer "acima dele"; metade de baixo, "abaixo". */
  function vaoDoPonteiro(e: DragEvent<HTMLElement>, indice: number): number {
    const caixa = e.currentTarget.getBoundingClientRect();
    return e.clientY < caixa.top + caixa.height / 2 ? indice : indice + 1;
  }

  function largar() {
    setArrastando(null);
    setVaoAlvo(null);
  }

  function aoPassarPorCima(e: DragEvent<HTMLElement>, indice: number) {
    if (!vaosLegais) return;
    const vao = vaoDoPonteiro(e, indice);
    if (!vaosLegais.includes(vao)) {
      setVaoAlvo(null);
      return;
    }
    /*
     * Sem este `preventDefault` o navegador recusa o solte — é assim que a API
     * de arrastar diz "aqui pode". Nos vãos ilegais ele NÃO é chamado, e o
     * ponteiro passa a mostrar o sinal de proibido sozinho, sem uma linha de
     * código nossa.
     */
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setVaoAlvo(vao);
  }

  function aoSoltar(e: DragEvent<HTMLElement>, indice: number) {
    e.preventDefault();
    const de = arrastando;
    const vao = vaoDoPonteiro(e, indice);
    const podia = vaosLegais?.includes(vao) ?? false;
    largar();
    if (de !== null && podia) aoMover(de, vao);
  }

  const linhaDeDesfazer = desfazer ? (
    <LinhaDeDesfazer numero={desfazer.numero} aoDesfazer={aoDesfazer} />
  ) : null;

  return (
    <nav
      aria-label="Diagramas desta etapa"
      className="flex flex-col"
      onDragLeave={(e) => {
        // Só quando o ponteiro sai da coluna inteira, e não a cada selo que ele
        // atravessa por dentro.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setVaoAlvo(null);
      }}
    >
      <Vao
        indice={0}
        total={diagramas.length}
        cabeMais={cabeMais}
        aoAcrescentar={aoAcrescentar}
        arrastando={arrastando !== null}
        legal={vaosLegais?.includes(0) ?? false}
        alvo={vaoAlvo === 0}
      />
      {diagramas.map((d, i) => {
        const selecionado = i === atual;
        const temProblema = d.problemas.length > 0;
        const podeMover = movivel(i).pode;
        return (
          <div
            key={i}
            draggable={podeMover}
            onDragStart={(e) => {
              setArrastando(i);
              e.dataTransfer.effectAllowed = "move";
              // O Firefox só começa o arrasto se houver dado; o valor não é
              // lido por ninguém — quem sabe o que está no ar é o estado.
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragEnd={largar}
            onDragOver={(e) => aoPassarPorCima(e, i)}
            onDrop={(e) => aoSoltar(e, i)}
            className={arrastando === i ? "opacity-40" : undefined}
          >
            {/* A linha do desfazer nasce ENTRE o vão e o selo — que é
                exatamente o buraco deixado pelo diagrama que saiu. */}
            {desfazer?.indice === i && linhaDeDesfazer}
            <div className="group relative">
              <button
                type="button"
                onClick={() => aoEscolher(i)}
                aria-current={selecionado ? "true" : undefined}
                className={`foco flex w-full items-start gap-2.5 rounded-lg border p-1.5 pr-7 text-left transition-colors ${
                  selecionado
                    ? "border-foco bg-carta-alta"
                    : temProblema
                      ? "border-erro hover:bg-carta-alta"
                      : "border-transparent hover:border-borda-fraca hover:bg-carta-alta"
                }`}
              >
                <Miniatura fen={d.fen} orientation={orientation} tamanho={64} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                  <span className="rotulo text-tinta-fraca">{i + 1}</span>
                  {/* Duas linhas da fala, cortadas: o selo é para reconhecer o
                      diagrama, e a fala inteira está do outro lado da tela. */}
                  <span className="line-clamp-2 text-xs leading-snug text-tinta-media">
                    {d.fala || <em className="text-tinta-muda">sem fala</em>}
                  </span>
                  {temProblema && (
                    <span className="text-xs font-medium text-erro-tinta">
                      {d.problemas.length === 1 ? d.problemas[0] : `${d.problemas.length} problemas`}
                    </span>
                  )}
                </span>
                {temProblema && (
                  <span
                    aria-label={`${d.problemas.length} problema(s) neste diagrama`}
                    className="absolute right-1.5 top-2 size-2 rounded-full bg-erro"
                  />
                )}
              </button>
              <Punho numero={i + 1} etapa={etapa} veredicto={movivel(i)} />
              <Lixeira
                numero={i + 1}
                etapa={etapa}
                veredicto={apagavel(i)}
                aoApagar={() => aoApagar(i)}
              />
            </div>
            <Vao
              indice={i + 1}
              total={diagramas.length}
              cabeMais={cabeMais}
              aoAcrescentar={aoAcrescentar}
              arrastando={arrastando !== null}
              legal={vaosLegais?.includes(i + 1) ?? false}
              alvo={vaoAlvo === i + 1}
            />
          </div>
        );
      })}
      {/* O último diagrama da lista sai e deixa o buraco no fim, onde não há
          selo seguinte para carregar a linha. */}
      {desfazer !== null && desfazer.indice >= diagramas.length && linhaDeDesfazer}
    </nav>
  );
}

/**
 * O punho: o sinal de que este selo se arrasta — ou de que não se arrasta.
 *
 * Ele é a única coisa na coluna que diz que os selos mudam de lugar. Sem ele o
 * gesto existiria e ninguém saberia, e "tente arrastar e veja no que dá" não é
 * uma interface: é uma adivinhação.
 *
 * **Não é ele que se arrasta — é o selo inteiro**, como um slide. O punho é
 * placa, não maçaneta; arrastar só a partir de um alvo de 12 px seria trocar a
 * precisão do vão pela precisão do punho, que é justamente o defeito que este
 * gesto evitou. Isso continua verdade sem tirar o ponteiro dele: o arrasto
 * começa no `draggable` do selo, e um filho não precisa ser transparente ao
 * ponteiro para o pai ser arrastado a partir dele.
 *
 * ## O `pointer-events-none` que emudeceu o punho
 *
 * A primeira versão era `pointer-events-none`, e o Doug achou na primeira
 * rodada de teste: o bloqueio funcionava e **a frase nunca aparecia**. É a
 * mesma armadilha que a lixeira já tinha documentado por outro caminho — lá é o
 * `disabled` de verdade que não dispara `title`; aqui era o ponteiro
 * atravessando o elemento como se ele não existisse. Um elemento que o ponteiro
 * nunca toca não tem `:hover`, e sem `:hover` não há dica nenhuma.
 *
 * O alvo tem o **mesmo tamanho da lixeira** (20 px de caixa em volta de 12 de
 * desenho) pelo mesmo motivo: 12 px é grande o bastante para ver e pequeno
 * demais para acertar.
 *
 * Segue a regra da lixeira e não a do vão: **nunca some**. Onde o diagrama está
 * preso entre dois lances ele fica apagado e diz o motivo ao ser apontado —
 * porque a recusa é deste diagrama e muda de selo para selo, e um selo sem
 * punho ao lado de um selo com punho faz o professor concluir a regra errada.
 */
function Punho({
  numero,
  etapa,
  veredicto,
}: {
  numero: number;
  etapa: "intro" | "objective";
  veredicto: Movivel;
}) {
  const onde = etapa === "intro" ? "a apresentação" : "a aula assistida";
  const frase = veredicto.pode
    ? `arrastar o diagrama ${numero} para outro lugar`
    : "não dá para mudar de lugar: este diagrama move uma peça, e os vizinhos " +
      `também — ${onde} é uma partida, e trocar a ordem dos lances embaralharia a aula`;

  return (
    <span
      title={frase}
      aria-label={frase}
      role="img"
      /* Meio da altura, na calha que o `pr-7` do selo já reserva: o alto é da
         bolinha do problema e o pé é da lixeira, e as três não se pisam. */
      className={`absolute right-1 top-1/2 flex -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
        veredicto.pode ? "cursor-grab text-tinta-fraca" : "cursor-default text-tinta-muda"
      }`}
    >
      {/* Seis pontos, o desenho universal de "isto se arrasta". */}
      <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <circle cx="4" cy="2.5" r="1" />
        <circle cx="8" cy="2.5" r="1" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="8" cy="6" r="1" />
        <circle cx="4" cy="9.5" r="1" />
        <circle cx="8" cy="9.5" r="1" />
      </svg>
    </span>
  );
}

/**
 * A lixeira de um selo — e, quando ela não pode, o motivo.
 *
 * ## As duas recusas têm frases diferentes de propósito
 *
 * "Não dá" é a resposta que faz o professor tentar de novo. As duas recusas de
 * `podeApagarPasso` vêm de mundos diferentes — uma é o tamanho da lista, a
 * outra é a corrente de lances — e um professor que leia a frase certa aprende
 * a regra numa vez; um que leia "não é possível apagar" aprende a desconfiar da
 * tela.
 *
 * ## `aria-disabled`, e não `disabled`
 *
 * O desabilitado de verdade sai do Tab e não dispara `title` — ou seja, esconde
 * a explicação justamente de quem depende dela para saber que o botão existe.
 * Aqui o botão continua alcançável e continua falando; o que ele não faz é
 * apagar.
 */
function Lixeira({
  numero,
  etapa,
  veredicto,
  aoApagar,
}: {
  numero: number;
  etapa: "intro" | "objective";
  veredicto: Apagavel;
  aoApagar: () => void;
}) {
  const onde = etapa === "intro" ? "a apresentação" : "a aula assistida";
  // O singular existe porque o penúltimo diagrama com lance é um caso comum, e
  // "os 1 lances seguintes" foi o que a tela mostrou nele na primeira rodada.
  const seguintes =
    veredicto.pode || veredicto.porque !== "corrente"
      ? ""
      : veredicto.seguintes === 1
        ? "o lance seguinte é jogado"
        : `os ${veredicto.seguintes} lances seguintes são jogados`;
  const frase = veredicto.pode
    ? `apagar o diagrama ${numero}`
    : veredicto.porque === "piso"
      ? `não dá para apagar: ${onde} precisa de pelo menos ${veredicto.piso} diagramas`
      : `não dá para apagar: este diagrama tem um lance, e ${seguintes} a partir dele — a aula ficaria inválida`;

  return (
    <button
      type="button"
      aria-disabled={veredicto.pode ? undefined : true}
      onClick={veredicto.pode ? aoApagar : undefined}
      title={frase}
      aria-label={frase}
      className={`foco absolute bottom-1 right-1 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${
        veredicto.pode
          ? "text-tinta-fraca hover:bg-carta-toque hover:text-erro-tinta"
          : "cursor-default text-tinta-muda"
      }`}
    >
      {/* Traço e não preenchimento, no peso dos outros ícones da casa. */}
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 6.5h16M9.5 6.5v-2h5v2M6.8 6.5 7.7 20h8.6l.9-13.5" />
      </svg>
    </button>
  );
}

/**
 * O direito de voltar atrás, no lugar em que o diagrama estava.
 *
 * ## Por que ela não tem cronômetro
 *
 * O plano pedia "desfazer por alguns segundos", que é a forma de um aviso
 * flutuante: ele cobre a tela, então tem de sair sozinho. Esta linha não
 * flutua — ela ocupa o buraco que o diagrama deixou, numa coluna que já rola
 * por dentro e que acabou de ficar 64 px mais curta. Ela não cobre nada e não
 * empurra o palco, então o cronômetro não estaria protegendo a tela de nada:
 * estaria só marcando o tempo que o professor tem para perceber o próprio erro,
 * num gesto que é o único do editor sem outro caminho de volta.
 *
 * O que a faz sumir é a próxima edição, e isso não é cortesia — é correção. Um
 * "desfazer" clicado depois de o professor ter escrito outra coisa devolveria o
 * arquivo de antes e levaria a escrita junto, em silêncio. Quem garante isso é
 * o `Editor`, comparando a identidade do JSON na tela com a do JSON que este
 * desfazer sabe desfazer: qualquer edição cria um objeto novo, e a linha some.
 */
function LinhaDeDesfazer({ numero, aoDesfazer }: { numero: number; aoDesfazer: () => void }) {
  return (
    <div
      role="status"
      className="my-0.5 flex items-center gap-2 rounded-lg border border-dashed border-borda px-2 py-1.5"
    >
      <span className="min-w-0 flex-1 text-xs text-tinta-media">Diagrama {numero} apagado</span>
      <button
        type="button"
        onClick={aoDesfazer}
        className="foco shrink-0 rounded-md border border-borda px-2 py-0.5 text-xs font-medium text-tinta hover:bg-carta-alta"
      >
        Desfazer
      </button>
    </div>
  );
}

/**
 * O vão entre dois selos: seis pixels de nada que viram um "+" ao serem
 * apontados.
 *
 * ## O rótulo diz o lugar, não o gesto
 *
 * "Acrescentar diagrama" sozinho seria a mesma frase nos catorze vãos, e quem
 * ouve a tela ouviria catorze botões idênticos. O rótulo nomeia a posição —
 * "acrescentar diagrama antes do 3", "acrescentar diagrama no fim" —, que é a
 * única coisa que distingue um vão do outro.
 *
 * ## Cheio, ele some
 *
 * No teto do schema o vão não vira um "+" desabilitado: um botão apagado que
 * não diz por quê é pior que botão nenhum. Ele deixa de existir, e quem explica
 * é a frase no pé da coluna, que o `Editor` desenha uma vez só. (A lixeira faz
 * o contrário e não se contradiz — ver o cabeçalho deste arquivo: lá a recusa é
 * de um diagrama, e não da etapa inteira.)
 *
 * ## Durante o arrasto ele troca de papel, e não de altura
 *
 * O "+" sai — no meio de um arrasto o vão quer dizer "solte aqui", não
 * "acrescente aqui", e dois significados no mesmo lugar não é economia: é
 * ambiguidade. Entra a linha: fraca nos vãos que aceitam este diagrama, sólida
 * no que receberia o solte agora, nenhuma nos que a corrente de lances proíbe.
 *
 * **A altura não muda em nenhum dos casos**, e essa é a parte que se sente sem
 * se ver: uma coluna que cresce e encolhe enquanto o professor arrasta move o
 * alvo que ele está mirando, e o gesto vira perseguição. Mesmo no teto, onde o
 * vão é um espaçador sem botão, a linha aparece dentro dos mesmos pixels.
 */
function Vao({
  indice,
  total,
  cabeMais,
  aoAcrescentar,
  arrastando,
  legal,
  alvo,
}: {
  indice: number;
  total: number;
  cabeMais: boolean;
  aoAcrescentar: (indice: number) => void;
  arrastando: boolean;
  legal: boolean;
  alvo: boolean;
}) {
  const altura = cabeMais ? "h-3" : "h-1.5";

  if (arrastando) {
    return (
      <span className={`flex ${altura} items-center`} aria-hidden>
        <span
          className={`h-0.5 w-full rounded-full transition-colors ${
            alvo ? "bg-foco" : legal ? "bg-foco/30" : "bg-transparent"
          }`}
        />
      </span>
    );
  }

  if (!cabeMais) return <span className={`block ${altura}`} />;
  const onde =
    indice === 0
      ? "no começo"
      : indice >= total
        ? "no fim"
        : `entre o ${indice} e o ${indice + 1}`;
  return (
    <button
      type="button"
      onClick={() => aoAcrescentar(indice)}
      title={`acrescentar diagrama ${onde}`}
      aria-label={`acrescentar diagrama ${onde}`}
      className={`foco group flex ${altura} w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100`}
    >
      <span className="h-px flex-1 bg-borda-fraca" />
      <span className="rotulo px-1.5 leading-none text-tinta-fraca">+</span>
      <span className="h-px flex-1 bg-borda-fraca" />
    </button>
  );
}
