import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/acoes";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { hojeNoBrasil, somarDias } from "@/lib/curso/calendario";
import { minutosDeHoje, sequenciaDeDias } from "@/lib/curso/hoje";
import { fechamentoDoNivel, nivelDoAluno, proximoPasso } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { minutosPorDia, partidasDeclaradas } from "@/lib/curso/minutos";
import { aulasPublicadas } from "@/lib/finais/conteudo";
import { aulasVencidas } from "@/lib/finais/escada";
import { progressoDeFinais } from "@/lib/finais/progresso";
import {
  aulasAbertas,
  CLASSE,
  CLASSES,
  daClasse,
  aprendidasDaTrilha,
  proximaAula,
} from "@/lib/finais/trilha";
import { lerIndice } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  aprendidasDaAbertura,
  aRevisarNaAbertura,
  baseCompleto,
  idsLiberados,
} from "@/lib/repertorio/treino";
import {
  emOrdemDeData,
  quandoPorExtenso,
  type ItemDaAgenda,
  type Quando,
} from "@/lib/tarefas/agenda";
import { AGENDA, TAREFAS } from "@/lib/tarefas/conteudo";
import { estadoDasTarefas } from "@/lib/tarefas/estado";
import { tarefasMarcadas } from "@/lib/tarefas/progresso";
import { doNivel } from "@/lib/tarefas/tarefas";
import { BLOCOS } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, revisaoDeHoje, temaZerado } from "@/lib/tatica/progresso";
import { etapaAtual, METAS, NOME_DA_ETAPA } from "@/lib/tatica/serie";
import { Agenda } from "./Agenda";
import { Hoje } from "./Hoje";
import { FaixaDoNivel } from "./Nivel";
import { Tarefas } from "./Tarefas";

export const metadata: Metadata = { title: "Painel — Preparatório OLESC" };

const EQUIPE = { M: "Equipe masculina", F: "Equipe feminina" } as const;

/**
 * O painel do aluno: **o nível em que ele está**, o que falta para fechá-lo, e
 * uma única coisa para fazer agora.
 *
 * Era a semana até 2026-09-09, e a semana respondia a pergunta errada: ela
 * dizia que dia é hoje, que o celular já diz, e não dizia onde o aluno está.
 * O eixo é o degrau; a data ficou como agenda dos encontros presenciais.
 *
 * **As três consultas do painel são as mesmas de outras telas, e de propósito.**
 * O progresso vem de `progressoPorTema`, que a lista de tática e (na B1.3) o
 * relatório também usam; as tarefas feitas vêm de `tarefasMarcadas`; e a conta
 * de "está feita?" é `estadoDasTarefas`, função pura com teste. Nada aqui soma
 * nada por conta própria — é o que impede o painel de dizer 5 e o relatório
 * dizer 4 com o aluno na frente.
 */
