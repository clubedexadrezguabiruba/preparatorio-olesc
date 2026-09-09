import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { estadoParaONivel } from "@/lib/curso/estado";
import { NIVEIS, PROVA_DE_NIVEL, prontoParaProva, fechamentoDoNivel } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { temaPorTag } from "@/lib/tatica/blocos";
import { sortearProvaDeNivel, tentativasCompletas, ultimaProvaDeNivel } from "@/lib/tatica/prova";
import { Serie } from "@/app/tatica/[tema]/Serie";
import { EncerrarProva } from "./Encerrar";

export const metadata: Metadata = { title: "Prova de nível — Preparatório OLESC" };

/**
 * A prova de nível: 12 puzzles misturados, sem dizer o tema. Passa com 9.
 *
 * ## O que esta página **não** decide
 *
 * Nada. Quais puzzles (`lib/tatica/prova.ts`), se o aluno pode fazê-la
 * (`prontoParaProva`), se ele passou (a mesma `prova.ts`, corrigindo linhas que
 * o servidor já julgou uma a uma) e se o nível é concedido (`acoes.ts`, com
 * chave de serviço). Esta página junta as quatro coisas e as desenha.
 *
 * ## A série é reaproveitada inteira, e a diferença é o que ela **não** mostra
 *
 * É o que a `/tatica/revisao` já faz: o mesmo tabuleiro, o mesmo juiz, a mesma
 * gravação. `tema` é `null` e os dois degraus da dica vêm vazios, então o botão
 * de dica não aparece — **é o ponto inteiro da prova**. O nome do padrão só é
 * revelado *depois* de resolver, como na revisão, porque aí ele fixa o que o
 * aluno acabou de ver em vez de entregá-lo antes.
 *
 * ## Três telas na mesma rota, e o que decide qual
 *
 * - **Não pode fazer** — as três trilhas não fecharam. É o selo, não o exame
 *   de admissão.
 * - **Acabou de fazer** — há 12 linhas completas e válidas. Mostra o
 *   resultado; se reprovou, **nomeia os temas dos erros**, porque "tente de
 *   novo" sem dizer o quê é a única coisa que uma reprovação não pode ser.
 * - **Vai fazer** — a série, com os 12.
 *
 * O que separa a segunda da terceira é a `tentativa`: enquanto a rodada não
 * fecha 12 linhas, o quociente não anda e o aluno continua na mesma prova.
 */
