import type { Metadata } from "next";
import Link from "next/link";
import { professorAtual } from "@/lib/auth/perfil";
import { editorLigado } from "@/lib/editor/local";
import { nivelDoAluno } from "@/lib/curso/nivel";
import { niveisDaTurma } from "@/lib/curso/progresso";
import { aulasComPratica, aulasExtras, aulasPublicadas } from "@/lib/finais/conteudo";
import { finaisDaTurma } from "@/lib/finais/progresso";
import { aprendidasDaTrilha, aulasAbertas, CLASSES, daClasse } from "@/lib/finais/trilha";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { formatarDelta } from "@/lib/tatica/rating";
import { ultimaVez } from "@/lib/tatica/rating-historico";
import { ratingsDaTurma } from "@/lib/tatica/rating-leitura";
import { CadastroDeAluno } from "./CadastroDeAluno";

export const metadata: Metadata = { title: "Professor — Preparatório OLESC" };

const EQUIPE = { M: "Masculina", F: "Feminina" } as const;

export default async function Professor() {
  await professorAtual();
  const supabase = await criarClienteServidor();

  // Ler todos os perfis só funciona porque `eh_professor()` abriu a política
  // de `select` — a mesma consulta feita por um aluno devolve uma linha só.
  const { data: alunos } = await supabase
    .from("perfis")
    .select("id, usuario, nome, equipe, tabuleiro, rating")
    .eq("papel", "aluno")
    .order("equipe", { nullsFirst: false })
    .order("nome");

  /*
   * A coluna "Finais": quantas aulas abertas cada aluno já domina.
   *
   * Uma consulta para a turma inteira, e não uma por aluno — com doze alunos,
   * doze idas ao banco na renderização de uma tabela é o tipo de lentidão que
   * ninguém investiga, porque cada consulta sozinha é rápida.
   *
   * A conta é a mesma do painel e da trilha (`dominadas()` sobre as aulas
   * abertas), e é justamente por ser a mesma que o professor pode dizer o
   * número em voz alta com o aluno na frente.
   */
  const abertas = aulasAbertas(aulasPublicadas(), aulasExtras());
  const comPratica = aulasComPratica();
  const [finais, niveis, ratings] = await Promise.all([finaisDaTurma(), niveisDaTurma(), ratingsDaTurma()]);
  // Maior rating primeiro, e quem nunca jogou no fim. A ordem é do professor:
  // o aluno não vê esta tabela, e não há ranking na tela dele.
  const turmaNoRating = [...(alunos ?? [])].sort(
    (a, b) => (ratings.get(b.id)?.rating ?? -1) - (ratings.get(a.id)?.rating ?? -1) || a.nome.localeCompare(b.nome),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="rotulo text-metodo-tinta">Área do professor</p>
          <h1 className="titulo text-tinta">Alunos</h1>
        </div>
        <Link
          href="/painel"
          className="foco rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
        >
          Voltar ao painel
        </Link>
      </header>

      {/* Só na máquina do Doug, em `npm run dev`. Na Vercel esta linha não
          existe — e a rota que ela aponta responde 404. */}
      {editorLigado() ? (
        <section className="flex flex-col gap-1">
          <h2 className="rotulo text-tinta-fraca">Modo editor</h2>
          <p className="text-sm text-tinta-media">
            <Link href="/editor" className="foco underline">
              Editar as aulas de finais
            </Link>{" "}
            — escreve nos arquivos deste computador.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">Criar conta</h2>
        <CadastroDeAluno />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">
          {alunos?.length ?? 0} {alunos?.length === 1 ? "aluno" : "alunos"}
        </h2>
        {alunos?.length ? (
          <div className="cartao overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda-fraca text-left text-tinta-fraca">
                  <Th>Nome</Th>
                  <Th>Usuário</Th>
                  <Th>Equipe</Th>
                  <Th>Tab.</Th>
                  <Th>Rating de entrada</Th>
                  <Th>Nível</Th>
                  <Th>Finais</Th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-borda-fraca last:border-0">
                    <Td>
                      {/* O nome é a porta do relatório: a tabela responde
                          "como vai a turma?", e a conversa de sábado é sempre
                          sobre um aluno. */}
                      <Link
                        href={`/professor/${aluno.id}`}
                        className="foco font-medium text-metodo-tinta hover:underline"
                      >
                        {aluno.nome}
                      </Link>
                    </Td>
                    <Td mono>{aluno.usuario}</Td>
                    <Td>{aluno.equipe ? EQUIPE[aluno.equipe as "M" | "F"] : "—"}</Td>
                    <Td>{aluno.tabuleiro ?? "—"}</Td>
                    {/* A célula tinha sumido em 394f75d (semana → nível) e o
                        título ficou: o nível aparecia embaixo de "Rating". */}
                    <Td>{aluno.rating ?? "—"}</Td>
                    {/* O degrau vem antes dos finais porque é a resposta de
                        uma palavra: é ele que diz o que o aluno está fazendo
                        hoje, e os finais são uma das três trilhas dele. */}
                    <Td>
                      <span className="tabular-nums">
                        {nivelDoAluno(niveis.get(aluno.id) ?? 0)}
                        <span className="text-tinta-fraca"> de 5</span>
                      </span>
                    </Td>
                    <Td>
                      <Finais
                        feitas={aprendidasDaTrilha(abertas, finais.get(aluno.id) ?? new Map(), comPratica)}
                        abertas={abertas}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            Nenhum aluno ainda. Crie a primeira conta acima.
          </p>
        )}
      </section>

      {alunos?.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="rotulo text-tinta-fraca">Tática rating — a turma</h2>
            <p className="text-sm text-tinta-media">
              O rating de tática (todos começam em 600) e a semana de cada um: quanto o rating andou, quantos
              problemas e o acerto nos últimos 7 dias. Só você vê esta tabela.
            </p>
          </div>
          <div className="cartao overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda-fraca text-left text-tinta-fraca">
                  <Th>Aluno</Th>
                  <Th>Rating de tática</Th>
                  <Th>7 dias</Th>
                  <Th>Na semana</Th>
                  <Th>Acerto na semana</Th>
                  <Th>Última vez</Th>
                  <Th>Resolvidos</Th>
                </tr>
              </thead>
              <tbody>
                {turmaNoRating.map((aluno) => {
                  const r = ratings.get(aluno.id);
                  const acerto = r?.semana.acerto ?? null;
                  return (
                    <tr key={aluno.id} className="border-b border-borda-fraca last:border-0">
                      <Td>
                        <Link href={`/professor/${aluno.id}`} className="foco font-medium text-metodo-tinta hover:underline">
                          {aluno.nome}
                        </Link>
                      </Td>
                      <Td>
                        <span className="font-semibold tabular-nums">{r ? Math.round(r.rating) : "—"}</span>
                      </Td>
                      <Td>
                        <span className={`tabular-nums ${!r ? "text-tinta-fraca" : r.semana.variacao < 0 ? "text-erro-texto" : ""}`}>
                          {r ? formatarDelta(r.semana.variacao) : "—"}
                        </span>
                      </Td>
                      {/* Sem os problemas ao lado, "±0" não separa quem ficou parado de quem jogou e empatou. */}
                      <Td>
                        <span className={`tabular-nums ${r?.semana.problemas ? "" : "text-tinta-fraca"}`}>
                          {r ? r.semana.problemas : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className={`tabular-nums ${acerto === null ? "text-tinta-fraca" : ""}`}>
                          {acerto === null ? "—" : `${acerto}%`}
                        </span>
                      </Td>
                      <Td>
                        <span className={r?.ultimaResposta ? "" : "text-tinta-fraca"}>
                          {r?.ultimaResposta ? ultimaVez(r.ultimaResposta) : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="tabular-nums">{r ? r.resolvidos : "—"}</span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

/**
 * Quantas aulas de finais este aluno domina, no total e por classe.
 *
 * O total vem primeiro porque é o que se lê de relance na coluna; a quebra por
 * classe vem embaixo, miúda, porque é ela que diz *onde* o aluno está — seis de
 * seis na classe E e zero na D é uma conversa diferente de três e três.
 */
function Finais({
  feitas,
  abertas,
}: {
  feitas: ReadonlySet<string>;
  abertas: ReturnType<typeof aulasAbertas>;
}) {
  if (abertas.length === 0) return <span className="text-tinta-fraca">—</span>;

  return (
    <span className="flex flex-col gap-0.5 tabular-nums">
      <span className={feitas.size > 0 ? "text-tinta" : "text-tinta-fraca"}>
        {feitas.size} de {abertas.length}
      </span>
      <span className="text-xs text-tinta-fraca">
        {CLASSES.map((classe) => {
          const daqui = daClasse(abertas, classe);
          if (daqui.length === 0) return null;
          return `${classe} ${daqui.filter((a) => feitas.has(a.id)).length}/${daqui.length}`;
        })
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 text-tinta ${mono ? "font-mono text-xs" : ""}`}>{children}</td>
  );
}
