import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { porExtenso, sabadoDaSemana, semanaAtual } from "@/lib/curso/calendario";
import { contarAberto, MODULO, MODULOS_EM_ORDEM, montarMapa } from "@/lib/curso/mapa";
import {
  NIVEIS,
  PUZZLE_ACIMA_DO_RAPIDO,
  vocEstaAqui,
  type ItemDoNivel,
  type ModuloDoNivel,
  type Situacao,
} from "@/lib/curso/trilha";
import { aulasPublicadas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { dicasLidas } from "@/lib/meiojogo/progresso";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema } from "@/lib/tatica/progresso";

/**
 * O mapa do curso inteiro, por nível de força.
 *
 * ## A pergunta que esta página responde
 *
 * "O que vem depois?" — e ela existe porque, até a F2, a resposta estava
 * repartida em três telas que não conversavam: `/tatica` fala em rating de
 * puzzle do Lichess, `/finais` fala em classe USCF, e o meio-jogo não falava em
 * nada. Um aluno de doze anos não converte escalas de cabeça.
 *
 * ## Uma escada só, e a conversão dita com todas as letras
 *
 * Os quatro degraus são faixas de **rápidas do chess.com**, que é o número que
 * o aluno conhece. As outras duas escalas entram convertidas, e a conversão
 * está escrita no rodapé desta página — não escondida em `lib/curso/trilha.ts`.
 * São aproximações declaradas, e **ninguém é barrado por elas**: todo item
 * aberto continua clicável em qualquer degrau.
 *
 * ## Três barras que contam coisas diferentes
 *
 * Puzzle resolvido é medido; aula dominada é certificada pela tablebase; dica
 * lida é declaração do aluno. Pôr as três lado a lado sem dizer isso seria
 * fabricar um percentual único que o professor não saberia defender com o aluno
 * na frente — então cada barra carrega a frase que diz o que ela conta
 * (`MODULO` em `lib/curso/mapa.ts`).
 *
 * ## As três aparências de uma pastilha, e a legenda que as nomeia
 *
 * A pastilha fechada é tracejada, que é a mesma linguagem de `/finais` e
 * `/tatica` — e por isso o tracejado precisava parar de dizer duas coisas ao
 * mesmo tempo. Ele **não** significa "trancado por rating": significa que o
 * item ainda não chegou, e a pastilha diz qual dos dois motivos o segura (o
 * sábado, ou o texto por escrever). A legenda no cabeçalho nomeia as três
 * aparências, e o rodapé não fala mais em tranca sem dizer de que espécie.
 */

export const metadata: Metadata = { title: "A trilha — Preparatório OLESC" };