export default async function Painel() {
  const perfil = await perfilAtual();
  const hoje = hojeNoBrasil();

  // As duas últimas são do repertório, e entram na **mesma** rajada: elas
  // vinham de um `Promise.all` próprio, num ramo paralelo, e deixá-las de fora
  // custaria dois round-trips em série na página inicial do aluno.
  const [
    progresso,
    marcadas,
    finais,
    devidosDeTatica,
    minutos,
    partidas,
    indice,
    repertorio,
    conquistado,
  ] = await Promise.all([
    progressoPorTema(perfil.id),
    tarefasMarcadas(perfil.id),
    progressoDeFinais(perfil.id),
    revisaoDeHoje(perfil.id),
    // Trinta dias bastam para a sequência: o preparatório inteiro tem quatro
    // semanas, e ninguém precisa ver "48 dias seguidos" numa tela de celular.
    minutosPorDia(perfil.id, somarDias(hoje, -30)),
    // `partidasDeclaradas` no lugar de `partidaDoDiaMarcada`: **a mesma uma
    // consulta**, com mais dias. Ela devolve o conjunto de dias declarados, e
    // com isso a barra do dia e o gráfico do professor passam a somar a mesma
    // coisa — que era a terceira divergência de 9/9.
    partidasDeclaradas(perfil.id, somarDias(hoje, -30)),
    lerIndice(),
    progressoDoRepertorio(),
    nivelConquistado(perfil.id),
  ]);

  // A trilha de finais: o que está publicado, e o que dele já foi aprendido. As
  // duas contas são as mesmas de `/finais` — a tela lá e o cartão aqui não
  // podem discordar, e é por isso que nenhuma das duas as refaz.
  const publicadas = aulasPublicadas();
  const aulasDeFinais = aulasAbertas(publicadas);
  const finaisFeitos = aprendidasDaTrilha(aulasDeFinais, finais);
  const proximoFinal = proximaAula(aulasDeFinais, finais);

  const nivel = nivelDoAluno(conquistado);
  const estados = estadoDasTarefas(doNivel(TAREFAS, nivel), marcadas, progresso, finaisFeitos);

  const grupos = agrupar(emOrdemDeData(AGENDA));

  /*
   * As aulas vencidas hoje na escada, com o nome que o cartão mostra.
   *
   * Era `revisoesDevidas`, que relia o log inteiro de tentativas a cada
   * renderização para derivar uma agenda. Agora a data está gravada
   * (`finais_progresso.revisar_em`), e a fila é uma comparação de instantes
   * sobre o que a página já leu — nenhuma consulta a mais.
   */
  const agoraNosFinais = new Date().toISOString();
  const revisoesDeFinais = aulasVencidas(
    aulasDeFinais.map((a) => a.id),
    new Map([...finais].map(([id, p]) => [id, p.escada])),
    agoraNosFinais,
  ).map((id) => ({
    id,
    nome: aulasDeFinais.find((a) => a.id === id)?.nome ?? id,
  }));

  const aberturas = indice.length;
  // O painel conta o mesmo que `/aberturas`: enquanto o portão do Avançado está
  // fechado, as linhas trancadas não entram no total nem na conta de aprendidas.
  // Duas telas com denominadores diferentes para o mesmo repertório seria o bug
  // de 6/9/2026 de novo, por outra porta.
  const avancadoLiberado = baseCompleto(repertorio, indice);
  const linhasDoRepertorio = indice.reduce(
    (soma, e) => soma + idsLiberados(e, avancadoLiberado).length,
    0,
  );
  const linhasAprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(repertorio, e, avancadoLiberado),
    0,
  );
  const agoraNoRepertorio = new Date().toISOString();
  const linhasARevisar = indice.reduce(
    (soma, e) => soma + aRevisarNaAbertura(repertorio, e, agoraNoRepertorio, avancadoLiberado),
    0,
  );

  const abertos = BLOCOS.map((bloco) => ({
    ...bloco,
    temas: bloco.temas.filter((t) => temaAberto(t.tag)),
  })).filter((bloco) => bloco.temas.length > 0);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  /*
   * O fechamento do degrau, montado das mesmas leituras que a página já fez.
   *
   * Nenhuma consulta a mais: `fechamentoDoNivel` e `proximoPasso` são funções
   * puras de `lib/curso/nivel.ts`, testadas, e o que elas recebem aqui é o que
   * já está na memória. Foi por isso que a regra nasceu sem falar com o banco.
   */
  const paraONivel = {
    temas: new Map([...progresso].map(([tema, p]) => [tema, p.feitos])),
    finais,
    publicadas,
    linhasAprendidas,
    baseCompleto: avancadoLiberado,
  };
  const fechamento = fechamentoDoNivel(nivel, paraONivel);
  const passo = proximoPasso(nivel, paraONivel, devidosDeTatica.length, conquistado);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="rotulo text-metodo-tinta">Preparatório OLESC 2026</p>
          <h1 className="titulo text-tinta">{perfil.nome}</h1>
          <p className="text-sm text-tinta-fraca">
            {perfil.equipe ? EQUIPE[perfil.equipe] : "Professor"}
            {perfil.tabuleiro ? ` · tabuleiro ${perfil.tabuleiro}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {perfil.papel === "professor" ? (
            <Link
              href="/professor"
              className="foco rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
            >
              Área do professor
            </Link>
          ) : null}
          <form action={sair}>
            <button
              type="submit"
              className="foco rounded-lg px-2 py-1.5 text-sm text-tinta-fraca hover:text-tinta"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* O dia, em primeiro lugar: é o que o aluno abre o site para ver. Os
          totais do curso vêm depois — eles não mudam o que fazer agora. */}
      <Hoje
        minutos={minutosDeHoje(minutos, hoje, partidas.has(hoje))}
        sequencia={sequenciaDeDias(minutos, hoje)}
        revisaoDeTatica={devidosDeTatica.length}
        revisaoDeFinais={revisoesDeFinais}
        partidaFeita={partidas.has(hoje)}
      />

      <section className="flex gap-3">
        <Numero rotulo="Puzzles resolvidos" valor={feitos} />
        <Numero
          rotulo="Acerto"
          valor={feitos ? `${Math.round((100 * certos) / feitos)}%` : "—"}
        />
      </section>

      {/* ----------------------------------------------------------------- *
       * O seu nível — a faixa, as três barras, a prova e o próximo passo
       * ----------------------------------------------------------------- */}
      <FaixaDoNivel
        nivel={nivel}
        fechamento={fechamento}
        passo={passo}
        conquistado={conquistado}
      />

      {/* ----------------------------------------------------------------- *
       * A rotina do degrau
       *
       * O que o site **não** mede sozinho, mais a tarefa de tática — que fica
       * porque é onde mora o aviso de acerto, e o nível recusa de propósito
       * cobrar piso de acerto como cadeado.
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">O seu nível</h2>
        {estados.length > 0 ? (
          <Tarefas estados={estados} />
        ) : (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            A rotina deste degrau ainda não foi escrita. Siga na tática.
          </p>
        )}
      </section>

      {/* ----------------------------------------------------------------- *
       * A agenda — o que tem data marcada
       * ----------------------------------------------------------------- */}
      {grupos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="rotulo text-tinta-fraca">A agenda</h2>
            <p className="text-sm text-tinta-media">
              Os encontros presenciais e o que só acontece num dia. A data não tranca nada
              do curso — ela só marca quando estas coisas são.
            </p>
          </div>
          <Agenda grupos={grupos} marcadas={[...marcadas]} />
        </section>
      ) : null}

      {/* ----------------------------------------------------------------- *
       * O progresso por tema
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="rotulo text-tinta-fraca">Curso de tática</h2>
          <Link
            href="/tatica"
            className="foco text-sm font-medium text-metodo-tinta hover:underline"
          >
            Ver todos os temas →
          </Link>
        </div>

        {abertos.map((bloco) => (
          <div key={bloco.id} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-tinta">
              <span className="text-tinta-fraca tabular-nums">{bloco.id}.</span> {bloco.nome}
            </p>
            <ul className="flex flex-col gap-2">
              {bloco.temas.map((tema) => {
                const p = progresso.get(tema.tag) ?? temaZerado();
                const etapa = etapaAtual(p.feitos);
                return (
                  <li key={tema.tag}>
                    <Link
                      href={`/tatica/${tema.tag}`}
                      className="foco flex items-center gap-3 cartao-alvo px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="truncate text-sm font-medium text-tinta">{tema.nome}</p>
                        <Barra
                          feitos={p.tentativas}
                          de={PUZZLES_POR_TEMA}
                          tom={etapa ? "metodo" : "completo"}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs text-tinta-fraca tabular-nums">
                        {etapa
                          ? `${NOME_DA_ETAPA[etapa]} ${p.feitos[etapa]}/${METAS[etapa]}`
                          : "Concluído"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
          Dentro de cada tema os puzzles vêm em ordem de dificuldade: começam fáceis e vão
          subindo. Os blocos dos degraus seguintes já estão abertos — você pode adiantar.
        </p>
      </section>

      {/* ----------------------------------------------------------------- *
       * O repertório
       *
       * Irmã da seção de tática, e com a mesma forma — mas a barra mede outra
       * coisa: aqui conta **linha aprendida**, três degraus da escada de
       * revisão, e não linha tentada. Na tática um puzzle tentado é um puzzle
       * pensado; aqui o exercício é decorar, e "abri a linha" não quer dizer
       * nada.
       *
       * O que a barra **não** mostra é o trabalho do dia: com repetição
       * espaçada, um repertório inteiro aprendido ainda tem linhas vencendo.
       * Por isso a contagem de "a revisar hoje" vai ao lado, e é ela que muda
       * de cor — é a única parte desta seção que pede uma ação agora.
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="rotulo text-tinta-fraca">Repertório do clube</h2>
          <Link
            href="/aberturas"
            className="foco text-sm font-medium text-metodo-tinta hover:underline"
          >
            Treinar →
          </Link>
        </div>

        <div className="flex items-center gap-3 cartao px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-sm font-medium text-tinta">
              {aberturas} aberturas, de brancas e de pretas
            </p>
            {linhasARevisar > 0 ? (
              <p className="text-xs font-semibold text-aviso-tinta tabular-nums">
                {linhasARevisar} {linhasARevisar === 1 ? "linha" : "linhas"} a revisar hoje
              </p>
            ) : null}
            <Barra
              feitos={linhasAprendidas}
              de={linhasDoRepertorio}
              tom={linhasAprendidas >= linhasDoRepertorio ? "completo" : "metodo"}
            />
          </div>
          <span className="w-28 shrink-0 text-right text-xs text-tinta-fraca tabular-nums">
            {linhasAprendidas}/{linhasDoRepertorio} aprendidas
          </span>
        </div>
      </section>

      {/* ----------------------------------------------------------------- *
       * Os finais
       * ----------------------------------------------------------------- */}
      {aulasDeFinais.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="rotulo text-tinta-fraca">Curso de finais</h2>
            <Link
              href="/finais"
              className="foco text-sm font-medium text-metodo-tinta hover:underline"
            >
              Ver a trilha →
            </Link>
          </div>

          <div className="flex flex-col gap-3 cartao px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium text-tinta">Aulas aprendidas</span>
                <span className="text-sm text-tinta-media tabular-nums">
                  {finaisFeitos.size} de {aulasDeFinais.length}
                </span>
              </div>
              <Barra
                feitos={finaisFeitos.size}
                de={aulasDeFinais.length}
                tom={finaisFeitos.size === aulasDeFinais.length ? "completo" : "metodo"}
              />
            </div>

            {/* Por classe, e só as que já têm aula aberta: a classe C com "0 de
                0" seria uma reprovação por algo que ainda não foi escrito. */}
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {CLASSES.map((classe) => {
                const daqui = daClasse(aulasDeFinais, classe);
                if (daqui.length === 0) return null;
                const feitasAqui = daqui.filter((a) => finaisFeitos.has(a.id)).length;
                return (
                  <li key={classe} className="text-xs text-tinta-fraca tabular-nums">
                    {CLASSE[classe].nome}:{" "}
                    <span className="text-tinta-media">
                      {feitasAqui} de {daqui.length}
                    </span>
                  </li>
                );
              })}
            </ul>

            {proximoFinal ? (
              <Link
                href={`/finais/${proximoFinal.id}`}
                className="foco w-fit text-sm font-medium text-metodo-tinta hover:underline"
              >
                Próxima aula: {proximoFinal.nome} →
              </Link>
            ) : (
              <p className="text-sm text-metodo-tinta">
                Você aprendeu tudo o que já foi publicado. O curso de finais continua sendo
                escrito.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

/**
 * A agenda agrupada por dia, com o rótulo já pronto.
 *
 * Feito aqui, e não no componente: quem sabe converter `"sabado-2"` em "19 de
 * setembro" é `SABADOS`, que é do servidor — e uma função não atravessa a
 * fronteira para o cliente. O agrupamento vem de graça junto, porque a lista já
 * chega em ordem de data.
 */
function agrupar(
  itens: readonly ItemDaAgenda[],
): { rotulo: string; itens: ItemDaAgenda[] }[] {
  const grupos: { quando: Quando; rotulo: string; itens: ItemDaAgenda[] }[] = [];
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.quando === item.quando) ultimo.itens.push(item);
    else grupos.push({ quando: item.quando, rotulo: quandoPorExtenso(item.quando), itens: [item] });
  }
  return grupos.map(({ rotulo, itens: doDia }) => ({ rotulo, itens: doDia }));
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 cartao px-4 py-3">
      <span className="text-2xl font-semibold text-tinta tabular-nums">{valor}</span>
      <span className="text-xs text-tinta-fraca">{rotulo}</span>
    </div>
  );
}
