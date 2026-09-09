import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/Barra";
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
import { aulasPublicadas } from "@/lib/finais/conteudo";
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
import { linhasDeTentativas, progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";
import { filaCompleta, INTERVALOS_DA_REVISAO } from "@/lib/tatica/revisao";

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
  await professorAtual();
  const { aluno: id } = await params;

  const supabase = await criarClienteServidor();
  const { data: aluno } = await supabase
    .from("perfis")
    .select("id, usuario, nome, equipe, tabuleiro, rating, papel")
    .eq("id", id)
    .maybeSingle();
  if (!aluno || aluno.papel !== "aluno") notFound();

  const hoje = hojeNoBrasil();
  const desde = somarDias(hoje, -(DIAS - 1));

  const [tatica, linhas, finais, minutos, partidas, conquistado] = await Promise.all([
    progressoPorTema(id),
    linhasDeTentativas(id),
    progressoDeFinais(id),
    minutosPorDia(id, desde),
    partidasDeclaradas(id, desde),
    nivelConquistado(id),
  ]);

  const nivel = nivelDoAluno(conquistado);
  const abertas = aulasAbertas(aulasPublicadas());
  // As partidas entram na série: sem elas o gráfico do professor e a barra do
  // aluno somariam totais diferentes para o mesmo dia — e o professor diria o
  // número em voz alta com o aluno na frente, olhando outro número.
  const serie = serieDeDias(minutos, hoje, DIAS, partidas);
  const sequencia = sequenciaDeDias(minutos, hoje);
  const fila = filaCompleta(linhas);
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

  const temasComTrabalho = BLOCOS.flatMap((bloco) =>
    bloco.temas.map((tema) => ({ bloco, tema, p: tatica.get(tema.tag) ?? temaZerado() })),
  ).filter((t) => t.p.tentativas > 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/professor" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Alunos
        </Link>
        <h1 className="titulo text-tinta">{aluno.nome}</h1>
        <p className="text-sm text-tinta-media">
          <span className="font-mono text-xs">{aluno.usuario}</span>
          {aluno.equipe ? ` · equipe ${EQUIPE[aluno.equipe as "M" | "F"]}` : ""}
          {aluno.tabuleiro ? ` · tabuleiro ${aluno.tabuleiro}` : ""}
          {aluno.rating ? ` · rating ${aluno.rating}` : ""}
        </p>
        <p className="text-xs text-tinta-fraca">
          Nível {nivel} de 5 · dados de {porExtenso(desde)} a {porExtenso(hoje)}.
        </p>
      </header>

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

        <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
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
          <h2 className="rotulo text-tinta-fraca">Tática, tema a tema</h2>
          <p className="text-sm text-tinta-media">
            O acerto da <strong>prova</strong> é a coluna que decide: ela é a única em que o
            aluno resolve sem tema anunciado, e ela inclui de propósito os puzzles que ele
            errou antes.
          </p>
        </div>

        {temasComTrabalho.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
            Nenhum puzzle resolvido ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borda-fraca bg-carta">
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
          <h2 className="rotulo text-tinta-fraca">Fila de revisão</h2>
          <p className="text-sm text-tinta-media">
            Tática: errou, volta em {INTERVALOS_DA_REVISAO[0]} dias; acertou no prazo, em{" "}
            {INTERVALOS_DA_REVISAO[1]}, depois em {INTERVALOS_DA_REVISAO[2]}. Finais: uma escada de{" "}
            {DEGRAUS_EM_DIAS.slice(1).join(", ")} dias — a aula fica{" "}
            <strong className="font-semibold">aprendida</strong> no terceiro degrau, e cada degrau
            só sobe num dia em que ela já tenha vencido.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
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

          <div className="flex flex-col gap-1 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
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
          <h2 className="rotulo text-tinta-fraca">Finais, aula a aula</h2>
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
                    const estado = estadoDaAula(aula.formato, finais.get(aula.id) ?? AULA_ZERADA);
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top text-tinta">{children}</td>;
}
