import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { nota, notas } from "@/lib/repertorio/conteudo";
import { lancesEmPortugues } from "@/lib/repertorio/notas";

export async function generateMetadata({
  params,
}: PageProps<"/aberturas/notas/[abertura]">): Promise<Metadata> {
  const { abertura } = await params;
  return { title: `${nota(abertura)?.nome ?? "Princípios"} — Preparatório OLESC` };
}

/**
 * Uma abertura que não virou linha: os princípios, em texto.
 *
 * **Não há tabuleiro nesta página, e é uma decisão.** A §2.10 do
 * `docs/REPERTORIO.md` tirou quatro defesas do repertório porque cada uma
 * aparece menos de uma vez por torneio — decorar oito meios-lances de algo tão
 * raro é o pior negócio de memória que existe. O que sobrevive até a partida é
 * a ideia.
 *
 * A quinta chegou aqui pelo motivo oposto, e é a §16 do `docs/REVISAO-FONTES.md`
 * que a traz: o bispo em c4 contra a nossa Siciliana é **~31 % das sicilianas**,
 * a posição mais frequente do repertório inteiro — e mesmo assim não rende
 * linha, porque depois de `2.Bc4 Cc6` as quatro respostas mais comuns das
 * brancas somam só 73,2 % e nenhum dos onze cursos do corpus entra nela. Não há
 * sequência estável para decorar; há uma ideia.
 *
 * **Por isso o "por que não há linha" vem do dado, e não daqui.** Um rodapé
 * fixo dizendo "estas são as raras" seria falso justamente para a que o aluno
 * mais encontra. Cada nota traz o seu motivo no campo `porque`.
 *
 * Um diagrama também custaria uma superfície nova — um desenhista de FEN que
 * o site não tem desde que a apostila saiu de cena. Os lances no alto dizem
 * que posição é essa, que
 * é o que um livro de princípios faz — e saem em português (`Cf3`, e não `Nf3`)
 * por `lancesEmPortugues`, porque o JSON os guarda em inglês para a `chess.js`
 * do teste poder conferir que são lances legais.
 */
export default async function NotaDaAbertura({
  params,
}: PageProps<"/aberturas/notas/[abertura]">) {
  const { abertura } = await params;
  const texto = nota(abertura);
  if (!texto) notFound();

  await perfilAtual();
  const outras = notas().filter((n) => n.slug !== texto.slug);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-2">
        <Link href="/aberturas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Aberturas
        </Link>
        <h1 className="titulo text-tinta">{texto.nome}</h1>
        <p className="rotulo w-fit rounded-md bg-carta-toque px-2 py-0.5 text-tinta-media">
          Você de {texto.cor}
        </p>
        <p className="text-sm font-medium text-tinta-media tabular-nums">
          {lancesEmPortugues(texto.lances)}
        </p>
        <p className="text-xs text-tinta-fraca">{texto.frequencia}</p>
      </header>

      {/* ---------------------------------------------------------------- *
       * Por que não há linha
       *
       * Vem antes do conteúdo porque é a primeira pergunta do aluno que abre
       * esta página vindo de uma lista em que todas as outras têm treino. E vem
       * da nota, não da tela: o motivo do bispo em c4 (não há teoria) é o
       * oposto do das quatro raras (aparecem pouco).
       * ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-1.5 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
        <h2 className="rotulo text-tinta-fraca">Por que não há linha para decorar</h2>
        <p className="text-sm text-tinta-media">{texto.porque}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">O que ele quer</h2>
        {texto.explicacao.map((paragrafo) => (
          <p key={paragrafo.slice(0, 24)} className="text-sm text-tinta-media">
            {paragrafo}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">O que você faz</h2>
        <ol className="flex flex-col gap-2">
          {texto.faca.map((passo, i) => (
            <li
              key={passo.slice(0, 24)}
              className="flex gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3"
            >
              <span className="text-sm font-semibold text-metodo-tinta tabular-nums">{i + 1}.</span>
              <span className="text-sm text-tinta">{passo}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2.5 text-sm text-aviso-tinta">
        <span className="font-semibold">Cuidado: </span>
        {texto.cuidado}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="rotulo text-tinta-fraca">As outras sem linha</h2>
        <ul className="flex flex-col gap-1.5">
          {outras.map((n) => (
            <li key={n.slug}>
              <Link
                href={`/aberturas/notas/${n.slug}`}
                className="foco flex flex-col gap-1 rounded-lg border border-borda-fraca bg-carta px-3 py-2.5 transition-colors hover:bg-carta-toque sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="text-sm text-tinta">{n.nome}</span>
                <span className="text-xs text-tinta-fraca tabular-nums">
                  {lancesEmPortugues(n.lances)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
