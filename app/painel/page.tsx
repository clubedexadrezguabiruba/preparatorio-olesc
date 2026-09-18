import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/acoes";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { Seta } from "@/app/trilha/Faixa";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { perfilAtual } from "@/lib/auth/perfil";
import { proximaAcao } from "@/lib/curso/acao";
import { hojeNoBrasil, somarDias } from "@/lib/curso/calendario";
import { minutosDeHoje, sequenciaDeDias } from "@/lib/curso/hoje";
import { fechamentoDoNivel, METAL, nivelDoAluno } from "@/lib/curso/nivel";
import {
  entradaDosSelos,
  puzzlesDoAluno,
  sincronizarSelos,
} from "@/lib/curso/selos-banco";
import { minutosPorDia, partidasDeclaradas } from "@/lib/curso/minutos";
import { nivelConquistado } from "@/lib/curso/progresso";
import {
  aulasComPratica,
  aulasExtras,
  aulasPublicadas,
} from "@/lib/finais/conteudo";
import { aulasVencidas } from "@/lib/finais/escada";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { aulasAbertas } from "@/lib/finais/trilha";
import { lerIndice } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  aprendidasDaAbertura,
  aRevisarNaAbertura,
  baseCompleto,
} from "@/lib/repertorio/treino";
import {
  emOrdemDeData,
  quandoPorExtenso,
  type ItemDaAgenda,
  type Quando,
} from "@/lib/tarefas/agenda";
import { AGENDA } from "@/lib/tarefas/conteudo";
import { tarefasMarcadas } from "@/lib/tarefas/progresso";
import { progressoPorTema, revisaoDeHoje } from "@/lib/tatica/progresso";
import { INICIO } from "@/lib/tatica/glicko2";
import { serieDoGrafico } from "@/lib/tatica/rating-grafico";
import { ratingDoAluno, tentativasDoRating } from "@/lib/tatica/rating-leitura";
import { AvisoDeSeloNovo } from "@/components/selos/AvisoDeSeloNovo";
import { Agenda } from "./Agenda";
import { Agora } from "./Agora";
import { Escada } from "./Escada";
import { Hoje } from "./Hoje";
import { Modulos, Prova } from "./Nivel";
import { RatingDeTatica } from "./RatingDeTatica";
import { Selos } from "./Selos";

export const metadata: Metadata = { title: "Painel — Preparatório OLESC" };

const EQUIPE = { M: "Equipe masculina", F: "Equipe feminina" } as const;

/**
 * O painel do aluno: **uma coisa para fazer agora**, onde ele está na escada, e
 * quanto do dia já foi.
 *
 * ## O que ele era, medido
 *
 * Em 2026-09-09, a 360 px: **5.661 px de rolagem — 7,65 telas —, 50 links para
 * 43 destinos, em 8 seções.** No meio dele, os 36 cartões de tema empilhados um
 * por linha, idênticos ao que a `/tatica` já mostrava. Um aluno de 11 anos abria
 * isso e a pergunta "o que eu faço agora?" tinha três respostas diferentes na
 * mesma tela.
 *
 * A régua que decidiu o corte: **isto não é um painel de curso, é um
 * treinador.** Um painel mostra tudo o que existe. Um treinador diz o que fazer,
 * mostra por quê, e deixa o resto alcançável sem disputar atenção.
 *
 * A ordem, e ela é a prioridade:
 *
 * 1. **AGORA** — um cartão, uma ação, um botão, e o motivo escrito.
 * 2. **A escada** — cinco degraus, "você está aqui".
 * 3. **Hoje** — quanto do dia já foi. Contexto, não instrução.
 * 4. **Os três módulos** — quanto falta em cada frente.
 * 5. **A tática rating** — o número e a minicurva de 30 dias (15/9). Contexto.
 * 6. **A prova**, quando ela está fechada ou já passada.
 * 7. **Os selos** — o que ele já conquistou, e dois que estão perto.
 * 7. **A agenda**, fechada: são 4 itens presos a data, e a data deixou de ser o
 *    eixo do site em 9/9.
 *
 * ## Saíram, e por quê
 *
 * - **Os 36 cartões de tema.** Eram a maior fonte de rolagem do site e
 *   repetiam, linha por linha, o que a `/tatica` mostra. Viraram um cartão de
 *   módulo com a barra e um link.
 * - **Os dois números soltos** ("Puzzles resolvidos", "Acerto"). Ocupavam a
 *   posição nobre e não mudam o que fazer agora. Foram para dentro do cartão de
 *   tática, onde significam alguma coisa.
 * - **A lista de tarefas do degrau.** O que ela ainda cobrava — a partida do dia
 *   e o aviso de acerto — mora agora no cartão Hoje e no cartão de tática.
 *
 * ## A rajada única continua única
 *
 * As consultas abaixo vão num `Promise.all` só, de propósito: são a página
 * inicial do aluno, e nove round-trips em série num 4G de escola é a diferença
 * entre abrir e desistir. A reescrita não acrescentou consulta nenhuma —
 * `proximaAcao()` e `fechamentoDoNivel()` são funções puras sobre o que já está
 * na memória, e foi para isso que elas nasceram sem falar com o banco.
 */
