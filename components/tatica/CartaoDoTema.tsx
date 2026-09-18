import Link from "next/link";
import { SeloDoGrau } from "@/components/progresso/SeloDoGrau";
import { NOME_DO_GRAU, type Grau } from "@/lib/progresso/grau";
import { temaFechado, type Nivel } from "@/lib/curso/nivel";
import type { Tema } from "@/lib/tatica/blocos";
import type { EstadoDoTema } from "@/lib/tatica/ordem";
import type { ProgressoDoTema } from "@/lib/tatica/progresso";
import { ETAPAS, etapaAtual, METAS, NOME_DA_ETAPA, PUZZLES_POR_TEMA } from "@/lib/tatica/serie";
import { COR_DO_NIVEL, SeloDoTema } from "./SeloDoTema";

/**
 * Um tema de `/tatica` em cartão (Doug, 16/9: "não gosto de lista, prefiro
 * cartões"; escolheu o anel entre três desenhos).
 *
 * - **Anel:** quanto do tema inteiro já foi feito, etapa por etapa, cada uma até
 *   a meta dela. Repetir a série não enche o anel além do que a série vale.
 * - **Rodapé:** onde o aluno está *agora* — "Série · 13 de 24" —, que é o que
 *   ele precisa saber antes de tocar; e o acerto, quando já houve tentativa.
 * - **Fechado** é `temaFechado`, a mesma régua do painel e dos selos: as três
 *   etapas acabaram. Sem piso de acerto, pelo motivo escrito lá.
 *
 * O estado vem da corrente (`lib/tatica/ordem.ts`, 18/9/2026): os temas abrem em
 * ordem, e o trancado é tracejado, com cadeado e sem link. `em-escrita` também
 * fecha a porta — sem texto escrito não há o que abrir.
 *
 * ## A ilustração e o metal (Doug, 16/9)
 *
 * O anel virou `SeloDoTema`: o ícone do tema no quadro do metal do nível, com o
 * progresso na moldura. A **borda do cartão** é do metal — Madeira, Ferro,
 * Bronze, Prata, Ouro —, então a página se lê de longe como uma escalada. O
 * concluído, que antes tinha borda verde, agora é o ✓ no canto do selo: a borda
 * já tem dono. O tracejado do trancado é na cor do metal.
 *
 * `destaque` é o "Continue de onde parou" do topo: largo, com borda do método e
 * o botão "Continuar".
 *
 * O tema **em teste** (`Tema.emTeste`) ganha a pastilha âmbar "Em teste" ao lado
 * do nome: ele está aberto, mas não conta para nada.
 *
 * ## O grau (17/9/2026)
 *
 * Novato a Mestre, no rodapé, ao lado de onde o aluno está: acertos de **qualquer modo** pesados pela
 * dificuldade, com o topo exigindo acerto recente (`lib/progresso/grau.ts`). Só aparece depois da
 * primeira tentativa — um "Novato" em trinta cartões intocados seria o mesmo ruído do "Nível 2".
 */
