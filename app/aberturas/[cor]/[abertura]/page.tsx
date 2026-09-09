import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { aberturaNoIndice, lerIndice, linhasDaAbertura } from "@/lib/repertorio/banco";
import { notasDaAbertura } from "@/lib/repertorio/conteudo";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { lancesEmPortugues, type Nota } from "@/lib/repertorio/notas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  baseCompleto,
  DEGRAU_APRENDIDA,
  diasAteRevisar,
  proximaLinha,
  resumo,
  todasAprendidas,
  zerado,
  type ProgressoDaLinha,
} from "@/lib/repertorio/treino";
import { Bolinhas } from "@/components/Bolinhas";
import { Treino } from "./Treino";

/** A cor veio da URL: ou é uma das duas, ou a rota não existe. */
function ehCor(valor: string): valor is Cor {
  return (CORES as readonly string[]).includes(valor);
}

export async function generateMetadata({
  params,
}: PageProps<"/aberturas/[cor]/[abertura]">): Promise<Metadata> {
  const { cor, abertura } = await params;
  const entrada = ehCor(cor) ? await aberturaNoIndice(cor, abertura) : null;
  return { title: `${entrada?.nome ?? "Aberturas"} — Preparatório OLESC` };
}

/**
 * A página de uma abertura: uma linha na tela, e nada abaixo dela.
 *
 * **Quem escolhe a linha é o servidor.** O aluno troca quando quiser, pelo
 * `SeletorDeLinha` que mora no painel — mas o padrão tem de ser a linha certa,
 * senão ele treina três vezes a primeira da lista e nunca chega à décima. A
 * ordem está em `proximaLinha`, e ela **alterna** entre revisar e avançar.
 *
 * **Abaixo do palco não vai nada, e a regra é de aritmética.** O palco tem
 * altura fechada (ver "O palco da aula" em `app/globals.css`), então o que vier
 * depois dele começa na dobra e nunca é lido. Medido em 8/9/2026 nas onze
 * aberturas, a lista que ficava aqui embaixo mostrava mediana de **2 itens** e,
 * em quatro delas, **um item só — a própria linha que já estava na tela**. Vale
 * para o próximo bloco que alguém quiser acrescentar aqui.
 *
 * **O `agora` é calculado uma vez, aqui, e desce inteiro.** A escada de revisão
 * é comparação de instantes, e três funções chamando `new Date()` por conta
 * própria produziriam três "agoras" na mesma renderização — o suficiente para
 * uma linha estar vencida na lista e em dia no cartão, na mesma tela.
 *
 * **A `key` do `Treino` é o que faz "Próxima linha" funcionar.** O botão chama
 * `router.refresh()`, que troca as props vindas do servidor mas não desmonta o
 * componente de cliente. Sem a `key`, a linha nova entraria com o estado velho
 * — parada na tela de fim da anterior. O `tentativas` entra na chave porque a
 * mesma linha pode voltar (revisão), e aí o id sozinho não muda.
 *
 * A rota tem `[cor]` antes de `[abertura]` porque o slug pode repetir entre as
 * duas: há uma "francesa" de brancas, e um dia haverá uma de pretas.
 */
