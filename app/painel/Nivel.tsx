import Link from "next/link";
import { Barra } from "@/components/Barra";
import {
  META_DA_OLESC,
  NIVEL,
  PROVA_DE_NIVEL,
  type FechamentoDoNivel,
  type Nivel,
  type ProximoPasso,
} from "@/lib/curso/nivel";

/**
 * A faixa do nível: onde o aluno está, o que falta, e o que fazer agora.
 *
 * ## Por que ela é a primeira coisa do painel depois do "Hoje"
 *
 * Porque é a pergunta que o aluno abre o site para responder, e até 2026-09-09
 * o site respondia outra: *"Semana 2 · 19 a 25 de setembro"*. A semana dizia
 * que dia é hoje — coisa que o celular dele já diz — e não dizia onde ele está.
 *
 * ## Três barras, e elas contam coisas diferentes
 *
 * Tema fechado, aula aprendida e linha decorada não somam na mesma barra: a
 * primeira é medida pelo servidor puzzle a puzzle, a segunda é certificada pela
 * tablebase, a terceira é uma escada de três dias. É a mesma disciplina da
 * `/trilha` — cada barra escreve embaixo o que ela conta.
 *
 * ## O clamp dos finais aparece na tela, e é isso que o torna honesto
 *
 * O requisito de finais é `min(declarado, publicado)`. Escondê-lo faria o nível
 * 1 fechar com finais em branco e ninguém entenderia por quê; escrevê-lo — *"1
 * de 4 aulas publicadas"* — diz ao aluno que o degrau fecha com o que existe
 * hoje, e que o curso de finais ainda está sendo escrito. Um requisito que
 * encolhe em silêncio é pior que um requisito alto.
 *
 * ## O acerto é aviso, e nunca cadeado
 *
 * Nenhuma barra aqui cobra piso de acerto, e isso é decisão escrita em
 * `lib/curso/nivel.ts`: quem pune acerto baixo é a fila de revisão, que já
 * existe e já derruba. Duas réguas de "eu sei isto" na mesma tela seriam uma a
 * mais.
 */
export function FaixaDoNivel({
  nivel,
  fechamento,
  passo,
  conquistado,
}: {
  nivel: Nivel;
  fechamento: FechamentoDoNivel;
  passo: ProximoPasso;
  conquistado: 0 | Nivel;
}) {
  const [piso, teto] = NIVEL[nivel].fide;
  const faixa = teto === null ? `${piso}+` : piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
  const daOlesc = META_DA_OLESC.includes(nivel);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-metodo-cheio bg-carta px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titulo text-tinta">
            Nível {nivel} <span className="font-normal text-tinta-fraca">de 5</span>
          </h2>
          <span className="text-sm text-tinta-media tabular-nums">FIDE {faixa}</span>
          {daOlesc ? (
            <span className="rounded-full border border-metodo-cheio px-2 py-0.5 text-xs font-medium text-metodo-tinta">
              Meta da OLESC
            </span>
          ) : (
            <span className="rounded-full border border-borda px-2 py-0.5 text-xs text-tinta-fraca">
              Depois da OLESC
            </span>
          )}
        </div>
        <p className="text-sm text-tinta-media">{NIVEL[nivel].resumo}</p>
      </div>

      <ul className="flex flex-col gap-3">
        <Trilha
          nome="Tática"
          feitos={fechamento.tatica.feitos}
          de={fechamento.tatica.total}
          conta={`${fechamento.tatica.feitos} de ${fechamento.tatica.total} temas fechados`}
          nota="Um tema fecha com as três etapas: aquecimento, série e prova."
          href="/tatica"
        />
        <Trilha
          nome="Finais"
          feitos={fechamento.finais.feitos}
          de={fechamento.finais.exigidas}
          conta={
            fechamento.finais.exigidas === 0
              ? "nenhuma aula deste nível está publicada"
              : `${fechamento.finais.feitos} de ${fechamento.finais.exigidas} aulas aprendidas`
          }
          nota={
            fechamento.finais.publicadas < fechamento.finais.declaradas
              ? `${fechamento.finais.publicadas} de ${fechamento.finais.declaradas} aulas publicadas — o nível fecha com o que existe hoje.`
              : "Cada aula é certificada pela tablebase, em três dias diferentes."
          }
          href="/finais"
        />
        <Trilha
          nome="Repertório"
          feitos={Math.min(fechamento.repertorio.feitas, fechamento.repertorio.exigidas)}
          de={fechamento.repertorio.exigidas}
          conta={`${fechamento.repertorio.feitas} de ${fechamento.repertorio.exigidas} linhas aprendidas`}
          nota="Quaisquer linhas, contadas no total — quem adiantou repertório atravessa de graça."
          href="/aberturas"
        />
      </ul>

      <Prova nivel={nivel} fechado={fechamento.fechado} conquistado={conquistado} />

      <ProximoPassoCartao passo={passo} />
    </section>
  );
}