export function CartaoDoTema({
  tema,
  progresso,
  estado,
  nivel,
  destaque = false,
  grau,
}: {
  tema: Tema;
  progresso: ProgressoDoTema;
  /** O estado na corrente (`lib/tatica/ordem.ts`), ou `em-escrita` para o tema sem texto. */
  estado: EstadoDoTema | "em-escrita";
  /** O nível do bloco do tema — a cor do metal. */
  nivel: Nivel;
  destaque?: boolean;
  /** O grau do tema. Ausente, o cartão não o mostra. */
  grau?: Grau;
}) {
  const cor = COR_DO_NIVEL[nivel];
  if (estado === "em-escrita" || estado === "trancado") {
    return (
      <li className={`flex h-full items-center gap-3 cartao-vazio px-4 py-3 ${cor.borda}`}>
        <SeloDoTema tag={tema.tag} nivel={nivel} feitos={0} de={PUZZLES_POR_TEMA} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold text-tinta-fraca">{tema.nome}</p>
          {estado === "trancado" ? (
            <p className="flex items-center gap-1.5 text-xs text-tinta-fraca">
              <IconeCadeado />
              Abre quando você concluir o tema anterior.
            </p>
          ) : (
            <p className="text-xs text-tinta-fraca">Este tema ainda não foi escrito.</p>
          )}
        </div>
      </li>
    );
  }

  const fechado = temaFechado(progresso.feitos);
  const feitos = ETAPAS.reduce((soma, etapa) => soma + Math.min(progresso.feitos[etapa], METAS[etapa]), 0);
  const etapa = etapaAtual(progresso.feitos);
  const acerto = progresso.tentativas > 0 ? Math.round((100 * progresso.certos) / progresso.tentativas) : null;

  const onde = fechado
    ? "Concluído"
    : feitos === 0 || etapa === null
      ? "Começar"
      : `${NOME_DA_ETAPA[etapa]} · ${Math.min(progresso.feitos[etapa], METAS[etapa])} de ${METAS[etapa]}`;

  return (
    <li className="h-full">
      <Link
        href={`/tatica/${tema.tag}`}
        aria-label={`${tema.nome}${tema.emTeste ? " (em teste)" : ""}: ${feitos} de ${PUZZLES_POR_TEMA} puzzles${acerto === null ? "" : `, ${acerto}% de acerto`}. ${onde}.${grau !== undefined && (grau > 0 || progresso.tentativas > 0) ? ` Grau ${NOME_DO_GRAU[grau]}.` : ""}`}
        className={`foco flex h-full gap-3 ${destaque ? "flex-wrap items-center px-4 py-4 sm:flex-nowrap sm:px-5" : "px-4 py-3.5"} cartao-alvo ${cor.borda}`}
      >
        <SeloDoTema tag={tema.tag} nivel={nivel} feitos={feitos} de={PUZZLES_POR_TEMA} tamanho={destaque ? 72 : 64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={`${destaque ? "text-base" : "text-sm"} leading-snug font-semibold text-tinta`}>
            {tema.nome}
            {tema.emTeste ? (
              <>
                {" "}
                <EmTeste />
              </>
            ) : null}
          </p>
          <p className="text-xs text-tinta-fraca">{tema.resumo}</p>
          {/* Etapa e acerto um embaixo do outro, sempre: lado a lado, o acerto descia
              de linha só nos cartões de descrição longa, e cartões vizinhos ficavam
              com o mesmo número em dois lugares. */}
          <p className="mt-auto flex flex-col pt-1 text-xs tabular-nums">
            <span
              className={
                fechado ? "font-medium text-metodo-tinta" : feitos > 0 ? "font-medium text-tinta-media" : "text-tinta-fraca"
              }
            >
              {onde}
            </span>
            {feitos === 0 ? null : (
              <span className="text-tinta-fraca">
                {feitos} de {PUZZLES_POR_TEMA}
                {acerto === null ? "" : ` · acerto ${acerto}%`}
              </span>
            )}
            {grau !== undefined && (grau > 0 || progresso.tentativas > 0) ? (
              <span aria-hidden className="pt-1.5">
                <SeloDoGrau grau={grau} />
              </span>
            ) : null}
          </p>
        </div>
        {destaque ? (
          <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-metodo-cheio px-5 text-sm font-semibold text-tinta-inversa sm:w-auto">
            Continuar
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function IconeCadeado() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * A pastilha "Em teste" — âmbar, que é a cor de aviso do site. A mesma no cartão
 * e no cabeçalho da página do tema.
 */
export function EmTeste() {
  return (
    <span className="inline-block rounded-full border border-aviso-superficie px-2 py-px align-[0.1em] text-[11px] leading-4 font-semibold whitespace-nowrap text-aviso-tinta">
      Em teste
    </span>
  );
}
