import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Diagrama } from "@/components/board/Diagrama";
import { Negrito } from "@/components/texto/Negrito";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEIS } from "@/lib/curso/trilha";
import { camadaDeRealce, ladoDaVez, PALETA_DA_TELA } from "@/lib/diagrama/tabuleiro";
import { DICAS, dicaPorId, ordemDaDica } from "@/lib/meiojogo/conteudo";
import { Exercicios } from "./Exercicios";
import { Passos } from "./Passos";

/**
 * Uma dica de meio-jogo.
 *
 * ## Dinâmica só pela tranca
 *
 * Ela era dinâmica porque lia `dica_lida` na renderização. A caixa "li" saiu em
 * 2026-09-07 e o progresso passou a sair de `tentativa_meiojogo`, então não há
 * mais estado do aluno nesta página — o que a mantém dinâmica é a chamada de
 * `perfilAtual`, que é a tranca da rota num projeto sem middleware.
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
 *
 * ## A ordem da página, e o que saiu dela
 *
 * ```
 * 1 cabeçalho · 2 diagrama grudado + legenda + citação de uma linha
 * 3 explicação passo a passo, cada passo acendendo o que ele cita
 * 4 vocabulário · 5 cuidado · 6 exercícios de jogar o lance
 * 7 vídeo · 8 <details> da proveniência · nav
 * ```
 *
 * Saíram, por decisão do Doug em 2026-09-07: o quiz de três alternativas, a
 * pergunta de duas alternativas do degrau 4, a caixa "li" e o bloco "o que
 * procurar" (cujo conteúdo dobra dentro da explicação). O que fica é a
 * apresentação do tema e a prática dele — e mais nada.
 *
 * A proveniência ficava aberta embaixo da legenda, e a justificativa de então
 * continua válida — "o aluno de doze anos não vai lê-la; o professor que abrir
 * a dica no sábado, sim". O que mudou foi o **tamanho**: depois do trabalho com
 * os livros ela chegou a 765 caracteres de média, ~17 linhas de letra miúda num
 * celular de 360 px, e empurrava a explicação para fora da tela. Ela não sai da
 * página: desce para o `<details>` do pé, inteira, e o que fica embaixo do
 * diagrama é a `citacaoCurta` de uma linha. O professor continua tendo tudo; o
 * aluno deixa de rolar 17 linhas para chegar ao primeiro parágrafo.
 */

