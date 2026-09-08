"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { CasasTocaveis } from "@/components/board/CasasTocaveis";
import { Negrito } from "@/components/texto/Negrito";
import { legalDests } from "@/lib/chess/dests";
import { ladoDaVez } from "@/lib/diagrama/tabuleiro";
import type { ItemDeLance, Treino as TreinoDaDica } from "@/lib/meiojogo/dicas";
import {
  COMECO,
  comApoio,
  comLance,
  contratoDoItem,
  custoDoRecusado,
  lancesDoItem,
  uciDoToque,
  type EstadoDoItem,
} from "@/lib/meiojogo/tentativa";
import { gravarTentativaDeTreino } from "../acoes";

/**
 * Os exercícios da dica: o aluno **joga** o lance do tema.
 *
 * ## O que mudou em relação ao treino do Bloco 4, e por quê
 *
 * O Bloco 4 pedia um clique: toque na coluna aberta, toque no peão isolado. O
 * Doug recusou pelo que aquilo mede — clicar em d5 prova que o aluno **vê** a
 * coluna aberta, não que ele a **usa**, e a dica m9 manda ligar a coluna a uma
 * entrada. Aqui ele arrasta a peça, e o juiz decide se aquele lance aplica o
 * tema (`lib/meiojogo/lances.ts`).
 *
 * O que sobreviveu do Bloco 4, e é bastante: a escada de apoio de três níveis
 * (convite → realce → solução), o relógio que zera a cada resposta, a gravação
 * sem `await`, um exercício por vez com o tabuleiro grudado, e a grade de casas
 * para quem responde por teclado — que aqui passa a pedir **duas** casas.
 *
 * ## Três respostas, e não duas
 *
 * O erro não diz que o lance é ruim: diz que ele não é o **do tema**, e a
 * diferença importa — um lance legal que não ocupa a coluna aberta pode ser o
 * melhor da posição.
 *
 * E há um terceiro caso, que é o que mais ensina: o lance que **aplica** o tema
 * e o motor reprovou na curadoria. A torre foi para a coluna aberta e pendurou
 * na casa de entrada. O aluno fez o que a dica manda e perdeu; chamar isso de
 * "esse não é o lance desta dica" seria mentir para quem entendeu a dica. A
 * tela diz as duas coisas — o padrão está certo, a casa é a metade seguinte —,
 * e o `lancesRecusados` do item é o que lhe dá o direito de dizer.
 *
 * ## Dois lances aceitos são uma resposta com dois caminhos
 *
 * Quando as duas torres chegam à coluna, as duas contam, e depois do acerto a
 * tela **diz** que a outra também servia. Recusar Tad1 e aceitar Tfd1 porque o
 * autor pensou numa só ensina o aluno a adivinhar o site.
 */

/** O que o chessground pinta em cada casa, e o que cada cor quer dizer. */
const PINCEL = { apoio: "blue", errada: "red", certa: "green" } as const;

