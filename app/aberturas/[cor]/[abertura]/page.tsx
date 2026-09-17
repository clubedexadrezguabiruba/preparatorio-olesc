import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { SeloDoGrau } from "@/components/progresso/SeloDoGrau";
import type { AulaDoCurso } from "@/lib/aberturas/curso";
import { estadoDasAulas, donaDaLinha, type EstadoDaAulaNaTrilha } from "@/lib/aberturas/trava";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { grauDaAulaDeAbertura, grauDaEscada } from "@/lib/progresso/grau";
import { aberturaNoIndice, lerIndice, linhasDaAbertura } from "@/lib/repertorio/banco";
import { notasDaAbertura } from "@/lib/repertorio/conteudo";
import { CORES, type Cor, type Linha } from "@/lib/repertorio/linhas";
import { lancesEmPortugues, type Nota } from "@/lib/repertorio/notas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { aprendida, baseCompleto, vencida, zerado, type ProgressoDaLinha } from "@/lib/repertorio/treino";

/** A cor veio da URL: ou é uma das duas, ou a rota não existe. */
function ehCor(valor: string): valor is Cor {
  return (CORES as readonly string[]).includes(valor);
}

export async function generateMetadata({
  params,
}: PageProps<"/aberturas/[cor]/[abertura]">): Promise<Metadata> {
  const { cor, abertura } = await params;
  const entrada = ehCor(cor) ? await aberturaNoIndice(cor, abertura) : null;
  return { title: `${entrada?.nome ?? "Aberturas"} — Preparatório OLESC` };
}

/**
 * A página de uma abertura: o caminho até o move trainer (17/9/2026).
 *
 * ## O que ela era, e o defeito
 *
 * Esta rota **era** o move trainer. Clicar na Francesa em `/aberturas` punha o aluno decorando
 * linhas antes de ter visto a aula A, e a faixa "Aulas A · B · C…" ficava espremida num canto do
 * cabeçalho, sem dizer qual fazer primeiro nem o que já estava feito. Foi o primeiro ponto do
 * feedback do aluno que testou a Francesa 3.Bd3. O treino foi para `/treino`, e esta página virou
 * o mapa.
 *
 * ## As duas formas
 *
 * - **Abertura com curso** (a Francesa): uma linha do tempo vertical A → B → C → D → E+F. Cada aula
 *   diz se está concluída, se é a de agora ou se está trancada, com o progresso da rodada; e embaixo
 *   dela, as **suas** linhas do move trainer — com cadeado até a aula ser concluída
 *   (`lib/aberturas/trava.ts`). O cadeado não esconde o grau: quem treinou antes da trava continua
 *   vendo onde está.
 * - **Abertura sem curso** (as outras dez): só a lista das linhas.
 *
 * Em cada linha: o grau (`SeloDoGrau`, o degrau atual), "revisar hoje" quando venceu, e o botão
 * Treinar — que leva ao move trainer já naquela linha.
 *
 * ## Uma coisa só chama atenção
 *
 * A aula "de agora" é o único cartão com borda do método e botão cheio. O resto é quieto: aula
 * concluída é uma linha com ✓, aula trancada é tracejada. O aluno abre a página e sabe o que fazer
 * sem ler nada — que é o que a faixa do cabeçalho não fazia.
 */