export default async function Painel() {
  const perfil = await perfilAtual();
  const hoje = hojeNoBrasil();

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
    ratingTatica,
    tentativasNoRating,
    trava,
    puzzles,
  ] = await Promise.all([
    progressoPorTema(perfil.id),
    tarefasMarcadas(perfil.id),
    progressoDeFinais(perfil.id),
    revisaoDeHoje(perfil.id),
    // **O histórico inteiro, e não os 30 dias.** A janela de 30 dias era certa
    // para o cartão Hoje e **errada para um selo**, que é permanente: "Uma hora"
    // ganho no dia 1 sumiria no dia 32, e "30 dias seguidos" seria
    // inconquistável dentro de uma janela de 30. O `desde` de `minutosPorDia` já
    // era opcional; basta não passá-lo. O recorte dos 30 dias passa a ser feito
    // em memória, logo abaixo, e não custa consulta nenhuma.
    minutosPorDia(perfil.id),
    // `partidasDeclaradas` no lugar de `partidaDoDiaMarcada`: **a mesma uma
    // consulta**, com mais dias. Ela devolve o conjunto de dias declarados, e
    // com isso a barra do dia e o gráfico do professor passam a somar a mesma
    // coisa — que era a terceira divergência de 9/9.
    partidasDeclaradas(perfil.id, somarDias(hoje, -30)),
    lerIndice(),
    progressoDoRepertorio(),
    nivelConquistado(perfil.id),
    ratingDoAluno(perfil.id),
    tentativasDoRating(perfil.id),
    // As linhas das aulas de abertura não concluídas (trava por aula, 17/9/2026) saem das contas,
    // como em `/aberturas`: o painel e a lista não podem ter denominadores diferentes.
    travaDoAluno(perfil),
    // Os números dos selos V2 — puzzles resolvidos e pontaria —, da view da 0018.
    puzzlesDoAluno(perfil.id),
  ]);

  // A trilha de finais: o que está publicado, e o que dele já foi aprendido. As
  // duas contas são as mesmas de `/finais` — a tela lá e o cartão aqui não
  // podem discordar, e é por isso que nenhuma das duas as refaz.
  const publicadas = aulasPublicadas();
  // As aulas extras publicadas (§22 do Editor v2) entram na trilha por dados.
  const extras = aulasExtras();
  const aulasDeFinais = aulasAbertas(publicadas, extras);
  // Quem tem a etapa 4 decide o que "aprendida" quer dizer, desde que os três
  // formatos saíram em 9/9/2026.
  const comPratica = aulasComPratica();

  const nivel = nivelDoAluno(conquistado);

  /*
   * As aulas vencidas hoje na escada, com o nome que a ação mostra.
   *
   * A data está gravada (`finais_progresso.revisar_em`), e a fila é uma
   * comparação de instantes sobre o que a página já leu — nenhuma consulta a
   * mais.
   */
  const agoraNosFinais = new Date().toISOString();
  const revisoesDeFinais = aulasVencidas(
    aulasDeFinais.map((a) => a.id),
    new Map([...finais].map(([id, p]) => [id, p.escada])),
    agoraNosFinais,
  ).map((id) => ({
    id,
    nome: aulasDeFinais.find((a) => a.id === id)?.nome ?? id,
    // Aula v2 com várias práticas: o cartão abre a que venceu (trava 9, 15/9/2026).
    ...(finais.get(id)?.praticaParaRevisar
      ? { pratica: finais.get(id)!.praticaParaRevisar }
      : {}),
  }));

  // O painel conta o mesmo que `/aberturas`: enquanto o portão do Avançado está
  // fechado, as linhas trancadas não entram no total nem na conta de aprendidas.
  // Duas telas com denominadores diferentes para o mesmo repertório seria o bug
  // de 6/9/2026 de novo, por outra porta.
  const avancadoLiberado = baseCompleto(repertorio, indice, trava.trancadas);
  const linhasAprendidas = indice.reduce(
    (soma, e) =>
      soma +
      aprendidasDaAbertura(repertorio, e, avancadoLiberado, trava.trancadas),
    0,
  );
  const agoraNoRepertorio = new Date().toISOString();
  const linhasARevisar = indice.reduce(
    (soma, e) =>
      soma +
      aRevisarNaAbertura(
        repertorio,
        e,
        agoraNoRepertorio,
        avancadoLiberado,
        trava.trancadas,
      ),
    0,
  );

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  /*
   * O fechamento do degrau e a ação de agora, montados das mesmas leituras que a
   * página já fez. `fechamentoDoNivel` e `proximaAcao` são funções puras e
   * testadas de `lib/curso/`, e o que elas recebem aqui já está na memória.
   */
  const paraONivel = {
    temas: new Map([...progresso].map(([tema, p]) => [tema, p.feitos])),
    finais,
    publicadas,
    comPratica,
    linhasAprendidas,
    baseCompleto: avancadoLiberado,
    extras,
  };
  const fechamento = fechamentoDoNivel(nivel, paraONivel);
  const acao = proximaAcao({
    nivel,
    conquistado,
    progresso: paraONivel,
    vencidosDeTatica: devidosDeTatica.length,
    vencidasDeFinais: revisoesDeFinais,
  });

  /*
   * O recorte dos 30 dias, agora em memória.
   *
   * O cartão Hoje e a sequência corrente olham a janela curta — ninguém precisa
   * ver "48 dias seguidos" numa tela de celular, e o preparatório inteiro tem
   * quatro semanas. Os selos olham o histórico inteiro, porque um selo não
   * expira. As duas leituras saem da **mesma** consulta.
   */
  const inicioDaJanela = somarDias(hoje, -30);
  const minutosRecentes = minutos.filter((l) => l.dia >= inicioDaJanela);

  const minutosDoDia = minutosDeHoje(minutosRecentes, hoje, partidas.has(hoje));
  const sequencia = sequenciaDeDias(minutosRecentes, hoje);

  // Os últimos 30 dias; o recorte vem depois da conta, dentro de `serieDoGrafico`,
  // para o recorde de cada ponto contar o pico de antes da janela.
  const curvaDoRating = serieDoGrafico(tentativasNoRating, { dias: 30, hoje });

  /*
   * Os selos, do histórico inteiro, e **gravados com a data** (0018, 17/9/2026).
   *
   * A entrada é montada por `entradaDosSelos` — a mesma função de "Meu perfil", para as duas
   * telas não discordarem — sobre o que o painel já leu, mais a view de puzzles. Os números de
   * tática e de finais são do curso inteiro, e não do degrau. `sincronizarSelos` grava o que é
   * novo e devolve os que o aviso "Selo novo" tem de mostrar; se o banco falhar, o painel mostra
   * os derivados sem data e segue.
   */
  const { lista: listaDeSelos, novos: selosNovos } = await sincronizarSelos(
    perfil.id,
    entradaDosSelos({
      progresso,
      finais,
      aulasDeFinais,
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
  const grupos = agrupar(emOrdemDeData(AGENDA));
  const itensDaAgenda = grupos.reduce((n, g) => n + g.itens.length, 0);

  return (
    <>
      <Cabecalho
        atual="painel"
        nivel={nivel}
        sequencia={sequencia}
        largura="larga"
      />
      <Moldura largura="larga" barraInferior>
        {/* **O cabeçalho no desenho de "Meu perfil" (18/9/2026).**

            Ele era uma linha de 40 px com o nome em corpo 16 — medido em 9/9, o nome
            em `titulo` comia a dobra que o cartão AGORA disputa. Mas era a única página
            do site sem o título em serifa, e o painel parecia de outro site. Voltou a
            serifa, numa linha só com o avatar e a pastilha do metal (a mesma do perfil),
            e os links foram para a direita: são ~20 px a mais, não os 96 de antes. */}
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/perfil"
              aria-label="Meu perfil"
              className="foco shrink-0 rounded-full"
            >
              <Avatar id={perfil.avatar} tamanho={56} decorativo />
            </Link>
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <h1 className="titulo truncate text-tinta">{perfil.nome}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_DO_NIVEL[nivel].pastilha}`}
              >
                Nível {nivel} · {METAL[nivel]}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {/* "Meu perfil" (17/9/2026): conquistas com data, graus e o avatar numa página só — era
                "Meu progresso". E a turma: os colegas, em ordem alfabética, sem número nenhum. */}
            <Link
              href="/perfil"
              className="foco -my-3 inline-flex min-h-11 items-center font-medium text-metodo-tinta hover:underline"
            >
              Meu perfil
            </Link>
            <Link
              href="/turma"
              className="foco -my-3 inline-flex min-h-11 items-center font-medium text-metodo-tinta hover:underline"
            >
              Turma
            </Link>
            <span className="text-tinta-fraca">
              {perfil.equipe ? EQUIPE[perfil.equipe] : "Professor"}
              {perfil.tabuleiro ? ` · tabuleiro ${perfil.tabuleiro}` : ""}
            </span>
            {perfil.papel === "professor" ? (
              <Link
                href="/professor"
                className="foco font-medium text-metodo-tinta hover:underline"
              >
                Professor
              </Link>
            ) : null}
            <form action={sair}>
              <button
                type="submit"
                className="foco text-tinta-fraca hover:text-tinta"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* O selo novo antes do AGORA: é a notícia do dia, e aparece uma vez só. */}
        {selosNovos.length > 0 ? (
          <AvisoDeSeloNovo
            selos={selosNovos.map(({ id, familia, nome, conta }) => ({
              id,
              familia,
              nome,
              conta,
            }))}
          />
        ) : null}

        {/* **Duas colunas, como `/trilha` e `/finais` (18/9/2026).** À esquerda, o que se
            faz — AGORA, o dia, as frentes, o rating; à direita, onde se está — a escada, as
            conquistas, a agenda. No celular a escada sobe para logo depois do AGORA (a
            ordem de prioridade de sempre) e o resto da coluna do lado desce para o fim. */}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
            <Agora acao={acao} nivel={nivel} />

            <div className="lg:hidden">
              <Escada nivel={nivel} conquistado={conquistado} />
            </div>

            <Hoje
              minutos={minutosDoDia}
              sequencia={sequencia}
              partidaFeita={partidas.has(hoje)}
            />

            <Modulos
              nivel={nivel}
              fechamento={fechamento}
              puzzles={feitos}
              acerto={feitos ? Math.round((100 * certos) / feitos) : null}
              linhasARevisar={linhasARevisar}
            />

            <Prova
              nivel={nivel}
              fechado={fechamento.fechado}
              conquistado={conquistado}
            />

            <RatingDeTatica
              estado={ratingTatica}
              serie={curvaDoRating}
              inicio={INICIO.rating}
            />
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
            <div className="hidden lg:block">
              <Escada nivel={nivel} conquistado={conquistado} />
            </div>

            <Selos lista={listaDeSelos} />

            {/* A agenda no fim, e **fechada**.

            Medida: aberta ela ocupava 612 px dos 2.022 do painel — 30% da
            página para quatro itens que não mudam o que fazer agora. A data
            deixou de ser o eixo do site em 9/9; o que sobrou aqui são os
            encontros presenciais e o que só acontece num dia.

            `<details>` e não um link para outra página: o conteúdo continua
            **nesta** tela, a um toque, com o próximo encontro dito no resumo. Um
            link levaria o aluno para fora do painel para ler quatro linhas. */}
            {grupos.length > 0 ? (
              <details className="group cartao px-4 py-4">
                <summary className="foco flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-semibold text-tinta">
                      Agenda
                    </span>
                    <span className="text-xs text-tinta-fraca">
                      {itensDaAgenda} {itensDaAgenda === 1 ? "item" : "itens"} ·
                      o próximo é {grupos[0].rotulo}
                    </span>
                  </span>
                  <span className="mt-1 shrink-0 text-tinta-fraca transition-transform group-open:rotate-180">
                    <Seta />
                  </span>
                </summary>
                <div className="mt-3 border-t border-borda-fraca pt-3">
                  <Agenda grupos={grupos} marcadas={[...marcadas]} />
                </div>
              </details>
            ) : null}
          </aside>
        </div>
      </Moldura>
    </>
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
  const grupos: { quando: Quando; rotulo: string; itens: ItemDaAgenda[] }[] =
    [];
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.quando === item.quando) ultimo.itens.push(item);
    else
      grupos.push({
        quando: item.quando,
        rotulo: quandoPorExtenso(item.quando),
        itens: [item],
      });
  }
  return grupos.map(({ rotulo, itens: doDia }) => ({ rotulo, itens: doDia }));
}
