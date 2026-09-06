import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Diagrama } from "@/components/board/Diagrama";
import { Negrito } from "@/components/texto/Negrito";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEIS } from "@/lib/curso/trilha";
import { DICAS, dicaPorId, ordemDaDica } from "@/lib/meiojogo/conteudo";
import { dicasLidas } from "@/lib/meiojogo/progresso";
import { Li } from "../Li";
import { Quiz } from "../Quiz";

/**
 * Uma dica de meio-jogo.
 *
 * ## Dinâmica, ao contrário da aula de finais
 *
 * `/finais/[aula]` é estática e paga uma ida de rede só nas duas aulas que
 * precisam do estado do aluno. Aqui é o contrário, e o motivo é a proporção:
 * **todas** as trinta dicas terminam na caixa "li", então uma consulta na
 * renderização é uma consulta por página aberta — a mesma que a estática pagaria
 * do navegador, um instante depois e com a tela piscando no meio.
 *
 * ## O que a tela separa, e por quê
 *
 * A dica tem duas metades com donos diferentes, e a página as mantém visualmente
 * separadas de propósito (ver `lib/meiojogo/afirmacoes.ts`):
 *
 * - a **legenda**, embaixo do diagrama, só afirma o que uma máquina mediu —
 *   coluna aberta, peão isolado, posto, cor das casas;
 * - a **explicação**, o "procure" e o quiz são julgamento da autoria, e a tela
 *   escreve isso onde ele aparece.
 *
 * É a mesma disciplina do selo de domínio das aulas de finais, aplicada ao
 * módulo que não tem tablebase para se apoiar.
 */

