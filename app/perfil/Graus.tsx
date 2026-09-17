import Link from "next/link";
import { Barra } from "@/components/Barra";
import { DegrausDoGrau, SeloDoGrau } from "@/components/progresso/SeloDoGrau";
import { GRAUS, NOME_DO_GRAU, type Grau } from "@/lib/progresso/grau";
import { menorDia, type ResumoDosGraus } from "@/lib/progresso/resumo";

/**
 * O progresso item a item — o que era a página `/progresso` (17/9/2026), agora dentro de "Meu
 * perfil". A conta mora em `lib/progresso/resumo.ts`; aqui é só a forma.
 *
 * ## A ordem
 *
 * 1. **A revisar hoje**: a única parte que pede ação agora, e cada número leva aonde se faz o
 *    trabalho. Vazia, diz quando volta a ter revisão.
 * 2. **Os graus**: a escada dos seis nomes com quantos itens do aluno estão em cada um, e depois
 *    Aberturas, Finais e Tática.
 *
 * ## A forma, revista em 17/9 (crítica de design da `/progresso`)
 *
 * - **Os cabeçalhos de bloco são o `rotulo`**, como em `/finais` e no painel.
 * - **Nome à esquerda, grau à direita**, o desenho do cartão de `/finais`.
 * - **O estado vazio é um alvo inteiro**, e não um "Começar" sublinhado no fim da frase: dedo de
 *   criança acerta o cartão, não a palavra.
 */
export function RevisarHoje({ resumo, devidosDeTatica }: { resumo: ResumoDosGraus; devidosDeTatica: number }) {
  const nadaHoje = resumo.linhasHoje === 0 && resumo.finaisHoje.length === 0 && devidosDeTatica === 0;
  const proximaDeLinhas = menorDia(resumo.aberturas.map((a) => a.proxima));
  const proximaDeFinais = menorDia(resumo.finaisComecadas.map((f) => f.dias));
  return (
    <section aria-labelledby="hoje" className="flex flex-col gap-3">
      <CabecaDoBloco id="hoje" titulo="A revisar hoje" />
      {nadaHoje ? (
        <p className="cartao-vazio px-4 py-3.5 text-sm text-tinta-fraca">
          Nada para revisar hoje.
          <ProximaRevisao linhas={proximaDeLinhas} finais={proximaDeFinais} />
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          <ItemDeHoje numero={resumo.linhasHoje} unidade={["linha", "linhas"]} de="de abertura" href="/aberturas" />
          <ItemDeHoje
            numero={resumo.finaisHoje.length}
            unidade={["aula", "aulas"]}
            de="de finais"
            href={resumo.finaisHoje[0] ? `/finais/${resumo.finaisHoje[0]}` : "/finais"}
          />
          <ItemDeHoje numero={devidosDeTatica} unidade={["puzzle", "puzzles"]} de="de tática" href="/tatica/revisao" />
        </ul>
      )}
    </section>
  );
}

