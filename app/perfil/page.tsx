import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { AvisoDeSeloNovo } from "@/components/selos/AvisoDeSeloNovo";
import { ConquistasDoPerfil, SelosPerto } from "@/components/selos/ListaDeSelos";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { perfilAtual } from "@/lib/auth/perfil";
import { hojeNoBrasil, somarDias } from "@/lib/curso/calendario";
import { maiorSequenciaDeDias, sequenciaDeDias } from "@/lib/curso/hoje";
import { minutosPorDia } from "@/lib/curso/minutos";
import { METAL, nivelDoAluno } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { entradaDosSelos, puzzlesDoAluno, sincronizarSelos } from "@/lib/curso/selos-banco";
import { ganhos, proximos } from "@/lib/curso/selos";
import { aulasComPratica, aulasExtras, aulasPublicadas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { aulasAbertas } from "@/lib/finais/trilha";
import { resumoDosGraus } from "@/lib/progresso/resumo";
import { grausDosTemas } from "@/lib/progresso/tatica-banco";
import { lerIndice } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { progressoPorTema, revisaoDeHoje } from "@/lib/tatica/progresso";
import { ratingDoAluno } from "@/lib/tatica/rating-leitura";
import { CabecaDoBloco, Graus, RevisarHoje } from "./Graus";
import { TrocaDeAvatar } from "./TrocaDeAvatar";

export const metadata: Metadata = { title: "Meu perfil — Preparatório OLESC" };

const EQUIPE = { M: "Equipe masculina", F: "Equipe feminina" } as const;

/**
 * "Meu perfil": quem o aluno é, o que ele conquistou, e onde ele está em cada coisa (17/9/2026).
 *
 * ## Duas páginas numa
 *
 * Até 17/9 eram duas: `/perfil` (o avatar) e `/progresso` (os graus). O Doug pediu uma só — o
 * aluno não separa "quem eu sou" de "o que eu fiz", e duas entradas no menu para a mesma pergunta
 * eram uma a mais. `/progresso` agora redireciona para cá.
 *
 * ## A ordem
 *
 * 1. **Quem é**: avatar, nome, nível com o metal, e "Trocar avatar" — fechado, para a grade de
 *    vinte desenhos não empurrar o resto para baixo.
 * 2. **Os dois números que são só dele**: a sequência (e o recorde) e o recorde da tática rating.
 *    Nenhum dos dois aparece na vitrine que os colegas veem (`/turma/[id]`).
 * 3. **Selo novo**, quando há: o aviso com confete, uma vez só.
 * 4. **A revisar hoje** — a única parte da página que pede ação agora.
 * 5. **Conquistas**: as seis mais recentes, "Ver todas as N" abrindo a coleção aqui mesmo, e as
 *    três mais perto.
 * 6. **Os graus** — o que era `/progresso`, sem mudança de regra.
 *
 * Até 17/9 as conquistas vinham antes da revisão, uma linha por selo. Com as 45 ganhas, "A revisar
 * hoje" começava a 4.648 px no celular — o aluno rolava a coleção inteira para achar o que tinha
 * de fazer (pergunta do Doug, 17/9/2026). A revisão subiu, e a coleção ficou compacta e fechada.
 *
 * ## As leituras são as do painel
 *
 * Os selos saem de `entradaDosSelos` e `sincronizarSelos`, as mesmas funções do painel: as duas
 * telas não podem discordar sobre o que ele ganhou. `progressoDoRepertorio` recebe o id (e não
 * depende só da RLS): na sessão do professor, sem o id, ela devolveria a turma inteira.
 */
export default async function Perfil() {
  const perfil = await perfilAtual();
  const hoje = hojeNoBrasil();

  const [indice, repertorio, trava, finais, devidosDeTatica, grausDeTatica, progresso, minutos, conquistado, ratingTatica, puzzles] =
    await Promise.all([
      lerIndice(),
      progressoDoRepertorio(perfil.id),
      travaDoAluno(perfil),
      progressoDeFinais(perfil.id),
      revisaoDeHoje(perfil.id),
      grausDosTemas(perfil.id),
      progressoPorTema(perfil.id),
      // O histórico inteiro: os selos não expiram. A sequência de agora recorta 30 dias abaixo.
      minutosPorDia(perfil.id),
      nivelConquistado(perfil.id),
      ratingDoAluno(perfil.id),
      puzzlesDoAluno(perfil.id),
    ]);

  const nivel = nivelDoAluno(conquistado);
  const sequencia = sequenciaDeDias(
    minutos.filter((l) => l.dia >= somarDias(hoje, -30)),
    hoje,
  );
  const recordeDeDias = maiorSequenciaDeDias(minutos);

  const abertasDeFinais = aulasAbertas(aulasPublicadas(), aulasExtras());
  const comPratica = aulasComPratica();

  const { lista, novos } = await sincronizarSelos(
    perfil.id,
    entradaDosSelos({
      progresso,
      finais,
      aulasDeFinais: abertasDeFinais,
      comPratica,
      indice,
      repertorio,
      trava,
      conquistado,
      minutos,
      ratingTatica,
      puzzles,
    }),
  );
  const conquistas = ganhos(lista);
  const perto = proximos(lista, 3);

  const resumo = resumoDosGraus({
    indice,
    repertorio,
    trava,
    finais,
    abertasDeFinais,
    comPratica,
    grausDeTatica,
    agora: new Date().toISOString(),
  });

  const detalhes = [
    `usuário ${perfil.usuario}`,
    perfil.equipe ? EQUIPE[perfil.equipe] : perfil.papel === "professor" ? "Professor" : null,
    perfil.tabuleiro ? `tabuleiro ${perfil.tabuleiro}` : null,
  ].filter(Boolean);

  const recordeDoRating = ratingTatica && ratingTatica.resolvidos > 0 ? Math.round(ratingTatica.ratingMaximo) : null;

  return (
    <>
      <Cabecalho atual="perfil" nivel={nivel} sequencia={sequencia} />
      <Moldura largura="painel" barraInferior>
        {/* ---------------------------------------------------------------- */}
        <TrocaDeAvatar atual={perfil.avatar}>
          <header className="flex min-w-0 items-center gap-4 sm:gap-5">
            <Avatar id={perfil.avatar} tamanho={88} className="sm:size-24" />
            <div className="flex min-w-0 flex-col items-start gap-2">
              <h1 className="titulo break-words text-tinta">{perfil.nome}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_DO_NIVEL[nivel].pastilha}`}
              >
                Nível {nivel} · {METAL[nivel]}
              </span>
            </div>
          </header>
        </TrocaDeAvatar>

        {/* Os dois números que só o próprio aluno vê — a sequência e o rating da tática, cada um com o
            seu recorde. Uma faixa baixa, e não dois "cartões de métrica": são contexto, não a notícia
            da página. */}
        <dl className="cartao grid grid-cols-2 divide-x divide-borda-fraca">
          <div className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-xs text-tinta-fraca">Dias seguidos</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
              <span className="text-lg leading-tight font-semibold text-tinta">{sequencia}</span>
              <span className="text-xs text-tinta-fraca">recorde {recordeDeDias}</span>
            </dd>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-xs text-tinta-fraca">Tática rating</dt>
            {recordeDoRating === null || !ratingTatica ? (
              <dd>
                <Link href="/tatica/rating" className="foco -my-3 inline-flex min-h-11 items-center text-sm font-medium text-metodo-tinta hover:underline">
                  Jogar a primeira
                </Link>
              </dd>
            ) : (
              // O rating de agora é a notícia; o recorde fica pequeno ao lado, como nos dias seguidos
              // (pedido do Doug, 17/9/2026). Só aqui: a vitrine do colega nunca mostra rating.
              <dd className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
                <Link href="/tatica/rating" className="foco text-lg leading-tight font-semibold text-tinta hover:underline">
                  {Math.round(ratingTatica.rating)}
                </Link>
                <span className="text-xs text-tinta-fraca">recorde {recordeDoRating}</span>
              </dd>
            )}
          </div>
        </dl>

        {novos.length > 0 ? (
          <AvisoDeSeloNovo selos={novos.map(({ id, familia, nome, conta }) => ({ id, familia, nome, conta }))} />
        ) : null}

        <RevisarHoje resumo={resumo} devidosDeTatica={devidosDeTatica.length} />

        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="conquistas" className="flex flex-col gap-4">
          <CabecaDoBloco id="conquistas" titulo="Conquistas" resumo={`${conquistas.length} de ${lista.length}`} />
          {conquistas.length === 0 ? (
            <p className="text-sm text-tinta-fraca">
              Nenhuma ainda. Os selos abaixo dizem o que falta para os primeiros.
            </p>
          ) : (
            <ConquistasDoPerfil selos={conquistas} />
          )}
          {perto.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-borda-fraca pt-4">
              <h3 className="text-xs font-semibold text-tinta-media">Mais perto</h3>
              <SelosPerto selos={perto} />
            </div>
          ) : null}
        </section>

        <Graus resumo={resumo} />

        <footer className="flex flex-col gap-1 border-t border-borda-fraca pt-4 text-xs text-tinta-fraca">
          <p>{detalhes.join(" · ")}</p>
          <p>O nome é o que o professor cadastrou. Se estiver errado, fale com ele.</p>
        </footer>
      </Moldura>
    </>
  );
}
