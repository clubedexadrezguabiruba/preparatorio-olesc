import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Diagrama } from "@/components/board/Diagrama";
import { Negrito } from "@/components/texto/Negrito";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEIS } from "@/lib/curso/trilha";
import { camadaDeRealce, ladoDaVez, PALETA_DA_TELA } from "@/lib/diagrama/tabuleiro";
import { DICAS, dicaPorId, ordemDaDica } from "@/lib/meiojogo/conteudo";
import { dicasLidas } from "@/lib/meiojogo/progresso";
import { Li } from "../Li";
import { Passos } from "./Passos";
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
 *
 * ## A ordem da página, e a proveniência que desceu
 *
 * ```
 * 1 cabeçalho · 2 diagrama grudado + legenda + citação de uma linha
 * 3 explicação passo a passo, cada passo acendendo o que ele cita
 * 4 "o que procurar" + cuidado · 5 pergunta · 6 vídeo · 7 caixa "li"
 * 8 <details> da proveniência · nav
 * ```
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

      {/* As posições além do exemplo. Hoje as 30 dicas têm uma só, e o esquema
          aceita até três: as duas extras são o reconhecimento guiado do Bloco 3,
          que ainda não foi curado. Elas não entram no tabuleiro grudado — o que
          gruda é a posição que a explicação comenta. */}
      {dica.posicoes.slice(1).map((posicao) => (
        <figure key={posicao.fen} className="flex flex-col gap-2">
          <Diagrama fen={posicao.fen} titulo={`Outra posição da dica ${ordem}`} />
          <figcaption className="flex flex-col gap-1">
            <p className="text-sm text-tinta-media">{posicao.legenda}</p>
            <p className="text-xs text-tinta-fraca">{posicao.provenance.citacaoCurta}</p>
          </figcaption>
        </figure>
      ))}

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

      <Li dica={dica.id} inicial={lidas.has(dica.id)} />

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