export function Graus({ resumo }: { resumo: ResumoDosGraus }) {
  const { aberturas, finaisComecadas, temas } = resumo;
  return (
    <>
      <section aria-labelledby="graus" className="flex flex-col gap-3">
        <CabecaDoBloco id="graus" titulo="Seus graus" />
        <p className="max-w-prose text-sm text-tinta-media">
          Cada linha, aula e tema tem um grau. Ele mostra onde a sua memória está{" "}
          <strong className="font-semibold text-tinta">hoje</strong>: sobe quando você acerta no dia da revisão, e desce
          quando erra.
        </p>
        <EscadaDosGraus contagem={resumo.contagem} />
      </section>

      <section aria-labelledby="aberturas" className="flex flex-col gap-3">
        <CabecaDoBloco id="aberturas" titulo="Aberturas" />
        {aberturas.length === 0 ? (
          <Vazio href="/aberturas" acao="Ir para Aberturas">
            Nenhuma linha treinada ainda.
          </Vazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {aberturas.map((a) => (
              <li key={`${a.entrada.cor}/${a.entrada.abertura}`}>
                <Link
                  href={`/aberturas/${a.entrada.cor}/${a.entrada.abertura}`}
                  className="foco flex flex-col gap-3 cartao-alvo px-4 py-3.5"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-medium text-tinta">{a.entrada.nome}</span>
                    {a.aulas > 0 ? (
                      <span className="text-xs text-tinta-fraca tabular-nums">
                        {a.aulasFeitas} de {a.aulas} {a.aulas === 1 ? "aula concluída" : "aulas concluídas"}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <Barra feitos={a.treinadas} de={a.total} tom={a.total > 0 && a.treinadas >= a.total ? "completo" : "metodo"} />
                    <span className="text-xs text-tinta-fraca tabular-nums">
                      {a.treinadas} de {a.total} linhas treinadas
                      {a.hoje > 0 ? <span className="font-medium text-aviso-tinta"> · {a.hoje} para revisar hoje</span> : null}
                    </span>
                  </span>
                  {a.treinadas > 0 ? (
                    <span className="flex flex-wrap gap-x-5 gap-y-2">
                      {[...GRAUS].reverse().map((g) => {
                        const n = a.porGrau.get(g);
                        return n ? (
                          <span key={g} className="inline-flex items-end gap-1.5">
                            <SeloDoGrau grau={g} />
                            <span className="text-xs leading-none text-tinta-fraca tabular-nums">
                              · {n} {n === 1 ? "linha" : "linhas"}
                            </span>
                          </span>
                        ) : null;
                      })}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="finais" className="flex flex-col gap-3">
        <CabecaDoBloco
          id="finais"
          titulo="Finais"
          resumo={
            finaisComecadas.length > 0
              ? `${finaisComecadas.length} ${finaisComecadas.length === 1 ? "aula começada" : "aulas começadas"}`
              : null
          }
        />
        {finaisComecadas.length === 0 ? (
          <Vazio href="/finais" acao="Ir para Finais">
            Nenhuma aula de finais começada ainda.
          </Vazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {finaisComecadas.map(({ aula, grau, dias }) => (
              <li key={aula.id}>
                <ItemComGrau href={`/finais/${aula.id}`} nome={aula.nome} grau={grau}>
                  {dias === null ? null : dias === 0 ? (
                    <span className="font-medium text-aviso-tinta">Revisar hoje</span>
                  ) : dias === 1 ? (
                    "Revisão amanhã"
                  ) : (
                    `Revisão em ${dias} dias`
                  )}
                </ItemComGrau>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tatica" className="flex flex-col gap-3">
        <CabecaDoBloco
          id="tatica"
          titulo="Tática"
          resumo={temas.length > 0 ? `${temas.length} ${temas.length === 1 ? "tema" : "temas"}` : null}
        />
        {temas.length === 0 ? (
          <Vazio href="/tatica" acao="Ir para Tática">
            Nenhum puzzle resolvido ainda.
          </Vazio>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {temas.map(({ tema, g }) => {
                const { tentativas, acertos } = g.medida.janela;
                return (
                  <li key={tema.tag}>
                    <ItemComGrau href={`/tatica/${tema.tag}`} nome={tema.nome} grau={g.grau}>
                      {tentativas > 0 ? (
                        <span className="block">
                          Acertou {Math.round((100 * acertos) / tentativas)}%{" "}
                          {tentativas === 1 ? "do último" : `dos últimos ${tentativas}`}
                        </span>
                      ) : null}
                      {g.falta ? <span className="block">{g.falta}</span> : null}
                    </ItemComGrau>
                  </li>
                );
              })}
            </ul>
            <p className="max-w-prose text-xs text-tinta-fraca">
              Na tática, todo puzzle do tema conta — série, prova, revisão ou rating —, e puzzle difícil vale mais. De
              Experiente para cima, o grau também olha os seus últimos puzzles do tema: se você começar a errar, ele cai
              junto.
            </p>
          </>
        )}
      </section>
    </>
  );
}

/**
 * Os seis graus em escada, do Novato ao Mestre, cada um com quantos itens do aluno estão nele.
 * Três colunas no celular (o nome mais largo, "Intermediário", cabe em 1/3 de 335 px) e seis a
 * partir de `sm`. O zero fica em `tinta-fraca`, e não some: "0 em Mestre" também é informação.
 */
export function EscadaDosGraus({ contagem, legenda = true }: { contagem: ReadonlyMap<Grau, number>; legenda?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <ol
        aria-label="Os graus, do primeiro ao último, com quantos itens estão em cada um"
        className="cartao grid grid-cols-3 gap-y-4 px-1 py-3.5 sm:grid-cols-6"
      >
        {GRAUS.map((g) => {
          const n = contagem.get(g) ?? 0;
          return (
            <li key={g} className="flex flex-col items-start gap-1.5 px-3">
              <DegrausDoGrau grau={g} />
              <span
                className={`text-xs leading-tight ${
                  n === 0 ? "text-tinta-fraca" : g >= 3 ? "font-semibold text-metodo-tinta" : "font-semibold text-tinta-media"
                }`}
              >
                {NOME_DO_GRAU[g]}
              </span>
              <span className={`text-lg leading-none font-semibold tabular-nums ${n > 0 ? "text-tinta" : "text-tinta-fraca"}`}>
                <span className="sr-only">: </span>
                {n}
                <span className="sr-only"> {n === 1 ? "item" : "itens"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {legenda ? (
        <p className="text-xs text-tinta-fraca">Os números contam suas linhas treinadas, aulas de finais começadas e temas de tática.</p>
      ) : null}
    </div>
  );
}

/** O cabeçalho de bloco do site — o `rotulo` de `/finais` e do painel —, com o resumo à direita. */
export function CabecaDoBloco({
  id,
  titulo,
  resumo = null,
  children,
}: {
  id: string;
  titulo: string;
  resumo?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 id={id} className="rotulo text-tinta-fraca">
        {titulo}
      </h2>
      {resumo ? <span className="text-xs text-tinta-fraca tabular-nums">{resumo}</span> : null}
      {children}
    </div>
  );
}

/** "A próxima revisão é amanhã", com a origem — a tática não entra: a fila dela só sabe o dia de hoje. */
function ProximaRevisao({ linhas, finais }: { linhas: number | null; finais: number | null }) {
  const dias = menorDia([linhas, finais]);
  if (dias === null) return null;
  const de = linhas === dias && finais === dias ? "aberturas e finais" : linhas === dias ? "aberturas" : "finais";
  return (
    <>
      {" "}
      A próxima revisão de {de} é{" "}
      <span className="font-medium text-tinta-media">{dias <= 1 ? "amanhã" : `daqui a ${dias} dias`}</span>.
    </>
  );
}

/** Uma aula ou um tema: nome e detalhe à esquerda, o grau à direita — o desenho do cartão de `/finais`. */
function ItemComGrau({ href, nome, grau, children }: { href: string; nome: string; grau: Grau; children?: React.ReactNode }) {
  return (
    <Link href={href} className="foco flex min-h-14 items-center gap-3 cartao-alvo px-4 py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-tinta">{nome}</span>
        {children ? <span className="text-xs text-tinta-fraca tabular-nums">{children}</span> : null}
      </span>
      <SeloDoGrau grau={grau} />
    </Link>
  );
}

function ItemDeHoje({
  numero,
  unidade,
  de,
  href,
}: {
  numero: number;
  unidade: readonly [string, string];
  de: string;
  href: string;
}) {
  if (numero === 0) {
    return (
      <li className="flex flex-col gap-0.5 cartao-vazio px-4 py-3">
        <span className="text-sm text-tinta-fraca">
          Nenhum{unidade[0] === "aula" || unidade[0] === "linha" ? "a" : ""} {unidade[0]}
        </span>
        <span className="text-xs text-tinta-fraca">{de}</span>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="foco flex h-full flex-col gap-0.5 cartao-alvo px-4 py-3">
        <span className="text-sm font-semibold text-tinta tabular-nums">
          {numero} {numero === 1 ? unidade[0] : unidade[1]}
        </span>
        <span className="text-xs text-aviso-tinta">{de}, para revisar hoje</span>
      </Link>
    </li>
  );
}

/** O bloco ainda vazio: o cartão inteiro é o alvo, e a ação diz aonde ele leva. */
function Vazio({ href, acao, children }: { href: string; acao: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="foco flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 cartao-vazio px-4 py-3 transition-colors hover:bg-carta-toque"
    >
      <span className="text-sm text-tinta-fraca">{children}</span>
      <span className="text-sm font-medium text-metodo-tinta">{acao}</span>
    </Link>
  );
}
