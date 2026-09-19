import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar/Avatares";
import { Barra } from "@/components/Barra";
import { DegrausDoGrau } from "@/components/progresso/SeloDoGrau";
import { ListaDeSelos } from "@/components/selos/ListaDeSelos";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { cursosParaOsSelos, selosGravados } from "@/lib/curso/selos-banco";
import { comDatas } from "@/lib/curso/selos-gravados";
import { aberturasDoRepertorio } from "@/lib/curso/selos-repertorio";
import { entradaZerada, selos } from "@/lib/curso/selos";
import { GRAUS, NOME_DO_GRAU } from "@/lib/progresso/grau";
import { resumoDosGraus } from "@/lib/progresso/resumo";
import { grausDosTemas } from "@/lib/progresso/tatica-banco";
import { lerIndice, linhasDaAbertura } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { professorAtual } from "@/lib/auth/perfil";
import { hojeNoBrasil, porExtenso, somarDias } from "@/lib/curso/calendario";
import { nivelDoAluno } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import {
  META_DO_DIA_MIN,
  MINIMO_DA_SEQUENCIA_MIN,
  MINUTOS_DA_PARTIDA,
  sequenciaDeDias,
  serieDeDias,
} from "@/lib/curso/hoje";
import { minutosPorDia, partidasDeclaradas } from "@/lib/curso/minutos";
import { aulasComPratica, aulasExtras, aulasPublicadas } from "@/lib/finais/conteudo";
import { DEGRAUS_EM_DIAS, diasAteRevisar } from "@/lib/finais/escada";
import { progressoDeFinais } from "@/lib/finais/progresso";
import {
  aulasAbertas,
  CLASSE,
  CLASSES,
  daClasse,
  estadoDaAula,
  AULA_ZERADA,
} from "@/lib/finais/trilha";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BLOCOS } from "@/lib/tatica/blocos";
import { linhasDeTentativas, progressoPorTema, PUZZLES_POR_TEMA, soOServivel, temaZerado } from "@/lib/tatica/progresso";
import { filaCompleta, INTERVALOS_DA_REVISAO } from "@/lib/tatica/revisao";
import { evolucaoDoAluno } from "@/lib/tatica/rating-leitura";
import { EvolucaoDoRating } from "@/components/tatica/EvolucaoDoRating";
import { formatarTempoEstudo, percentualDeAcerto } from "@/lib/turma/atividade";
import { turmaVisivel } from "@/lib/turma/vitrine";
import { GerirConta } from "./GerirConta";

/**
 * O relatório de um aluno — a tela que o professor abre antes da conversa.
 *
 * ## Por que ela existe separada da tabela da turma
 *
 * `/professor` responde "como vai a turma?" em uma linha por aluno. Esta
 * responde "o que eu digo para **este** aluno no sábado?", e a diferença não é
 * de tamanho: são perguntas com respostas de naturezas diferentes. A tabela
 * mostra totais; aqui mostra-se **onde** o total foi feito — em que tema o
 * acerto caiu, em que dia ele não treinou, que aula está vencida na revisão.
 *
 * ## Nada aqui é recalculado
 *
 * Todo número desta página vem da mesma função que o aluno vê no painel dele:
 * `progressoPorTema`, `dominou`, `agendaDeRevisao`, `filaCompleta`,
 * `serieDeDias`. É o que permite ao professor dizer o número **em voz alta com
 * o aluno na frente** sem que a tela do aluno o desminta.
 *
 * ## Quem filtra é a RLS, e a segunda tranca é `professorAtual`
 *
 * As políticas de 0002, 0004 e 0005 entregam ao professor as linhas de todos os
 * alunos; o `aluno` da rota escolhe **qual** olhar. `professorAtual()` recusa o
 * aluno que digitar a URL de um colega — e a RLS o recusaria de novo, porque
 * para ele as consultas voltariam vazias.
 */

export const metadata: Metadata = { title: "Relatório do aluno — Preparatório OLESC" };

