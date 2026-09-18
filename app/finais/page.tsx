import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { DegrausDoGrau } from "@/components/progresso/SeloDoGrau";
import { IconeDoSelo } from "@/components/selos/Medalha";
import { perfilAtual } from "@/lib/auth/perfil";
import { editorLigado } from "@/lib/editor/local";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { estadoParaONivel } from "@/lib/curso/estado";
import { montarMapa, type ItemDoNivel } from "@/lib/curso/mapa";
import { NIVEIS, nivelDoAluno, prontoParaProva, type Nivel } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { grauDaAulaDeFinais, type Grau } from "@/lib/progresso/grau";
import { aulasComPratica, aulasExtras, aulasPublicadas, indiceDeAulas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import {
  AULA_ZERADA,
  aulasAbertas,
  aprendidasDaTrilha,
  proximaAula,
  trilhaCompleta,
} from "@/lib/finais/trilha";
import { Caminho, type Trofeu } from "../trilha/Caminho";
import { Escada } from "../trilha/Escada";
import { FaixaDoNivel, Seta } from "../trilha/Faixa";
import { RolarAteOProximo } from "../trilha/RolarAteOProximo";
import { trofeuDoNivel } from "../trilha/trofeu";

/**
 * O curso de finais na tela: os cinco níveis, e em cada um o caminho das aulas.
 *
 * ## O que a tela **não** decide
 *
 * Nada. Quais aulas existem e em que nível é `lib/finais/trilha.ts`; o que
 * passou pelo gate é o `status` do arquivo; o que o aluno fez é
 * `lib/finais/progresso.ts`; o que "aprendida" quer dizer é `aprendeu()`; e o
 * que cada item do caminho é, `montarMapa` — o mesmo mapa da `/trilha`, então
 * as duas páginas não podem discordar sobre uma aula.
 *
 * ## O caminho do Duolingo, como a `/trilha` (17/9/2026)
 *
 * Eram quatro listas de cartões, uma por classe USCF (E a B). Virou o desenho
 * da `/trilha` com só as aulas de finais: cada nível é uma faixa do seu metal
 * (Madeira a Ouro), as aulas são medalhões em onda, e o fim do nível é o troféu
 * da prova. Ao lado, a escada dos cinco níveis com o "você". A classe saiu da
 * tela: ela não cabe nos cinco níveis (o corte do mapa já é o `nivel` da aula),
 * e duas réguas de força na mesma página o aluno de doze anos não converte.
 *
 * O que cada nó tem a mais que na `/trilha` é o **grau** da aula, embaixo do
 * nome — Aprendiz a Mestre, a escadinha que sobe com a prática vencida e desce
 * com a revisão perdida. É o "subir e descer os degraus" da aula; o medalhão
 * aceso é o "aprendida", que não volta.
 *
 * ## A trilha inteira aparece — decisão revista na F2
 *
 * O aluno quer **saber o que vem depois**: as 49 aparecem, e a que não existe
 * em disco fica com o cadeado e "em escrita". A barra do topo continua contando
 * sobre as **publicadas** — medir o aluno contra 49 aulas quando existe uma
 * seria dizer-lhe que ele está em 2%.
 *
 * ## Os níveis longe do aluno começam fechados
 *
 * A regra da `/trilha`: abertos ficam o nível do aluno, o seguinte e o do
 * próximo passo. É um `<details>`, e a faixa continua dizendo o que tem dentro.
 *
 * ## A bancada do professor
 *
 * O rascunho continua alcançável, mas só para quem publica: é nele que o Doug
 * revisa a aula no celular antes do sábado. Para o aluno, rascunho não existe.
 */

export const metadata: Metadata = { title: "Finais — Preparatório OLESC" };

export default async function Finais() {
  const perfil = await perfilAtual();

  const publicadas = aulasPublicadas();
  const comPratica = aulasComPratica();
  // As aulas extras publicadas (§22 do Editor v2) entram no nível que declaram.
  const extras = aulasExtras();
  const trilha = trilhaCompleta(extras);
  const abertas = aulasAbertas(publicadas, extras);

  const [progresso, conquistado, cabecalho, estado] = await Promise.all([
    progressoDeFinais(perfil.id),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    estadoParaONivel(perfil.id),
  ]);
  const aqui = nivelDoAluno(conquistado);
  const pronto = prontoParaProva(estado);
  const feitas = aprendidasDaTrilha(abertas, progresso, comPratica);
  const proxima = proximaAula(abertas, progresso, comPratica);

  const mapa = montarMapa({
    // A tática não entra nesta página: o mapa só precisa dela para os itens que descartamos.
    tatica: new Map(),
    temaAberto: () => false,
    finais: progresso,
    aulasPublicadas: publicadas,
    aulasComPratica: comPratica,
    nivelDoAluno: aqui,
    extras,
  });
  const caminhos = new Map<Nivel, readonly ItemDoNivel[]>(
    NIVEIS.map((n) => [n, (mapa.get(n) ?? []).find((m) => m.modulo === "finais")?.itens ?? []]),
  );

  // O grau de hoje de cada aula tocada; a intocada é Novato, e o caminho não o escreve.
  const graus = new Map<string, Grau>(
    trilha.map((a) => [a.id, grauDaAulaDeFinais(comPratica.has(a.id), progresso.get(a.id) ?? AULA_ZERADA)]),
  );

  const trofeus = new Map<Nivel, Trofeu>(
    NIVEIS.map((n) => [n, trofeuDoNivel(n, conquistado, pronto, estado)]),
  );

  // Um próximo passo só: a primeira aula aberta e por aprender; sem nenhuma, a prova pronta.
  let proximo: { nivel: Nivel; id: string } | null = null;
  for (const n of NIVEIS) {
    const item = caminhos.get(n)!.find((i) => i.situacao === "aberto" && i.feitos < i.total);
    if (item) {
      proximo = { nivel: n, id: item.id };
      break;
    }
    if (trofeus.get(n)!.estado === "pronto") {
      proximo = { nivel: n, id: "trofeu" };
      break;
    }
  }

  const naTrilha = new Set(trilha.map((a) => a.id));
  // O editor não existe em produção, e o link para ele também não. A conta é a
  // mesma que a página do editor faz para decidir se abre ou responde 404.
  const comEditor = perfil.papel === "professor" && editorLigado();
  const bancada =
    perfil.papel === "professor"
      ? indiceDeAulas().filter((a) => !abertas.some((aberta) => aberta.id === a.id))
      : [];

  // A próxima aula, no metal do nível dela. "Continuar" pela mesma regra do balão do caminho.
  const acao = proxima && (graus.get(proxima.id) ?? 0) > 0 ? "Continuar" : "Começar";

  // Desenhado duas vezes (celular em cima, desktop ao lado), então o id leva o lugar.
  const resumo = (onde: string) => (
    <section aria-labelledby={`suas-aulas-${onde}`} className="flex flex-col gap-4 cartao px-4 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`suas-aulas-${onde}`} className="text-base font-semibold text-tinta">
            Suas aulas
          </h2>
          {abertas.length > 0 ? (
            <p className="text-sm text-tinta-media tabular-nums">
              <span className="font-serif text-2xl leading-none font-semibold text-tinta">{feitas.size}</span>
              <span className="text-tinta-fraca"> de {abertas.length}</span>
            </p>
          ) : null}
        </div>
        {abertas.length > 0 ? (
          <>
            <Barra
              feitos={feitas.size}
              de={abertas.length}
              tom={feitas.size === abertas.length ? "completo" : "metodo"}
            />
            <p className="text-xs text-tinta-fraca">
              {feitas.size === 0
                ? acao === "Começar"
                  ? "Nenhuma aprendida ainda. Comece pela primeira!"
                  : "Nenhuma aprendida ainda."
                : feitas.size === 1
                  ? "Aula aprendida."
                  : "Aulas aprendidas."}
            </p>
          </>
        ) : (
          <p className="text-sm text-tinta-media">
            Nenhuma aula foi publicada ainda. O caminho é o curso inteiro, e ele vai acendendo.
          </p>
        )}
      </div>

      {proxima ? (
        <Link
          href={`/finais/${proxima.id}`}
          aria-label={`${acao}: ${proxima.nome}`}
          className="foco group flex flex-col gap-3 rounded-2xl border border-borda bg-papel/40 p-3 transition-colors hover:bg-carta-toque"
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className={`trilha-no metal-${proxima.nivel} shrink-0`}
              style={{ "--lado": "2.75rem" } as React.CSSProperties}
            >
              <IconeDoSelo familia="finais" tamanho={22} />
            </span>
            <span className="text-sm leading-snug font-semibold text-pretty text-tinta">{proxima.nome}</span>
          </span>
          <span aria-hidden className="finais-botao py-2 text-center text-sm font-bold tracking-wide uppercase">
            {acao}
          </span>
        </Link>
      ) : abertas.length > 0 ? (
        <p className="text-sm text-metodo-tinta">
          Você aprendeu tudo o que já foi publicado. O curso continua sendo escrito.
        </p>
      ) : null}

      <p className="flex items-center gap-2.5 border-t border-borda-fraca pt-3 text-xs text-tinta-fraca">
        <DegrausDoGrau grau={0} />
        <span>O grau de cada aula sobe quando você vence a prática e desce se perder a revisão.</span>
      </p>
    </section>
  );

  return (
    <>
      <Cabecalho atual="finais" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="larga" />
      <Moldura largura="larga" barraInferior>
        <header className="flex flex-col gap-2">
          <h1 className="titulo text-tinta">Curso de finais</h1>
          {/* A frase do topo, no mesmo desenho da `/trilha` (Kasparov lá, Capablanca aqui):
              ouvir de um campeão mundial que o final vem antes de tudo vale mais que instrução. */}
          <figure className="flex max-w-prose flex-col gap-1">
            <blockquote className="font-serif text-lg leading-snug text-tinta-media italic">
              “Para melhorar o seu jogo, você precisa estudar os finais antes de tudo.”
            </blockquote>
            <figcaption className="text-xs text-tinta-fraca">
              José Raúl Capablanca, campeão mundial
            </figcaption>
          </figure>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-12">
            <div className="flex flex-col gap-4 lg:hidden">
              {resumo("celular")}
              <Escada aqui={aqui} conquistado={conquistado} />
            </div>

            {NIVEIS.map((nivel) => {
              const aberto = nivel === aqui || nivel === aqui + 1 || proximo?.nivel === nivel;
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
                    mostrar={["finais"]}
                  />
                  <details open={aberto} className="group">
                    <summary className="trilha-abrir foco mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-borda px-4 py-2 text-sm font-medium text-tinta-media transition-colors select-none hover:bg-carta-toque group-open:hidden">
                      Ver o caminho
                      <span className="text-tinta-fraca tabular-nums">
                        · {itens.length} {itens.length === 1 ? "aula" : "aulas"} e a prova
                      </span>
                      <Seta />
                    </summary>
                    <Caminho
                      nivel={nivel}
                      itens={itens}
                      trofeu={trofeus.get(nivel)!}
                      proximo={proximo?.nivel === nivel ? proximo.id : null}
                      graus={graus}
                    />
                  </details>
                </section>
              );
            })}

            <p className="max-w-prose text-sm text-tinta-media">
              São {trilha.length} aulas nos cinco níveis, e você vê todas: a do cadeado ainda está
              sendo escrita, e a tracejada é de um nível acima do seu — dá para adiantar.{" "}
              <Link href="/trilha" className="foco font-medium text-metodo-tinta underline">
                Veja a trilha do curso inteiro
              </Link>{" "}
              — tática e finais juntos.
            </p>

            {comEditor ? (
              <p className="text-sm text-tinta-media">
                <Link href="/editor" className="foco underline">
                  Editar as aulas
                </Link>{" "}
                — só na sua máquina, em <code>npm run dev</code>.
              </p>
            ) : null}

            {bancada.length > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-semibold text-tinta">Bancada do professor</h2>
                  <p className="text-sm text-tinta-media">
                    Aulas que o aluno ainda não enxerga: rascunho, ou publicada fora da trilha
                    das 49. Abrem normalmente por este link, e o que você jogar nelas grava.
                  </p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
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
                      {/* Irmão do link da aula, e não filho: link dentro de link é
                          HTML inválido, e o leitor de tela anuncia um alvo só. */}
                      {comEditor ? (
                        <Link
                          // A aula extra só existe no Editor v2: o editor v1 responde 404 para `EX-`.
                          href={aula.id.startsWith("EX-") ? `/editor/v2/finais/${aula.id}` : `/editor/finais/${aula.id}`}
                          className="foco rotulo mt-1 inline-block px-4 text-tinta-fraca underline"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="hidden flex-col gap-6 lg:sticky lg:top-16 lg:flex">
            {resumo("lado")}
            <Escada aqui={aqui} conquistado={conquistado} />
          </aside>
        </div>
        <RolarAteOProximo />
      </Moldura>
    </>
  );
}