export default async function ProvaDeNivel({ params }: PageProps<"/nivel/[n]/prova">) {
  const { n } = await params;
  const nivel = NIVEIS.find((v) => String(v) === n);
  if (nivel === undefined) notFound();

  const perfil = await perfilAtual();
  const [progresso, conquistado] = await Promise.all([
    estadoParaONivel(perfil.id),
    nivelConquistado(perfil.id),
  ]);

  if (prontoParaProva(progresso) < nivel) {
    const fecho = fechamentoDoNivel(nivel, progresso);
    return (
      <Moldura nivel={nivel}>
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-borda bg-carta px-5 py-6">
          <p className="text-sm font-medium text-tinta">
            A prova do nível {nivel} ainda não abriu.
          </p>
          <p className="text-sm text-tinta-media">
            Ela é o selo do degrau, e não o exame de entrada: vem depois de as três trilhas
            fecharem. Falta{" "}
            {[
              fecho.tatica.feitos < fecho.tatica.total
                ? `${fecho.tatica.total - fecho.tatica.feitos} tema(s) de tática`
                : null,
              fecho.finais.feitos < fecho.finais.exigidas
                ? `${fecho.finais.exigidas - fecho.finais.feitos} aula(s) de finais`
                : null,
              fecho.repertorio.feitas < fecho.repertorio.exigidas
                ? `${fecho.repertorio.exigidas - fecho.repertorio.feitas} linha(s) do repertório`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
            .
          </p>
          <Link href="/painel" className="foco w-fit text-sm font-medium text-metodo-tinta underline">
            Voltar ao painel
          </Link>
        </div>
      </Moldura>
    );
  }

  const tentativa = await tentativasCompletas(perfil.id);
  const resultado = await ultimaProvaDeNivel(perfil.id, nivel);

  // Uma prova acabou de fechar 12 linhas: a tela é o resultado, e não uma
  // rodada nova. O `conquistado` já vem atualizado — a ação de encerrar rodou
  // antes do `router.refresh()` que trouxe o aluno de volta aqui.
  if (resultado && tentativa > 0 && (conquistado >= nivel || !resultado.passou)) {
    return (
      <Moldura nivel={nivel}>
        <Resultado nivel={nivel} resultado={resultado} passou={conquistado >= nivel} />
      </Moldura>
    );
  }

  const puzzles = await sortearProvaDeNivel(perfil.id, nivel, tentativa);

  return (
    <Moldura nivel={nivel}>
      <Serie
        key={`prova-de-nivel:${nivel}:${tentativa}`}
        tema={null}
        nomeDoTema={`Prova do nível ${nivel}`}
        etapa="prova-de-nivel"
        puzzles={puzzles}
        jaFeitosNaEtapa={0}
        metaDaEtapa={puzzles.length}
        feitosNoTema={null}
        totalNoTema={null}
        explicacao={[]}
        procure={[]}
        cuidado={null}
        noFim={<EncerrarProva nivel={nivel} />}
      />
    </Moldura>
  );
}

/**
 * A moldura de uma linha, a mesma do palco (`app/tatica/revisao`).
 *
 * O palco tem altura fechada: qualquer coisa acrescentada depois dele volta a
 * rolar a página no celular, e é por isso que o cabeçalho cabe numa linha.
 */
function Moldura({ nivel, children }: { nivel: number; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href="/painel" className="foco rotulo text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Prova do nível {nivel}</h1>
        <p className="text-xs text-tinta-fraca tabular-nums">
          {PROVA_DE_NIVEL.puzzles} puzzles · passa com {PROVA_DE_NIVEL.paraPassar}
        </p>
      </header>
      {children}
    </main>
  );
}

/**
 * O resultado, nas duas formas.
 *
 * **Reprovar não pune**, e a tela tem de mostrar isso: os 12 puzzles já
 * entraram na fila de revisão pela porta de sempre, a prova é repetível com
 * sorteio novo, e os temas dos erros vêm **nomeados**. "Tente de novo" sem
 * dizer o quê é a única coisa que uma reprovação não pode ser — o aluno de doze
 * anos não sabe o que revisar, e ninguém sabe por ele.
 */
function Resultado({
  nivel,
  resultado,
  passou,
}: {
  nivel: number;
  resultado: { acertos: number; total: number; erros: readonly string[] };
  passou: boolean;
}) {
  const nomes = resultado.erros.map((tag) => temaPorTag(tag)?.nome ?? tag);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-borda-fraca bg-carta px-5 py-6">
      <p className="rotulo text-metodo-tinta">
        Prova do nível {nivel} — {passou ? "passou" : "não passou"}
      </p>
      <p className="titulo text-tinta tabular-nums">
        {resultado.acertos} de {resultado.total} de primeira
      </p>

      {passou ? (
        <p className="text-sm text-tinta-media">
          O selo do nível {nivel} é seu, e ele não volta atrás: publicar aula nova ou errar
          uma linha já aprendida não rebaixa ninguém. O nível {Math.min(5, nivel + 1)} está
          aberto.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-media">
            Faltou{" "}
            <span className="tabular-nums">
              {PROVA_DE_NIVEL.paraPassar - resultado.acertos}
            </span>
            . Nada foi perdido: os 12 entraram na fila de revisão, e a prova pode ser
            refeita quantas vezes você quiser — com sorteio novo a cada vez.
          </p>
          {nomes.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-tinta">Revise estes temas:</p>
              <ul className="flex flex-wrap gap-1.5">
                {nomes.map((nome) => (
                  <li
                    key={nome}
                    className="rounded-full border border-borda px-2 py-0.5 text-xs text-tinta-media"
                  >
                    {nome}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/painel"
          className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
        >
          Voltar ao painel
        </Link>
        {passou ? null : (
          <Link
            href="/tatica/revisao"
            className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
          >
            Ir para a revisão
          </Link>
        )}
      </div>
    </div>
  );
}