export default async function Trilha() {
  const perfil = await perfilAtual();
  const semana = semanaAtual();

  const [tatica, finais, lidas] = await Promise.all([
    progressoPorTema(perfil.id),
    progressoDeFinais(perfil.id),
    dicasLidas(perfil.id),
  ]);

  const mapa = montarMapa({
    tatica: new Map([...tatica].map(([tema, p]) => [tema, p.tentativas])),
    temaAberto,
    finais,
    aulasPublicadas: aulasPublicadas(),
    dicasLidas: lidas,
    semana,
  });
  const aqui = vocEstaAqui(mapa);
  // A legenda só nomeia o que a página de fato desenha. Hoje nenhuma pastilha
  // está "em escrita" — as duas aulas do Sábado 1 já têm JSON, e o que falta
  // escrever só abre em sábados que ainda não chegaram —, e uma legenda com
  // uma entrada sem referente ensina o aluno a procurar um desenho que não
  // existe. Ela volta sozinha no dia em que um sábado chegar sem o texto
  // pronto, que é justamente o dia em que ela precisa estar lá.
  const situacoes = new Set<Situacao>(
    [...mapa.values()].flat().flatMap((m) => m.itens.map((i) => i.situacao)),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">A trilha do curso</h1>
        <p className="text-sm text-tinta-media">
          Tudo o que o preparatório tem, em quatro degraus de força: tática, finais e
          meio-jogo lado a lado. Você não precisa esperar o degrau certo — o que está aberto
          está clicável em qualquer um.
        </p>
        <Legenda situacoes={situacoes} />
        {aqui === null ? (
          <p className="rounded-lg bg-metodo-superficie/12 px-3 py-2 text-sm text-metodo-tinta-alta">
            Você fez tudo o que está aberto. O próximo lote abre no sábado.
          </p>
        ) : null}
      </header>

      {NIVEIS.map((nivel, i) => {
        const modulos = mapa.get(nivel.id) ?? [];
        const voceEstaAqui = aqui === nivel.id;

        return (
          <section
            key={nivel.id}
            aria-current={voceEstaAqui ? "step" : undefined}
            className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 sm:px-5 ${
              voceEstaAqui ? "border-metodo-cheio bg-carta" : "border-borda-fraca bg-carta/60"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-tinta">
                  <span className="text-tinta-fraca tabular-nums">{i + 1}.</span> {nivel.nome}
                  <span className="font-normal text-tinta-fraca"> de rápidas</span>
                </h2>
                {voceEstaAqui ? (
                  <span className="rounded-full bg-metodo-cheio px-2 py-0.5 text-xs font-semibold text-tinta-inversa">
                    Você está aqui
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-tinta-media">{nivel.resumo}</p>
            </div>

            {/* `items-start` porque a coluna do meio-jogo tem trinta pastilhas e
                a de finais tem seis: sem isto as três esticam até a altura da
                mais alta e sobra um terço de cartão em branco. `min-w-0` em
                cada cartão porque item de grade nasce com `min-width: auto`, e
                uma pastilha longa empurrava o cartão para fora da coluna — que
                é o defeito nº 1 da revisão das capturas: na coluna do meio o
                rótulo ficava escondido atrás do cartão vizinho. */}
            <div className="grid items-start gap-3 sm:grid-cols-3">
              {MODULOS_EM_ORDEM.map((nome) => (
                <Coluna
                  key={nome}
                  modulo={modulos.find((m) => m.modulo === nome) ?? { modulo: nome, itens: [] }}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-borda bg-carta px-4 py-3">
        <h2 className="rotulo text-tinta-fraca">Como as escalas foram casadas</h2>
        <p className="text-sm text-tinta-media">
          Os quatro degraus são faixas de <strong>rápidas do chess.com</strong>. As outras
          duas escalas do curso entram convertidas, e as duas conversões são aproximações,
          não fatos:
        </p>
        <ul className="flex flex-col gap-1 text-sm text-tinta-media">
          <li>
            <span aria-hidden className="text-tinta-muda">
              —{" "}
            </span>
            <strong>classe USCF → chess.com:</strong> o chess.com roda de 150 a 250 pontos
            acima do USCF nesta faixa.
          </li>
          <li>
            <span aria-hidden className="text-tinta-muda">
              —{" "}
            </span>
            <strong>puzzle do Lichess → rápidas do chess.com:</strong> puzzle é outra
            habilidade e outra escala; aqui vale{" "}
            <span className="tabular-nums">puzzle ≈ rápidas + {PUZZLE_ACIMA_DO_RAPIDO}</span>.
          </li>
        </ul>
        <p className="text-xs text-tinta-fraca">
          Elas ordenam esta tela, e nada mais: <strong>nenhum item é trancado por rating</strong>
          , e o degrau em que você está não impede de clicar no de cima. O que segura uma
          pastilha tracejada é o calendário ou o texto ainda por escrever — nunca o seu
          número.
        </p>
      </section>
    </main>
  );
}

/**
 * Uma coluna do degrau: um módulo, a barra dele e as pastilhas.
 *
 * Recebe o módulo mesmo vazio, e é de propósito — ver `MODULOS_EM_ORDEM`. Uma
 * coluna sem item nenhum escreve **por que** está vazia; um espaço em branco
 * onde o cabeçalho prometeu três colunas lê como erro de carregamento.
 */
function Coluna({ modulo }: { modulo: ModuloDoNivel }) {
  const { feitos, total, porAbrir, emEscrita } = contarAberto(modulo);
  const rotulo = MODULO[modulo.modulo];

  if (modulo.itens.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-dashed border-borda-fraca bg-carta/40 px-3 py-3">
        <span className="text-sm font-semibold text-tinta-fraca">{rotulo.nome}</span>
        <p className="text-xs text-tinta-fraca">{rotulo.vazio}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-3 py-3">
      <div className="flex flex-col gap-1">
        <Link
          href={rotulo.href}
          className="foco text-sm font-semibold text-metodo-tinta hover:underline"
        >
          {rotulo.nome}
        </Link>
        <span className="text-xs text-tinta-fraca tabular-nums">
          {total > 0 ? `${feitos} de ${total} ${rotulo.unidade}` : "nada aberto ainda"}
          {porAbrir > 0 ? ` · ${porAbrir} por abrir` : ""}
          {emEscrita > 0 ? ` · ${emEscrita} em escrita` : ""}
        </span>
      </div>
      <Barra
        feitos={feitos}
        de={total}
        tom={total > 0 && feitos === total ? "completo" : "metodo"}
      />
      <ul className="flex flex-wrap gap-1.5">
        {modulo.itens.map((item) => (
          // `min-w-0` no item flex pelo mesmo motivo do cartão: sem ele o
          // `truncate` da pastilha nunca corta, porque `max-w-full` resolve
          // contra a largura do próprio conteúdo.
          <li key={item.id} className="min-w-0 max-w-full">
            <Pastilha item={item} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-tinta-fraca">{rotulo.conta}</p>
    </div>
  );
}

/** As aparências que esta página **está** usando, nomeadas onde o aluno as vê. */
function Legenda({ situacoes }: { situacoes: ReadonlySet<Situacao> }) {
  const exemplos: { situacao: Situacao; amostra: string; diz: string; tracejada: boolean }[] = [
    { situacao: "aberto", amostra: "aberto", diz: "clique e comece", tracejada: false },
    { situacao: "por-abrir", amostra: "Sáb 3", diz: "abre naquele sábado", tracejada: true },
    { situacao: "em-escrita", amostra: "em escrita", diz: "ainda não existe", tracejada: true },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-tinta-fraca">
      {exemplos
        .filter((e) => situacoes.has(e.situacao))
        .map((e) => (
          <li key={e.situacao} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`rounded-full border border-borda px-2 py-0.5 ${
                e.tracejada ? "border-dashed" : "text-tinta-media"
              }`}
            >
              {e.amostra}
            </span>
            <span>{e.diz}</span>
          </li>
        ))}
    </ul>
  );
}

/**
 * Um item do curso, do tamanho de uma pastilha.
 *
 * Cento e dez pastilhas cabem nesta página, e é de propósito: a promessa da F2
 * é que o aluno **veja o que vem depois**, e um resumo em número não mostra que
 * a aula 34 se chama "Filidor".
 *
 * O sufixo (`Sáb 3`, `em escrita`) é irredutível — `shrink-0` — e é o nome que
 * encolhe. O contrário deixaria a pastilha dizer só o motivo, que é a metade
 * inútil das duas: o aluno já sabe que está fechada pelo tracejado.
 */
function Pastilha({ item }: { item: ItemDoNivel }) {
  const completo = item.feitos >= item.total;

  if (item.situacao !== "aberto") {
    const motivo = item.situacao === "por-abrir" ? `Sáb ${item.sabado}` : "em escrita";
    const porque =
      item.situacao === "por-abrir" && item.sabado !== null
        ? `abre no Sábado ${item.sabado}, ${porExtenso(sabadoDaSemana(item.sabado).data)}`
        : "ainda não foi escrita";

    return (
      <span
        className="inline-flex max-w-full items-baseline gap-1 rounded-full border border-dashed border-borda px-2 py-0.5 text-xs text-tinta-fraca"
        title={`${item.nome} — ${porque}`}
      >
        <span className="truncate">{item.nome}</span>
        <span className="shrink-0 text-tinta-fraca tabular-nums">· {motivo}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      title={item.nome}
      className={`foco inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-xs transition-colors ${
        completo
          ? "border-metodo-cheio bg-metodo-superficie/14 text-metodo-tinta-alta"
          : "border-borda text-tinta-media hover:bg-carta-toque"
      }`}
    >
      {completo ? "✓ " : ""}
      {item.nome}
    </Link>
  );
}