export default async function Abertura({ params }: PageProps<"/aberturas/[cor]/[abertura]">) {
  const { cor, abertura } = await params;
  if (!ehCor(cor)) notFound();

  const entrada = await aberturaNoIndice(cor, abertura);
  if (!entrada) notFound();

  const perfil = await perfilAtual();
  const [todasAsLinhas, progresso, indiceInteiro, trava, cabecalho] = await Promise.all([
    linhasDaAbertura(cor, abertura),
    progressoDoRepertorio(),
    lerIndice(),
    travaDoAluno(perfil),
    dadosDoCabecalho(perfil.id),
  ]);

  const agora = new Date().toISOString();
  const de = (id: string): ProgressoDaLinha => progresso.get(id) ?? zerado();

  // O portão do Avançado continua escondendo (é outro repertório); a trava por aula **mostra**
  // com cadeado, porque o aluno precisa ver o que a aula destrava.
  const avancadoLiberado = baseCompleto(progresso, indiceInteiro, trava.trancadas);
  const linhas = [...todasAsLinhas]
    .filter((l) => l.nivel !== "avancado" || avancadoLiberado)
    .sort((a, b) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER));
  const abertas = linhas.filter((l) => !trava.trancadas.has(l.id));
  const aprendidas = abertas.filter((l) => aprendida(de(l.id))).length;
  const aRevisar = abertas.filter((l) => vencida(de(l.id), agora)).length;

  const aulas = trava.cursos.get(`${cor}/${abertura}`) ?? [];
  const concluidas = new Set(trava.concluidas.keys());
  const estados = estadoDasAulas(aulas, concluidas, trava.quem);
  const daVez = aulas.find((_, i) => estados[i] === "agora") ?? null;

  const paginaDaAbertura = `/aberturas/${cor}/${abertura}`;
  const treino = `${paginaDaAbertura}/treino`;
  const semPrefixo = (nome: string) => nome.replace(`${entrada.nome} — `, "");
  const itemDe = (l: Linha): ItemDeLinha => ({
    id: l.id,
    nome: semPrefixo(l.nome),
    progresso: de(l.id),
    trancada: trava.trancadas.has(l.id),
    hoje: vencida(de(l.id), agora),
  });

  // As linhas de cada aula são as que ela **possui** — a primeira que as lista. A E+F revisa as
  // dezenove, e repeti-las embaixo dela seria a mesma lista duas vezes na mesma página.
  const linhasDaAula = new Map<string, ItemDeLinha[]>();
  const semAula: ItemDeLinha[] = [];
  for (const l of linhas) {
    const dona = donaDaLinha(aulas, l.id);
    if (dona) linhasDaAula.set(dona.id, [...(linhasDaAula.get(dona.id) ?? []), itemDe(l)]);
    else semAula.push(itemDe(l));
  }

  return (
    <>
      <Cabecalho atual="aberturas" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="painel" barraInferior>
        <header className="flex flex-col gap-3">
          <Link href="/aberturas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
            ← Aberturas
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="titulo text-tinta">{entrada.nome}</h1>
            <p className="text-sm text-tinta-media">
              Você joga de {cor}.{" "}
              {aulas.length > 0
                ? "Primeiro as aulas, na ordem; cada aula concluída abre as linhas dela no move trainer."
                : "Cada linha vai até o roque e as peças fora, e é aprendida quando você a acerta em três dias diferentes."}
            </p>
          </div>
          <p className="text-sm text-tinta-fraca tabular-nums">
            {aulas.length > 0
              ? `${abertas.length} de ${linhas.length} ${linhas.length === 1 ? "linha aberta" : "linhas abertas"} · `
              : `${linhas.length} ${linhas.length === 1 ? "linha" : "linhas"} · `}
            {aprendidas} {aprendidas === 1 ? "aprendida" : "aprendidas"}
            {aRevisar > 0 ? (
              <>
                {" · "}
                <strong className="font-semibold text-aviso-tinta">{aRevisar} a revisar hoje</strong>
              </>
            ) : null}
          </p>
          {abertas.length > 0 ? (
            <Link
              href={treino}
              className={`foco inline-flex min-h-11 w-fit items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
                daVez
                  ? "border border-borda-forte text-tinta hover:bg-carta-toque"
                  : "bg-metodo-cheio text-tinta-inversa hover:bg-metodo-cheio-toque"
              }`}
            >
              {aRevisar > 0 ? "Revisar as linhas de hoje" : "Treinar as linhas"}
            </Link>
          ) : null}
        </header>

        {aulas.length > 0 ? (
          <section aria-labelledby="titulo-das-aulas" className="flex flex-col gap-3">
            <h2 id="titulo-das-aulas" className="text-base font-semibold text-tinta">
              As aulas
            </h2>
            <ol className="flex flex-col">
              {aulas.map((aula, i) => (
                <NaLinhaDoTempo
                  key={aula.id}
                  aula={aula}
                  estado={estados[i]}
                  anterior={aulas[i - 1] ?? null}
                  ultima={i === aulas.length - 1}
                  vezes={trava.concluidas.get(aula.id) ?? 0}
                  feitas={trava.abertas.get(aula.id)?.length ?? 0}
                  linhas={linhasDaAula.get(aula.id) ?? []}
                  treino={treino}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {semAula.length > 0 ? (
          <section aria-labelledby="titulo-das-linhas" className="flex flex-col gap-3">
            <h2 id="titulo-das-linhas" className="text-base font-semibold text-tinta">
              {aulas.length > 0 ? "Outras linhas" : semAula.length === 1 ? "A linha" : `As ${semAula.length} linhas`}
            </h2>
            <ListaDeLinhas linhas={semAula} treino={treino} />
          </section>
        ) : null}

        {linhas.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            {todasAsLinhas.length > 0
              ? "Esta abertura é do Avançado. Ela abre quando você tiver aprendido todas as linhas do Base."
              : "Esta abertura ainda não tem linhas publicadas."}
          </p>
        ) : null}

        <Podadas notas={notasDaAbertura(cor, abertura)} />
      </Moldura>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * A linha do tempo das aulas
 * ------------------------------------------------------------------ */

type ItemDeLinha = {
  id: string;
  nome: string;
  progresso: ProgressoDaLinha;
  trancada: boolean;
  hoje: boolean;
};

/** "Francesa 3.Bd3 — aula A: A defesa e nossa arma" vira "A defesa e nossa arma". */
function tituloCurto(titulo: string): string {
  const corte = titulo.indexOf(": ");
  return corte >= 0 ? titulo.slice(corte + 2) : titulo;
}

/**
 * Uma aula na linha do tempo, com as linhas dela embaixo.
 *
 * O trilho vertical é um fio à esquerda que liga os nós; o trecho abaixo de uma aula concluída é
 * verde, e o resto é borda — o aluno vê até onde chegou sem contar ✓. É forma, e não só cor: o nó
 * concluído é cheio com ✓, o de agora é um anel, o trancado é tracejado com cadeado.
 */
function NaLinhaDoTempo({
  aula,
  estado,
  anterior,
  ultima,
  vezes,
  feitas,
  linhas,
  treino,
}: {
  aula: AulaDoCurso;
  estado: EstadoDaAulaNaTrilha;
  anterior: AulaDoCurso | null;
  ultima: boolean;
  vezes: number;
  feitas: number;
  linhas: readonly ItemDeLinha[];
  treino: string;
}) {
  const total = aula.etapas.length;
  const trancada = estado === "trancada";
  const daVez = estado === "agora";
  const grau = linhas.length > 0 ? grauDaAulaDeAbertura(linhas.map((l) => grauDaEscada(l.progresso))) : null;

  const situacao =
    estado === "concluida"
      ? vezes > 1
        ? `Concluída ${vezes} vezes`
        : "Concluída"
      : trancada
        ? anterior
          ? `Abre quando você concluir a aula ${anterior.rotulo}`
          : "Trancada"
        : feitas > 0
          ? `${Math.min(feitas, total)} de ${total} etapas`
          : `${total} ${total === 1 ? "etapa" : "etapas"}`;

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {ultima ? null : (
        <span
          aria-hidden
          className={`absolute top-9 bottom-1 left-4.25 w-0.5 rounded-full ${
            estado === "concluida" ? "bg-metodo-cheio" : "bg-borda"
          }`}
        />
      )}
      <No estado={estado} rotulo={aula.rotulo} />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
        <div
          className={`flex flex-col gap-2 ${
            daVez ? "cartao border-metodo-cheio px-4 py-3.5" : "px-0.5"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className={`text-sm font-semibold ${trancada ? "text-tinta-fraca" : "text-tinta"}`}>
              <span className="tabular-nums">Aula {aula.rotulo}</span>
              <span className={`font-normal ${trancada ? "text-tinta-fraca" : "text-tinta-media"}`}>
                {" "}
                · {tituloCurto(aula.titulo)}
              </span>
            </h3>
            {grau !== null && !trancada ? <SeloDoGrau grau={grau} /> : null}
          </div>

          <p
            className={`text-xs tabular-nums ${
              estado === "concluida" ? "font-medium text-metodo-tinta" : daVez ? "text-tinta-media" : "text-tinta-fraca"
            }`}
          >
            {daVez && feitas === 0 ? "Estude agora · " : daVez ? "Continue de onde parou · " : ""}
            {situacao}
          </p>

          {daVez && feitas > 0 ? <Barra feitos={Math.min(feitas, total)} de={total} /> : null}

          {trancada ? null : (
            <Link
              href={aula.href}
              className={`foco inline-flex w-fit items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
                daVez
                  ? "min-h-11 bg-metodo-cheio text-tinta-inversa hover:bg-metodo-cheio-toque"
                  : "min-h-10 border border-borda text-tinta-media hover:bg-carta-toque"
              }`}
            >
              {daVez ? (feitas > 0 ? "Continuar a aula" : "Começar a aula") : estado === "concluida" ? "Rever a aula" : "Abrir a aula"}
            </Link>
          )}
        </div>

        {linhas.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-tinta-fraca">
              {linhas.length === 1 ? "A linha desta aula" : `As ${linhas.length} linhas desta aula`}
              {linhas.some((l) => l.trancada) ? ", no move trainer depois que você concluir a aula" : ", no move trainer"}
            </p>
            <ListaDeLinhas linhas={linhas} treino={treino} />
          </div>
        ) : aula.linhaIds.length > 0 ? (
          <p className="text-xs text-tinta-fraca tabular-nums">
            Revisa {aula.linhaIds.length} linhas das aulas anteriores no move trainer.
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** O nó da linha do tempo. 36 px: grande o bastante para o ✓ e o cadeado serem lidos no celular. */
function No({ estado, rotulo }: { estado: EstadoDaAulaNaTrilha; rotulo: string }) {
  const base = "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums";
  if (estado === "concluida") {
    return (
      <span className={`${base} bg-metodo-cheio text-tinta-inversa`}>
        <IconeCerto />
        <span className="sr-only">Concluída</span>
      </span>
    );
  }
  if (estado === "trancada") {
    return (
      <span className={`${base} border border-dashed border-borda-forte bg-papel text-tinta-fraca`}>
        <IconeCadeado />
        <span className="sr-only">Trancada</span>
      </span>
    );
  }
  return (
    <span
      className={`${base} bg-papel ${
        estado === "agora" ? "border-2 border-metodo-cheio text-metodo-tinta" : "border border-borda-forte text-tinta-media"
      }`}
    >
      {rotulo}
      {estado === "agora" ? <span className="sr-only"> — a aula de agora</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * As linhas
 * ------------------------------------------------------------------ */

/**
 * As linhas, uma por fileira: o grau, o nome, "revisar hoje", e Treinar.
 *
 * **A fileira não é um link, o botão é.** Uma fileira inteira clicável com um cadeado dentro seria
 * um alvo que às vezes não leva a lugar nenhum. Na trancada o botão some e o cadeado toma o lugar
 * dele — o grau fica, para quem já tinha treinado antes da trava.
 */
function ListaDeLinhas({ linhas, treino }: { linhas: readonly ItemDeLinha[]; treino: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {linhas.map((l) => (
        <li
          key={l.id}
          className={`flex min-h-12 items-center gap-3 px-3 py-2 ${l.trancada ? "cartao-vazio" : "cartao"}`}
        >
          <span className="w-24 shrink-0">
            {l.trancada && l.progresso.tentativas === 0 ? (
              <span className="text-xs text-tinta-muda">—</span>
            ) : (
              <SeloDoGrau grau={grauDaEscada(l.progresso)} />
            )}
          </span>
          <span className={`min-w-0 flex-1 text-sm leading-snug ${l.trancada ? "text-tinta-fraca" : "text-tinta"}`}>
            {l.nome}
          </span>
          {l.hoje && !l.trancada ? <span className="rotulo shrink-0 text-aviso-tinta">hoje</span> : null}
          {l.trancada ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-tinta-fraca" title="Abre quando você concluir a aula">
              <IconeCadeado />
              <span className="sr-only">Trancada</span>
            </span>
          ) : (
            <Link
              href={`${treino}?linha=${l.id}`}
              aria-label={`Treinar ${l.nome}`}
              className="foco inline-flex min-h-9 shrink-0 items-center rounded-lg border border-borda px-3 text-xs font-semibold text-metodo-tinta transition-colors hover:bg-carta-toque"
            >
              Treinar
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function IconeCerto() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function IconeCadeado() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * O que a poda tirou desta abertura
 *
 * Quatro das nove páginas de princípios são ramos de uma abertura que o aluno TREINA. Moravam no
 * cartão de "abertura em dia" do treino, a única tela sem palco; com a página da abertura virando o
 * mapa (17/9/2026), voltaram para cá, embaixo das linhas — que é onde elas completam a abertura.
 *
 * O cartão diz de cara que ali NÃO há lance para decorar: a lista de cima é treino cobrado; isto é
 * leitura. Some quando não há nenhuma, que é o caso de sete das onze aberturas.
 * ------------------------------------------------------------------ */

function Podadas({ notas }: { notas: readonly Nota[] }) {
  if (notas.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-tinta">Nesta abertura, sem linha para decorar</h2>
      <ul className="flex flex-col gap-1.5">
        {notas.map((nota) => (
          <li key={nota.slug}>
            <Link
              href={`/aberturas/notas/${nota.slug}`}
              className="foco flex flex-col gap-1 cartao-vazio px-3 py-2.5 transition-colors hover:bg-carta-toque"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-tinta">{nota.nome}</span>
                <span className="rotulo shrink-0 text-tinta-muda">para ler</span>
              </span>
              <span className="text-xs text-tinta-muda tabular-nums">{lancesEmPortugues(nota.lances)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
