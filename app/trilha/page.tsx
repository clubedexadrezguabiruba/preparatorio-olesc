import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { estadoParaONivel } from "@/lib/curso/estado";
import { MODULOS_EM_ORDEM, montarMapa, type ItemDoNivel } from "@/lib/curso/mapa";
import { NIVEIS, nivelDoAluno, prontoParaProva, type Nivel } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import {
  aulasComPratica,
  aulasExtras,
  aulasPublicadas,
} from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema } from "@/lib/tatica/progresso";
import { Caminho, type Trofeu } from "./Caminho";
import { Escada } from "./Escada";
import { FaixaDoNivel, Seta } from "./Faixa";
import { RolarAteOProximo } from "./RolarAteOProximo";
import { trofeuDoNivel } from "./trofeu";

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
 * ## Os degraus são cinco, e o rótulo é FIDE
 *
 * O degrau é declarado no currículo (`Bloco.nivel`, `AulaDaTrilha.nivel`), e
 * não derivado do piso de rating dos puzzles — a derivação antiga jogava os 36
 * temas no degrau 1. O rótulo é **FIDE**, e não chess.com, de propósito: um
 * aluno de 1700 rapid que lesse "1400+" no degrau 5 concluiria que pode pular
 * os quatro de baixo. FIDE ≈ rápidas − 300/400 é conversão honesta.
 *
 * ## Duas barras que contam coisas diferentes
 *
 * Puzzle resolvido é medido; aula aprendida é a prática vencida em três dias
 * diferentes (ou a aula sem prática assistida até o fim). Pôr as duas lado a
 * lado sem dizer isso seria fabricar um percentual único que o professor não
 * saberia defender com o aluno na frente — então cada faixa tem uma barra por
 * módulo, na unidade dela (`MODULO` em `lib/curso/mapa.ts`).
 *
 * ## O tracejado
 *
 * O tracejado **não** significa "trancado". Ele diz qual dos dois motivos
 * segura o item: o degrau que o aluno ainda não alcançou (e que ele pode
 * adiantar, porque a trava é mole) ou o texto por escrever (que não existe, e
 * aí não há o que abrir). O card "Como ler o caminho", que nomeava as
 * aparências, saiu a pedido do Doug (18/9): o "pode adiantar" e o "em
 * escrita" escritos ao lado do nó já dizem isso.
 *
 * ## A escada em caminho (17/9/2026)
 *
 * Eram pastilhas em duas colunas por nível. Virou o caminho do Duolingo com os
 * metais da `/tatica`: cada nível é uma faixa do seu metal (Madeira a Ouro),
 * os itens são medalhões em onda — tática e depois finais, a ordem da rotina —
 * e o fim de cada nível é o troféu da prova, que diz se ela está conquistada,
 * pronta, ou o que falta (as três trilhas de `fechamentoDoNivel`, repertório
 * incluído). Ao lado, a escada dos cinco degraus com o "você".
 *
 * O **próximo passo** é um só na página: o primeiro item aberto e não
 * concluído, na ordem do caminho; sem nenhum, a prova pronta. É ele que ganha
 * o balão e o professor, e é para ele que a página rola ao abrir.
 *
 * ## Os níveis longe do aluno começam fechados (Doug, 18/9: "tem que rolar muito")
 *
 * São 117 temas e aulas; abertos todos, a página passava de dez telas, e o
 * nível 5 sozinho tinha 34 temas. Abertos ficam o nível do aluno, o seguinte e
 * o do próximo passo; os outros mostram a faixa e um botão "Ver o caminho".
 * Nada fica escondido de vez: é um `<details>`, e a faixa continua dizendo o
 * que tem dentro.
 */

export const metadata: Metadata = { title: "A trilha — Preparatório OLESC" };