export function Exercicios({ dica, treino }: { dica: string; treino: TreinoDaDica }) {
  const [passo, setPasso] = useState(0);
  const [estados, setEstados] = useState<EstadoDoItem[]>(() => treino.exercicios.map(() => COMECO));

  const item = treino.exercicios[passo];
  const estado = estados[passo];
  const ultimo = passo === treino.exercicios.length - 1;

  const mudar = (novo: EstadoDoItem) =>
    setEstados((atuais) => atuais.map((e, i) => (i === passo ? novo : e)));

  /**
   * O relógio do tempo gravado, e por que ele **zera a cada resposta**.
   *
   * A `minutos_por_dia` **soma** os `tempo_ms` das linhas. Se cada resposta
   * gravasse o tempo desde o começo do exercício, três tentativas de vinte
   * segundos virariam 20 + 40 + 60 = dois minutos de treino que não
   * aconteceram. O que cada linha carrega é o intervalo desde a resposta
   * anterior — assim a soma é o tempo de verdade.
   *
   * Ele nasce num efeito, e não no render: `Date.now()` no corpo do componente
   * é chamada impura, e o React pode renderizar duas vezes sem que o aluno
   * tenha feito nada. O efeito também é o que zera o relógio na troca de
   * exercício, sem que quem trocou precise lembrar de zerá-lo.
   */
  const relogio = useRef(0);
  useEffect(() => {
    relogio.current = Date.now();
  }, [passo]);

  const registrar = (idDoItem: string, resposta: string, apoio: number) => {
    const tempoMs = Date.now() - relogio.current;
    relogio.current = Date.now();
    // Sem `await`: a tela já deu o veredito no instante do lance, e prender a
    // criança na rede da escola para gravar seria trocar a resposta imediata
    // por uma barra de espera. O erro fica no `console.error` do servidor.
    void gravarTentativaDeTreino({ dica, item: idDoItem, resposta, apoio, tempoMs }).catch(
      () => {},
    );
  };

  const jogar = (orig: string, dest: string) => {
    const lance = uciDoToque(orig, dest, lancesDoItem(item));
    const novo = comLance(estado, item, lance);
    // Estado idêntico é o mesmo lance de novo, ou lance depois do acerto:
    // `tentativa.ts` já decidiu que não conta, e o que não conta na tela não
    // pode virar linha no banco.
    if (novo === estado) return;
    mudar(novo);
    registrar(item.id, lance, estado.apoio);
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h2 className="rotulo text-tinta-fraca">Agora jogue</h2>
        {/* A medida no parágrafo, e não na seção: no computador a coluna tem
            852 px, e o objetivo saía com 115 caracteres por linha — longa
            demais para um leitor de 12 anos, e o dobro dos ~62 do texto do
            exercício, que vive em duas colunas. */}
        <p className="max-w-[60ch] text-sm text-tinta-media">
          <Negrito>{treino.ficha.objetivo}</Negrito>
        </p>
      </header>

      {/* A trilha, sempre visível: com um exercício por vez, sem ela o aluno não
          sabe se está no começo ou no fim. `aria-current` porque o estado tem de
          existir também para quem ouve a página. */}
      <ol className="flex flex-wrap items-center gap-2" aria-label="Exercícios desta dica">
        {treino.exercicios.map((exercicio, i) => {
          const feito = estados[i].acertou;
          return (
            <li
              key={exercicio.id}
              aria-current={i === passo ? "step" : undefined}
              className={`rotulo flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 ${
                i === passo
                  ? "border-borda-forte bg-carta text-tinta"
                  : "border-transparent text-tinta-fraca"
              }`}
            >
              {feito ? (
                <>
                  <span aria-hidden>✓</span>
                  <span className="sr-only">feito:</span>
                </>
              ) : null}
              <span>{i + 1}</span>
            </li>
          );
        })}
      </ol>

      <Exercicio
        // `key` por item: sem ela o chessground animaria a diferença entre duas
        // posições que não têm lance nenhum entre si, e as peças do exercício
        // seguinte deslizariam das casas do anterior.
        key={item.id}
        item={item}
        ordem={passo + 1}
        total={treino.exercicios.length}
        estado={estado}
        erroMaisProvavel={treino.ficha.erroMaisProvavel.feedback}
        onJogar={jogar}
        onApoio={() => mudar(comApoio(estado))}
        onProximo={ultimo ? null : () => setPasso(passo + 1)}
      />
    </section>
  );
}

