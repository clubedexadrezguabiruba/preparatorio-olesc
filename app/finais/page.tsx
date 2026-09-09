import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Bolinhas } from "@/components/Bolinhas";
import { EscolhaDaSemana } from "@/components/curso/EscolhaDaSemana";
import { perfilAtual } from "@/lib/auth/perfil";
import { porExtenso, sabadoDaSemana } from "@/lib/curso/calendario";
import { PARAMETRO_DA_SEMANA, semanaDaTela } from "@/lib/curso/semana";
import { aulasComPratica, aulasPublicadas, indiceDeAulas } from "@/lib/finais/conteudo";
import { DEGRAU_APRENDIDA } from "@/lib/finais/escada";
import { progressoDeFinais } from "@/lib/finais/progresso";
import {
  AULA_ZERADA,
  aulasAbertas,
  CLASSE,
  CLASSES,
  aprendidasDaTrilha,
  daClasse,
  estadoDaAula,
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
 * ## A trilha inteira aparece — decisão revista na F2
 *
 * Até aqui esta lista mostrava só o que estava aberto, com o argumento de que
 * 39 cartões cinzas ensinam a criança a medir o que falta. A turma real
 * respondeu o contrário: o aluno quer **saber o que vem depois**, e um curso
 * que esconde o próprio tamanho não deixa ninguém planejar o mês. Então as 49
 * aparecem, numeradas, por classe de força, e cada uma diz em que estado está
 * — inclusive "abre no Sábado 3" e "em escrita".
 *
 * O que **não** mudou: a barra de progresso conta sobre as **abertas**. Medir o
 * aluno contra 49 aulas em 12 de setembro seria dizer-lhe que ele está em 4%.
 *
 * ## A bancada do professor
 *
 * O rascunho continua alcançável, mas só para quem publica: é nele que o Doug
 * revisa a aula no celular antes do sábado, e é dessa revisão que sai o número
 * de horas por aula que dimensiona as fases seguintes. Para o aluno, rascunho
 * não existe.
 */

export const metadata: Metadata = { title: "Finais — Preparatório OLESC" };

export default async function Finais({ searchParams }: PageProps<"/finais">) {
  const perfil = await perfilAtual();
  // Ver a semana 4 aqui abre as sete aulas publicadas de uma vez, e esvazia a
  // bancada logo abaixo — que é o mesmo conteúdo, listado como "ainda não
  // aberta". As duas listas continuam somando o mesmo curso.
  const tela = semanaDaTela(perfil.papel, (await searchParams)[PARAMETRO_DA_SEMANA]);
  const semana = tela.semana;

  const publicadas = aulasPublicadas();
  const comPratica = aulasComPratica();
  const abertas = aulasAbertas(publicadas, semana);
  const idsAbertos = new Set(abertas.map((a) => a.id));
  const progresso = await progressoDeFinais(perfil.id);
  const feitas = aprendidasDaTrilha(abertas, progresso, comPratica);
  const proxima = proximaAula(abertas, progresso, comPratica);

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
        {/*
          * **Esta frase era falsa, e voltou a ser verdadeira.**
          *
          * Ela promete "um exemplo animado" desde sempre. Em 8/9/2026 a animação
          * saiu do formato das aulas e ninguém mexeu aqui: por um dia o índice
          * prometeu ao aluno uma coisa que nenhuma aula fazia. A etapa 1 voltou a
          * animar (ver `ObjectiveStage`), e a promessa voltou a se cumprir — o
          * que ela precisava era de redação nova, não de remoção.
          */}
        <p className="text-sm text-tinta-media">
          Cada aula mostra a técnica jogada no tabuleiro e depois devolve as peças para
          você. As aulas vêm em classes de força: comece pela E e suba.
        </p>
      </header>

      {/* Sem aula aberta, o aviso substitui a barra — mas a lista das 49
          continua embaixo. É justamente quando o aluno mais quer ver o que vem. */}
      {abertas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
          As primeiras aulas de finais abrem no Sábado {semana}, {porExtenso(sabadoDaSemana(semana).data)}.
        </p>
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="rotulo text-tinta-fraca">Aulas aprendidas</span>
            <span className="text-sm text-tinta-media tabular-nums">
              {feitas.size} de {abertas.length} abertas
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
      )}

      {perfil.papel === "professor" ? <EscolhaDaSemana tela={tela} base="/finais" /> : null}

      {CLASSES.map((classe) => {
        // A classe inteira, aberta ou não: é o mapa do curso. A contagem ao
        // lado continua sobre as abertas, que é o que dá para fazer hoje.
        const aulas = daClasse(TRILHA, classe);
        const abertasAqui = aulas.filter((a) => idsAbertos.has(a.id));
        const aprendidasAqui = abertasAqui.filter((a) => feitas.has(a.id)).length;

        return (
          <section key={classe} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="rotulo text-tinta-fraca">
                  {CLASSE[classe].nome} · {CLASSE[classe].faixa}
                </h2>
                <span className="text-xs text-tinta-fraca tabular-nums">
                  {aprendidasAqui} de {abertasAqui.length} aprendidas
                  {abertasAqui.length < aulas.length ? ` · ${aulas.length} no total` : ""}
                </span>
              </div>
              <p className="text-sm text-tinta-media">{CLASSE[classe].resumo}</p>
            </div>

            <ul className="flex flex-col gap-2">
              {aulas.map((aula) => (
                <li key={aula.id}>
                  {idsAbertos.has(aula.id) ? (
                    <Cartao
                      aula={aula}
                      progresso={progresso.get(aula.id) ?? AULA_ZERADA}
                      temPratica={comPratica.has(aula.id)}
                    />
                  ) : (
                    <Fechado aula={aula} publicada={publicadas.has(aula.id)} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
        São {TRILHA.length} aulas em quatro classes de força, e você vê todas: as que ainda não
        abriram dizem quando abrem.{" "}
        <Link href="/trilha" className="font-medium underline">
          Veja a trilha do curso inteiro
        </Link>{" "}
        — tática e finais, por nível.
      </p>

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

function Cartao({
  aula,
  progresso,
  temPratica,
}: {
  aula: AulaDaTrilha;
  progresso: ProgressoDaAula;
  /** A aula tem a etapa 4? É o que decide o critério e as bolinhas. */
  temPratica: boolean;
}) {
  const estado = estadoDaAula(temPratica, progresso);

  return (
    <Link
      href={`/finais/${aula.id}`}
      className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
    >
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
          estado === "aprendida"
            ? "border-metodo-cheio bg-metodo-cheio text-tinta-inversa"
            : "border-borda-forte text-tinta-fraca"
        }`}
      >
        {estado === "aprendida" ? "✓" : aula.ordem}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-tinta">{aula.nome}</p>
        {/*
          **A linha de formato saiu daqui em 9/9/2026, com os formatos.** Ela
          dizia "Aula completa · objetivo, com ajuda e sem ajuda". Com um
          formato só, ela repetiria a mesma frase em 49 cartões — e a lista de
          etapas que ela recitava é justamente o que as abas da aula mostram
          quando o aluno entra.

          As bolinhas ficam, e só onde há escada: a aula sem prática não tem
          partida para vencer, e três círculos vazios ao lado dela prometeriam
          um caminho que ela não tem — o dela é a declaração, e o `Estado` ao
          lado já a diz.
        */}
        {temPratica && <Bolinhas progresso={progresso.escada} total={DEGRAU_APRENDIDA} />}
      </div>

      <Estado estado={estado} />
    </Link>
  );
}

/**
 * A aula que ainda não abriu: sem link, e dizendo **por quê**.
 *
 * As duas razões são diferentes para o aluno. "Abre no Sábado 3" é uma data
 * que ele pode esperar; "em escrita" é uma aula que ainda não existe. Um
 * cadeado mudo para as duas faria ele perguntar ao professor o que já estaria
 * escrito na tela.
 */
function Fechado({ aula, publicada }: { aula: AulaDaTrilha; publicada: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-borda bg-carta/50 px-4 py-3">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-borda text-xs font-bold text-tinta-fraca tabular-nums"
      >
        {aula.ordem}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-tinta-fraca">{aula.nome}</p>
        <p className="text-xs text-tinta-fraca">
          {publicada
            ? `Abre no Sábado ${aula.sabado}, ${porExtenso(sabadoDaSemana(aula.sabado).data)}`
            : "Em escrita"}
        </p>
      </div>
    </div>
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
  if (estado === "aprendida") {
    return <span className="shrink-0 text-xs font-medium text-metodo-tinta">Aprendida</span>;
  }
  if (estado === "praticando") {
    return <span className="shrink-0 text-xs font-medium text-aviso-tinta">Praticando</span>;
  }
  return <span className="shrink-0 text-xs text-tinta-fraca">Não começou</span>;
}
