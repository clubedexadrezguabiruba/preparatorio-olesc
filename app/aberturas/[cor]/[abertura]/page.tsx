import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { aberturaNoIndice, linhasDaAbertura } from "@/lib/repertorio/banco";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  diasAteRevisar,
  proximaLinha,
  resumo,
  todasAprendidas,
  zerado,
  type ProgressoDaLinha,
} from "@/lib/repertorio/treino";
import { Bolinhas } from "../../Bolinhas";
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
 * A página de uma abertura: uma linha na tela, e a lista ao lado.
 *
 * **Quem escolhe a linha é o servidor.** A lista continua embaixo para o aluno
 * trocar quando quiser — mas o padrão tem de ser a linha certa, senão o aluno
 * treina três vezes a primeira da lista e nunca chega à décima. A ordem está em
 * `proximaLinha`, e ela **alterna** entre revisar e avançar.
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
  const [linhas, progresso] = await Promise.all([
    linhasDaAbertura(cor, abertura),
    progressoDoRepertorio(),
  ]);

  const agora = new Date().toISOString();
  const de = (id: string): ProgressoDaLinha => progresso.get(id) ?? zerado();
  const contas = resumo(linhas, progresso, agora);

  // A linha pedida na URL só vale se ela existir **nesta** abertura — senão o
  // aluno cairia numa tela sem tabuleiro por causa de um link velho.
  const { linha: pedida } = await searchParams;
  const escolhida = typeof pedida === "string" ? linhas.find((l) => l.id === pedida) : undefined;
  const sugerida = proximaLinha(linhas, progresso, agora);
  const linha = escolhida ?? sugerida;

  /**
   * A lista recebe `atual` só quando há um treino na tela. No cartão de
   * "abertura aprendida" não há tabuleiro nenhum, e marcar uma linha como
   * "nesta tela" ali seria apontar para o que não existe.
   */
  const lista = (atual: string | null) => (
    <ListaDeLinhas
      cor={cor}
      abertura={abertura}
      linhas={linhas}
      progressoDe={de}
      atual={atual}
      agora={agora}
    />
  );

  // Tudo aprendido **e nada vencendo**: a tela para e diz isso, em vez de servir
  // uma revisão que o aluno não pediu. Com a escada, a segunda metade da
  // condição é o que impede este cartão de esconder o trabalho do dia.
  if (!escolhida && todasAprendidas(linhas, progresso, agora)) {
    return (
      <Moldura nome={entrada.nome} cor={cor}>
        <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-6 text-center">
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
        {lista(null)}
      </Moldura>
    );
  }

  if (!linha) {
    return (
      <Moldura nome={entrada.nome} cor={cor}>
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
          Esta abertura ainda não tem linhas publicadas.
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
        agora={agora}
      />
      {lista(linha.id)}
    </Moldura>
  );
}

/* ------------------------------------------------------------------ *
 * A lista das linhas da abertura
 * ------------------------------------------------------------------ */

function ListaDeLinhas({
  cor,
  abertura,
  linhas,
  progressoDe,
  atual,
  agora,
}: {
  cor: Cor;
  abertura: string;
  linhas: { id: string; nome: string }[];
  progressoDe: (id: string) => ProgressoDaLinha;
  atual: string | null;
  agora: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="rotulo text-tinta-fraca">
        {linhas.length === 1 ? "A linha" : `As ${linhas.length} linhas`}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {linhas.map((l) => {
          const ehAtual = l.id === atual;
          return (
            <li key={l.id}>
              <Link
                href={`/aberturas/${cor}/${abertura}?linha=${l.id}`}
                aria-current={ehAtual ? "true" : undefined}
                className={`foco flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  ehAtual
                    ? "border-borda-forte bg-carta-alta"
                    : "border-borda-fraca bg-carta hover:bg-carta-toque"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-tinta">{l.nome}</span>
                {/*
                 * A linha que está na tela **não** repete as bolinhas aqui.
                 * Esta lista vem do servidor e só muda quando a página recarrega;
                 * o cabeçalho do treino, dois centímetros acima, mostra o número
                 * que o servidor acabou de devolver. Os dois na mesma tela
                 * discordariam durante toda a rodada — "1 de 3" em cima e
                 * "0 de 3" embaixo —, e o aluno teria de escolher em qual
                 * acreditar.
                 */}
                {ehAtual ? (
                  <span className="rotulo shrink-0 text-metodo-tinta">nesta tela</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    {/*
                     * "hoje" é o único rótulo de agenda que cabe numa lista de
                     * doze linhas. O número de dias vai no fim da passada, onde
                     * há espaço e onde ele responde a uma pergunta que o aluno
                     * acabou de fazer.
                     */}
                    {diasAteRevisar(progressoDe(l.id), agora) === 0 ? (
                      <span className="rotulo text-aviso-tinta">hoje</span>
                    ) : null}
                    <Bolinhas progresso={progressoDe(l.id)} />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-1">
        <Link href="/aberturas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Aberturas
        </Link>
        <h1 className="titulo text-tinta">{nome}</h1>
        <p className="text-xs text-tinta-fraca">
          Você joga de {cor}.
        </p>
      </header>
      {children}
    </main>
  );
}
