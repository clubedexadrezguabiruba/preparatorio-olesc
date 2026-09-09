import { z } from "zod";
import { COMECO_DO_TORNEIO, SABADOS, porExtenso } from "../curso/calendario.ts";

/**
 * A agenda: o que tem data, e por isso não cabe num degrau.
 *
 * ## Por que ela existe, em vez de tudo virar nível
 *
 * Quatro semanas viraram cinco níveis em 2026-09-09, e a tentação era mapear
 * as 23 tarefas de uma para a outra. Três delas não sobreviveriam ao
 * mapeamento, porque o que as define é **o relógio**, e não a força do aluno:
 *
 * - a **véspera do torneio** — uma hora leve, a mochila pronta, dormir cedo;
 * - a **partida longa** de 60+30 anotada, que só cabe num fim de semana;
 * - o **torneio do clube na quinta**, que acontece na quinta.
 *
 * Forçá-las num nível perderia a lista de véspera, que é a mais importante das
 * 23: ela é lida uma vez, na noite de 10 de outubro, e não tem segunda chance.
 *
 * ## A data mora em `calendario.ts`, e este arquivo só a aponta
 *
 * `quando` é um **rótulo**, não uma data escrita à mão. Remarcar um sábado
 * continua sendo mudar uma linha em `SABADOS` — que foi o motivo de
 * `calendario.ts` existir. Este arquivo perderia isso se guardasse
 * `"2026-09-19"` num JSON de conteúdo.
 *
 * `calendario.ts` ficou depois da mudança de eixo, e ficou **sem poder de
 * tranca**: `SABADOS` e `COMECO_DO_TORNEIO` dizem quando os encontros
 * presenciais acontecem, e é só isso que a agenda precisa deles.
 */

export const QUANDO = [
  "sabado-1",
  "sabado-2",
  "sabado-3",
  "sabado-4",
  "vespera-do-torneio",
] as const;

export type Quando = (typeof QUANDO)[number];

export const ItemDaAgendaSchema = z
  .object({
    /**
     * O id que vai para o banco em `tarefa_conclusao.tarefa`, como o das
     * tarefas de nível — e pelo mesmo motivo de ser escrito à mão.
     *
     * O prefixo `agenda-` existe para que um id de agenda e um id de nível
     * nunca colidam: os dois vivem na mesma coluna do banco, e um `n1-partidas`
     * que virasse `agenda-partidas` sem prefixo apagaria a marcação errada.
     */
    id: z.string().regex(/^agenda-[a-z0-9-]+$/, "o id é `agenda-<nome-curto>`, tudo minúsculo"),
    quando: z.enum(QUANDO),
    titulo: z.string().min(8),
    detalhe: z.string().min(10).optional(),
    onde: z
      .object({ rotulo: z.string().min(3), url: z.string().min(1).nullable() })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();

export type ItemDaAgenda = z.infer<typeof ItemDaAgendaSchema>;

export const AgendaSchema = z.array(ItemDaAgendaSchema);

/** Confere a agenda e devolve a lista, ou estoura com o caminho do erro. */
export function validarAgenda(dados: unknown): ItemDaAgenda[] {
  const lido = AgendaSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/agenda.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`O conteúdo da agenda não passou na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const item of lido.data) {
    if (vistos.has(item.id)) {
      throw new Error(`content/agenda.json: o id "${item.id}" aparece duas vezes.`);
    }
    vistos.add(item.id);
  }
  return lido.data;
}

/** O dia (ISO) a que um rótulo de agenda se refere. */
export function diaDe(quando: Quando): string {
  if (quando === "vespera-do-torneio") {
    // A véspera é o dia anterior ao começo, e não uma sexta data escrita à mão:
    // remarcar o torneio remarca a véspera junto.
    const [ano, mes, dia] = COMECO_DO_TORNEIO.split("-").map(Number);
    const vespera = new Date(Date.UTC(ano, mes - 1, dia - 1));
    return vespera.toISOString().slice(0, 10);
  }
  const numero = Number(quando.slice("sabado-".length));
  const sabado = SABADOS.find((s) => s.semana === numero);
  if (!sabado) throw new Error(`A agenda aponta para "${quando}", que não está em SABADOS.`);
  return sabado.data;
}

/** "Sábado 2, 19 de setembro" — o que a tela escreve ao lado do item. */
export function quandoPorExtenso(quando: Quando): string {
  const dia = porExtenso(diaDe(quando));
  if (quando === "vespera-do-torneio") return `Véspera do torneio, ${dia}`;
  return `Sábado ${quando.slice("sabado-".length)}, ${dia}`;
}

/** Os itens de um dia da agenda, na ordem em que foram escritos. */
export function doQuando(agenda: readonly ItemDaAgenda[], quando: Quando): ItemDaAgenda[] {
  return agenda.filter((i) => i.quando === quando);
}

/** A agenda em ordem de data, que é a ordem em que a tela a desenha. */
export function emOrdemDeData(agenda: readonly ItemDaAgenda[]): ItemDaAgenda[] {
  return [...agenda].sort((a, b) => diaDe(a.quando).localeCompare(diaDe(b.quando)));
}
