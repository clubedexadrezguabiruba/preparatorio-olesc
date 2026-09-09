import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/acoes";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { proximaAcao } from "@/lib/curso/acao";
import { hojeNoBrasil, somarDias } from "@/lib/curso/calendario";
import {
  diasComOMinimo,
  maiorSequenciaDeDias,
  minutosDeHoje,
  sequenciaDeDias,
} from "@/lib/curso/hoje";
import { fechamentoDoNivel, nivelDoAluno, temaFechado } from "@/lib/curso/nivel";
import { selos } from "@/lib/curso/selos";
import { minutosPorDia, partidasDeclaradas } from "@/lib/curso/minutos";
import { nivelConquistado } from "@/lib/curso/progresso";
import { aulasPublicadas } from "@/lib/finais/conteudo";
import { aulasVencidas } from "@/lib/finais/escada";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { aprendidasDaTrilha, aulasAbertas } from "@/lib/finais/trilha";
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
import { AGENDA } from "@/lib/tarefas/conteudo";
import { tarefasMarcadas } from "@/lib/tarefas/progresso";
import { BLOCOS } from "@/lib/tatica/blocos";
import { progressoPorTema, revisaoDeHoje } from "@/lib/tatica/progresso";
import { Agenda } from "./Agenda";
import { Agora } from "./Agora";
import { Escada } from "./Escada";
import { Hoje } from "./Hoje";
import { Modulos, Prova } from "./Nivel";
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
 * 5. **A prova**, quando ela está fechada ou já passada.
 * 6. **Os selos** — o que ele já conquistou, e dois que estão perto.
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
  ]);

  // A trilha de finais: o que está publicado, e o que dele já foi aprendido. As
  // duas contas são as mesmas de `/finais` — a tela lá e o cartão aqui não
  // podem discordar, e é por isso que nenhuma das duas as refaz.
  const publicadas = aulasPublicadas();
  const aulasDeFinais = aulasAbertas(publicadas);

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
  }));

  // O painel conta o mesmo que `/aberturas`: enquanto o portão do Avançado está
  // fechado, as linhas trancadas não entram no total nem na conta de aprendidas.
  // Duas telas com denominadores diferentes para o mesmo repertório seria o bug
  // de 6/9/2026 de novo, por outra porta.
  const avancadoLiberado = baseCompleto(repertorio, indice);
  const linhasAprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(repertorio, e, avancadoLiberado),
    0,
  );
  const agoraNoRepertorio = new Date().toISOString();
  const linhasARevisar = indice.reduce(
    (soma, e) => soma + aRevisarNaAbertura(repertorio, e, agoraNoRepertorio, avancadoLiberado),
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
    linhasAprendidas,
    baseCompleto: avancadoLiberado,
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

  /*
   * Os selos, do histórico inteiro e sem uma consulta a mais.
   *
   * Os números de tática e de finais são do **curso inteiro**, e não do degrau:
   * um selo de "13 temas" que zerasse ao subir de nível não seria um selo.
   */
  const temasFechados = BLOCOS.flatMap((b) => b.temas).filter((t) =>
    temaFechado(progresso.get(t.tag)?.feitos),
  ).length;

  const aBase = (cor: "brancas" | "pretas") => {
    const daCor = indice.filter((e) => e.cor === cor);
    const total = daCor.reduce((n, e) => n + idsLiberados(e, false).length, 0);
    const feitas = daCor.reduce((n, e) => n + aprendidasDaAbertura(repertorio, e, false), 0);
    return total > 0 && feitas >= total;
  };
  const linhasTodas = indice.reduce((n, e) => n + e.ids.length, 0);
  const aprendidasTodas = indice.reduce(
    (n, e) => n + aprendidasDaAbertura(repertorio, e, true),
    0,
  );

  const listaDeSelos = selos({
    temasFechados,
    aulasAprendidas: aprendidasDaTrilha(aulasDeFinais, finais).size,
    repertorio: {
      brancasCompletas: aBase("brancas"),
      pretasCompletas: aBase("pretas"),
      baseCompleto: avancadoLiberado,
      avancadoCompleto: linhasTodas > 0 && aprendidasTodas >= linhasTodas,
    },
    conquistado,
    diasComUmaHora: diasComOMinimo(minutos),
    maiorSequencia: maiorSequenciaDeDias(minutos),
  });
  const grupos = agrupar(emOrdemDeData(AGENDA));
  const itensDaAgenda = grupos.reduce((n, g) => n + g.itens.length, 0);

  return (
    <>
      <Cabecalho atual="painel" nivel={nivel} sequencia={sequencia} />
      <Moldura largura="painel" barraInferior className="gap-6">
        {/* O nome do aluno, e nada mais — **em corpo pequeno**.

            Ele era um cabeçalho de três linhas com equipe, tabuleiro e dois
            botões; 96 px da primeira dobra gastos em informação que o aluno já
            sabe sobre si mesmo. Saíram as linhas, e depois saiu também a serifa
            grande: medido, o nome em `titulo` ainda comia ~60 px da dobra que o
            cartão AGORA disputa. O título desta página não é quem o aluno é —
            é o que ele tem para fazer. */}
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h1 className="text-base font-semibold text-tinta">{perfil.nome}</h1>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-tinta-fraca">
              {perfil.equipe ? EQUIPE[perfil.equipe] : "Professor"}
              {perfil.tabuleiro ? ` · tabuleiro ${perfil.tabuleiro}` : ""}
            </span>
            {perfil.papel === "professor" ? (
              <Link href="/professor" className="foco font-medium text-metodo-tinta hover:underline">
                Professor
              </Link>
            ) : null}
            <form action={sair}>
              <button type="submit" className="foco text-tinta-fraca hover:text-tinta">
                Sair
              </button>
            </form>
          </div>
        </header>

        <Agora acao={acao} />

        <Escada nivel={nivel} conquistado={conquistado} />

        <Hoje minutos={minutosDoDia} sequencia={sequencia} partidaFeita={partidas.has(hoje)} />

        <Modulos
          fechamento={fechamento}
          puzzles={feitos}
          acerto={feitos ? Math.round((100 * certos) / feitos) : null}
          linhasARevisar={linhasARevisar}
        />

        <Prova nivel={nivel} fechado={fechamento.fechado} conquistado={conquistado} />

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
          <details className="cartao px-4 py-3">
            <summary className="foco flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
              <span className="rotulo text-tinta-fraca">A agenda</span>
              <span className="text-xs text-tinta-fraca">
                {itensDaAgenda} {itensDaAgenda === 1 ? "item" : "itens"} · o próximo é{" "}
                {grupos[0].rotulo} ▾
              </span>
            </summary>
            <div className="mt-3 border-t border-borda-fraca pt-3">
              <Agenda grupos={grupos} marcadas={[...marcadas]} />
            </div>
          </details>
        ) : null}
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
  const grupos: { quando: Quando; rotulo: string; itens: ItemDaAgenda[] }[] = [];
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.quando === item.quando) ultimo.itens.push(item);
    else grupos.push({ quando: item.quando, rotulo: quandoPorExtenso(item.quando), itens: [item] });
  }
  return grupos.map(({ rotulo, itens: doDia }) => ({ rotulo, itens: doDia }));
}
