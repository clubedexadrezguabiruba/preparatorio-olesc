"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cor, Linha } from "@/lib/repertorio/linhas";
import type { Modo } from "@/lib/repertorio/passada";
import {
  DEGRAU_APRENDIDA,
  diasAteRevisar,
  semQuebras,
  type ProgressoDaLinha,
} from "@/lib/repertorio/treino";
import {
  armAudioOnFirstGesture,
  isSoundOn,
  playComplete,
  setSoundOn,
  subscribeSound,
} from "@/lib/sound";
import { BotaoPrincipal, BotaoSecundario } from "@/components/lesson/BotoesDaAula";
import { Bolinhas } from "@/components/Bolinhas";
import { registrarTreino } from "../../acoes";
import { Passada } from "./Passada";
import { OQueAindaFalta } from "./OQueFalta";
import { SeletorDeLinha, type LinhaDoMenu } from "./SeletorDeLinha";

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
  /**
   * As linhas da abertura, para o menu de troca — id, nome e progresso, e nada
   * mais. Ver o `catalogo` em `page.tsx`: aqui é cliente, e a `Linha` inteira
   * seria o repertório da abertura despejado no HTML.
   */
  linhas: readonly LinhaDoMenu[];
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
  linhas,
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
  const [placar, setPlacar] = useState<{
    acertou: boolean;
    /** Preenchido quando foi o erro que parou a passada. Ver `Passada.tsx`. */
    revelado: { passo: number; uci: string; san: string } | null;
  } | null>(null);

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

  /**
   * Zera tudo o que é de uma passada e entra na etapa pedida.
   *
   * A `rodada` sobe junto porque é ela que remonta a `Passada` por `key`, e
   * remontar é a maneira do React de zerar estado: posição, fase e boletim têm
   * de voltar ao começo, e não há caminho mais barato nem mais seguro.
   */
  const entrarEm = useCallback((proximo: Modo) => {
    setTerminou(false);
    setResultado(null);
    setFalhaAoGravar(null);
    setModo(proximo);
    setPorQue("fim");
    setPlacar(null);
    setRodada((r) => r + 1);
  }, []);

  /** Recomeça a linha valendo. É o "Jogar de novo" e o "Tentar de novo". */
  const dNovo = useCallback(() => entrarEm("quiz"), [entrarEm]);

  /**
   * A emenda das três etapas: **seta → treino → valendo**.
   *
   * A do meio é a que faltava até 8/9/2026, e o buraco que ela fecha é este: o
   * aluno saía da passada com a seta lhe dando o lance e caía direto na
   * cobrança. Não havia onde praticar **sem a seta e sem estar sendo medido** —
   * e é nesse lugar que se descobre se decorou.
   *
   * As três são **uma passada**. A escada de revisão espaçada não muda: a linha
   * só fica aprendida com três passadas em três dias espaçados, e só a terceira
   * etapa grava. Da segunda passada em diante (`tentativas > 0`) o aluno entra
   * direto no valendo — repetição espaçada mede recall, não releitura.
   */
  const avancarEtapa = useCallback(() => {
    entrarEm(modo === "assistido" ? "treino" : "quiz");
  }, [entrarEm, modo]);

  /**
   * A volta à passada assistida, sob demanda.
   *
   * O modo "ver" — tabuleiro só de olhar — foi revogado, mas a **assistida**
   * continua sendo a resposta certa para o aluno que esqueceu a linha inteira e
   * para quem a dica de uma casa não basta. Ela não grava nada, então não há o
   * que burlar aqui.
   */
  const comASeta = useCallback(() => entrarEm("assistido"), [entrarEm]);

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

  /**
   * O topo do painel. Sobe para dentro da coluna da direita porque é lá que
   * fica a voz do treinador — o nome da linha responde "onde eu estou?", e a
   * pergunta nasce ao lado do tabuleiro, não acima dele.
   */
  const cabecalho = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-sm font-medium text-tinta">{linha.nome}</p>
          <div className="flex items-center gap-2">
            {/*
             * O "linha 2 de 5" deixou de ser rótulo e virou o gatilho do menu
             * de troca. É a única informação que a lista de baixo tinha e as
             * outras telas não davam — pular para uma linha específica vendo o
             * estado de cada uma —, e ela subiu para cá quando a lista saiu de
             * baixo do tabuleiro. Ver `SeletorDeLinha.tsx`.
             */}
            <SeletorDeLinha
              cor={cor}
              abertura={abertura}
              linhas={linhas}
              atual={linha.id}
              posicao={posicao}
              agora={agora}
            />
            <span className="text-tinta-muda" aria-hidden>
              ·
            </span>
            <Bolinhas progresso={atual} total={DEGRAU_APRENDIDA} />
          </div>
        </div>
        <BotaoDeSom />
      </div>
      {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : null}
    </>
  );

  /**
   * Os dois atalhos do quiz em andamento, no pé do painel.
   *
   * Ficam junto dos outros botões e não numa barra própria: no painel de
   * altura fechada, cada faixa extra é altura que sai do comentário.
   */
  const rodapeExtra =
    !terminou && modo !== "assistido" ? (
      <>
        <button
          type="button"
          onClick={comASeta}
          className="foco rounded-lg border border-metodo-superficie px-3 py-2 text-xs font-medium text-metodo-tinta hover:bg-metodo-superficie/10"
        >
          Jogar com a seta
        </button>
        <Link
          href="/aberturas"
          className="foco ml-auto text-xs font-medium text-metodo-tinta hover:underline"
        >
          Escolher outra abertura →
        </Link>
      </>
    ) : null;

  return (
    <>
      <Passada
        key={`${modo}:${linha.id}:${rodada}`}
        linha={linha}
        modo={modo}
        aoDecidir={decidir}
        aoTerminar={(fechou) => {
          setPlacar(fechou);
          setTerminou(true);
        }}
        aoAvancarEtapa={avancarEtapa}
        /*
         * A trilha só na primeira passada da linha. Da segunda em diante o
         * aluno entra direto no valendo, e uma trilha de três com duas etapas
         * apagadas para sempre prometeria um caminho que não existe mais.
         */
        mostrarTrilha={modoInicial === "assistido"}
        cabecalho={cabecalho}
        rodapeExtra={rodapeExtra}
        painelDeFim={
          /*
           * O painel de fim é só do quiz. A assistida termina no cartão
           * "Pronto. / Agora de memória." e no botão que emenda a fase
           * seguinte — pôr aqui um painel de resultado seria dar nota a uma
           * passada que não é medida.
           */
          terminou && modo === "quiz" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto cartao px-4 py-4">
          {virouAprendida ? (
            <p className="titulo text-metodo-tinta-alta">Linha aprendida!</p>
          ) : placar?.revelado ? (
            /*
             * O erro **para** a passada desde 8/9/2026, e antes ela ia até o
             * fim. A troca é do Move Trainer do chess.com (§A3 de
             * `docs/REFERENCIA-MOVE-TRAINER.md`): revelar o lance certo e
             * recomeçar ensina mais que assistir ao resto de uma linha que o
             * aluno já não está mais tentando lembrar.
             *
             * O que **não** mudou é o que se grava: o erro sobe ao servidor uma
             * vez, com `porQue: "erro"`, derruba o degrau e zera os acertos
             * seguidos. É o que faz o registro querer dizer alguma coisa.
             */
            <p className="text-sm font-semibold text-tinta">
              Não era esse lance. A linha joga{" "}
              <span className="text-metodo-tinta-alta">{placar.revelado.san}</span> — e os
              acertos seguidos voltaram a zero.
            </p>
          ) : resultado && !resultado.acertou ? (
            <p className="text-sm font-semibold text-tinta">
              {porQue === "dica" && placar?.acertou
                ? "Você chegou ao fim, e todos os lances saíram certos — mas com ajuda. Esta passada conta como treino, e os acertos seguidos voltaram a zero."
                : "Você chegou ao fim — mas houve um erro no caminho, e os acertos seguidos voltaram a zero."}
            </p>
          ) : (
            <p className="text-sm font-semibold text-tinta">Linha inteira, sem erro.</p>
          )}

          {/*
           * O texto do professor: o do lance em que o aluno errou, quando houve
           * erro, e o do último lance da linha quando ela fechou. É o comentário
           * que responde à pergunta que ele acabou de fazer — "por que não era
           * esse?" tem resposta no lance certo, não no fim da linha.
           */}
          <Comentario
            texto={
              placar?.revelado
                ? linha.comentarios[String(placar.revelado.passo)]
                : linha.comentarios[String(linha.lances.length - 1)]
            }
          />

          {/* Só aparece quando a linha não fechou a régua — ver `OQueFalta.tsx`. */}
          <OQueAindaFalta linha={linha} />

          <ProximaPratica progresso={resultado?.progresso ?? null} agora={agora} />

          <div className="flex flex-wrap gap-2">
            {resultado?.acertou === false ? (
              <>
                {/*
                 * "Tentar de novo" quando o erro parou a passada, e "Jogar de
                 * novo" quando ela foi até o fim: o primeiro é a resposta a uma
                 * linha que ficou incompleta, o segundo a uma que fechou e não
                 * contou. Os dois fazem a mesma coisa — reiniciam o valendo do
                 * lance 1 —, e é o nome que tem de dizer o que aconteceu.
                 */}
                <BotaoPrincipal onClick={dNovo} esperando={gravando}>
                  {placar?.revelado ? "Tentar de novo" : "Jogar de novo"}
                </BotaoPrincipal>
                <BotaoSecundario onClick={proxima} esperando={gravando}>
                  Próxima linha
                </BotaoSecundario>
              </>
            ) : (
              <>
                <BotaoPrincipal onClick={proxima} esperando={gravando}>
                  Próxima linha
                </BotaoPrincipal>
                <BotaoSecundario onClick={dNovo} esperando={gravando}>
                  Jogar de novo
                </BotaoSecundario>
              </>
            )}
            <BotaoSecundario onClick={comASeta} esperando={false}>
              Jogar com a seta
            </BotaoSecundario>
          </div>
            </div>
          ) : null
        }
      />
    </>
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

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 *
 * ## Por que os emojis saíram
 *
 * Eram 🔊 e 🔇. Medido nas capturas de 8/9/2026, o 🔇 sai **rosa saturado**
 * (`#F1489A`) na fonte de emoji do sistema: a única cor quente e saturada da
 * tela inteira, num canto onde não há nada de urgente acontecendo. O olho lê
 * como erro e vai até lá — e a paleta do site, que existe para reservar cor
 * forte ao veredito de um lance, é atropelada por um glifo que não é nosso.
 *
 * Emoji é, além disso, arte de terceiro: o desenho muda por sistema
 * operacional, e o alinhamento com o texto ao lado muda junto.
 *
 * Os dois glifos abaixo são o mesmo traço dos quatro do cartão de comando
 * (`components/lesson/CartaoDeComando.tsx`): 24 px, `stroke-width: 2`, `fill: none`, `currentColor`.
 * `currentColor` é o que os faz respeitar o tom da linha em que estão.
 */
function BotaoDeSom() {
  const ligado = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!ligado)}
      aria-pressed={ligado}
      className="foco flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg text-tinta-fraca transition-colors hover:bg-carta-toque hover:text-tinta"
    >
      <IconeDeSom ligado={ligado} />
      <span className="sr-only">{ligado ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}

/**
 * O alto-falante, com as ondas ou com o corte.
 *
 * O corpo é o mesmo nos dois estados — só o que sai dele muda. É o que faz o
 * botão não "piscar de forma" quando o aluno o aperta: a silhueta fica, e a
 * diferença é exatamente a informação (som saindo, som cortado).
 */
function IconeDeSom({ ligado }: { ligado: boolean }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      {ligado ? (
        <>
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18.5 6.4a8 8 0 0 1 0 11.2" />
        </>
      ) : (
        <path d="M16 9.5 21 14.5M21 9.5 16 14.5" />
      )}
    </svg>
  );
}
