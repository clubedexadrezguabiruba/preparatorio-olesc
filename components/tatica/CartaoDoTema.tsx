import Link from "next/link";
import { podeAbrir, temaFechado, type Nivel, type Situacao } from "@/lib/curso/nivel";
import type { Tema } from "@/lib/tatica/blocos";
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
 * As três situações de `situacaoDoItem`: `aberto` é `cartao-alvo`; `adiante`
 * continua clicável e tracejado (adiantar é do aluno), com "Pode adiantar" — o
 * nível já está no título da seção, e "Nível 2 — você está no 1" repetido em
 * trinta cartões quebrava a linha e virava ruído; `em-escrita` é o único que
 * fecha a porta — sem texto escrito não há o que abrir.
 *
 * ## A ilustração e o metal (Doug, 16/9)
 *
 * O anel virou `SeloDoTema`: o ícone do tema no quadro do metal do nível, com o
 * progresso na moldura. A **borda do cartão** é do metal — Madeira, Ferro,
 * Bronze, Prata, Ouro —, então a página se lê de longe como uma escalada. O
 * concluído, que antes tinha borda verde, agora é o ✓ no canto do selo: a borda
 * já tem dono. O tracejado do adiante continua, na cor do metal.
 *
 * `destaque` é o "Continue de onde parou" do topo: largo, com borda do método e
 * o botão "Continuar", tracejado nunca — mesmo quando o tema é de nível adiante,
 * ali ele é o próximo passo, e não um desvio.
 *
 * O tema **em teste** (`Tema.emTeste`) ganha a pastilha âmbar "Em teste" ao lado
 * do nome: ele está aberto, mas não conta para nada.
 */
export function CartaoDoTema({
  tema,
  progresso,
  situacao,
  nivel,
  destaque = false,
}: {
  tema: Tema;
  progresso: ProgressoDoTema;
  situacao: Situacao;
  /** O nível do bloco do tema — a cor do metal. */
  nivel: Nivel;
  destaque?: boolean;
}) {
  const cor = COR_DO_NIVEL[nivel];
  if (!podeAbrir(situacao)) {
    return (
      <li className={`flex h-full items-center gap-3 cartao-vazio px-4 py-3 ${cor.borda}`}>
        <SeloDoTema tag={tema.tag} nivel={nivel} feitos={0} de={PUZZLES_POR_TEMA} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold text-tinta-fraca">{tema.nome}</p>
          <p className="text-xs text-tinta-fraca">Este tema ainda não foi escrito.</p>
        </div>
      </li>
    );
  }

  const adiante = situacao === "adiante" && !destaque;
  const fechado = temaFechado(progresso.feitos);
  const feitos = ETAPAS.reduce((soma, etapa) => soma + Math.min(progresso.feitos[etapa], METAS[etapa]), 0);
  const etapa = etapaAtual(progresso.feitos);
  const acerto = progresso.tentativas > 0 ? Math.round((100 * progresso.certos) / progresso.tentativas) : null;

  const onde = fechado
    ? "Concluído"
    : adiante && feitos === 0
      ? "Pode adiantar"
      : feitos === 0 || etapa === null
        ? "Começar"
        : `${NOME_DA_ETAPA[etapa]} · ${Math.min(progresso.feitos[etapa], METAS[etapa])} de ${METAS[etapa]}`;

  return (
    <li className="h-full">
      <Link
        href={`/tatica/${tema.tag}`}
        aria-label={`${tema.nome}${tema.emTeste ? " (em teste)" : ""}: ${feitos} de ${PUZZLES_POR_TEMA} puzzles${acerto === null ? "" : `, ${acerto}% de acerto`}. ${onde}.`}
        className={`foco flex h-full gap-3 ${destaque ? "flex-wrap items-center px-4 py-4 sm:flex-nowrap sm:px-5" : "px-4 py-3.5"} ${
          adiante ? "cartao-vazio transition-colors hover:bg-carta-toque" : "cartao-alvo"
        } ${cor.borda}`}
      >
        <SeloDoTema tag={tema.tag} nivel={nivel} feitos={feitos} de={PUZZLES_POR_TEMA} tamanho={destaque ? 72 : 64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={`${destaque ? "text-base" : "text-sm"} leading-snug font-semibold ${adiante ? "text-tinta-media" : "text-tinta"}`}>
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
                fechado ? "font-medium text-metodo-tinta" : feitos > 0 && !adiante ? "font-medium text-tinta-media" : "text-tinta-fraca"
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
