"use client";

import { Miniatura } from "@/components/editor/Miniatura";
import type { Apagavel } from "@/lib/editor/edicoes";

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
  /** O diagrama recém-apagado, ou `null`. A linha nasce no buraco que ele deixou. */
  desfazer: Desfazer | null;
  aoDesfazer: () => void;
}) {
  const linhaDeDesfazer = desfazer ? (
    <LinhaDeDesfazer numero={desfazer.numero} aoDesfazer={aoDesfazer} />
  ) : null;

  return (
    <nav aria-label="Diagramas desta etapa" className="flex flex-col">
      <Vao
        indice={0}
        total={diagramas.length}
        cabeMais={cabeMais}
        aoAcrescentar={aoAcrescentar}
      />
      {diagramas.map((d, i) => {
        const selecionado = i === atual;
        const temProblema = d.problemas.length > 0;
        return (
          <div key={i}>
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
 */
function Vao({
  indice,
  total,
  cabeMais,
  aoAcrescentar,
}: {
  indice: number;
  total: number;
  cabeMais: boolean;
  aoAcrescentar: (indice: number) => void;
}) {
  if (!cabeMais) return <span className="block h-1.5" />;
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
      className="foco group flex h-3 w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      <span className="h-px flex-1 bg-borda-fraca" />
      <span className="rotulo px-1.5 leading-none text-tinta-fraca">+</span>
      <span className="h-px flex-1 bg-borda-fraca" />
    </button>
  );
}