export default async function Abertura({
  params,
  searchParams,
}: PageProps<"/aberturas/[cor]/[abertura]">) {
  const { cor, abertura } = await params;
  if (!ehCor(cor)) notFound();

  const entrada = await aberturaNoIndice(cor, abertura);
  if (!entrada) notFound();

  await perfilAtual();
  const [todasAsLinhas, progresso, indiceInteiro] = await Promise.all([
    linhasDaAbertura(cor, abertura),
    progressoDoRepertorio(),
    lerIndice(),
  ]);

  /**
   * O portão do Avançado, aplicado uma vez e no lugar mais alto possível.
   *
   * Filtrar aqui, logo depois de carregar, é o que faz o resto desta tela ficar
   * intacto: `resumo`, `proximaLinha`, a `ListaDeLinhas` e até o `?linha=` da URL
   * passam a enxergar só o que o aluno pode treinar, sem cada um precisar saber
   * que existe um portão. Um id trancado vindo de link velho simplesmente não é
   * achado, e a tela cai na linha sugerida — que é o mesmo caminho que já existia
   * para id de linha apagada.
   *
   * O portão é do repertório INTEIRO, e não desta abertura: o professor pediu
   * que o Avançado abrisse quando o aluno terminasse **todas** as linhas do Base
   * (7/9/2026), então é preciso o índice inteiro, não só esta entrada.
   */
  const avancadoLiberado = baseCompleto(progresso, indiceInteiro);
  const linhas = todasAsLinhas.filter((l) => l.nivel !== "avancado" || avancadoLiberado);

  const agora = new Date().toISOString();
  const de = (id: string): ProgressoDaLinha => progresso.get(id) ?? zerado();
  const contas = resumo(linhas, progresso, agora);

  /**
   * O catálogo que desce ao treino: id, nome e progresso, e nada mais.
   *
   * O `Treino` é componente de cliente, então **nada de função** (`de` não
   * atravessa a fronteira) e nada de `Linha` inteira: mandar as onze linhas com
   * lances, SANs e comentários seria despejar o repertório da abertura no HTML
   * para o menu desenhar onze nomes. Três campos por linha é o que o
   * `SeletorDeLinha` lê, e é o que sobe.
   */
  const catalogo = linhas.map((l) => ({ id: l.id, nome: l.nome, progresso: de(l.id) }));

  // A linha pedida na URL só vale se ela existir **nesta** abertura — senão o
  // aluno cairia numa tela sem tabuleiro por causa de um link velho.
  const { linha: pedida } = await searchParams;
  const escolhida = typeof pedida === "string" ? linhas.find((l) => l.id === pedida) : undefined;
  const sugerida = proximaLinha(linhas, progresso, agora);
  const linha = escolhida ?? sugerida;

  /**
   * As páginas de princípios saem GRUDADAS na lista, e não numa terceira
   * chamada espalhada pelos `return`. São o resto da mesma abertura: os ramos
   * que a poda de 7/9/2026 tirou daqui por não renderem sequência para decorar.
   * Quem lê "as 5 linhas" tem de ler, no lance seguinte, "e mais isto, que não
   * é linha" — senão a página promete cobrir a abertura e cobre dois terços.
   */
  const podadas = notasDaAbertura(cor, abertura);
  /*
   * A lista e as páginas de princípios só aparecem no cartão de "abertura em
   * dia" — a única tela desta rota que **não** tem palco de altura fechada.
   *
   * Elas saíram de baixo do treino em 8/9/2026, cada uma para onde é vista: a
   * lista virou o `SeletorDeLinha`, atrás do "linha 2 de 5" do painel; as
   * páginas de princípios continuam inteiras em `/aberturas` (seção "Sem linha
   * para decorar") e em `/aberturas/notas/`, e aqui embaixo eram uma terceira
   * cópia — a cópia que ninguém via.
   *
   * A largura própria: a moldura cresceu para caber o palco (tabuleiro + painel
   * somam até 1.322 px), e uma linha de texto dessa largura não se lê — o olho
   * perde o começo da seguinte. 48rem é o teto do tabuleiro, e alinhar por ele
   * dá à página uma régua só.
   */
  const lista = (
    <div className="flex w-full flex-col gap-5 lg:max-w-3xl">
      <ListaDeLinhas
        cor={cor}
        abertura={abertura}
        linhas={linhas}
        progressoDe={de}
        agora={agora}
      />
      <Podadas notas={podadas} />
    </div>
  );

  // Tudo aprendido **e nada vencendo**: a tela para e diz isso, em vez de servir
  // uma revisão que o aluno não pediu. Com a escada, a segunda metade da
  // condição é o que impede este cartão de esconder o trabalho do dia.
  if (!escolhida && todasAprendidas(linhas, progresso, agora)) {
    return (
      <Moldura nome={entrada.nome} cor={cor}>
        <div className="flex flex-col gap-3 cartao px-4 py-6 text-center">
          <p className="titulo text-tinta">Abertura em dia</p>
          <p className="text-sm text-tinta-media tabular-nums">
            {contas.total} {contas.total === 1 ? "linha" : "linhas"}, todas aprendidas e
            nenhuma vencendo hoje.
          </p>
          {sugerida ? (
            <Link
              href={`/aberturas/${cor}/${abertura}?linha=${sugerida.id}`}
              className="foco mx-auto w-fit rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
            >
              Revisar
            </Link>
          ) : null}
          <Link href="/aberturas" className="foco text-sm font-medium text-metodo-tinta underline">
            Escolher outra abertura
          </Link>
        </div>
        {lista}
      </Moldura>
    );
  }

  if (!linha) {
    // Duas maneiras de chegar aqui, e elas dizem coisas opostas ao aluno. Sem
    // separá-las, uma abertura inteira de Avançado — que existe e ele vai ganhar
    // — apareceria como "não tem linhas publicadas", que soa a defeito do site.
    const trancada = todasAsLinhas.length > 0 && !avancadoLiberado;
    return (
      <Moldura nome={entrada.nome} cor={cor}>
        <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
          {trancada
            ? "Esta abertura é do Avançado. Ela abre quando você tiver aprendido todas as linhas do Base."
            : "Esta abertura ainda não tem linhas publicadas."}
        </p>
      </Moldura>
    );
  }

  const p = de(linha.id);
  const indice = linhas.findIndex((l) => l.id === linha.id);

  return (
    <Moldura nome={entrada.nome} cor={cor}>
      <Treino
        key={`${linha.id}:${p.tentativas}`}
        cor={cor}
        abertura={abertura}
        linha={linha}
        progresso={p}
        // Primeira vez nesta linha: a passada **assistida** — o lance por
        // extenso, a seta na tela, e o aluno executando. Cobrar de memória uma
        // linha que ele nunca viu não é treino, é adivinhação.
        modoInicial={p.tentativas === 0 ? "assistido" : "quiz"}
        posicao={{ indice: indice + 1, total: linhas.length }}
        linhas={catalogo}
        agora={agora}
      />
    </Moldura>
  );
}