export function generateStaticParams() {
  // Os ids são conhecidos na build, e declará-los fecha a porta para um
  // `/meio-jogo/m99` renderizado sob demanda.
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

  // A tranca da rota, e o único motivo de esta página continuar dinâmica.
  //
  // Ela não lê mais nada do aluno — a caixa "li" saiu, e o progresso passou a
  // sair de `tentativa_meiojogo`. O que sobrou de `perfilAtual` é o redirecionamento
  // de quem não entrou: sem middleware no projeto, esta chamada **é** a tranca, e
  // tirá-la publicaria as trinta dicas para qualquer um com o endereço.
  await perfilAtual();

  // A primeira posição é a que a explicação comenta: é ela que gruda no topo.
  const exemplo = dica.posicoes[0];
  const nivel = NIVEIS.find((n) => n.id === dica.nivel);
  const ordem = ordemDaDica(dica.id);
  const anterior = ordem > 1 ? DICAS[ordem - 2] : null;
  const proxima = ordem < DICAS.length ? DICAS[ordem] : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8 sm:py-10 lg:max-w-4xl">
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

      <Passos
        passos={dica.explicacao}
        camadas={dica.explicacao.map((passo) =>
          camadaDeRealce(passo.realce, {
            orientacao: ladoDaVez(exemplo.fen),
            paleta: PALETA_DA_TELA,
          }),
        )}
        legenda={exemplo.legenda}
        citacao={exemplo.provenance.citacaoCurta}
      >
        <Diagrama fen={exemplo.fen} titulo={`Diagrama da dica ${ordem}: ${dica.titulo}`} />
      </Passos>

      {/* O vocabulário do conceito, dentro da explicação — que é onde ele
          serve. Ele morava na ficha do treino, ao lado dos pré-requisitos e
          dos limites da evidência; a ficha visível saiu da tela do aluno por
          decisão do Doug em 2026-09-07, e dos quatro campos dela este é o
          único que o aluno usa enquanto lê. Os `limitesDaEvidencia` continuam
          no arquivo e vão para o relatório do professor, que é de quem eles
          são. */}
      {dica.treino ? (
        <details className="rounded-lg bg-carta px-3 py-2.5">
          <summary className="foco cursor-pointer text-sm text-tinta-media">
            As palavras desta dica
          </summary>
          <dl className="flex flex-col gap-1.5 pt-2.5">
            {dica.treino.ficha.vocabulario.map((verbete) => (
              <div key={verbete.termo} className="text-sm">
                <dt className="inline font-semibold text-tinta">{verbete.termo}: </dt>
                <dd className="inline text-tinta-media">{verbete.significa}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {/* As posições além do exemplo. Elas não entram no tabuleiro grudado — o
          que gruda é a posição que a explicação comenta. */}
      {dica.posicoes.slice(1).map((posicao) => (
        <figure key={posicao.fen} className="flex flex-col gap-2">
          <Diagrama fen={posicao.fen} titulo={`Outra posição da dica ${ordem}`} />
          <figcaption className="flex flex-col gap-1">
            <p className="text-sm text-tinta-media">{posicao.legenda}</p>
            <p className="text-xs text-tinta-fraca">{posicao.provenance.citacaoCurta}</p>
          </figcaption>
        </figure>
      ))}

      {dica.cuidado ? (
        <p className="rounded-lg bg-aviso-superficie/14 px-3 py-2.5 text-sm text-aviso-tinta">
          <span className="font-semibold">Cuidado: </span>
          <Negrito>{dica.cuidado}</Negrito>
        </p>
      ) : null}

      {/* Os exercícios de jogar o lance, quando o conceito já foi curado. Nas
          outras dicas `treino` é `null`, e o estado correto delas é não ter
          exercício nenhum: elas continuam no ar com a explicação, e a lista de
          `/meio-jogo` já marca quais têm prática.

          Ele vem **depois** da explicação, e não antes: testar antes de ensinar
          funciona para quem tem o que ativar, e quem testa antes aqui é a
          revisão espaçada, dias depois. */}
      {dica.treino ? <Exercicios dica={dica.id} treino={dica.treino} /> : (
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-3 text-sm text-tinta-media">
          Esta dica ainda não tem exercício. Ela está aqui para ser lida e
          usada na partida — a prática entra quando as posições dela estiverem
          curadas.
        </p>
      )}

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
              {/* A ressalva vem antes da linha do "link conferido", e não
                  depois: o que ela diz é o que faria o aluno fechar o vídeo aos
                  dez minutos se ninguém tivesse avisado. */}
              {dica.video.ressalva ? (
                <p className="rounded-lg bg-aviso-superficie/14 px-3 py-2 text-sm text-aviso-tinta">
                  <span className="font-semibold">Antes de assistir: </span>
                  {dica.video.ressalva}
                </p>
              ) : null}
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

      {/* A proveniência inteira, fechada. `tinta-fraca` e não `tinta-muda`:
          `tinta-muda` é a única tinta da paleta isenta do piso de 4,5:1, e a
          isenção existe porque ela não carrega informação. Esta carrega. */}
      <details className="rounded-xl border border-borda-fraca bg-carta px-4 py-3">
        <summary className="foco rotulo cursor-pointer text-tinta-fraca">
          De onde vem {dica.posicoes.length > 1 ? "cada posição" : "a posição"}
        </summary>
        <div className="flex flex-col gap-3 pt-3">
          {dica.posicoes.map((posicao) => (
            // `wrap-break-word`: o `fenMethod` de m24 carrega uma FEN de 53
            // caracteres sem espaço nenhum, e em 360 px ela empurrava a página
            // inteira 30 px para o lado. Rolagem horizontal é o pior defeito
            // possível num celular — some com a coluna do texto e não há como
            // adivinhar que ela existe.
            <p key={posicao.fen} className="wrap-break-word text-xs leading-relaxed text-tinta-fraca">
              {posicao.provenance.bibliographicSource} {posicao.provenance.fenMethod}
            </p>
          ))}
        </div>
      </details>

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
