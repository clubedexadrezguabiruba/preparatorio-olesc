"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { CasasTocaveis } from "@/components/board/CasasTocaveis";
import { Negrito } from "@/components/texto/Negrito";
import { ladoDaVez } from "@/lib/diagrama/tabuleiro";
import type { Ficha, ItemDeAplicacao, ItemDeReconhecimento, Treino as TreinoDaDica } from "@/lib/meiojogo/dicas";
import {
  COMECO,
  casasAceitas,
  comApoio,
  comClique,
  contratoDoItem,
  type EstadoDoItem,
} from "@/lib/meiojogo/tentativa";
import { gravarTentativaDeTreino } from "../acoes";

/**
 * O treino: dois exercícios guiados, um sozinho e a aplicação — os degraus 2, 3
 * e 4 da §2.1 do plano.
 *
 * ## Um exercício por vez, e o tabuleiro grudado
 *
 * Os três não aparecem juntos. Com três tabuleiros na página o aluno vê a
 * posição seguinte enquanto responde a atual, e no celular a página vira um
 * rolo de dois metros em que a posição sai da tela justamente quando ele lê o
 * apoio. O tabuleiro do exercício em curso é grudado pelo mesmo motivo e com a
 * mesma receita da explicação (`Passos.tsx`): **ausência de ida e volta** é o
 * critério de aceite da §8, e ler "olhe os peões pretos coluna por coluna" com
 * o tabuleiro fora da tela é a definição do defeito.
 *
 * ## Onde mora a aplicação
 *
 * Embaixo do terceiro exercício, na mesma tela e com o mesmo tabuleiro parado
 * no lugar — decisão do Doug em 2026-09-07. O degrau 4 reusa a posição do 3 de
 * propósito (trocar posição e pergunta ao mesmo tempo são duas mudanças), e uma
 * tela seguinte redesenharia o tabuleiro para mostrar exatamente a mesma
 * posição.
 *
 * ## O que a tela **não** faz
 *
 * Não julga por conta própria: `casasAceitas` é `respostaDaTarefa`, o juiz do
 * gate. Não esconde o erro nem trava a resposta — o tabuleiro continua clicável
 * depois do acerto, e clique depois de resolvido não vira tentativa nova
 * (`lib/meiojogo/tentativa.ts`). E não chama pedir ajuda de falhar: a escada
 * fica a um toque, o registro guarda o nível, e a tela escreve isso.
 */

/** O que o chessground pinta em cada casa, e o que cada cor quer dizer. */
const PINCEL = { apoio: "blue", errada: "red", certa: "green" } as const;

