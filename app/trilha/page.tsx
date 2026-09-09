import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import {
  contarAberto,
  MODULO,
  MODULOS_EM_ORDEM,
  montarMapa,
  type ItemDoNivel,
  type ModuloDoNivel,
} from "@/lib/curso/mapa";
import {
  META_DA_OLESC,
  NIVEIS,
  NIVEL,
  nivelDoAluno,
  type Nivel,
  type Situacao,
} from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { aulasComPratica, aulasPublicadas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema } from "@/lib/tatica/progresso";

/**
 * O mapa do curso inteiro, por nível.
 *
 * ## A pergunta que esta página responde
 *
 * "O que vem depois?" — e ela existe porque, até a F2, a resposta estava
 * repartida em três telas que não conversavam: `/tatica` falava em rating de
 * puzzle do Lichess e `/finais` falava em classe USCF, e nenhuma das duas falava
 * em nada. Um aluno de doze anos não converte escalas de cabeça.
 *
 * ## Os degraus passaram a ser cinco, e o rótulo passou a ser FIDE
 *
 * Eram quatro faixas de rápidas do chess.com, **derivadas** do piso de rating
 * dos puzzles — e a derivação estava quebrada: os oito blocos começam entre 700
 * e 1100, então os 36 temas caíam todos no degrau 1 e três degraus mostravam
 * uma coluna vazia com uma explicação. Hoje o degrau é declarado no currículo
 * (`Bloco.nivel`, `AulaDaTrilha.nivel`) e a escada tem cinco.
 *
 * O rótulo é **FIDE**, e não chess.com, de propósito: um aluno de 1700 rapid
 * que lesse "1400+" no degrau 5 concluiria que pode pular os quatro de baixo.
 * FIDE ≈ rápidas − 300/400 é conversão honesta, e o efeito acontece sozinho.
 *
 * ## Duas barras que contam coisas diferentes
 *
 * Puzzle resolvido é medido; aula aprendida é certificada pela tablebase. Pôr
 * as duas lado a lado sem dizer isso seria fabricar um percentual único que o
 * professor não saberia defender com o aluno na frente — então cada barra
 * carrega a frase que diz o que ela conta (`MODULO` em `lib/curso/mapa.ts`).
 *
 * ## As três aparências de uma pastilha, e a legenda que as nomeia
 *
 * A pastilha tracejada **não** significa "trancado". Ela diz qual dos dois
 * motivos segura o item: o degrau que o aluno ainda não alcançou (e que ele
 * pode adiantar, porque a trava é mole) ou o texto por escrever (que não
 * existe, e aí não há o que abrir). A legenda no cabeçalho só nomeia as
 * aparências que a página **está** usando.
 */

export const metadata: Metadata = { title: "A trilha — Preparatório OLESC" };

