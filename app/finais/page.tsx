import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { Bolinhas } from "@/components/Bolinhas";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { aulasPublicadas, indiceDeAulas } from "@/lib/finais/conteudo";
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
  FORMATO,
  proximaAula,
  TRILHA,
  type AulaDaTrilha,
  type EstadoDeAula,
  type ProgressoDaAula,
} from "@/lib/finais/trilha";

/**
 * A trilha de finais na tela: quatro classes, e em cada uma as 49 aulas, com o
 * estado do aluno em cada uma.
 *
 * ## O que a tela **não** decide
 *
 * Nada. Quais aulas existem, em que classe, em que formato e em que nível é
 * `lib/finais/trilha.ts`; o que passou pelo gate é o `status` do
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
 * aparecem, numeradas, por classe de força, e cada uma diz em que estado está.
 *
 * O que **não** mudou: a barra de progresso conta sobre as **publicadas**.
 * Medir o aluno contra 49 aulas quando existe uma seria dizer-lhe que ele está
 * em 2%.
 *
 * ## O sábado saiu daqui em 2026-09-09
 *
 * A aula fechada tinha dois motivos — "abre no Sábado 3" e "em escrita" — e o
 * primeiro nunca chegou a valer: `/finais/[aula]` não checava semana nenhuma, e
 * o cadeado só existia nesta lista. Com a data fora do portão sobrou um motivo
 * só, e ele é o que sempre foi verdade: a aula não existe em disco.
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

  const publicadas = aulasPublicadas();
  const abertas = aulasAbertas(publicadas);
  const idsAbertos = new Set(abertas.map((a) => a.id));
  const [progresso, cabecalho] = await Promise.all([
    progressoDeFinais(perfil.id),
    dadosDoCabecalho(perfil.id),
  ]);
  const feitas = aprendidasDaTrilha(abertas, progresso);
  const proxima = proximaAula(abertas, progresso);

  const naTrilha = new Set(TRILHA.map((a) => a.id));
  const bancada =
    perfil.papel === "professor"
      ? indiceDeAulas().filter((a) => !abertas.some((aberta) => aberta.id === a.id))
      : [];

  return (
    <>
      <Cabecalho atual="finais" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="painel" barraInferior>
      <header className="flex flex-col gap-2">
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

      {/* Sem aula publicada, o aviso substitui a barra — mas a lista das 49
          continua embaixo. É justamente quando o aluno mais quer ver o que vem. */}
      {abertas.length === 0 ? (
        <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
          Nenhuma aula de finais foi publicada ainda. A lista abaixo é o curso inteiro, e
          ela vai enchendo.
        </p>
      ) : (
        <section className="flex flex-col gap-2 cartao px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="rotulo text-tinta-fraca">Aulas aprendidas</span>
            <span className="text-sm text-tinta-media tabular-nums">
              {feitas.size} de {abertas.length} publicadas
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
              Você aprendeu tudo o que já foi publicado. O curso continua sendo escrito.
            </p>
          )}
        </section>
      )}

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
                    <Cartao aula={aula} progresso={progresso.get(aula.id) ?? AULA_ZERADA} />
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
              Aulas que o aluno ainda não enxerga: rascunho, ou publicada fora da trilha
              das 49. Abrem normalmente por este link, e o que você jogar nelas grava.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {bancada.map((aula) => (
              <li key={aula.id}>
                <Link
                  href={`/finais/${aula.id}`}
                  className="foco flex items-center gap-3 cartao-vazio px-4 py-3 transition-colors hover:bg-carta-toque"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-tinta">{aula.titulo}</p>
                    <p className="text-xs text-tinta-fraca tabular-nums">
                      {aula.etapas} {aula.etapas === 1 ? "etapa" : "etapas"}
                      {aula.status === "draft" ? " · rascunho" : " · publicada"}
                      {naTrilha.has(aula.id) ? "" : " · fora da trilha"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </Moldura>
    </>
  );
}

function Cartao({ aula, progresso }: { aula: AulaDaTrilha; progresso: ProgressoDaAula }) {
  const estado = estadoDaAula(aula.formato, progresso);

  return (
    <Link
      href={`/finais/${aula.id}`}
      className="foco flex items-center gap-3 cartao-alvo px-4 py-3"
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
        <p className="text-xs text-tinta-fraca">
          {FORMATO[aula.formato].nome} · {FORMATO[aula.formato].etapas}
        </p>
        {/* As bolinhas só onde há escada. A aula de leitura não tem partida
            para vencer, e três círculos vazios ao lado dela prometeriam um
            caminho que ela não tem — o dela é a declaração, e o `Estado` ao
            lado já a diz. */}
        {aula.formato !== "leitura" && (
          <Bolinhas progresso={progresso.escada} total={DEGRAU_APRENDIDA} />
        )}
      </div>

      <Estado estado={estado} />
    </Link>
  );
}

/**
 * A aula que ainda não existe: sem link, e dizendo **por quê**.
 *
 * Eram duas razões — o sábado por chegar e o texto por escrever —, e a primeira
 * saiu com o calendário em 2026-09-09. Sobrou "em escrita", que é a única que
 * de fato fecha a porta: não há o que abrir num arquivo que não existe. O
 * `nível N` ao lado é informação, e não tranca — a trava é mole.
 */
function Fechado({ aula, publicada }: { aula: AulaDaTrilha; publicada: boolean }) {
  return (
    <div className="flex items-center gap-3 cartao-vazio px-4 py-3">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-borda text-xs font-bold text-tinta-fraca tabular-nums"
      >
        {aula.ordem}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-tinta-fraca">{aula.nome}</p>
        <p className="text-xs text-tinta-fraca">
          {FORMATO[aula.formato].nome} ·{" "}
          {publicada ? `nível ${aula.nivel}` : "em escrita"}
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
