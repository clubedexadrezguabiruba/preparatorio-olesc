import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { porExtenso, sabadoDaSemana, semanaAtual } from "@/lib/curso/calendario";
import { aulasPublicadas, indiceDeAulas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import {
  AULA_ZERADA,
  aulasAbertas,
  CLASSE,
  CLASSES,
  daClasse,
  dominadas,
  estadoDaAula,
  FORMATO,
  proximaAula,
  TRILHA,
  type AulaDaTrilha,
  type EstadoDeAula,
  type ProgressoDaAula,
} from "@/lib/finais/trilha";

/**
 * A trilha de finais na tela: quatro classes, e em cada uma as aulas que já
 * abriram, com o estado do aluno em cada uma.
 *
 * ## O que a tela **não** decide
 *
 * Nada. Quais aulas existem, em que classe, em que formato e a partir de que
 * sábado é `lib/finais/trilha.ts`; o que passou pelo gate é o `status` do
 * arquivo; o que o aluno fez é `lib/finais/progresso.ts`; e o que "dominada"
 * quer dizer em cada formato é `dominou()`. Esta página junta as quatro coisas
 * e as desenha — é o mesmo desenho de `/tatica`, e é o que impede a trilha de
 * dizer 6 e o painel dizer 5 com o aluno na frente.
 *
 * ## Por que a aula fechada não aparece
 *
 * A lista mostra o que está **aberto**, e nunca o cadeado de uma aula que ainda
 * não foi escrita. Uma trilha com 49 cartões, 39 deles cinzas, ensina a criança
 * a medir o que falta em vez do que ela fez — e mudaria de tamanho a cada
 * sábado sem ela ter feito nada. O rodapé diz, em uma frase, que o curso cresce.
 *
 * ## A bancada do professor
 *
 * O rascunho continua alcançável, mas só para quem publica: é nele que o Doug
 * revisa a aula no celular antes do sábado, e é dessa revisão que sai o número
 * de horas por aula que dimensiona as fases seguintes. Para o aluno, rascunho
 * não existe.
 */

export const metadata: Metadata = { title: "Finais — Preparatório OLESC" };

export default async function Finais() {
  const perfil = await perfilAtual();
  const semana = semanaAtual();

  const publicadas = aulasPublicadas();
  const abertas = aulasAbertas(publicadas, semana);
  const progresso = await progressoDeFinais(perfil.id);
  const feitas = dominadas(abertas, progresso);
  const proxima = proximaAula(abertas, progresso);

  const naTrilha = new Set(TRILHA.map((a) => a.id));
  const bancada =
    perfil.papel === "professor"
      ? indiceDeAulas().filter((a) => !abertas.some((aberta) => aberta.id === a.id))
      : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Curso de finais</h1>
        <p className="text-sm text-tinta-media">
          Cada aula explica a técnica, mostra um exemplo animado e devolve o tabuleiro para
          você jogar. As aulas vêm em classes de força: comece pela E e suba.
        </p>
      </header>

      {abertas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
          As primeiras aulas de finais abrem no Sábado {semana}, {porExtenso(sabadoDaSemana(semana).data)}.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="rotulo text-tinta-fraca">Aulas dominadas</span>
              <span className="text-sm text-tinta-media tabular-nums">
                {feitas.size} de {abertas.length}
              </span>
            </div>
            <Barra
              feitos={feitas.size}
              de={abertas.length}
              tom={feitas.size === abertas.length ? "completo" : "metodo"}
            />
            {proxima ? (
              <p className="text-xs text-tinta-fraca">
                Próxima da trilha: <span className="text-tinta-media">{proxima.nome}</span>
              </p>
            ) : (
              <p className="text-xs text-metodo-tinta">
                Você dominou tudo o que está aberto. O próximo lote vem no sábado.
              </p>
            )}
          </section>

          {CLASSES.map((classe) => {
            const aulas = daClasse(abertas, classe);
            if (aulas.length === 0) return null;
            const dominadasAqui = aulas.filter((a) => feitas.has(a.id)).length;

            return (
              <section key={classe} className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h2 className="rotulo text-tinta-fraca">
                      {CLASSE[classe].nome} · {CLASSE[classe].faixa}
                    </h2>
                    <span className="text-xs text-tinta-fraca tabular-nums">
                      {dominadasAqui} de {aulas.length} dominadas
                    </span>
                  </div>
                  <p className="text-sm text-tinta-media">{CLASSE[classe].resumo}</p>
                </div>

                <ul className="flex flex-col gap-2">
                  {aulas.map((aula) => (
                    <li key={aula.id}>
                      <Cartao aula={aula} progresso={progresso.get(aula.id) ?? AULA_ZERADA} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
            A trilha inteira tem {TRILHA.length} aulas, em quatro classes de força. As que ainda
            não aparecem aqui estão sendo escritas — cada sábado abre mais um lote.
          </p>
        </>
      )}

      {bancada.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="rotulo text-tinta-fraca">Bancada do professor</h2>
            <p className="text-sm text-tinta-media">
              Aulas que o aluno ainda não enxerga: rascunho, ou publicada com o sábado por
              chegar. Abrem normalmente por este link, e o que você jogar nelas grava.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {bancada.map((aula) => (
              <li key={aula.id}>
                <Link
                  href={`/finais/${aula.id}`}
                  className="foco flex items-center gap-3 rounded-xl border border-dashed border-borda bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-tinta">{aula.titulo}</p>
                    <p className="text-xs text-tinta-fraca tabular-nums">
                      {aula.etapas} {aula.etapas === 1 ? "etapa" : "etapas"}
                      {aula.status === "draft" ? " · rascunho" : " · publicada, sábado por chegar"}
                      {naTrilha.has(aula.id) ? "" : " · fora da trilha"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Cartao({ aula, progresso }: { aula: AulaDaTrilha; progresso: ProgressoDaAula }) {
  const estado = estadoDaAula(aula.formato, progresso);

  return (
    <Link
      href={`/finais/${aula.id}`}
      className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
    >
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
          estado === "dominada"
            ? "border-metodo-cheio bg-metodo-cheio text-tinta-inversa"
            : "border-borda-forte text-tinta-muda"
        }`}
      >
        {estado === "dominada" ? "✓" : aula.ordem}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-tinta">{aula.nome}</p>
        <p className="text-xs text-tinta-fraca">
          {FORMATO[aula.formato].nome} · {FORMATO[aula.formato].etapas}
        </p>
      </div>

      <Estado estado={estado} />
    </Link>
  );
}

/**
 * O estado em palavras, ao lado do numeral.
 *
 * "Não começou" fica em `tinta-fraca` e sem moldura de propósito: é o estado de
 * quase tudo no primeiro dia, e um selo cinza repetido dez vezes desenha uma
 * coluna de reprovação onde não houve nem tentativa.
 */
function Estado({ estado }: { estado: EstadoDeAula }) {
  if (estado === "dominada") {
    return <span className="shrink-0 text-xs font-medium text-metodo-tinta">Dominada</span>;
  }
  if (estado === "praticando") {
    return <span className="shrink-0 text-xs font-medium text-aviso-tinta">Praticando</span>;
  }
  return <span className="shrink-0 text-xs text-tinta-muda">Não começou</span>;
}