export function Treino({ dica, treino }: { dica: string; treino: TreinoDaDica }) {
  const [passo, setPasso] = useState(0);
  const [estados, setEstados] = useState<EstadoDoItem[]>(() => treino.reconhecimento.map(() => COMECO));

  const item = treino.reconhecimento[passo];
  const estado = estados[passo];
  const ultimo = passo === treino.reconhecimento.length - 1;

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
    // Sem `await`: a tela já deu o veredito no instante do toque, e prender a
    // criança na rede da escola para gravar seria trocar a resposta imediata
    // por uma barra de espera. O erro fica no `console.error` do servidor.
    void gravarTentativaDeTreino({ dica, item: idDoItem, resposta, apoio, tempoMs }).catch(
      () => {},
    );
  };

  const clicar = (casa: string) => {
    const novo = comClique(estado, item, casa);
    // Estado idêntico é toque repetido na mesma casa, ou toque depois do
    // acerto: `tentativa.ts` já decidiu que não conta, e o que não conta na
    // tela não pode virar linha no banco.
    if (novo === estado) return;
    mudar(novo);
    registrar(item.id, casa, estado.apoio);
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h2 className="rotulo text-tinta-fraca">Treino</h2>
        {/* A medida no parágrafo, e não na seção: no computador a coluna tem
            852 px, e o objetivo saía com 115 caracteres por linha — longa
            demais para um leitor de 12 anos, e o dobro dos ~62 do texto do
            exercício, que vive em duas colunas. `60ch` e não `max-w-prose`
            porque o `ch` do `prose` conta a fonte do elemento onde a classe
            está, e a medida aqui é a deste parágrafo. A caixa recolhida abaixo
            continua da largura dos cartões vizinhos: encolher a **caixa**
            deixaria a borda direita da página em degrau. */}
        <p className="max-w-[60ch] text-sm text-tinta-media">
          <Negrito>{treino.ficha.objetivo}</Negrito>
        </p>
        <Vocabulario ficha={treino.ficha} />
      </header>

      {/* A trilha dos três, sempre visível: com um exercício por vez, sem ela o
          aluno não sabe se está no começo ou no fim. `aria-current` porque o
          estado tem de existir também para quem ouve a página. */}
      <ol className="flex items-center gap-2" aria-label="Exercícios do treino">
        {treino.reconhecimento.map((exercicio, i) => {
          const feito = estados[i].acertou;
          return (
            <li
              key={exercicio.id}
              aria-current={i === passo ? "step" : undefined}
              // `whitespace-nowrap`: sem ele "Guiado 1" quebra em duas linhas
              // no celular e o ✓ fica pendurado no meio da altura da pílula,
              // com as três abas fora da mesma linha de base.
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
              <span>
                {i + 1 === treino.reconhecimento.length ? "Sozinho" : `Guiado ${i + 1}`}
              </span>
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
        total={treino.reconhecimento.length}
        estado={estado}
        erroMaisProvavel={treino.ficha.erroMaisProvavel.feedback}
        onClique={clicar}
        onApoio={() => mudar(comApoio(estado))}
        // A aplicação entra por dentro do exercício, embaixo do feedback: é o
        // que mantém o tabuleiro do degrau 3 parado no lugar.
        aplicacao={
          ultimo && estado.acertou ? (
            <Aplicacao
              aplicacao={treino.aplicacao}
              // Apoio 0: o degrau 4 não tem escada, e herdar o nível do
              // exercício de cima contaria como ajuda uma ajuda que esta
              // pergunta não ofereceu.
              onResponder={(letra) => registrar(treino.aplicacao.id, letra, 0)}
            />
          ) : null
        }
        onProximo={ultimo ? null : () => setPasso(passo + 1)}
      />

      {/* O que o treino prova e o que não prova, no lugar em que o número
          nasce. Ele existe no esquema porque a tentação de esquecê-lo é
          proporcional ao quanto o número parece bom (§6). */}
      <details className="rounded-xl border border-borda-fraca bg-carta px-4 py-3">
        <summary className="foco rotulo cursor-pointer text-tinta-fraca">
          O que este treino mede, e o que ele não mede
        </summary>
        <p className="pt-3 text-xs leading-relaxed text-tinta-fraca">
          {treino.ficha.limitesDaEvidencia}
        </p>
      </details>
    </section>
  );
}

/**
 * O vocabulário e os pré-requisitos, fechados — e não escondidos.
 *
 * Abertos, os dois punham 15 linhas de texto entre o título "Treino" e o
 * primeiro tabuleiro num celular de 360 px (medido na captura). Quem chega aqui
 * acabou de ler a explicação inteira da dica, que é onde o conceito é ensinado;
 * isto é a folha de consulta de quem travou no meio do exercício, e é assim que
 * ela tem de estar disponível — a um toque, e fora do caminho.
 */
function Vocabulario({ ficha }: { ficha: Ficha }) {
  return (
    <details className="rounded-lg bg-carta px-3 py-2.5">
      <summary className="foco cursor-pointer text-sm text-tinta-media">
        As palavras desta dica, e o que você já precisa saber
      </summary>
      <dl className="flex flex-col gap-1.5 pt-2.5">
        {ficha.vocabulario.map((verbete) => (
          <div key={verbete.termo} className="text-sm">
            <dt className="inline font-semibold text-tinta">{verbete.termo}: </dt>
            <dd className="inline text-tinta-media">{verbete.significa}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-1 pt-2.5 text-xs text-tinta-fraca">
        {ficha.prerequisitos.map((pre) => (
          <li key={pre} className="flex gap-2">
            <span aria-hidden>—</span>
            <span>{pre}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Exercicio({
  item,
  ordem,
  total,
  estado,
  erroMaisProvavel,
  onClique,
  onApoio,
  aplicacao,
  onProximo,
}: {
  item: ItemDeReconhecimento;
  ordem: number;
  total: number;
  estado: EstadoDoItem;
  erroMaisProvavel: string;
  onClique: (casa: string) => void;
  onApoio: () => void;
  aplicacao: React.ReactNode;
  onProximo: (() => void) | null;
}) {
  const contrato = contratoDoItem(item);
  const aceitas = casasAceitas(item);
  const erradas = estado.tocadas.filter((casa) => !aceitas.includes(casa));
  const orientacao = ladoDaVez(item.fen);

  const shapes: DrawShape[] = [
    ...(estado.apoio >= 2
      ? item.apoio.realce.map((casa) => ({ orig: casa as Key, brush: PINCEL.apoio }))
      : []),
    // As casas erradas somem no acerto. Elas existem para o aluno ver onde
    // tocou enquanto ainda procura; depois do acerto, o que a tela tem de
    // mostrar é a resposta, e três cores juntas no mesmo tabuleiro fazem o
    // olho procurar significado onde não há.
    ...(estado.acertou ? [] : erradas.map((casa) => ({ orig: casa as Key, brush: PINCEL.errada }))),
    ...(estado.acertou ? aceitas.map((casa) => ({ orig: casa as Key, brush: PINCEL.certa })) : []),
  ];

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-borda-fraca bg-carta px-4 py-4 lg:grid lg:grid-cols-[minmax(0,384px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* A mesma receita de `Passos`: grudado com fundo opaco e margem negativa
          para cobrir a calha do cartão, e duas colunas só a partir de `lg`,
          porque partir a coluna antes disso devolve um tabuleiro menor que o do
          celular. */}
      <figure className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-borda-fraca bg-carta px-4 pb-3 pt-2 lg:mx-0 lg:top-4 lg:border-b-0 lg:px-0">
        <div className="mx-auto w-full max-w-sm">
          <ChessBoard
            fen={item.fen}
            orientation={orientacao === "brancas" ? "white" : "black"}
            shapes={shapes}
            // Sem `turnColor` e sem `dests` de propósito, e **sem** `viewOnly`:
            // é a combinação que deixa o toque chegar (`isMovable` falso, peça
            // nenhuma arrasta, casa nenhuma fica selecionada) sem que o
            // chessground pare de escutar o ponteiro. Ver a prop `onSelect`.
            onSelect={(casa) => onClique(casa)}
            overlay={
              <CasasTocaveis
                fen={item.fen}
                orientacao={orientacao}
                onEscolher={onClique}
                descricao={`Tabuleiro do exercício ${ordem}. ${contrato.enunciado}`}
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
            da tela, e sobravam 270 px de janela de leitura para o enunciado, o
            apoio e o feedback. Grudado fica o tabuleiro, que é o que precisa
            ficar à vista; a legenda se lê uma vez e sai. */}
        <p className="text-sm text-tinta-media">{item.legenda}</p>
        {/* O desequilíbrio de material vem escrito quando existe (§3.3): sem
            isso o aluno passa o exercício procurando por que um dos lados está
            com uma torre a mais. */}
        {item.material ? <p className="text-sm text-tinta-media">{item.material}</p> : null}
        <p className="text-xs text-tinta-fraca">{item.provenance.citacaoCurta}</p>
        <p className="text-base font-medium text-tinta">{contrato.enunciado}</p>

        <Escada item={item} apoio={estado.apoio} onPedir={onApoio} />

        {/* `aria-live`: quem responde pelo teclado não vê a casa acender, e sem
            isto o resultado só existiria na cor de um círculo. */}
        <div aria-live="polite" className="flex flex-col gap-3">
          {estado.acertou ? (
            <div className="flex flex-col gap-1 rounded-lg bg-metodo-superficie/12 px-3 py-2.5">
              <p className="text-sm font-semibold text-metodo-tinta-alta">
                Isso: {aceitas.join(", ")}.
              </p>
              <p className="text-sm text-tinta-media">
                <Negrito>{contrato.feedback}</Negrito>
              </p>
            </div>
          ) : erradas.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-lg bg-aviso-superficie/14 px-3 py-2.5">
              <p className="text-sm font-semibold text-aviso-tinta">
                {erradas[erradas.length - 1]} não é. Olhe de novo — errar aqui não custa nada.
              </p>
              {/* A linha escrita para o erro mais provável do conceito entra na
                  primeira tentativa perdida, e não em todas: repetida a cada
                  clique ela vira ruído e deixa de ser lida. */}
              {erradas.length === 1 ? (
                <p className="text-sm text-tinta-media">
                  <Negrito>{erroMaisProvavel}</Negrito>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {aplicacao}

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
 */
function Escada({
  item,
  apoio,
  onPedir,
}: {
  item: ItemDeReconhecimento;
  apoio: number;
  onPedir: () => void;
}) {
  const rotulo = ["Pedir uma ajuda", "Pedir mais uma", "Ver a resposta explicada"][apoio];

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
            ? "A resposta está entre elas."
            : "Nenhuma delas é a resposta: elas mostram o que está em volta, e a resposta é o que falta ali."}
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

/**
 * O degrau 4, na posição do degrau 3.
 *
 * Duas opções, e não três, porque aqui se comparam **razões** — e a terceira
 * razão plausível costuma ser a segunda com outra roupa. O gabarito é curado e
 * assinado, como no quiz de plano; a diferença é que esta resposta **entra no
 * registro**, e a tela diz as duas coisas.
 */
function Aplicacao({
  aplicacao,
  onResponder,
}: {
  aplicacao: ItemDeAplicacao;
  onResponder: (letra: string) => void;
}) {
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const respondeu = escolhida !== null;

  // Sem painel próprio nem filete, e as duas coisas são medidas. Com painel, a
  // aplicação era o quarto nível de caixa (cartão do exercício → painel →
  // cartão da opção → texto) e a alternativa saía com 197 px de texto no
  // celular: 45% da tela, quatro linhas para dezessete palavras. Com filete no
  // topo, ele encostava na borda de baixo do tabuleiro grudado — duas réguas a
  // 11 px uma da outra, que leem como defeito. O que separa é o rótulo e o
  // respiro, e é o bastante: as duas alternativas já são cartões.
  return (
    <section className="mt-1 flex flex-col gap-3">
      <h3 className="rotulo text-tinta-fraca">Agora a razão</h3>
      <p className="text-sm font-medium text-tinta">{aplicacao.pergunta}</p>

      <ul className="flex flex-col gap-2">
        {aplicacao.opcoes.map((opcao, i) => {
          const estilo = !respondeu
            ? "border-borda bg-carta text-tinta hover:bg-carta-toque"
            : opcao.certa
              ? "border-metodo-cheio bg-metodo-superficie/12 text-metodo-tinta-alta"
              : i === escolhida
                ? "border-erro bg-erro-superficie/12 text-erro-tinta"
                : "border-borda-fraca bg-carta text-tinta-fraca";

          return (
            <li key={opcao.texto}>
              <button
                type="button"
                onClick={() => {
                  setEscolhida(i);
                  // A letra que o aluno viu, e não o índice: é ela que o
                  // professor lê no relatório quando procura padrão numa
                  // alternativa errada escolhida por meia turma.
                  onResponder(String.fromCharCode(97 + i));
                }}
                aria-pressed={escolhida === i}
                disabled={respondeu}
                className={`foco flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${estilo}`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
                >
                  {String.fromCharCode(97 + i)}
                </span>
                <span className="flex-1">{opcao.texto}</span>
                {respondeu ? (
                  <span aria-hidden className="mt-0.5 shrink-0 text-sm font-bold">
                    {opcao.certa ? "✓" : i === escolhida ? "✗" : ""}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Ao contrário do exercício de casa, aqui a resposta é uma só e não se
          repete: a segunda tentativa seria escolher a que sobrou. Por isso os
          botões travam depois da resposta, e o `porque` das **duas** aparece —
          a refutação da errada é metade do que este degrau ensina. */}
      <div aria-live="polite" className="flex flex-col gap-2">
        {respondeu ? (
          <>
            <p
              className={`text-sm font-semibold ${
                aplicacao.opcoes[escolhida].certa ? "text-metodo-tinta-alta" : "text-aviso-tinta"
              }`}
            >
              {aplicacao.opcoes[escolhida].certa ? "É essa." : "Não é essa — leia as duas."}
            </p>
            {aplicacao.opcoes.map((opcao) => (
              <p key={opcao.texto} className="text-sm text-tinta-media">
                <span className="font-semibold">{opcao.certa ? "A certa: " : "A outra: "}</span>
                <Negrito>{opcao.porque}</Negrito>
              </p>
            ))}
            <p className="text-xs text-tinta-fraca">
              Quem julga esta é o autor da dica, e não o computador — em meio-jogo não há lance
              para reconferir. Esta resposta entra no seu registro.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