export default async function Trilha() {
  const perfil = await perfilAtual();

  const [tatica, finais, conquistado, cabecalho, estado] = await Promise.all([
    progressoPorTema(perfil.id),
    progressoDeFinais(perfil.id),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    estadoParaONivel(perfil.id),
  ]);
  const aqui = nivelDoAluno(conquistado);
  const pronto = prontoParaProva(estado);

  const mapa = montarMapa({
    tatica: new Map([...tatica].map(([tema, p]) => [tema, p.tentativas])),
    temaAberto,
    finais,
    aulasPublicadas: aulasPublicadas(),
    aulasComPratica: aulasComPratica(),
    nivelDoAluno: aqui,
    extras: aulasExtras(),
  });

  // O caminho de cada nível: tática e depois finais, na ordem da rotina.
  const caminhos = new Map<Nivel, ItemDoNivel[]>(
    NIVEIS.map((n) => [
      n,
      MODULOS_EM_ORDEM.flatMap(
        (m) => (mapa.get(n) ?? []).find((x) => x.modulo === m)?.itens ?? [],
      ),
    ]),
  );

  const trofeus = new Map<Nivel, Trofeu>(
    NIVEIS.map((n) => [n, trofeuDoNivel(n, conquistado, pronto, estado)]),
  );

  // Um próximo passo só: o primeiro item aberto e por fazer; sem nenhum, a prova pronta.
  let proximo: { nivel: Nivel; id: string } | null = null;
  for (const n of NIVEIS) {
    const item = caminhos
      .get(n)!
      .find((i) => i.situacao === "aberto" && i.feitos < i.total);
    if (item) {
      proximo = { nivel: n, id: item.id };
      break;
    }
    if (trofeus.get(n)!.estado === "pronto") {
      proximo = { nivel: n, id: "trofeu" };
      break;
    }
  }

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
          {/* A frase do topo (Doug, 18/9: "mais curto e com impacto"). Kasparov,
              e não um lema nosso: a trilha é feita de dias seguidos de treino, e
              ouvir de um campeão mundial que constância é talento vale mais que instrução. */}
          <figure className="flex max-w-prose flex-col gap-1">
            <blockquote className="font-serif text-lg leading-snug text-tinta-media italic">
              “A capacidade de trabalhar duro dias a fio sem perder o foco é um
              talento.”
            </blockquote>
            <figcaption className="text-xs text-tinta-fraca">
              Garry Kasparov, campeão mundial
            </figcaption>
          </figure>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-12">
            <div className="lg:hidden">
              <Escada aqui={aqui} conquistado={conquistado} />
            </div>

            {NIVEIS.map((nivel) => {
              const aberto =
                nivel === aqui ||
                nivel === aqui + 1 ||
                proximo?.nivel === nivel;
              const itens = caminhos.get(nivel)!;
              return (
                <section
                  key={nivel}
                  id={`nivel-${nivel}`}
                  aria-labelledby={`titulo-nivel-${nivel}`}
                  aria-current={aqui === nivel ? "step" : undefined}
                  className="flex scroll-mt-6 flex-col gap-4"
                >
                  <FaixaDoNivel
                    nivel={nivel}
                    modulos={mapa.get(nivel) ?? []}
                    voceEstaAqui={aqui === nivel}
                    conquistado={nivel <= conquistado}
                  />
                  <details open={aberto} className="group">
                    <summary className="trilha-abrir foco mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-borda px-4 py-2 text-sm font-medium text-tinta-media transition-colors select-none hover:bg-carta-toque group-open:hidden">
                      Ver o caminho
                      <span className="text-tinta-fraca tabular-nums">
                        · {itens.length} {itens.length === 1 ? "item" : "itens"}{" "}
                        e a prova
                      </span>
                      <Seta />
                    </summary>
                    <Caminho
                      nivel={nivel}
                      itens={itens}
                      trofeu={trofeus.get(nivel)!}
                      proximo={proximo?.nivel === nivel ? proximo.id : null}
                    />
                  </details>
                </section>
              );
            })}
          </div>

          <aside className="hidden flex-col gap-6 lg:sticky lg:top-6 lg:flex">
            <Escada aqui={aqui} conquistado={conquistado} />
          </aside>
        </div>
        <RolarAteOProximo />
      </Moldura>
    </>
  );
}
