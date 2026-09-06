"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cor, Linha } from "@/lib/repertorio/linhas";
import type { Modo } from "@/lib/repertorio/passada";
import { diasAteRevisar, semQuebras, type ProgressoDaLinha } from "@/lib/repertorio/treino";
import {
  armAudioOnFirstGesture,
  isSoundOn,
  playComplete,
  setSoundOn,
  subscribeSound,
} from "@/lib/sound";
import { Bolinhas } from "../../Bolinhas";
import { registrarTreino } from "../../acoes";
import { Passada } from "./Passada";

/**
 * O treinador de uma linha do repertório: conduzir as duas fases e gravar.
 *
 * ## Uma sessão são duas fases, na mesma tela
 *
 * Na primeira vez em cada linha (`tentativas = 0`) o aluno entra na passada
 * **assistida**: o cartão diz o lance por extenso, a seta fica desenhada, e ele
 * **executa**. Emendado nela, sem trocar de rota, o **quiz**: a mesma linha, de
 * memória, sem seta e sem o nome do lance.
 *
 * Antes de 6/9/2026 a primeira vez era um modo "ver", com o tabuleiro andando
 * sozinho e o aluno de espectador. Assistir não é treinar — o aluno chegava à
 * cobrança sem ter movido uma peça. O conteúdo é o mesmo; o que mudou é que
 * agora a mão está dentro.
 *
 * ## A regra que decide o resto
 *
 * **Uma passada pela linha é uma tentativa, e o primeiro erro já a decide.** É
 * o que protege a verdade gravada contra a aba que fecha no meio. O que mudou
 * é que a linha **continua até o fim** depois do erro: a peça volta, o lance do
 * clube entra, e o aluno vê o resto — e o boletim sai completo.
 *
 * ## O que é mandado ao servidor
 *
 * Os **lances jogados**, nunca um "acertei". Quem julga é a server action,
 * reconferindo com a mesma função que o tabuleiro usa para dizer "certo" na
 * tela (`lib/repertorio/treino.ts`). Um juiz só, dois lugares. A fase assistida
 * não manda nada.
 *
 * ## Por que são dois componentes
 *
 * `Treino` conta a rodada e guarda o que o servidor respondeu; `Passada`
 * resolve **uma** passada, e é remontada por `key`. A separação não é
 * arrumação: todo o estado de uma passada — posição, fase, boletim — tem de
 * voltar ao zero quando a próxima começa, e a maneira do React de zerar estado
 * é desmontar o componente.
 *
 * A `rodada` é local, e não vem do servidor, por um caso concreto: a tela de
 * fim aparece no mesmo instante em que a gravação dispara. No 4G a resposta
 * demora, e um "Próxima linha" clicado antes dela faria o `router.refresh()`
 * ler o `tentativas` velho — a `key` do servidor não mudaria, e o aluno ficaria
 * preso na mesma tela. Aqui o botão espera a resposta, e "Jogar de novo"
 * remonta por conta própria de qualquer jeito.
 */

export type TreinoProps = {
  cor: Cor;
  abertura: string;
  linha: Linha;
  progresso: ProgressoDaLinha;
  modoInicial: Modo;
  posicao: { indice: number; total: number };
  /** O instante que a página calculou uma vez, para a conta dos dias. */
  agora: string;
};