function Trilha({
  nome,
  feitos,
  de,
  conta,
  nota,
  href,
}: {
  nome: string;
  feitos: number;
  de: number;
  conta: string;
  nota: string;
  href: string;
}) {
  // Denominador zero é estado previsto — é o clamp dos finais com o disco
  // vazio. A barra cheia é a verdade: não falta nada que exista.
  const completo = feitos >= de;

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Link
          href={href}
          className="foco text-sm font-semibold text-metodo-tinta hover:underline"
        >
          {nome}
        </Link>
        <span className="text-xs text-tinta-fraca tabular-nums">{conta}</span>
      </div>
      <Barra feitos={feitos} de={de} tom={completo ? "completo" : "metodo"} />
      <p className="text-xs text-tinta-fraca">{nota}</p>
    </li>
  );
}

/**
 * O estado da prova, em três formas.
 *
 * A prova é **ofertada só depois** das três trilhas: ela é o selo, não o exame
 * de admissão. E é o único lugar do curso onde o aluno vê um puzzle **sem saber
 * o tema** — as outras quatro medidas de "eu sei isto" (a prova do tema, a
 * tablebase, os degraus do repertório, a fila de revisão) todas dizem qual é o
 * motivo. Na partida ninguém avisa "aqui tem um garfo".
 */
function Prova({
  nivel,
  fechado,
  conquistado,
}: {
  nivel: Nivel;
  fechado: boolean;
  conquistado: 0 | Nivel;
}) {
  if (conquistado >= nivel) {
    return (
      <p className="rounded-lg bg-metodo-superficie/12 px-3 py-2 text-sm text-metodo-tinta-alta">
        ✓ Prova do nível {nivel} passada. O selo é seu.
      </p>
    );
  }

  if (!fechado) {
    return (
      <p className="rounded-lg border border-dashed border-borda px-3 py-2 text-sm text-tinta-fraca">
        A prova do nível {nivel} abre quando as três barras encherem. São{" "}
        {PROVA_DE_NIVEL.puzzles} puzzles misturados, sem dizer o tema.
      </p>
    );
  }

  return (
    <Link
      href={`/nivel/${nivel}/prova`}
      className="foco flex flex-col gap-0.5 rounded-lg bg-metodo-cheio px-3 py-2.5 text-tinta-inversa transition-opacity hover:opacity-90"
    >
      <span className="text-sm font-semibold">Fazer a prova do nível {nivel} →</span>
      <span className="text-xs opacity-90">
        {PROVA_DE_NIVEL.puzzles} puzzles misturados, sem dizer o tema. Passa com{" "}
        {PROVA_DE_NIVEL.paraPassar}.
      </span>
    </Link>
  );
}

/**
 * Um alvo só, e a prioridade decidida em `proximoPasso`.
 *
 * "Faça isto agora" com três opções é "escolha o que fazer agora", que é a
 * pergunta que o aluno veio evitar. A fila de revisão vencida passa na frente
 * de conteúdo novo — é o site apontando para a casa antes de deixar mudar de
 * bairro.
 */
function ProximoPassoCartao({ passo }: { passo: ProximoPasso }) {
  const alvo = destinoDoPasso(passo);

  return (
    <div className="flex flex-col gap-1 border-t border-borda-fraca pt-3">
      <span className="rotulo text-tinta-fraca">Próximo passo</span>
      {alvo.href ? (
        <Link
          href={alvo.href}
          className="foco w-fit text-base font-semibold text-metodo-tinta hover:underline"
        >
          {alvo.diz} →
        </Link>
      ) : (
        <p className="text-base font-semibold text-tinta">{alvo.diz}</p>
      )}
      {alvo.porque ? <p className="text-xs text-tinta-fraca">{alvo.porque}</p> : null}
    </div>
  );
}

function destinoDoPasso(passo: ProximoPasso): {
  diz: string;
  href: string | null;
  porque: string | null;
} {
  switch (passo.tipo) {
    case "revisao":
      return {
        diz: `Revisar ${passo.vencidos} puzzles vencidos`,
        href: "/tatica/revisao",
        porque: "A fila passou de dois dias. Ela vem antes de conteúdo novo.",
      };
    case "tema":
      return { diz: passo.nome, href: passo.href, porque: "O próximo tema do seu nível." };
    case "aula":
      return { diz: passo.nome, href: passo.href, porque: "A próxima aula de finais do seu nível." };
    case "linha":
      return {
        diz: `Aprender mais ${passo.faltam} ${passo.faltam === 1 ? "linha" : "linhas"} do repertório`,
        href: "/aberturas",
        porque: "Quaisquer linhas. Elas treinam em paralelo, na mesma sessão.",
      };
    case "prova-de-nivel":
      return {
        diz: `A prova do nível ${passo.nivel}`,
        href: `/nivel/${passo.nivel}/prova`,
        porque: "As três trilhas fecharam. Falta o selo.",
      };
    case "nivel-fechado":
      return {
        diz: "Você percorreu a escada inteira",
        href: null,
        porque: "Daqui em diante o treino é a fila de revisão e as partidas do clube.",
      };
  }
}