export default async function Trilha() {
  const perfil = await perfilAtual();

  const [tatica, finais, conquistado, cabecalho] = await Promise.all([
    progressoPorTema(perfil.id),
    progressoDeFinais(perfil.id),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
  ]);
  const aqui = nivelDoAluno(conquistado);

  const mapa = montarMapa({
    tatica: new Map([...tatica].map(([tema, p]) => [tema, p.tentativas])),
    temaAberto,
    finais,
    aulasPublicadas: aulasPublicadas(),
    aulasComPratica: aulasComPratica(),
    nivelDoAluno: aqui,
  });

  // A legenda só nomeia o que a página de fato desenha. Uma legenda com uma
  // entrada sem referente ensina o aluno a procurar um desenho que não existe.
  const situacoes = new Set<Situacao>(
    [...mapa.values()].flat().flatMap((m) => m.itens.map((i) => i.situacao)),
  );

  return (
    <>
      <Cabecalho
        atual="trilha"
        nivel={cabecalho.nivel}
        sequencia={cabecalho.sequencia}
        largura="larga"
      />
      <Moldura largura="larga" barraInferior>
      <header className="flex flex-col gap-2">
        <h1 className="titulo text-tinta">A trilha do curso</h1>
        <p className="text-sm text-tinta-media">
          Tudo o que o preparatório tem, em cinco degraus: tática e finais lado a lado.
          Você não precisa esperar o degrau certo — <strong>tudo o que está escrito
          continua clicável</strong>, em qualquer um.
        </p>
        <Legenda situacoes={situacoes} />
      </header>

      {NIVEIS.map((nivel) => {
        const modulos = mapa.get(nivel) ?? [];
        const voceEstaAqui = aqui === nivel;
        const daOlesc = META_DA_OLESC.includes(nivel);

        return (
          <section
            key={nivel}
            aria-current={voceEstaAqui ? "step" : undefined}
            className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 sm:px-5 ${
              voceEstaAqui ? "border-metodo-cheio bg-carta" : "border-borda-fraca bg-carta/60"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-tinta">
                  <span className="text-tinta-fraca tabular-nums">Nível {nivel}.</span>{" "}
                  <span className="font-normal text-tinta-fraca">FIDE </span>
                  {faixaFide(nivel)}
                </h2>
                {voceEstaAqui ? (
                  <span className="rounded-full bg-metodo-cheio px-2 py-0.5 text-xs font-semibold text-tinta-inversa">
                    Você está aqui
                  </span>
                ) : null}
                {daOlesc ? (
                  <span className="rounded-full border border-metodo-cheio px-2 py-0.5 text-xs font-medium text-metodo-tinta">
                    Meta da OLESC
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-tinta-media">{NIVEL[nivel].resumo}</p>
            </div>

            {/* `items-start` porque a coluna de tática tem muito mais pastilhas
                que a de finais: sem isto as duas esticam até a altura da mais
                alta e sobra meio cartão em branco. `min-w-0` em cada cartão
                porque item de grade nasce com `min-width: auto`, e uma pastilha
                longa empurrava o cartão para fora da coluna — que era o defeito
                nº 1 da revisão das capturas. */}
            <div className="grid items-start gap-3 sm:grid-cols-2">
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

      <section className="flex flex-col gap-2 cartao-vazio px-4 py-3">
        <h2 className="rotulo text-tinta-fraca">Sobre os números da escada</h2>
        <p className="text-sm text-tinta-media">
          As faixas são de <strong>rating FIDE</strong> — o do torneio, e não o do site
          onde você joga. A conversão é aproximada e vale a pena saber de cor:
        </p>
        <ul className="flex flex-col gap-1 text-sm text-tinta-media">
          <li>
            <span aria-hidden className="text-tinta-muda">
              —{" "}
            </span>
            <strong>FIDE ≈ rápidas do chess.com − 300 a 400.</strong> Quem tem 1200 de
            rápidas está por volta de 800 FIDE, que é o degrau 2.
          </li>
          <li>
            <span aria-hidden className="text-tinta-muda">
              —{" "}
            </span>
            <strong>A meta da OLESC são os degraus 1 a 3.</strong> São 13 temas e 507
            puzzles, que cabem no tempo até o torneio. Os degraus 4 e 5 são o treino do
            clube <em>depois</em> dele — ninguém está atrasado por não os ter feito.
          </li>
        </ul>
        <p className="text-xs text-tinta-fraca">
          Elas ordenam esta tela, e nada mais: <strong>nenhum item é trancado por
          rating</strong>, e o degrau em que você está não impede de clicar no de cima. O
          que segura uma pastilha tracejada é o degrau — que você alcança fazendo — ou o
          texto ainda por escrever.
        </p>
      </section>
      </Moldura>
    </>
  );
}

/** "800 a 1000", "1400+" — o rótulo do degrau, sem o `null` do teto na tela. */
function faixaFide(nivel: Nivel): string {
  const [piso, teto] = NIVEL[nivel].fide;
  if (teto === null) return `${piso}+`;
  return piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
}

/**
 * Uma coluna do degrau: um módulo, a barra dele e as pastilhas.
 *
 * Recebe o módulo mesmo vazio, e é de propósito — ver `MODULOS_EM_ORDEM`. Uma
 * coluna sem item nenhum escreve **por que** está vazia; um espaço em branco
 * onde o cabeçalho prometeu duas colunas lê como erro de carregamento.
 */
function Coluna({ modulo }: { modulo: ModuloDoNivel }) {
  const { feitos, total, adiante, emEscrita } = contarAberto(modulo);
  const rotulo = MODULO[modulo.modulo];

  if (modulo.itens.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-2 cartao-vazio px-3 py-3">
        <span className="text-sm font-semibold text-tinta-fraca">{rotulo.nome}</span>
        <p className="text-xs text-tinta-fraca">{rotulo.vazio}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 cartao px-3 py-3">
      <div className="flex flex-col gap-1">
        <Link
          href={rotulo.href}
          className="foco text-sm font-semibold text-metodo-tinta hover:underline"
        >
          {rotulo.nome}
        </Link>
        <span className="text-xs text-tinta-fraca tabular-nums">
          {total > 0 ? `${feitos} de ${total} ${rotulo.unidade}` : "nada aberto ainda"}
          {adiante > 0 ? ` · ${adiante} adiante` : ""}
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
    { situacao: "adiante", amostra: "Nível 4", diz: "adiante — clicável mesmo assim", tracejada: true },
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
 * Oitenta e cinco pastilhas cabem nesta página, e é de propósito: a promessa da
 * F2 é que o aluno **veja o que vem depois**, e um resumo em número não mostra
 * que a aula 34 se chama "Filidor".
 *
 * ## O item "adiante" é um link, e o "em escrita" não é
 *
 * A diferença é a que a trava mole faz: o degrau é uma recomendação, e o texto
 * que não existe é um fato. O tracejado é o mesmo nos dois porque o que ele diz
 * é "isto não é o seu trabalho de hoje" — mas só um deles abre.
 *
 * O sufixo (`Nível 4`, `em escrita`) é irredutível — `shrink-0` — e é o nome
 * que encolhe. O contrário deixaria a pastilha dizer só o motivo, que é a
 * metade inútil das duas: o aluno já sabe que está fechada pelo tracejado.
 */
function Pastilha({ item }: { item: ItemDoNivel }) {
  const completo = item.feitos >= item.total;

  if (item.situacao === "em-escrita") {
    return (
      <span
        className="inline-flex max-w-full items-baseline gap-1 rounded-full border border-dashed border-borda px-2 py-0.5 text-xs text-tinta-fraca"
        title={`${item.nome} — ainda não foi escrita`}
      >
        <span className="truncate">{item.nome}</span>
        <span className="shrink-0 text-tinta-fraca">· em escrita</span>
      </span>
    );
  }

  if (item.situacao === "adiante") {
    return (
      <Link
        href={item.href}
        title={`${item.nome} — nível ${item.nivel}, adiante do seu. Pode adiantar.`}
        className="foco inline-flex max-w-full items-baseline gap-1 rounded-full border border-dashed border-borda px-2 py-0.5 text-xs text-tinta-fraca transition-colors hover:bg-carta-toque"
      >
        <span className="truncate">{item.nome}</span>
        <span className="shrink-0 text-tinta-fraca tabular-nums">· Nível {item.nivel}</span>
      </Link>
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