const EQUIPE = { M: "Masculina", F: "Feminina" } as const;

/** Quantos dias para trás o relatório olha. Duas semanas: o preparatório tem quatro. */
const DIAS = 14;

export default async function RelatorioDoAluno({ params }: PageProps<"/professor/[aluno]">) {
  const professor = await professorAtual();
  const { aluno: id } = await params;

  const supabase = await criarClienteServidor();
  const { data: aluno } = await supabase
    .from("perfis")
    .select("id, usuario, nome, equipe, turma, tabuleiro, rating, papel, avatar")
    .eq("id", id)
    .maybeSingle();
  if (!aluno || aluno.papel !== "aluno") notFound();

  const hoje = hojeNoBrasil();
  const desde = somarDias(hoje, -(DIAS - 1));

  const [
    tatica,
    linhas,
    finais,
    minutos,
    partidas,
    conquistado,
    evolucaoNoRating,
    gravados,
    trava,
    indice,
    repertorio,
    grausDeTatica,
    gruposDaTurma,
  ] = await Promise.all([
    progressoPorTema(id),
    linhasDeTentativas(id),
    progressoDeFinais(id),
    minutosPorDia(id, desde),
    partidasDeclaradas(id, desde),
    nivelConquistado(id),
    evolucaoDoAluno(id),
    // 17/9/2026: selos com data, graus e aulas de abertura — o que o aluno vê em "Meu perfil".
    // Os selos são **só lidos**: o relatório não deriva nem grava nada no nome do aluno (a
    // derivação completa pediria o progresso inteiro dele, e quem grava é a tela do próprio aluno).
    selosGravados(id),
    // `papel: "aluno"`, e não o de quem olha: a trava e as aulas concluídas são as do aluno.
    travaDoAluno({ id, papel: "aluno" }),
    lerIndice(),
    // Com o id, sempre: na sessão do professor, sem ele, a leitura devolveria a turma inteira.
    progressoDoRepertorio(id),
    grausDosTemas(id),
    turmaVisivel(professor),
  ]);

  const nivel = nivelDoAluno(conquistado);
  const abertas = aulasAbertas(aulasPublicadas(), aulasExtras());
  const comPratica = aulasComPratica();
  // As partidas entram na série: sem elas o gráfico do professor e a barra do
  // aluno somariam totais diferentes para o mesmo dia — e o professor diria o
  // número em voz alta com o aluno na frente, olhando outro número.
  const serie = serieDeDias(minutos, hoje, DIAS, partidas);
  const sequencia = sequenciaDeDias(minutos, hoje);
  // Só o que o disco ainda serve — a mesma fila que o painel do aluno conta.
  const fila = await soOServivel(filaCompleta(linhas));
  const devidosHoje = fila.filter((f) => f.devidoEm <= hoje);
  const pico = Math.max(META_DO_DIA_MIN, ...serie.map((d) => d.total));

  /*
   * A fila de finais, lida da escada em vez de derivada do log.
   *
   * `dias` é quantos faltam até a aula voltar: 0 é "vencida hoje", e `null`
   * quer dizer que ela nem entrou na escada — nunca vencida, ou derrubada por
   * uma partida perdida antes de estar aprendida. Estas ficam de fora da fila,
   * e é o certo: elas não estão atrasadas, estão por começar.
   */
  const agoraNosFinais = new Date().toISOString();
  const revisoesDeFinais = abertas
    .map((aula) => ({
      aula,
      dias: diasAteRevisar(finais.get(aula.id)?.escada ?? { degrau: 0, revisarEm: null, tentativas: 0, erros: 0, aprendidaEm: null, ultimaEm: null }, agoraNosFinais),
    }))
    .filter((r): r is { aula: (typeof abertas)[number]; dias: number } => r.dias !== null)
    .sort((a, b) => a.dias - b.dias);

  const catalogo = selos(entradaZerada(cursosParaOsSelos(trava, indice), aberturasDoRepertorio(indice, new Map(), new Set())));
  const selosDoAluno = comDatas(catalogo, gravados).filter((s) => s.ganho);
  const graus = resumoDosGraus({
    indice,
    repertorio,
    trava,
    finais,
    abertasDeFinais: abertas,
    comPratica,
    grausDeTatica,
    agora: agoraNosFinais,
  });
  const aulasDeAbertura = trava.aulas.filter((a) => trava.concluidas.has(a.id));
  const naTurma = gruposDaTurma.flatMap((grupo) => grupo.colegas).find((colega) => colega.id === id);
  const acertoGeral = naTurma ? percentualDeAcerto(naTurma.atividade) : null;

  const linhasPorAbertura = (
    await Promise.all(
      indice.map(async (abertura) => {
        const linhasAtuais = await linhasDaAbertura(abertura.cor, abertura.abertura);
        const treinadas = linhasAtuais.flatMap((linha) => {
          const progresso = repertorio.get(linha.id);
          if (!progresso || progresso.tentativas === 0) return [];
          return [{
            id: linha.id,
            nome: linha.nome,
            tentativas: progresso.tentativas,
            certas: Math.max(0, progresso.tentativas - progresso.erros),
            erros: progresso.erros,
          }];
        });
        return { id: `${abertura.cor}/${abertura.abertura}`, nome: abertura.nome, linhas: treinadas };
      }),
    )
  ).filter((abertura) => abertura.linhas.length > 0);
  const finaisPraticados = abertas.filter((aula) => {
    const progresso = finais.get(aula.id);
    return Boolean(progresso && (progresso.tentativas > 0 || progresso.lida));
  });

  const temasComTrabalho = BLOCOS.flatMap((bloco) =>
    bloco.temas.map((tema) => ({ bloco, tema, p: tatica.get(tema.tag) ?? temaZerado() })),
  ).filter((t) => t.p.tentativas > 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="cartao overflow-hidden">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-metodo-superficie/12 to-transparent px-5 py-5 sm:px-6 sm:py-6">
          <Link href="/professor" className="foco rotulo w-fit text-metodo-tinta hover:underline">
            ← Alunos
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar id={aluno.avatar as string | null} tamanho={68} />
            <div className="min-w-0">
              <p className="rotulo mb-1 text-tinta-fraca">Relatório do aluno</p>
              <h1 className="titulo truncate text-tinta">{aluno.nome}</h1>
              <p className="mt-1 text-xs text-tinta-fraca">Nível {nivel} de 5 · {porExtenso(desde)} a {porExtenso(hoje)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs text-tinta-media">
            <span className="rounded-full border border-borda-fraca bg-papel/20 px-2.5 py-1 font-mono">@{aluno.usuario}</span>
            {aluno.turma === "testadores" ? <span className="rounded-full border border-borda-fraca bg-papel/20 px-2.5 py-1">Turma de testadores</span> : null}
            {aluno.equipe ? <span className="rounded-full border border-borda-fraca bg-papel/20 px-2.5 py-1">Equipe {EQUIPE[aluno.equipe as "M" | "F"]}</span> : null}
            {aluno.tabuleiro ? <span className="rounded-full border border-borda-fraca bg-papel/20 px-2.5 py-1">Tabuleiro {aluno.tabuleiro}</span> : null}
            {aluno.rating ? <span className="rounded-full border border-borda-fraca bg-papel/20 px-2.5 py-1">Rating de entrada {aluno.rating}</span> : null}
          </div>
        </div>
        <nav aria-label="Seções do relatório" className="flex gap-1 overflow-x-auto border-t border-borda-fraca bg-carta-alta/20 px-3 py-2 text-sm sm:px-5">
          {[["#resumo", "Resumo"], ["#conquistas", "Conquistas"], ["#tatica", "Tática"], ["#revisao", "Revisão"], ["#finais", "Finais"]].map(([href, nome]) => (
            <a key={href} href={href} className="foco shrink-0 rounded-lg px-3 py-2 font-medium text-tinta-media hover:bg-carta-toque hover:text-tinta">{nome}</a>
          ))}
        </nav>
      </header>

      <section id="resumo" aria-labelledby="titulo-resumo" className="flex scroll-mt-4 flex-col gap-4">
        <div>
          <h2 id="titulo-resumo" className="rotulo text-tinta-fraca">Resumo geral</h2>
          <p className="text-sm text-tinta-media">Toda a atividade registrada desde a criação da conta.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumeroPrincipal valor={formatarTempoEstudo(naTurma?.atividade.tempoMs ?? 0)} rotulo="Tempo de estudo" detalhe="atividade registrada" destaque />
          <NumeroPrincipal valor={naTurma?.atividade.ratingTatica === null || naTurma?.atividade.ratingTatica === undefined ? "—" : Math.round(naTurma.atividade.ratingTatica)} rotulo="Rating de tática" detalhe="rating atual" />
          <div className="cartao overflow-hidden md:col-span-2">
            <div className="border-b border-borda-fraca px-4 py-3">
              <p className="text-xs font-medium text-tinta-fraca">Puzzles</p>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-borda-fraca sm:grid-cols-4">
              <DadoCompacto valor={naTurma?.atividade.puzzlesFeitos ?? 0} rotulo="feitos" />
              <DadoCompacto valor={acertoGeral === null ? "—" : `${acertoGeral}%`} rotulo="de acerto" destaque />
              <DadoCompacto valor={naTurma?.atividade.puzzlesCertos ?? 0} rotulo="certos" />
              <DadoCompacto valor={naTurma?.atividade.puzzlesErrados ?? 0} rotulo="errados" />
            </dl>
          </div>
          <div className="cartao flex items-center justify-between gap-5 px-4 py-4 md:col-span-2 xl:col-span-4">
            <div>
              <p className="text-sm font-semibold text-tinta">Linhas de abertura</p>
              <p className="mt-0.5 text-xs text-tinta-fraca">Da primeira tentativa até o domínio</p>
            </div>
            <dl className="flex shrink-0 gap-6 sm:gap-10">
              <DadoEmLinha valor={naTurma?.atividade.linhasEstudadas ?? 0} rotulo="estudadas" />
              <DadoEmLinha valor={naTurma?.atividade.linhasDominadas ?? 0} rotulo="dominadas" destaque />
            </dl>
          </div>
        </div>
        <p className="text-xs text-tinta-fraca">
          Números acumulados dos treinos. A lista da equipe usa somente o tempo registrado para ordenar, sem pontos.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="cartao flex flex-col gap-3 px-4 py-4">
            <div>
              <h3 className="font-semibold text-tinta">Linhas de abertura estudadas</h3>
              <p className="text-xs text-tinta-fraca tabular-nums">
                {naTurma?.atividade.linhasEstudadas ?? 0} estudadas · {naTurma?.atividade.linhasDominadas ?? 0} dominadas
              </p>
            </div>
            {linhasPorAbertura.length === 0 ? (
              <p className="text-sm text-tinta-fraca">Nenhuma linha treinada ainda.</p>
            ) : (
              <div className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-1">
                {linhasPorAbertura.map((abertura) => (
                  <div key={abertura.id} className="flex flex-col gap-1.5">
                    <h4 className="text-xs font-semibold text-tinta-media">{abertura.nome}</h4>
                    <ul className="flex flex-col gap-1">
                      {abertura.linhas.map((linha) => (
                        <li key={linha.id} className="flex items-start justify-between gap-3 rounded-lg bg-carta-alta/25 px-3 py-2 text-sm">
                          <span className="min-w-0 text-tinta">{linha.nome}</span>
                          <span className="shrink-0 text-xs text-tinta-fraca tabular-nums">
                            {linha.certas} certas · {linha.erros} erros
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cartao flex flex-col gap-3 px-4 py-4">
            <div>
              <h3 className="font-semibold text-tinta">Finais praticados</h3>
              <p className="text-xs text-tinta-fraca tabular-nums">{finaisPraticados.length} de {abertas.length} aulas publicadas</p>
            </div>
            {finaisPraticados.length === 0 ? (
              <p className="text-sm text-tinta-fraca">Nenhum final praticado ainda.</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {finaisPraticados.map((aula) => {
                  const progresso = finais.get(aula.id) ?? AULA_ZERADA;
                  const estado = estadoDaAula(comPratica.has(aula.id), progresso);
                  return (
                    <li key={aula.id} className="rounded-lg border border-borda-fraca bg-carta-alta/20 px-3 py-2.5 text-sm">
                      <span className="block text-tinta">{aula.nome}</span>
                      <span className="text-xs text-tinta-fraca tabular-nums">{estado} · {progresso.tentativas} tentativas</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- *
       * O que o aluno vê em "Meu perfil" (17/9/2026): selos com data, graus e
       * aulas de abertura. Antes da rotina, porque é por aqui que a conversa de
       * sábado costuma começar — pelo que ele conquistou.
       * ---------------------------------------------------------------- */}
      <section id="conquistas" className="flex scroll-mt-4 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">Conquistas</h2>
          <p className="text-sm text-tinta-media">
            Os selos gravados, com o dia em que apareceram para o aluno. Selo gravado não some, mesmo se o
            conteúdo mudar depois.
          </p>
        </div>
        {selosDoAluno.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            Nenhum selo gravado ainda. Eles são gravados quando o aluno abre o painel ou o perfil.
          </p>
        ) : (
          <div className="cartao px-4 py-4">
            <ListaDeSelos selos={selosDoAluno} rotulo={`Selos de ${aluno.nome}`} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">Graus</h2>
          <p className="text-sm text-tinta-media">
            O grau de cada linha treinada, aula de finais começada e tema de tática — a mesma régua que o
            aluno vê. Sobe com acerto no dia da revisão e desce com erro.
          </p>
        </div>
        {/* Uma tabela, e não três escadas: o professor compara as frentes linha a linha, e seis
            colunas de grau cabem numa tabela de 4xl, não em três cartões de um terço. */}
        <div className="cartao overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borda-fraca text-left text-tinta-fraca">
                <Th>Frente</Th>
                {GRAUS.map((g) => (
                  <th key={g} className="px-3 py-2 font-medium">
                    <span className="inline-flex items-end gap-1.5">
                      <DegrausDoGrau grau={g} />
                      {NOME_DO_GRAU[g]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Aberturas", graus.porFrente.aberturas, "linhas treinadas"],
                  ["Finais", graus.porFrente.finais, "aulas começadas"],
                  ["Tática", graus.porFrente.tatica, "temas tocados"],
                ] as const
              ).map(([nome, contagem, unidade]) => (
                <tr key={nome} className="border-b border-borda-fraca last:border-0">
                  <Td>
                    <span className="text-tinta">{nome}</span>
                    <span className="block text-xs text-tinta-fraca tabular-nums">
                      {[...contagem.values()].reduce((a, b) => a + b, 0)} {unidade}
                    </span>
                  </Td>
                  {GRAUS.map((g) => (
                    <Td key={g}>
                      <span className={`tabular-nums ${contagem.get(g) ? "font-semibold text-tinta" : "text-tinta-fraca"}`}>
                        {contagem.get(g) ?? 0}
                      </span>
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">Aulas de abertura concluídas</h2>
          <p className="text-sm text-tinta-media">
            {aulasDeAbertura.length} de {trava.aulas.length} aulas publicadas. Enquanto uma aula não é concluída, as
            linhas dela ficam trancadas no treino.
          </p>
        </div>
        {aulasDeAbertura.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">Nenhuma aula de abertura concluída.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {aulasDeAbertura.map((aula) => {
              const vezes = trava.concluidas.get(aula.id) ?? 0;
              return (
                <li
                  key={aula.id}
                  className="rounded-full border border-metodo-cheio bg-metodo-superficie/14 px-2.5 py-0.5 text-xs text-metodo-tinta-alta"
                >
                  {aula.titulo}
                  {vezes > 1 ? <span className="text-tinta-fraca tabular-nums"> · {vezes} vezes</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">A rotina — {DIAS} dias</h2>
          <p className="text-sm text-tinta-media">
            Minutos por dia, somados de cada puzzle e de cada etapa de aula, mais os{" "}
            {MINUTOS_DA_PARTIDA} da partida quando ela foi declarada. A meta é {META_DO_DIA_MIN}{" "}
            min; {MINIMO_DA_SEQUENCIA_MIN} é o mínimo que mantém a sequência — e esse mínimo{" "}
            <strong className="font-semibold">só conta tempo medido</strong>, sem a partida.
          </p>
        </div>

        <div className="flex flex-col gap-3 cartao px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm tabular-nums">
            <span className="text-tinta">
              <span className="font-semibold">{sequencia}</span>{" "}
              <span className="text-tinta-fraca">
                {sequencia === 1 ? "dia seguido" : "dias seguidos"}
              </span>
            </span>
            <span className="text-tinta">
              <span className="font-semibold">{serie.filter((d) => d.bateuMeta).length}</span>{" "}
              <span className="text-tinta-fraca">de {DIAS} dias na meta</span>
            </span>
            <span className="text-tinta">
              <span className="font-semibold">{serie.filter((d) => d.total === 0).length}</span>{" "}
              <span className="text-tinta-fraca">dias sem treino</span>
            </span>
            <span className="text-tinta">
              <span className="font-semibold">{partidas.size}</span>{" "}
              <span className="text-tinta-fraca">partidas declaradas</span>
            </span>
          </div>

          {/* O gráfico é de divs: catorze barras não pagam uma biblioteca, e
              uma biblioteca de gráfico no pacote do servidor pagaria por todas
              as rotas. A altura é proporcional ao pico, e a linha da meta é
              desenhada por cima para o professor ler sem contar pixel. */}
          <div className="relative flex h-28 items-end gap-1">
            <div
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-metodo-superficie"
              style={{ bottom: `${(META_DO_DIA_MIN / pico) * 100}%` }}
            />
            {serie.map((dia) => (
              <div key={dia.dia} className="flex h-full flex-1 flex-col justify-end gap-0.5">
                <div
                  title={`${dia.dia}: ${dia.total} min (tática ${dia.tatica}, finais ${dia.finais}` +
                    `${dia.partida ? `, partida ${dia.partida} declarados` : ""})`}
                  className={`w-full rounded-t-sm ${
                    dia.bateuMeta
                      ? "bg-metodo-cheio"
                      : dia.bateuMinimo
                        ? "bg-metodo-superficie"
                        : dia.total > 0
                          ? "bg-aviso-superficie"
                          : "bg-carta-alta"
                  }`}
                  style={{ height: `${Math.max((dia.total / pico) * 100, dia.total > 0 ? 4 : 2)}%` }}
                />
                <span className="text-center text-[10px] text-tinta-fraca tabular-nums">
                  {dia.dia.slice(8)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-tinta-fraca">
            Verde cheio: bateu os {META_DO_DIA_MIN} min do dia, partida incluída. Verde claro:{" "}
            passou dos {MINIMO_DA_SEQUENCIA_MIN} medidos. Âmbar: treinou menos que isso. Cinza:{" "}
            não treinou.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="tatica" className="scroll-mt-4 rotulo text-tinta-fraca">Tática, tema a tema</h2>
          <p className="text-sm text-tinta-media">
            O acerto da <strong>prova</strong> é a coluna que decide: ela é a única em que o
            aluno resolve sem tema anunciado, e ela inclui de propósito os puzzles que ele
            errou antes.
          </p>
        </div>

        {temasComTrabalho.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            Nenhum puzzle resolvido ainda.
          </p>
        ) : (
          <div className="cartao overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda-fraca text-left text-tinta-fraca">
                  <Th>Tema</Th>
                  <Th>Feitos</Th>
                  <Th>Acerto</Th>
                  <Th>Prova</Th>
                  <Th>Tempo médio</Th>
                  <Th>Última</Th>
                </tr>
              </thead>
              <tbody>
                {temasComTrabalho.map(({ bloco, tema, p }) => {
                  const acerto = Math.round((100 * p.certos) / p.tentativas);
                  const naProva = p.feitos.prova;
                  const acertoDaProva =
                    naProva > 0 ? Math.round((100 * p.acertos.prova) / naProva) : null;
                  const medio = p.tempoMedioMs.serie ?? p.tempoMedioMs.aquecimento;

                  return (
                    <tr key={tema.tag} className="border-b border-borda-fraca last:border-0">
                      <Td>
                        <span className="text-tinta">{tema.nome}</span>
                        <span className="block text-xs text-tinta-fraca">bloco {bloco.id}</span>
                      </Td>
                      <Td>
                        <span className="tabular-nums">
                          {p.tentativas}
                          <span className="text-tinta-fraca">/{PUZZLES_POR_TEMA}</span>
                        </span>
                        <span className="mt-1 block w-20">
                          <Barra feitos={p.tentativas} de={PUZZLES_POR_TEMA} />
                        </span>
                      </Td>
                      <Td>
                        <Percentual valor={acerto} />
                      </Td>
                      <Td>
                        {acertoDaProva === null ? (
                          <span className="text-tinta-fraca">—</span>
                        ) : (
                          <>
                            <Percentual valor={acertoDaProva} />
                            <span className="block text-xs text-tinta-fraca tabular-nums">
                              {naProva} feitos
                            </span>
                          </>
                        )}
                      </Td>
                      <Td>
                        <span className="tabular-nums text-tinta-media">
                          {medio === null ? "—" : `${Math.round(medio / 1000)} s`}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-tinta-fraca">
                          {p.ultima ? porExtenso(hojeNoBrasil(new Date(p.ultima))) : "—"}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-tinta-fraca">
          &quot;Feitos&quot; pode passar de {PUZZLES_POR_TEMA}: a prova serve de novo os
          puzzles que o aluno errou, e a revisão do dia grava no tema de origem. Nenhuma das
          duas repetições decide domínio nem tarefa — elas contam como trabalho, que é o que
          são.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">Rating de tática</h2>
          <p className="text-sm text-tinta-media">
            O modo de problemas misturados (Glicko-2). Todo aluno começa em 600, e
            a partir daí sobe e desce a cada problema, de 10 a 20 pontos. O erro dele volta na revisão do dia,
            e não na prova do tema.
          </p>
        </div>
        {evolucaoNoRating ? (
          <EvolucaoDoRating evolucao={evolucaoNoRating} paraOAluno={false} />
        ) : (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            Ainda não jogou a tática rating.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="revisao" className="scroll-mt-4 rotulo text-tinta-fraca">Fila de revisão</h2>
          <p className="text-sm text-tinta-media">
            Tática: errou, volta em {INTERVALOS_DA_REVISAO[0]} dias; acertou no prazo, em{" "}
            {INTERVALOS_DA_REVISAO[1]}, depois em {INTERVALOS_DA_REVISAO[2]}. Finais: uma escada de{" "}
            {DEGRAUS_EM_DIAS.slice(1).join(", ")} dias — a aula fica{" "}
            <strong className="font-semibold">aprendida</strong> no terceiro degrau, e cada degrau
            só sobe num dia em que ela já tenha vencido.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 cartao px-4 py-3">
            <span className="text-sm font-medium text-tinta">Puzzles</span>
            <span className="text-sm text-tinta-media tabular-nums">
              <strong className={devidosHoje.length > 0 ? "text-aviso-tinta" : "text-tinta"}>
                {devidosHoje.length}
              </strong>{" "}
              devidos hoje · {fila.length} na fila
            </span>
            {fila.length > 0 ? (
              <span className="text-xs text-tinta-fraca tabular-nums">
                próximo em {fila[0].devidoEm}
              </span>
            ) : (
              <span className="text-xs text-tinta-fraca">Nada em aberto.</span>
            )}
          </div>

          <div className="flex flex-col gap-1 cartao px-4 py-3">
            <span className="text-sm font-medium text-tinta">Aulas de finais</span>
            <span className="text-sm text-tinta-media tabular-nums">
              <strong
                className={
                  revisoesDeFinais.filter((r) => r.dias === 0).length > 0
                    ? "text-aviso-tinta"
                    : "text-tinta"
                }
              >
                {revisoesDeFinais.filter((r) => r.dias === 0).length}
              </strong>{" "}
              devidas hoje · {revisoesDeFinais.length} na fila
            </span>
            {revisoesDeFinais.length > 0 ? (
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {revisoesDeFinais.slice(0, 4).map(({ aula, dias }) => (
                  <li key={aula.id} className="text-xs text-tinta-fraca tabular-nums">
                    {aula.nome} — {dias === 0 ? "vencida" : `em ${dias} dia${dias === 1 ? "" : "s"}`}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-tinta-fraca">Nenhuma aula aprendida ainda.</span>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="finais" className="scroll-mt-4 rotulo text-tinta-fraca">Finais, aula a aula</h2>
          <p className="text-sm text-tinta-media">
            Só as {abertas.length} aulas publicadas. O critério de domínio é o do formato de
            cada uma — o mesmo que a trilha do aluno usa.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {CLASSES.map((classe) => {
            const daqui = daClasse(abertas, classe);
            if (daqui.length === 0) return null;
            return (
              <div key={classe} className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-tinta-media">
                  {CLASSE[classe].nome} · {CLASSE[classe].faixa}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {daqui.map((aula) => {
                    const estado = estadoDaAula(
                      comPratica.has(aula.id),
                      finais.get(aula.id) ?? AULA_ZERADA,
                    );
                    return (
                      <li key={aula.id}>
                        <span
                          title={`${aula.nome} — ${estado}`}
                          className={`inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-xs ${
                            estado === "aprendida"
                              ? "border-metodo-cheio bg-metodo-superficie/14 text-metodo-tinta-alta"
                              : estado === "praticando"
                                ? "border-aviso bg-aviso-superficie/14 text-aviso-tinta"
                                : "border-borda text-tinta-fraca"
                          }`}
                        >
                          {estado === "aprendida" ? "✓ " : ""}
                          {aula.nome}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <GerirConta id={aluno.id} nome={aluno.nome} usuario={aluno.usuario} />
    </main>
  );
}

/**
 * O percentual, com a cor de quem passou dos 70.
 *
 * Setenta é o alvo que a tarefa de casa escreve (`content/tarefas.json`), e ele
 * é **alvo, não trava**: o âmbar aqui é para o professor puxar assunto, não
 * para o aluno ver — esta tela é a do professor.
 */
function Percentual({ valor }: { valor: number }) {
  return (
    <span
      className={`text-sm font-medium tabular-nums ${
        valor >= 70 ? "text-metodo-tinta" : "text-aviso-tinta"
      }`}
    >
      {valor}%
    </span>
  );
}

function NumeroPrincipal({
  valor,
  rotulo,
  detalhe,
  destaque = false,
}: {
  valor: React.ReactNode;
  rotulo: string;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <div className={`cartao px-4 py-4 ${destaque ? "border-metodo-cheio bg-metodo-superficie/10" : ""}`}>
      <span className="text-xs font-medium text-tinta-fraca">{rotulo}</span>
      <strong className={`mt-1 block text-2xl tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</strong>
      <span className="mt-1 block text-xs text-tinta-fraca">{detalhe}</span>
    </div>
  );
}

function DadoCompacto({ valor, rotulo, destaque = false }: { valor: React.ReactNode; rotulo: string; destaque?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-tinta-fraca">{rotulo}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</dd>
    </div>
  );
}

function DadoEmLinha({ valor, rotulo, destaque = false }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className="text-right">
      <dt className="text-xs text-tinta-fraca">{rotulo}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top text-tinta">{children}</td>;
}
