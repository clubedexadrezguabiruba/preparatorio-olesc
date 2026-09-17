import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { perfilAtual } from "@/lib/auth/perfil";
import { aberturaNoIndice, lerIndice, linhasDaAbertura } from "@/lib/repertorio/banco";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  baseCompleto,
  proximaLinha,
  resumo,
  todasAprendidas,
  zerado,
  type ProgressoDaLinha,
} from "@/lib/repertorio/treino";
import { Treino } from "../Treino";

/** A cor veio da URL: ou é uma das duas, ou a rota não existe. */
function ehCor(valor: string): valor is Cor {
  return (CORES as readonly string[]).includes(valor);
}

export async function generateMetadata({
  params,
}: PageProps<"/aberturas/[cor]/[abertura]/treino">): Promise<Metadata> {
  const { cor, abertura } = await params;
  const entrada = ehCor(cor) ? await aberturaNoIndice(cor, abertura) : null;
  return { title: `Treino — ${entrada?.nome ?? "Aberturas"} — Preparatório OLESC` };
}

/**
 * O move trainer de uma abertura: uma linha na tela, e nada abaixo dela.
 *
 * ## Por que ele saiu da página da abertura (17/9/2026)
 *
 * Até aqui o treino **era** `/aberturas/[cor]/[abertura]`: clicar na Francesa em `/aberturas` punha
 * o aluno decorando linhas antes de ter visto a aula A — o primeiro ponto do feedback do aluno de
 * 17/9. A página da abertura virou a trilha (aulas e linhas, com cadeado), e o treino ganhou rota
 * própria. Todo `?linha=` do site aponta para cá.
 *
 * **Quem escolhe a linha é o servidor.** O aluno troca quando quiser, pelo `SeletorDeLinha` que mora
 * no painel — mas o padrão tem de ser a linha certa, senão ele treina três vezes a primeira da lista
 * e nunca chega à décima. A ordem está em `proximaLinha`, e ela **alterna** entre revisar e avançar.
 *
 * **Abaixo do palco não vai nada, e a regra é de aritmética.** O palco tem altura fechada (ver "O
 * palco da aula" em `app/globals.css`), então o que vier depois dele começa na dobra e nunca é lido.
 * Medido em 8/9/2026 nas onze aberturas: a lista que ficava aqui embaixo mostrava mediana de **2
 * itens** — e, em quatro delas, um item só, a própria linha que já estava na tela.
 *
 * **O `agora` é calculado uma vez, aqui, e desce inteiro.** A escada de revisão é comparação de
 * instantes, e três funções chamando `new Date()` por conta própria produziriam três "agoras" na
 * mesma renderização.
 *
 * **A `key` do `Treino` é o que faz "Próxima linha" funcionar.** O botão chama `router.refresh()`,
 * que troca as props vindas do servidor mas não desmonta o componente de cliente. O `tentativas`
 * entra na chave porque a mesma linha pode voltar (revisão), e aí o id sozinho não muda.
 */