function Exercicio({
  item,
  ordem,
  total,
  estado,
  erroMaisProvavel,
  onJogar,
  onApoio,
  onProximo,
}: {
  item: ItemDeLance;
  ordem: number;
  total: number;
  estado: EstadoDoItem;
  erroMaisProvavel: string;
  onJogar: (orig: string, dest: string) => void;
  onApoio: () => void;
  onProximo: (() => void) | null;
}) {
  const contrato = contratoDoItem(item);
  const aceitos = lancesDoItem(item);
  const orientacao = ladoDaVez(item.fen);
  const jogo = new Chess(item.fen);

  /**
   * A origem escolhida pelo teclado, esperando o destino.
   *
   * O tabuleiro do chessground já sabe fazer isso sozinho com o ponteiro — o
   * `selectSquare` guarda a origem e o segundo toque fecha o lance. Quem chega
   * pela grade de botões não passa por ele, e sem este estado o teclado só
   * conseguiria apontar uma casa: metade de um lance.
   */
  const [origem, setOrigem] = useState<string | null>(null);

  /**
   * O que o tabuleiro mostra, e por que o lance certo **fica**.
   *
   * Depois do acerto a posição avança: ver a torre na coluna aberta é metade do
   * que o exercício ensina, e devolvê-la para casa apagaria justamente o
   * resultado. Depois do erro a posição volta — o `revisao` é o que obriga o
   * chessground a ressincronizar, porque ele já moveu a peça na tela antes de
   * nós sabermos se o lance servia.
   */
  const certo = estado.acertou ? estado.jogados[estado.jogados.length - 1] : null;
  let fenNaTela = item.fen;
  if (certo !== null) {
    const depois = new Chess(item.fen);
    depois.move({ from: certo.slice(0, 2), to: certo.slice(2, 4), promotion: certo[4] });
    fenNaTela = depois.fen();
  }
  const errado = !estado.acertou && estado.jogados.length > 0
    ? estado.jogados[estado.jogados.length - 1]
    : null;
  const vereditoDoErro = errado === null ? null : estado.vereditos[estado.vereditos.length - 1];
  const custo = errado === null ? null : custoDoRecusado(item, errado);

  const shapes: DrawShape[] = [
    ...(estado.apoio >= 2 && !estado.acertou
      ? item.apoio.realce.map((casa) => ({ orig: casa as Key, brush: PINCEL.apoio }))
      : []),
    ...(errado !== null
      ? [{ orig: errado.slice(0, 2) as Key, dest: errado.slice(2, 4) as Key, brush: PINCEL.errada }]
      : []),
    ...(certo !== null
      ? [{ orig: certo.slice(0, 2) as Key, dest: certo.slice(2, 4) as Key, brush: PINCEL.certa }]
      : []),
    ...(origem !== null ? [{ orig: origem as Key, brush: PINCEL.apoio }] : []),
  ];

  const outros = certo === null ? [] : aceitos.filter((l) => l !== certo);

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-borda-fraca bg-carta px-4 py-4 lg:grid lg:grid-cols-[minmax(0,384px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* A mesma receita de `Passos`: grudado com fundo opaco e margem negativa
          para cobrir a calha do cartão, e duas colunas só a partir de `lg`,
          porque partir a coluna antes disso devolve um tabuleiro menor que o do
          celular. */}
      <figure className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-borda-fraca bg-carta px-4 pb-3 pt-2 lg:mx-0 lg:top-4 lg:border-b-0 lg:px-0">
        <div className="mx-auto w-full max-w-sm">
          <ChessBoard
            fen={fenNaTela}
            orientation={orientacao === "brancas" ? "white" : "black"}
            // Depois do acerto ninguém mais move: o tabuleiro continua vivo para
            // ser lido, e um segundo lance ali não teria o que julgar.
            turnColor={estado.acertou ? undefined : jogo.turn() === "w" ? "white" : "black"}
            dests={estado.acertou ? undefined : legalDests(jogo)}
            // Sobe a cada tentativa: o chessground já moveu a peça na tela, e é
            // este número que o obriga a reler a FEN e desfazer o lance errado.
            revision={estado.tentativa}
            lastMove={certo !== null ? [certo.slice(0, 2) as Key, certo.slice(2, 4) as Key] : null}
            shapes={shapes}
            onMove={(orig, dest) => {
              setOrigem(null);
              onJogar(orig, dest);
            }}
            overlay={
              <CasasTocaveis
                fen={fenNaTela}
                orientacao={orientacao}
                onEscolher={(casa) => {
                  if (estado.acertou) return;
                  if (origem === null) {
                    // Só casa com peça de quem joga vira origem: sem isto o
                    // primeiro toque numa casa vazia deixaria o teclado
                    // esperando um destino que nunca fecharia lance.
                    const peca = jogo.get(casa as never);
                    if (peca && peca.color === jogo.turn()) setOrigem(casa);
                    return;
                  }
                  if (casa === origem) {
                    setOrigem(null);
                    return;
                  }
                  const de = origem;
                  setOrigem(null);
                  onJogar(de, casa);
                }}
                // O nome da grade **começa sempre igual**, e o estado vem
                // depois. Um rótulo que troca inteiro faz quem usa leitor de
                // tela perder a referência do que está lendo no meio do lance —
                // e foi o que quebrou o robô de `scripts/conferir-treino.ts`,
                // que é o mesmo gesto de procurar a grade pelo nome.
                descricao={
                  `Tabuleiro do exercício ${ordem}. ${contrato.enunciado} ` +
                  (origem === null
                    ? "Escolha a peça que vai jogar."
                    : `Peça de ${origem} escolhida: escolha para onde ela vai, ou toque em ${origem} de novo para trocar de peça.`)
                }
              />
            }
          />
        </div>
      </figure>

      <div className="flex flex-col gap-3">
        <p className="rotulo text-tinta-fraca">
          Exercício {ordem} de {total}
        </p>
        {/* A legenda e a citação **fora** do que gruda, e é medida: no celular
            o tabuleiro com as quatro linhas de legenda ocupava 470 dos 740 px
            da tela. Grudado fica o tabuleiro, que é o que precisa ficar à
            vista; a legenda se lê uma vez e sai. */}
        <p className="text-sm text-tinta-media">{item.legenda}</p>
        {/* O desequilíbrio de material vem escrito quando existe (§3.3): sem
            isso o aluno passa o exercício procurando por que um dos lados está
            com uma torre a mais. */}
        {item.material ? <p className="text-sm text-tinta-media">{item.material}</p> : null}
        <p className="text-xs text-tinta-fraca">{item.provenance.citacaoCurta}</p>
        <p className="text-base font-medium text-tinta">{contrato.enunciado}</p>
        {origem !== null ? (
          <p className="text-sm text-tinta-media">
            Peça de {origem} escolhida. Toque na casa de destino.
          </p>
        ) : null}

        <Escada item={item} apoio={estado.apoio} onPedir={onApoio} />

        {/* `aria-live`: quem responde pelo teclado não vê a casa acender, e sem
            isto o resultado só existiria na cor de uma seta. */}
        <div aria-live="polite" className="flex flex-col gap-3">
          {certo !== null ? (
            <div className="flex flex-col gap-1 rounded-lg bg-metodo-superficie/12 px-3 py-2.5">
              <p className="text-sm font-semibold text-metodo-tinta-alta">
                Isso: {certo.slice(0, 2)} para {certo.slice(2, 4)}.
              </p>
              <p className="text-sm text-tinta-media">
                <Negrito>{contrato.aplica}</Negrito>
              </p>
              {/* Que os outros também servem é dito, e não escondido: o aluno
                  que pensou em Tad1 e jogou Tfd1 precisa saber que não errou a
                  ideia, e o que jogou Tad1 precisa saber que não adivinhou. */}
              {outros.length > 0 ? (
                <p className="text-sm text-tinta-media">
                  {outros.length === 1 ? "Também servia: " : "Também serviam: "}
                  {outros.map((l) => `${l.slice(0, 2)}–${l.slice(2, 4)}`).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : errado !== null ? (
            <div className="flex flex-col gap-1 rounded-lg bg-aviso-superficie/14 px-3 py-2.5">
              <p className="text-sm font-semibold text-aviso-tinta">
                {vereditoDoErro === "caro" ? (
                  <>
                    {errado.slice(0, 2)}–{errado.slice(2, 4)} é o lance desta dica — mas aqui ele
                    custa caro.
                  </>
                ) : (
                  <>
                    {errado.slice(0, 2)}–{errado.slice(2, 4)} não é o lance desta dica. Olhe de novo
                    — errar aqui não custa nada.
                  </>
                )}
              </p>
              {/* Fora do tema, a tela não diz que o lance é ruim: ele pode até
                  ser o melhor da posição. Caro, ela não diz que está fora do
                  tema: ele **é** o do tema. Duas frases, duas verdades
                  diferentes, e nenhuma delas serve para as duas. */}
              <p className="text-sm text-tinta-media">
                {vereditoDoErro === "caro" ? contrato.custaCaro : contrato.foraDoTema}
              </p>
              {vereditoDoErro === "caro" && custo !== null ? (
                <p className="text-xs text-tinta-fraca">
                  O computador mede a diferença em {custo} centésimos de peão contra o melhor lance
                  da posição — quase {(custo / 100).toFixed(1).replace(".", ",")} peão.
                </p>
              ) : null}
              {/* A linha escrita para o erro mais provável do conceito entra na
                  primeira tentativa perdida, e não em todas: repetida a cada
                  lance ela vira ruído e deixa de ser lida. */}
              {estado.jogados.length === 1 ? (
                <p className="text-sm text-tinta-media">
                  <Negrito>{erroMaisProvavel}</Negrito>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {estado.acertou && onProximo ? (
          <button
            type="button"
            onClick={onProximo}
            className="foco w-fit rounded-lg bg-metodo-cheio px-4 py-2 text-sm font-semibold text-tinta-inversa hover:bg-metodo-cheio-toque"
          >
            Próximo exercício
          </button>
        ) : null}
      </div>
    </article>
  );
}

/**
 * A escada de apoio: convite, realce e solução — pedidos, nunca impostos.
 *
 * Os dois formatos do realce (`apoio.modo`) mudam a frase, e não o desenho. Um
 * `contorno` acende o que **define** a resposta por ausência — os peões, para
 * quem procura a coluna sem peão — e dizer "a resposta está entre as acesas"
 * ali seria mentir para o aluno que confia na frase.
 *
 * A escada está em **todos** os exercícios, e não só em alguns. Um degrau
 * declarado no id do item era uma promessa sobre o aluno; a coluna `apoio` do
 * registro é o que ele fez.
 */
function Escada({
  item,
  apoio,
  onPedir,
}: {
  item: ItemDeLance;
  apoio: number;
  onPedir: () => void;
}) {
  const rotulo = ["Pedir uma ajuda", "Pedir mais uma", "Ver o lance explicado"][apoio];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-borda bg-papel px-3 py-2.5">
      {apoio >= 1 ? <p className="text-sm text-tinta-media">{item.apoio.convite}</p> : null}

      {apoio >= 2 ? (
        <p className="text-sm text-tinta-media">
          {/* As casas acesas ditas em texto, e não só desenhadas: é o mesmo
              cuidado do `aria-live` acima — o realce não pode existir só na
              cor de um círculo. */}
          Acendi {item.apoio.realce.join(", ")}.{" "}
          {item.apoio.modo === "contem"
            ? "O lance chega a uma delas."
            : "Nenhuma delas é a chegada: elas mostram o que está em volta, e o lance vai para o que falta ali."}
        </p>
      ) : null}

      {apoio >= 3 ? (
        <p className="text-sm text-tinta">
          <Negrito>{item.apoio.solucao}</Negrito>
        </p>
      ) : null}

      {rotulo ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={onPedir}
            className="foco w-fit rounded-lg border border-borda-forte bg-carta px-3 py-1.5 text-sm font-medium text-dica-tinta hover:bg-carta-toque"
          >
            {rotulo}
          </button>
          <p className="text-xs text-tinta-fraca">
            Pedir ajuda não é errar. Fica registrado que você usou, e só.
          </p>
        </div>
      ) : null}
    </div>
  );
}