export function generateStaticParams() {
  // A rota é dinâmica na renderização (lê `dica_lida`), mas os ids são
  // conhecidos na build: declará-los fecha a porta para um `/meio-jogo/m99`
  // renderizado sob demanda.
  return DICAS.map((d) => ({ dica: d.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/meio-jogo/[dica]">): Promise<Metadata> {
  const { dica } = await params;
  const encontrada = dicaPorId(dica);
  return { title: encontrada ? `${encontrada.titulo} — Meio-jogo` : "Dica não encontrada" };
}

export default async function DicaDeMeioJogo({ params }: PageProps<"/meio-jogo/[dica]">) {
  const { dica: id } = await params;
  const dica = dicaPorId(id);
  if (!dica) notFound();

  const perfil = await perfilAtual();
  const lidas = await dicasLidas(perfil.id);

  const nivel = NIVEIS.find((n) => n.id === dica.nivel);
  const ordem = ordemDaDica(dica.id);
  const anterior = ordem > 1 ? DICAS[ordem - 2] : null;
  const proxima = ordem < DICAS.length ? DICAS[ordem] : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <Link href="/meio-jogo" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Meio-jogo
        </Link>
        <p className="rotulo text-tinta-fraca tabular-nums">
          Dica {ordem} de {DICAS.length}
          {nivel ? ` · ${nivel.nome} de rápidas` : ""}
        </p>
        <h1 className="titulo text-tinta">{dica.titulo}</h1>
        <p className="text-base text-tinta-media">{dica.resumo}</p>
      </header>

      {dica.posicoes.map((posicao, i) => (
        <figure key={posicao.fen} className="flex flex-col gap-3">
          <Diagrama
            fen={posicao.fen}
            titulo={`Diagrama da dica ${ordem}: ${dica.titulo}`}
          />
          <figcaption className="flex flex-col gap-1.5">
            <p className="text-sm text-tinta-media">{posicao.legenda}</p>
            {/* A proveniência fica em letra miúda e aberta — não escondida
                atrás de um "saiba mais". O aluno de doze anos não vai lê-la; o
                professor que abrir a dica no sábado, sim, e é para ele que ela
                está aqui — e é por isso que ela é `tinta-fraca` e não
                `tinta-muda`. `tinta-muda` é a única tinta da paleta isenta do
                piso de 4,5:1, e a isenção existe porque ela não carrega
                informação; esta linha carrega. Media 2,69:1. */}
            <p className="text-xs text-tinta-fraca">
              {posicao.provenance.bibliographicSource} {posicao.provenance.fenMethod}
            </p>
          </figcaption>
          {i < dica.posicoes.length - 1 ? <hr className="border-borda-fraca" /> : null}
        </figure>
      ))}

      <section className="flex flex-col gap-3">
        {dica.explicacao.map((paragrafo) => (
          <p key={paragrafo} className="text-sm leading-relaxed text-tinta">
            <Negrito>{paragrafo}</Negrito>
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
        <h2 className="rotulo text-tinta-fraca">O que procurar no tabuleiro</h2>
        <ul className="flex flex-col gap-1.5">
          {dica.procure.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-tinta-media">
              <span aria-hidden className="text-tinta-muda">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {dica.cuidado ? (
        <p className="rounded-lg bg-aviso-superficie/14 px-3 py-2.5 text-sm text-aviso-tinta">
          <span className="font-semibold">Cuidado: </span>
          <Negrito>{dica.cuidado}</Negrito>
        </p>
      ) : null}

      <Quiz
        pergunta={dica.quiz.pergunta}
        opcoes={dica.quiz.opcoes}
        certa={dica.quiz.certa}
        porque={dica.quiz.porque}
      />

      {dica.video ? (
        <section className="flex flex-col gap-1 rounded-xl border border-dashed border-borda bg-carta px-4 py-3">
          <h2 className="rotulo text-tinta-fraca">Vídeo</h2>
          {dica.video.url ? (
            <>
              <a
                href={dica.video.url}
                target="_blank"
                rel="noreferrer"
                className="foco text-sm font-medium text-metodo-tinta underline"
              >
                {dica.video.titulo}
              </a>
              {/* O que foi conferido, dito com todas as letras. O link foi
                  aberto e o vídeo existe, é público e tem o título e o canal
                  escritos aqui — o oEmbed do YouTube devolveu os três. O que
                  **não** foi feito é assistir aos 30, e o site não vai dizer
                  que foi: é a mesma disciplina do quiz, que escreve de quem é
                  o julgamento em vez de vendê-lo como fato. */}
              <p className="text-xs text-tinta-fraca">
                Link conferido: o vídeo existe e é gratuito. Quem escolhe o que entra na aula
                é o professor.
              </p>
            </>
          ) : (
            <>
              {/* Link não conferido não vira link. A alternativa — mostrar o
                  título de um vídeo que ninguém abriu — faria a tela afirmar
                  que ele existe, e o aluno descobriria que não no meio da
                  tarefa de casa. */}
              <p className="text-sm text-tinta-media">
                Ainda não há link conferido para esta dica.
              </p>
              <p className="text-xs text-tinta-fraca">{dica.video.titulo}</p>
            </>
          )}
        </section>
      ) : null}

      <Li dica={dica.id} inicial={lidas.has(dica.id)} />

      <nav className="flex flex-wrap items-stretch justify-between gap-2 pt-2">
        {/* O título quebra em duas linhas em vez de ser cortado no meio da
            palavra: são só dois botões no rodapé, e "Peça parada não jog…" não
            diz para onde o link leva. `min-w-0` deixa a coluna encolher; sem
            ele o `line-clamp` não teria contra o que medir. */}
        {anterior ? (
          <Link
            href={`/meio-jogo/${anterior.id}`}
            className="foco flex min-w-0 max-w-[48%] flex-col rounded-lg border border-borda px-3 py-2 text-left hover:bg-carta-toque"
          >
            <span className="rotulo text-tinta-fraca">Anterior</span>
            <span className="line-clamp-2 text-sm text-tinta-media">
              {anterior.titulo}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {proxima ? (
          <Link
            href={`/meio-jogo/${proxima.id}`}
            className="foco flex min-w-0 max-w-[48%] flex-col rounded-lg border border-borda px-3 py-2 text-right hover:bg-carta-toque"
          >
            <span className="rotulo text-tinta-fraca">Próxima</span>
            <span className="line-clamp-2 text-sm text-tinta-media">
              {proxima.titulo}
            </span>
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
