"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { lerPlano } from "@/lib/repertorio/esquema";
import type { Linha } from "@/lib/repertorio/linhas";
import {
  acuracia,
  inicio,
  reduzir,
  type Efeito,
  type Evento,
  type Modo,
  type Selo,
} from "@/lib/repertorio/passada";
import { playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { ABERTURA_MS } from "@/lib/tatica/tempos";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { Comentario, useComentarioPaginado } from "@/components/lesson/Comentario";
import { ProfessorSeApresenta } from "@/components/lesson/ProfessorSeApresenta";
import { Cartao } from "./Cartao";
import { FaixaDeSans, FitaDoBoletim } from "./FitaDeLances";
import { TrilhaDeEtapas } from "./TrilhaDeEtapas";
import { OQueAindaFalta } from "./OQueFalta";

/**
 * A casca da passada: relógios, tabuleiro e teclado.
 *
 * **Tudo o que decide alguma coisa está em `lib/repertorio/passada.ts`**, que é
 * puro e testado. Este arquivo não sabe o que é uma alternativa nem quando a
 * dica custa: ele despacha eventos, aplica os efeitos que voltam, e desenha o
 * estado. É a divisão que permitiu a máquina de estado do treinador ter teste
 * pela primeira vez.
 *
 * O componente inteiro é remontado por `key` a cada rodada — é assim que o
 * estado de uma passada volta ao zero, e é por isso que não há nenhum
 * `useEffect` aqui tentando ressincronizar coisa alguma quando a linha muda.
 */

/** Quanto o disco do veredito fica na casa de destino. */
const SELO_MS = 800;

/**
 * O pincel de cada selo. Os três reaproveitam a paleta pedagógica de
 * `app/globals.css` — o aro verde e o aro vermelho são literalmente o mesmo
 * desenho de `defendida` e `pendurada` na tática, e o âmbar entrou com este
 * bloco porque aqui os vereditos são três, e não dois.
 */
const PINCEL: Record<Selo, string> = {
  acerto: "green",
  alternativa: "yellow",
  falha: "red",
};

export type PassadaProps = {
  linha: Linha;
  modo: Modo;
  /** Manda os lances ao servidor. Chamada **uma vez** por passada, ou nenhuma. */
  aoDecidir: (lances: string[], porQue: "erro" | "dica" | "fim") => void;
  /**
   * O placar da passada sobe junto: é o que o painel de fim precisa dizer.
   *
   * `revelado` vem no mesmo pacote porque o fim do quiz tem **duas** formas
   * desde 8/9/2026 — a linha inteira, ou o erro que a parou —, e o painel
   * precisa saber qual delas mostrar sem reler o estado da passada.
   */
  aoTerminar: (fecho: {
    acertos: number;
    total: number;
    acertou: boolean;
    revelado: { passo: number; uci: string; san: string } | null;
  }) => void;
  /**
   * A emenda entre as etapas, sem trocar de rota: assistido → treino → quiz.
   * Quem sabe qual vem depois é o `Treino`; aqui só se sabe que acabou esta.
   */
  aoAvancarEtapa: () => void;
  /** Se a trilha das três etapas aparece — só na primeira passada da linha. */
  mostrarTrilha?: boolean;
  /**
   * O cabeçalho da linha (nome, "linha N de M", bolinhas, som).
   *
   * Vem de fora porque quem sabe a posição da linha na abertura é o `Treino`,
   * mas o **lugar** dele é o topo do painel — do lado do tabuleiro, e não
   * acima dele, como no cabeçalho de 48 px do chess.com.
   */
  cabecalho?: React.ReactNode;
  /**
   * O painel de resultado do quiz, quando a passada acabou.
   *
   * Chega montado pelo `Treino` e **substitui** o comentário, a faixa de SANs e
   * os botões: no fim do quiz quem fala é o boletim, e repetir a faixa embaixo
   * dele seria dizer duas vezes a mesma coisa — desta vez dentro de uma coluna
   * de altura fechada, onde a segunda vez não caberia.
   */
  painelDeFim?: React.ReactNode;
  /** Atalhos que o `Treino` acrescenta ao rodapé de botões do painel. */
  rodapeExtra?: React.ReactNode;
};

export function Passada({
  linha,
  modo,
  aoDecidir,
  aoTerminar,
  aoAvancarEtapa,
  mostrarTrilha = false,
  cabecalho,
  painelDeFim,
  rodapeExtra,
}: PassadaProps) {
  const [estado, setEstado] = useState(() => inicio(linha, modo));
  /**
   * O estado autoritativo, fora do React.
   *
   * O redutor **não** pode rodar dentro do atualizador do `setState`: em
   * desenvolvimento o React o chama duas vezes de propósito, e os efeitos —
   * som, e sobretudo a gravação no servidor — sairiam em dobro. Com o `ref`,
   * `reduzir` roda uma vez por evento, fora de qualquer render.
   */
  const estadoRef = useRef(estado);

  const [marca, setMarca] = useState<{ casa: string; qual: Selo } | null>(null);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  /**
   * O chessground move a peça na tela por conta própria antes de perguntar.
   * Quando o lance é recusado sem mudar a FEN, é este número que o faz
   * redesenhar a posição de verdade.
   */
  const [ressincronizar, setRessincronizar] = useState(0);

  /**
   * O comentário, partido no que couber no painel.
   *
   * A paginação é de tela, não de conteúdo: o redutor continua entregando o
   * comentário inteiro e continua sem saber que existe uma tela. Quem mede o
   * espaço é o componente, e a conta refaz sozinha quando a janela muda.
   */
  const comentario = useComentarioPaginado(estado.comentario);

  const relogiosRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const agendar = useCallback((quefazer: () => void, ms: number) => {
    relogiosRef.current.push(setTimeout(quefazer, ms));
  }, []);

  // A limpeza mata todo relógio pendente. Sem ela, o lance de uma passada
  // desmontada chega no meio da próxima.
  useEffect(() => {
    const relogios = relogiosRef;
    return () => {
      for (const id of relogios.current) clearTimeout(id);
      relogios.current = [];
    };
  }, []);

  // O efeito `agendar` precisa despachar, e despachar precisa rodar efeitos:
  // as duas funções se chamam. O `ref` é o que quebra o ciclo sem congelar
  // nenhuma das duas numa versão velha.
  const despacharRef = useRef<(evento: Evento) => void>(() => {});

  const rodar = useCallback(
    (efeito: Efeito) => {
      switch (efeito.tipo) {
        case "som-lance":
          playForMove({ capture: efeito.captura, check: efeito.xeque });
          break;
        case "som-recusa":
          playRefusal();
          break;
        case "som-premio":
          playSuccess();
          break;
        case "selo":
          setMarca({ casa: efeito.casa, qual: efeito.qual });
          agendar(() => setMarca(null), SELO_MS);
          break;
        case "decidir":
          aoDecidir([...efeito.lances], efeito.porQue);
          break;
        case "agendar":
          agendar(() => despacharRef.current(efeito.evento), efeito.ms);
          break;
        case "terminou": {
          const agora = estadoRef.current;
          aoTerminar({
            ...acuracia(agora),
            revelado: agora.revelado ? { ...agora.revelado } : null,
          });
          break;
        }
      }
    },
    [agendar, aoDecidir, aoTerminar],
  );

  const despachar = useCallback(
    (evento: Evento) => {
      const { estado: novo, efeitos } = reduzir(linha, estadoRef.current, evento);
      estadoRef.current = novo;
      setEstado(novo);
      for (const efeito of efeitos) rodar(efeito);
    },
    [linha, rodar],
  );

  useEffect(() => {
    despacharRef.current = despachar;
  }, [despachar]);

  /**
   * O **primeiro** lance do adversário, nas linhas de pretas.
   *
   * É o único que a casca dispara: não existe evento anterior de onde emiti-lo.
   * Todos os outros saem do próprio redutor, no instante em que a vez passa a
   * ser dele. A espera é maior aqui de propósito — o aluno precisa ver a
   * posição parada para entender que o tabuleiro é dele, e não uma figura.
   *
   * Dependências vazias: este efeito é de montagem, e a limpeza cobre o
   * monta-desmonta-remonta que o React faz em desenvolvimento.
   */
  useEffect(() => {
    if (linha.meus.includes(0)) return;
    const relogio = setTimeout(() => despacharRef.current({ tipo: "adversarioJogou" }), ABERTURA_MS);
    return () => clearTimeout(relogio);
  }, [linha.meus]);

  /**
   * O gesto de "já li": **um botão só, dois trabalhos**.
   *
   * Quando o comentário não coube de uma vez, "Continuar" vira a página do
   * texto; quando acabou o texto, ele solta a passada. É a mesma tecla e o
   * mesmo botão nos dois casos, de propósito — dois controles para o mesmo
   * movimento dariam duas maneiras de fazer a mesma coisa numa tela cuja regra
   * é ter um caminho só.
   */
  const continuarLeitura = useCallback(() => {
    // A máquina de escrever tem prioridade sobre tudo: se o texto ainda está
    // saindo, o primeiro gesto o completa e **não** avança. Sem isto o aluno
    // que aperta "Continuar" cedo perde o comentário sem ter lido, e é o botão
    // que ele mais aperta.
    if (comentario.digitando) {
      comentario.completar();
      return;
    }
    if (!comentario.naUltima) {
      comentario.virar();
      return;
    }
    despachar({ tipo: "continuar" });
  }, [comentario, despachar]);

  /**
   * O teclado da aula: **espaço** em toda etapa, **←/→** só na primeira.
   *
   * ## A barra de espaço deixou de ser proibida
   *
   * Ela era recusada por dois motivos escritos: **rola a página** e **dispara o
   * botão que estiver com o foco** — as duas coisas acontecendo *além* do que
   * se pedisse. Os dois morreram, cada um do seu jeito:
   *
   * - A rolagem morreu com o layout: não há mais nada abaixo do palco, e o
   *   `preventDefault` abaixo cobre o resíduo.
   * - O disparo duplo tem conserto, e é a guarda do alvo: se o foco está num
   *   `button`, `a`, `input`, `select` ou `textarea`, **não interceptamos** — o
   *   nativo faz o trabalho, e o gesto acontece uma vez só. É a mesma exceção
   *   que a máquina de escrever usa para não brigar com o "Continuar".
   *
   * O que se ganha é o gesto do chess.com: uma tecla larga, que não exige mirar,
   * para o movimento que o aluno mais repete.
   *
   * ## As setas, e a trava que elas respeitam
   *
   * Navegar é da **assistida**, e nunca das outras duas — o redutor recusa
   * `olhou` fora dela, e a regra não é de tela: em 6/9/2026 o modo "só olhar"
   * foi revogado porque "assistir não é treinar; o aluno via a linha andar
   * sozinha e chegava ao quiz sem ter movido uma peça". Se → avançasse livre,
   * ele voltaria por outra porta. Quem cuida do limite (e de dizê-lo no cartão)
   * é o redutor; aqui só se despacha.
   *
   * `→` acumula três trabalhos, na ordem em que eles se excluem: soltar a
   * leitura, emendar a etapa seguinte no fim, e — fora desses dois — andar para
   * a frente na linha.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      // Foco num controle: o navegador já sabe o que fazer, e interceptar aqui
      // faria o gesto valer duas vezes.
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest("button, a, input, select, textarea")) return;

      const espaco = evento.key === " " || evento.key === "Spacebar";
      if (espaco) {
        evento.preventDefault();
        if (estado.fase === "lendo") continuarLeitura();
        // No fim do quiz não há "próxima etapa": o painel de fim está na tela
        // com as escolhas dele, e uma tecla que decidisse por ele ali estaria
        // escolhendo entre "próxima linha" e "jogar de novo" no lugar do aluno.
        else if (estado.fase === "resolvido" && modo !== "quiz") aoAvancarEtapa();
        return;
      }

      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        if (estado.fase === "lendo") continuarLeitura();
        else if (estado.fase === "resolvido" && modo !== "quiz") aoAvancarEtapa();
        else despachar({ tipo: "olhou", para: "frente" });
        return;
      }

      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        despachar({ tipo: "olhou", para: "tras" });
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoAvancarEtapa, continuarLeitura, despachar, estado.fase, modo]);

  /* ---------------------------------------------------------------- *
   * O tabuleiro
   * ---------------------------------------------------------------- */

  const jogo = useMemo(() => new Chess(estado.fen), [estado.fen]);
  const meuLado: Color = linha.cor === "brancas" ? "white" : "black";
  const minhaVez = linha.meus.includes(estado.passo);
  const podeMover = estado.fase === "jogando" && minhaVez;

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      if (!podeMover) {
        setRessincronizar((n) => n + 1);
        return;
      }
      const peca = jogo.get(orig as Square);
      if (peca?.type === "p" && (dest[1] === "8" || dest[1] === "1")) {
        setPromocao({ orig, dest });
        return;
      }
      despachar({ tipo: "jogou", uci: `${orig}${dest}` });
    },
    [despachar, jogo, podeMover],
  );

  /**
   * Três camadas no mesmo canal (`setAutoShapes`): a seta da fase assistida, a
   * casa acesa da dica, e o selo do veredito.
   *
   * A seta e a dica nunca aparecem juntas — a assistida não tem dica, porque a
   * seta já está lá. O selo convive com as duas: ele dura menos de um segundo e
   * é o que permite ao cartão ser quase monocromático.
   */
  const shapes: DrawShape[] = useMemo(() => {
    const lista: DrawShape[] = [];
    const esperado = linha.lances[estado.passo];

    // Na assistida a seta fica **também** durante a recusa: o cartão daquele
    // instante diz "siga a seta", e uma seta que some enquanto o texto manda
    // segui-la é a tela contradizendo a si mesma. Medido no navegador em 6/9.
    const recusando = modo === "assistido" && estado.fase === "mostrando";

    // Olhando para trás não há seta: ela aponta para o lance da FRENTE, e
    // desenhá-la sobre uma posição de três lances atrás mandaria o aluno jogar
    // uma peça que ainda nem está naquela casa.
    if (esperado && !estado.olhando && (estado.fase === "jogando" || recusando) && minhaVez) {
      const orig = esperado.slice(0, 2) as Key;
      if (modo === "assistido") {
        lista.push({ orig, dest: esperado.slice(2, 4) as Key, brush: "blue" });
      } else if (estado.dicaNoPasso === estado.passo) {
        // Um nível só: a casa de origem, que é a pergunta "qual peça?". A seta
        // inteira daria o lance, e a dica deixaria de custar alguma coisa.
        lista.push({ orig, brush: "blue" });
      }
    }

    if (marca) lista.push({ orig: marca.casa as Key, brush: PINCEL[marca.qual] });

    // A quarta camada, e a única que aparece DEPOIS do fim: as setas do
    // `[%plano]`. Elas convivem com o resto sem disputa porque, no `resolvido`,
    // não há seta de assistida nem dica de pé — o selo do último lance ainda
    // pode estar na tela por menos de um segundo, e é bom que esteja: o aluno vê
    // o veredito do lance e, ao lado, para onde a peça que ficou ainda vai.
    //
    // A origem do rei é procurada no tabuleiro, e não fixada em e1: numa linha
    // em que ele já andou (as duas com a dama trocada cedo), e1 desenharia a
    // seta a partir de uma casa vazia.
    if (estado.fase === "resolvido") {
      for (const item of lerPlano(linha.plano)) {
        const orig =
          item.chave === "rei"
            ? jogo.findPiece({ type: "k", color: meuLado === "white" ? "w" : "b" })[0]
            : (item.chave as Square);
        if (!orig) continue;
        lista.push(
          item.casa
            ? { orig: orig as Key, dest: item.casa as Key, brush: "plano" }
            : { orig: orig as Key, brush: "plano" },
        );
      }
    }
    return lista;
  }, [
    estado.dicaNoPasso,
    estado.fase,
    estado.olhando,
    estado.passo,
    jogo,
    linha.lances,
    linha.plano,
    marca,
    meuLado,
    minhaVez,
    modo,
  ]);

  const fim = estado.fase === "resolvido";
  const placar = acuracia(estado);
  /** Quantos meios-lances estão NO TABULEIRO — a frente, ou o que ele foi olhar. */
  const naTela = estado.olhando?.meioLance ?? estado.passo;

  return (
    <AulaShell
      tabuleiro={
        <div className="relative">
          <ChessBoard
            fen={estado.fen}
            orientation={meuLado}
            turnColor={toBoardColor(jogo.turn())}
            dests={podeMover ? legalDests(jogo) : new Map()}
            lastMove={estado.ultimoLance ? [estado.ultimoLance[0] as Key, estado.ultimoLance[1] as Key] : null}
            check={jogo.inCheck()}
            viewOnly={!podeMover}
            revision={estado.revisao + ressincronizar}
            shapes={shapes}
            onMove={aoMover}
          />
          {promocao ? (
            <PromotionPicker
              color={meuLado}
              onChoose={(peca: PromotionChoice) => {
                const { orig, dest } = promocao;
                setPromocao(null);
                despachar({ tipo: "jogou", uci: `${orig}${dest}${peca}` });
              }}
              onCancel={() => {
                setPromocao(null);
                setRessincronizar((n) => n + 1);
              }}
            />
          ) : null}
        </div>
      }
      painel={
        <>
          {cabecalho}

          {/*
           * No fim do quiz o cartão sai e a fita entra no lugar dele: o painel
           * de resultado do `Treino` já diz o que aconteceu, e um cartão
           * repetindo "linha completa" logo acima seria a mesma frase duas
           * vezes.
           */}
          {fim && modo === "quiz" ? (
            <FitaDoBoletim boletim={estado.boletim} acertos={placar.acertos} />
          ) : (
            <>
              <Cartao conteudo={estado.cartao} />
              {/*
               * A trilha entra logo abaixo do cartão, e só na primeira passada.
               * Ver `TrilhaDeEtapas.tsx` para os dois "3" que ela existe para
               * não deixar o aluno confundir.
               */}
              {mostrarTrilha ? <TrilhaDeEtapas modo={modo} /> : null}
            </>
          )}

          {painelDeFim ?? (
            <>
              <Comentario paginacao={comentario} retrato={<ProfessorSeApresenta />} />

              {/*
               * O painel do plano é montado aqui só na **assistida**. No quiz
               * quem o monta é o painel de fim do `Treino` — pôr nos dois
               * lugares mostraria a mesma lista duas vezes na mesma tela.
               */}
              {fim && modo === "assistido" ? <OQueAindaFalta linha={linha} /> : null}

              {/*
               * A faixa de SANs só a partir de `lg`, e a conta é de altura.
               * Medido num celular de 360×740: o painel tem 308 px, e o que é
               * fixo nele — cabeçalho 48, cartão 64, botões 42, vãos 36 —
               * come 190. A faixa levava mais 36, e sobravam **50 px** para o
               * comentário: duas linhas. Fora dela o comentário fica com 118,
               * que é a mediana do repertório numa página só.
               *
               * É o corte certo porque a faixa é a única coisa ali que o
               * tabuleiro já mostra: a posição na tela É a lista de lances.
               */}
              {/*
               * A faixa segue o que está NO TABULEIRO, e não a frente da
               * passada: recuado, marcar o lance da frente faria a faixa
               * apontar para um lance que não está na tela.
               */}
              <div className="hidden lg:block">
                <FaixaDeSans
                  linha={linha}
                  ate={naTela}
                  atual={naTela - 1}
                />
              </div>

              <AulaRodape>
                {estado.fase === "lendo" ? (
                  <Principal onClick={continuarLeitura}>Continuar →</Principal>
                ) : null}

                {/*
                 * O nome do botão diz o que vem, e não "próximo": o aluno tem
                 * de saber que a etapa seguinte tira a seta antes de ela sumir.
                 */}
                {fim && modo === "assistido" ? (
                  <Principal onClick={aoAvancarEtapa}>Treinar sem a seta →</Principal>
                ) : null}
                {fim && modo === "treino" ? (
                  <Principal onClick={aoAvancarEtapa}>Valendo →</Principal>
                ) : null}

                {!fim && modo === "assistido" ? (
                  <Secundario onClick={aoAvancarEtapa}>Pular e jogar</Secundario>
                ) : null}

                {/*
                 * A dica existe nas duas etapas sem seta, e custa só numa: no
                 * treino ela é de graça — é a ajuda que faz a etapa 2 valer a
                 * pena —, e no quiz decide a passada. Quem cobra é o redutor.
                 */}
                {modo !== "assistido" && podeMover ? (
                  <Secundario onClick={() => despachar({ tipo: "pediuDica" })}>Dica</Secundario>
                ) : null}

                {rodapeExtra}
              </AulaRodape>
            </>
          )}
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * As peças de tela que só a passada usa
 * ------------------------------------------------------------------ */

function Principal({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="foco rounded-lg border border-transparent bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
    >
      {children}
    </button>
  );
}

/**
 * O botão secundário: contornado em verde, e não em cinza.
 *
 * **Era `border-borda` sobre o papel, e sumia.** Medido em 8/9/2026: a borda
 * neutra sobre a página dá **1,36:1** — abaixo do piso de 3:1 da WCAG 1.4.11
 * para componente de interface, e abaixo do que o olho separa de uma sombra.
 * "Pular e jogar" e "Dica" ficavam sendo texto solto no meio do painel, sem
 * nada dizendo que ali havia um alvo para tocar. Escurecer a borda neutra não
 * resolvia: `borda-forte`, o degrau mais escuro que existe, mede 1,76:1.
 *
 * A saída usa a paleta que já está na tela: o botão principal é o verde
 * **cheio**, e este passa a ser o mesmo verde **contornado** — 3,54:1 de traço
 * e 11,08:1 de rótulo sobre a página. É o par preenchido/contornado de sempre,
 * e ele diz a hierarquia sem precisar de um cinza que não se enxerga.
 */
function Secundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="foco rounded-lg border border-metodo-superficie px-3 py-2.5 text-sm font-medium text-metodo-tinta transition-colors hover:bg-metodo-superficie/10"
    >
      {children}
    </button>
  );
}