/* ------------------------------------------------------------------ *
 * A lista das linhas da abertura
 * ------------------------------------------------------------------ */

/**
 * A lista completa das linhas, no cartão de "abertura em dia".
 *
 * **Sem "nesta tela".** Ela sobrava aqui desde que a lista saiu de baixo do
 * treino: nesta tela não há tabuleiro nenhum, e apontar uma linha como "a que
 * está na tela" seria apontar para o que não existe. Quem marca a linha
 * corrente é o `SeletorDeLinha`, que vive ao lado dela.
 */
function ListaDeLinhas({
  cor,
  abertura,
  linhas,
  progressoDe,
  agora,
}: {
  cor: Cor;
  abertura: string;
  linhas: { id: string; nome: string }[];
  progressoDe: (id: string) => ProgressoDaLinha;
  agora: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="rotulo text-tinta-fraca">
        {linhas.length === 1 ? "A linha" : `As ${linhas.length} linhas`}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {linhas.map((l) => (
          <li key={l.id}>
            <Link
              href={`/aberturas/${cor}/${abertura}?linha=${l.id}`}
              className="foco flex items-center justify-between gap-3 cartao-alvo px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-tinta">{l.nome}</span>
              <span className="flex shrink-0 items-center gap-2">
                {/*
                 * "hoje" é o único rótulo de agenda que cabe numa lista de doze
                 * linhas. O número de dias vai no fim da passada, onde há espaço
                 * e onde ele responde a uma pergunta que o aluno acabou de fazer.
                 */}
                {diasAteRevisar(progressoDe(l.id), agora) === 0 ? (
                  <span className="rotulo text-aviso-tinta">hoje</span>
                ) : null}
                <Bolinhas progresso={progressoDe(l.id)} total={DEGRAU_APRENDIDA} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * O que a poda tirou desta abertura
 *
 * Quatro das nove páginas de princípios são ramos de uma abertura que o aluno
 * TREINA, e até 7/9/2026 elas só existiam num bloco no rodapé de `/aberturas`,
 * abaixo de onze cartões. Quem entra direto para treinar nunca descia até lá —
 * e essas quatro cobrem perto de um terço do que ele encontra no tabuleiro.
 *
 * **A correção de 7/9 errou de lugar, e 8/9 a moveu de novo.** Este bloco foi
 * posto abaixo do treino, onde o palco de altura fechada o pôs na dobra — o
 * mesmo defeito, num lugar novo. Hoje ele aparece só no cartão de "abertura em
 * dia", que é a tela desta rota sem palco. Quem está treinando encontra as
 * páginas onde elas sempre estiveram inteiras: em `/aberturas`, na volta.
 *
 * O cartão diz de cara que ali NÃO há lance para decorar. É a diferença que o
 * aluno precisa entender antes de clicar: a lista de cima é treino cobrado; isto
 * é leitura. Sem essa frase o link parece mais uma linha, e a página de texto
 * chega como decepção.
 *
 * Some quando não há nenhuma, que é o caso de sete das onze aberturas.
 * ------------------------------------------------------------------ */

function Podadas({ notas }: { notas: readonly Nota[] }) {
  if (notas.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="rotulo text-tinta-fraca">Nesta abertura, sem linha para decorar</h2>
      <ul className="flex flex-col gap-1.5">
        {notas.map((nota) => (
          <li key={nota.slug}>
            <Link
              href={`/aberturas/notas/${nota.slug}`}
              className="foco flex flex-col gap-1 cartao-vazio px-3 py-2.5 transition-colors hover:bg-carta-toque"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-tinta">{nota.nome}</span>
                <span className="rotulo shrink-0 text-tinta-muda">para ler</span>
              </span>
              <span className="text-xs text-tinta-muda tabular-nums">
                {lancesEmPortugues(nota.lances)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * A moldura
 * ------------------------------------------------------------------ */

function Moldura({
  nome,
  cor,
  children,
}: {
  nome: string;
  cor: Cor;
  children: React.ReactNode;
}) {
  return (
    /*
     * `max-w-xl` (576 px) era a largura de todas as rotas do site, e é o certo
     * para uma página de texto. Para a aula, era o defeito: num notebook de
     * 1366 px ela deixava 384 px de vão vazio de cada lado e empurrava o
     * comentário para baixo da dobra.
     *
     * A moldura agora é o TETO do palco, não a régua dele: 85,75rem ≥ tabuleiro
     * no máximo (48rem) + vão (2,5rem) + painel (32,625rem) + os 2,5rem de
     * `px-5`, que somam 85,625. Quem decide a largura real é `--aula-teto`, no
     * CSS — a moldura só não pode estrangular a conta, que é o que 62rem fazia,
     * e é por isso que ela arredonda para cima em vez de para baixo.
     *
     * O painel passou de 25,625rem para 32,625rem em 8/9/2026, quando o retrato
     * do professor entrou ao lado do comentário. A moldura subiu junto: deixada
     * em 78rem, ela voltaria a ser a régua e o tabuleiro pagaria a diferença.
     */
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      {/*
       * **O cabeçalho é uma LINHA, e isso é altura de tabuleiro.**
       *
       * Ele era três linhas empilhadas — voltar, título, "você joga de
       * brancas" — e media 76 px. Somados aos 80 px de respiro e aos 20 do vão,
       * davam **176 px** que o tabuleiro não tinha. Medido no chess.com em
       * 8/9/2026: a aula deles gasta **16 px acima do tabuleiro e 17 abaixo**,
       * e o tabuleiro fica com **95% da altura útil** da janela (600 px num
       * viewport de 633). O nosso ficava com 77%.
       *
       * Numa linha, com o respiro em 40 e o vão em 12, a conta cai para 80 px
       * — e cada pixel que sai daqui entra no tabuleiro, porque `--aula-teto`
       * é literalmente `100dvh` menos isto (ver "O palco da aula" em
       * `app/globals.css`).
       *
       * `flex-wrap` com `items-baseline`: no celular ela quebra em duas, e as
       * três peças continuam alinhadas pela base do texto em vez de pelo topo
       * da caixa — que é o que faz um título de 20 px e um rótulo de 12
       * parecerem a mesma linha.
       */}
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href="/aberturas" className="foco rotulo text-metodo-tinta hover:underline">
          ← Aberturas
        </Link>
        <h1 className="titulo text-tinta">{nome}</h1>
        <p className="text-xs text-tinta-fraca">Você joga de {cor}.</p>
      </header>
      {children}
    </main>
  );
}