export default async function TreinoDaAbertura({
  params,
  searchParams,
}: PageProps<"/aberturas/[cor]/[abertura]/treino">) {
  const { cor, abertura } = await params;
  if (!ehCor(cor)) notFound();

  const entrada = await aberturaNoIndice(cor, abertura);
  if (!entrada) notFound();

  const perfil = await perfilAtual();
  const [todasAsLinhas, progresso, indiceInteiro, trava] = await Promise.all([
    linhasDaAbertura(cor, abertura),
    progressoDoRepertorio(),
    lerIndice(),
    travaDoAluno(perfil),
  ]);

  /**
   * Os dois portões, aplicados uma vez e no lugar mais alto possível.
   *
   * O do **Avançado** (7/9/2026) é do repertório inteiro; o da **aula** (17/9/2026) tira as linhas
   * do move trainer das aulas de abertura não concluídas. Filtrar aqui, logo depois de carregar, é o
   * que faz o resto desta tela ficar intacto: `resumo`, `proximaLinha`, o menu e até o `?linha=` da
   * URL passam a enxergar só o que o aluno pode treinar. Um id trancado vindo de link velho
   * simplesmente não é achado, e a tela cai na linha sugerida. O servidor recusa a gravação de
   * qualquer jeito (`gravarTreino`); isto é para a tela não oferecer o que não grava.
   */
  const avancadoLiberado = baseCompleto(progresso, indiceInteiro, trava.trancadas);
  const linhas = todasAsLinhas.filter(
    (l) => (l.nivel !== "avancado" || avancadoLiberado) && !trava.trancadas.has(l.id),
  );

  const agora = new Date().toISOString();
  const de = (id: string): ProgressoDaLinha => progresso.get(id) ?? zerado();
  const contas = resumo(linhas, progresso, agora);
  const paginaDaAbertura = `/aberturas/${cor}/${abertura}`;

  /**
   * O catálogo que desce ao treino: id, nome e progresso, e nada mais — o `Treino` é de cliente, e
   * as linhas inteiras seriam o repertório da abertura despejado no HTML para o menu desenhar nomes.
   */
  const catalogo = [...linhas]
    .sort((a, b) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER))
    .map((l) => ({ id: l.id, nome: l.nome, progresso: de(l.id), ...(l.categoria ? { categoria: l.categoria } : {}) }));

  const { linha: pedida } = await searchParams;
  const escolhida = typeof pedida === "string" ? linhas.find((l) => l.id === pedida) : undefined;
  const sugerida = proximaLinha(linhas, progresso, agora);
  const linha = escolhida ?? sugerida;

  // Tudo aprendido **e nada vencendo**: a tela para e diz isso, em vez de servir uma revisão que o
  // aluno não pediu. A lista das linhas mora na página da abertura, e é para lá que ela aponta.
  if (!escolhida && todasAprendidas(linhas, progresso, agora)) {
    return (
      <Moldura nome={entrada.nome} voltar={paginaDaAbertura}>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 cartao px-4 py-6 text-center">
          <p className="titulo text-tinta">Abertura em dia</p>
          <p className="text-sm text-tinta-media tabular-nums">
            {contas.total} {contas.total === 1 ? "linha" : "linhas"}, todas aprendidas e nenhuma vencendo hoje.
          </p>
          {sugerida ? (
            <Link
              href={`${paginaDaAbertura}/treino?linha=${sugerida.id}`}
              className="foco mx-auto w-fit rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
            >
              Revisar mesmo assim
            </Link>
          ) : null}
          <Link href={paginaDaAbertura} className="foco text-sm font-medium text-metodo-tinta underline">
            Ver as linhas de {entrada.nome}
          </Link>
        </div>
      </Moldura>
    );
  }

  if (!linha) {
    // Três maneiras de chegar aqui, e elas dizem coisas diferentes ao aluno. Sem separá-las, a
    // Francesa de quem ainda não fez a aula A apareceria como "não tem linhas publicadas".
    const porAula = todasAsLinhas.some((l) => trava.trancadas.has(l.id));
    const porAvancado = todasAsLinhas.length > 0 && !avancadoLiberado;
    return (
      <Moldura nome={entrada.nome} voltar={paginaDaAbertura}>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 cartao-vazio px-4 py-6 text-center">
          <p className="text-sm text-tinta-media">
            {porAula
              ? "As linhas desta abertura abrem com as aulas: termine uma aula e as linhas dela entram aqui."
              : porAvancado
                ? "Esta abertura é do Avançado. Ela abre quando você tiver aprendido todas as linhas do Base."
                : "Esta abertura ainda não tem linhas publicadas."}
          </p>
          <Link href={paginaDaAbertura} className="foco text-sm font-medium text-metodo-tinta underline">
            Ver as aulas de {entrada.nome}
          </Link>
        </div>
      </Moldura>
    );
  }

  const p = de(linha.id);
  const indice = catalogo.findIndex((l) => l.id === linha.id);

  return (
    <Moldura nome={entrada.nome} voltar={paginaDaAbertura}>
      <Treino
        key={`${linha.id}:${p.tentativas}`}
        cor={cor}
        abertura={abertura}
        linha={linha}
        progresso={p}
        // Primeira vez nesta linha: a passada **assistida** — o lance por extenso, a seta na tela, e
        // o aluno executando. Cobrar de memória uma linha que ele nunca viu é adivinhação.
        modoInicial={p.tentativas === 0 ? "assistido" : "quiz"}
        posicao={{ indice: indice + 1, total: linhas.length }}
        linhas={catalogo}
        agora={agora}
      />
    </Moldura>
  );
}

/**
 * A moldura do palco: uma linha de cabeçalho e o treino.
 *
 * **O cabeçalho é uma LINHA, e isso é altura de tabuleiro.** Medido no chess.com em 8/9/2026: a
 * aula deles gasta 16 px acima do tabuleiro, e o tabuleiro fica com 95% da altura útil. Cada pixel
 * que sai daqui entra no tabuleiro, porque `--aula-teto` é `100dvh` menos isto (ver "O palco da
 * aula" em `app/globals.css`). A largura é a do palco: tabuleiro no máximo (48rem) + vão + painel.
 *
 * O "←" volta para a **página da abertura**, e não para `/aberturas`: é lá que estão as aulas e a
 * lista das linhas, e é de lá que o aluno veio.
 */
function Moldura({ nome, voltar, children }: { nome: string; voltar: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href={voltar} className="foco rotulo text-metodo-tinta hover:underline">
          ← {nome}
        </Link>
        <h1 className="text-sm font-medium text-tinta-media">Move trainer</h1>
      </header>
      {children}
    </main>
  );
}