export function Treino({
  cor,
  abertura,
  linha,
  progresso,
  modoInicial,
  posicao,
  agora,
}: TreinoProps) {
  const router = useRouter();

  // Destrava o `AudioContext` no primeiro toque ou tecla desta página — sem
  // isso o navegador emudece tudo. Devolve o removedor dos ouvintes.
  useEffect(() => armAudioOnFirstGesture(), []);

  const [modo, setModo] = useState<Modo>(modoInicial);
  const [rodada, setRodada] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [resultado, setResultado] = useState<{
    acertou: boolean;
    progresso: ProgressoDaLinha;
  } | null>(null);
  const [falhaAoGravar, setFalhaAoGravar] = useState<string | null>(null);
  /**
   * Por que a passada foi decidida, e como ela terminou.
   *
   * Nada disto muda o que se grava — o servidor julga os lances e mais nada.
   * Muda o que a tela **diz** no fim, e os dois casos que obrigaram a guardá-lo
   * apareceram na verificação no navegador, um depois do outro: com a dica
   * pedida e os oito lances certos, o painel dizia "houve um erro no caminho";
   * e com dica **e** erro na mesma passada, ele passou a dizer "todos os
   * lances saíram certos" ao lado de uma fita com três ✗.
   *
   * Quem decide é o **placar**, que é o mesmo número que a fita desenha dois
   * centímetros acima. O motivo só entra para separar "sem erro nenhum, mas com
   * ajuda" de "sem erro nenhum" — que é a única distinção que o placar sozinho
   * não faz.
   */
  const [porQue, setPorQue] = useState<"erro" | "dica" | "fim">("fim");
  const [placar, setPlacar] = useState<{ acertou: boolean } | null>(null);

  /**
   * A passada terminou (ou a dica a decidiu): manda os lances e guarda o que
   * voltou.
   *
   * O `progresso` que a tela mostra depois é o do **servidor**, não uma conta
   * feita aqui. Nas duas ele seria igual — é a mesma `depoisDoTreino` —, e é
   * justamente por isso que vale usar o do servidor: as bolinhas e a data da
   * próxima prática passam a mostrar, literalmente, o que ficou gravado.
   */
  const decidir = useCallback(
    async (lances: string[], motivo: "erro" | "dica" | "fim") => {
      setPorQue(motivo);
      setGravando(true);
      const resposta = await registrarTreino({ cor, abertura, linhaId: linha.id, lances });
      setGravando(false);
      if ("erro" in resposta) {
        // Falar em vez de fingir: o aluno tem de saber que aquela passada não
        // entrou na conta, senão fecha a tarefa achando que aprendeu a linha.
        setFalhaAoGravar(resposta.erro);
        return;
      }
      setResultado(resposta);
    },
    [abertura, cor, linha.id],
  );

  const atual = resultado?.progresso ?? progresso;

  // A linha acabou de virar "aprendida": o prêmio toca uma vez. Não é
  // `setState` num efeito — é um efeito colateral disparado por uma transição
  // que já aconteceu, que é para isso que o `useEffect` serve.
  const virouAprendida =
    resultado !== null &&
    resultado.progresso.aprendidaEm !== null &&
    progresso.aprendidaEm === null;
  useEffect(() => {
    if (virouAprendida) playComplete();
  }, [virouAprendida]);

  /** Recomeça a linha, de memória. É a emenda do fim da assistida e o "de novo". */
  const dNovo = useCallback(() => {
    setTerminou(false);
    setResultado(null);
    setFalhaAoGravar(null);
    setModo("quiz");
    setPorQue("fim");
    setPlacar(null);
    setRodada((r) => r + 1);
  }, []);

  /**
   * A volta à passada assistida, sob demanda.
   *
   * O modo "ver" — tabuleiro só de olhar — foi revogado, mas a **assistida**
   * continua sendo a resposta certa para o aluno que esqueceu a linha inteira e
   * para quem a dica de uma casa não basta. Ela não grava nada, então não há o
   * que burlar aqui.
   */
  const comASeta = useCallback(() => {
    setTerminou(false);
    setResultado(null);
    setFalhaAoGravar(null);
    setModo("assistido");
    setPorQue("fim");
    setPlacar(null);
    setRodada((r) => r + 1);
  }, []);

  /**
   * A próxima linha vem do servidor, e não daqui: `proximaLinha` sabe a ordem —
   * inclusive a alternância entre revisar e avançar —, e a tela não precisa
   * saber. O `replace` tira o `?linha=` da URL: sem isso um link velho prenderia
   * o aluno na mesma linha para sempre.
   */
  const proxima = useCallback(() => {
    router.replace(`/aberturas/${cor}/${abertura}`);
    router.refresh();
  }, [abertura, cor, router]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-sm font-medium text-tinta">{linha.nome}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-tinta-fraca tabular-nums">
              linha {posicao.indice} de {posicao.total}
            </span>
            <span className="text-tinta-muda" aria-hidden>
              ·
            </span>
            <Bolinhas progresso={atual} />
          </div>
        </div>
        <BotaoDeSom />
      </div>

      <Passada
        key={`${modo}:${linha.id}:${rodada}`}
        linha={linha}
        modo={modo}
        aoDecidir={decidir}
        aoTerminar={(fechou) => {
          setPlacar(fechou);
          setTerminou(true);
        }}
        aoComecarQuiz={dNovo}
      />

      {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : null}

      {/*
       * O painel de fim é só do quiz. A assistida termina no cartão "Pronto. /
       * Agora de memória." e no botão que emenda a fase seguinte — pôr aqui um
       * painel de resultado seria dar nota a uma passada que não é medida.
       */}
      {terminou && modo === "quiz" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
          {virouAprendida ? (
            <p className="titulo text-metodo-tinta-alta">Linha aprendida!</p>
          ) : resultado && !resultado.acertou ? (
            <p className="text-sm font-semibold text-tinta">
              {porQue === "dica" && placar?.acertou
                ? "Você chegou ao fim, e todos os lances saíram certos — mas com ajuda. Esta passada conta como treino, e os acertos seguidos voltaram a zero."
                : "Você chegou ao fim — mas houve um erro no caminho, e os acertos seguidos voltaram a zero."}
            </p>
          ) : (
            <p className="text-sm font-semibold text-tinta">Linha inteira, sem erro.</p>
          )}

          <Comentario texto={linha.comentarios[String(linha.lances.length - 1)]} />

          <ProximaPratica progresso={resultado?.progresso ?? null} agora={agora} />

          <div className="flex flex-wrap gap-2">
            {resultado?.acertou === false ? (
              <>
                <Principal onClick={dNovo} esperando={gravando}>
                  Jogar de novo
                </Principal>
                <Secundario onClick={proxima} esperando={gravando}>
                  Próxima linha
                </Secundario>
              </>
            ) : (
              <>
                <Principal onClick={proxima} esperando={gravando}>
                  Próxima linha
                </Principal>
                <Secundario onClick={dNovo} esperando={gravando}>
                  Jogar de novo
                </Secundario>
              </>
            )}
            <Secundario onClick={comASeta} esperando={false}>
              Jogar com a seta
            </Secundario>
          </div>
        </div>
      ) : !terminou && modo === "quiz" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={comASeta}
            className="foco rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media hover:bg-carta-toque"
          >
            Jogar com a seta
          </button>
          <Link
            href="/aberturas"
            className="foco text-xs font-medium text-metodo-tinta hover:underline"
          >
            Escolher outra abertura →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * A data da próxima prática
 * ------------------------------------------------------------------ */

/**
 * Quando esta linha volta.
 *
 * **Só aparece depois que o servidor respondeu**, e é deliberado: o número é a
 * agenda gravada, não uma previsão do navegador. Enquanto a gravação está no
 * ar, a caixa fica vazia em vez de mostrar um dia que pode não ser o que ficou.
 *
 * "Na próxima vez que você abrir" para um dia, porque "em 1 dia" é uma promessa
 * que o aluno lê como "amanhã de manhã" — e ele volta hoje à noite.
 */
function ProximaPratica({
  progresso,
  agora,
}: {
  progresso: ProgressoDaLinha | null;
  agora: string;
}) {
  if (!progresso) return null;
  const dias = diasAteRevisar(progresso, agora);
  if (dias === null) return null;

  const quando =
    dias === 0 ? "hoje mesmo" : dias === 1 ? "na próxima vez que você abrir" : `em ${dias} dias`;
  return (
    <p className="text-sm text-tinta-fraca">
      Próxima prática: <span className="font-medium text-tinta-media">{quando}</span>.
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * O resto da moldura
 * ------------------------------------------------------------------ */

/** O texto do professor no fim da linha. Some quando não existe. */
function Comentario({ texto }: { texto: string | undefined }) {
  if (!texto?.trim()) return null;
  return (
    <p className="rounded-lg bg-metodo-superficie/15 px-3 py-2.5 text-sm text-metodo-tinta-alta">
      {semQuebras(texto)}
    </p>
  );
}

function Falha({ erro }: { erro: string }) {
  return (
    <p
      role="alert"
      className="min-h-11 rounded-lg bg-erro-superficie/15 px-3 py-2.5 text-sm text-erro-texto"
    >
      Não deu para gravar esta passada ({erro}). Avise o professor — o que você treinar
      depois disso pode não estar contando.
    </p>
  );
}

function Principal({
  onClick,
  esperando,
  children,
}: {
  onClick: () => void;
  esperando: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Secundario({
  onClick,
  esperando,
  children,
}: {
  onClick: () => void;
  esperando: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 */
function BotaoDeSom() {
  const ligado = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!ligado)}
      aria-pressed={ligado}
      className="foco min-h-11 shrink-0 rounded-lg px-2 text-lg leading-none transition-colors hover:bg-carta-toque"
    >
      <span aria-hidden>{ligado ? "🔊" : "🔇"}</span>
      <span className="sr-only">{ligado ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}
