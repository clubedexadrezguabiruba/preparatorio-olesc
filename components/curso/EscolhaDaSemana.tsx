import Link from "next/link";
import { porExtenso, SABADOS, sabadoDaSemana } from "@/lib/curso/calendario";
import { PARAMETRO_DA_SEMANA, type SemanaDaTela } from "@/lib/curso/semana";

/**
 * A barra que troca a semana da tela. **Só o professor a vê.**
 *
 * ## Por que ela existe, sendo o parâmetro de URL suficiente
 *
 * Porque `?semana=3` só é suficiente para quem lembra que ele existe. O ensaio
 * do professor acontece na noite de sexta, no celular, e um recurso que exige
 * digitar a mão na barra de endereço é um recurso que não vai ser usado.
 *
 * ## O aviso é a metade que importa
 *
 * A barra não é só navegação: ela é o que impede o professor de confundir o
 * ensaio com o site. Vendo a semana 3 em 8 de setembro, o painel diz "faça isto
 * esta semana" sobre uma tarefa que não começou — e sem um aviso, um professor
 * cansado remarca a própria agenda por causa dela. Daí a linha em cima, que só
 * aparece quando as duas semanas divergem, e o botão de voltar para a de
 * verdade.
 *
 * O aluno nunca chega aqui: `semanaDaTela` devolve `simulando: false` para ele,
 * e a página não desenha a barra. Os dois lados da tranca ficam do mesmo lado —
 * quem decide o que a tela mostra é quem decide se o seletor aparece.
 */
export function EscolhaDaSemana({ tela, base }: { tela: SemanaDaTela; base: string }) {
  const sabado = sabadoDaSemana(tela.semana);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-borda bg-carta px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="rotulo text-tinta-fraca">Ver como professor</span>
        {tela.simulando ? (
          <span className="text-xs text-aviso-tinta">
            Você está na semana {tela.semana}. A de verdade é a {tela.real}.
          </span>
        ) : (
          <span className="text-xs text-tinta-fraca">Esta é a semana de verdade.</span>
        )}
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {SABADOS.map((s) => {
          const aqui = s.semana === tela.semana;
          return (
            <Link
              key={s.semana}
              href={`${base}?${PARAMETRO_DA_SEMANA}=${s.semana}`}
              aria-current={aqui ? "page" : undefined}
              className={
                aqui
                  ? "foco rounded-lg border border-metodo-tinta bg-metodo-superficie/20 px-2.5 py-1 text-sm font-semibold text-metodo-tinta"
                  : "foco rounded-lg border border-borda px-2.5 py-1 text-sm text-tinta-media hover:bg-carta-toque"
              }
            >
              Semana {s.semana}
              {s.semana === tela.real ? " · hoje" : ""}
            </Link>
          );
        })}
      </nav>

      <p className="text-xs text-tinta-fraca">
        Sábado {tela.semana}, {porExtenso(sabado.data)} — {sabado.titulo}. O aluno não vê esta
        barra, e a semana dele é sempre a de verdade.
      </p>
    </div>
  );
}
