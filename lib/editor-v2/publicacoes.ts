/**
 * Onde as aulas v2 publicadas moram, e como são lidas — plano final §13, especificação §20.1.
 *
 * ```
 * content/aulas-v2/<AULA>/
 *   ativa.json                       ← o ponteiro: qual publicação o aluno recebe
 *   publicacoes/<publicationId>.json ← cada pacote publicado, imutável
 * ```
 *
 * ## Por que em `content/`, versionado
 *
 * O aluno usa o site da Vercel, e o site só enxerga o que vai no deploy. `content/**` já viaja
 * pelo `outputFileTracingIncludes`. Publicações anteriores ficam junto porque uma aba antiga
 * pode concluir contra o snapshot dela, e o servidor precisa dele para rejulgar (§10).
 *
 * ## Por que um ponteiro, e não copiar o pacote para um nome fixo
 *
 * Trocar o ponteiro é uma escrita de um arquivo pequeno por `rename`, atômica no disco. O
 * leitor resolve sempre um pacote inteiro — o antigo ou o novo, nunca metade de cada.
 *
 * Este módulo **só lê**. Quem escreve é `publicar.ts`, no editor local. Ele não importa
 * `server-only` porque roda também no validador e nos testes, fora do Next.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { aulaIdV2Schema } from "./modelo.ts";

export const PASTA_AULAS_V2 = "aulas-v2";
export const publicationIdSchema = z.string().regex(/^pub-[0-9a-f]{16}$/, "id de publicação fora do padrão");

export const ponteiroV2Schema = z.strictObject({
  publicationId: publicationIdSchema,
  /** A publicação ativa antes desta — o que "reativar anterior" devolve. */
  anterior: publicationIdSchema.nullable(),
  ativadaEm: z.string().min(1),
});

export type PonteiroV2 = z.infer<typeof ponteiroV2Schema>;

/** A pasta de uma aula v2, com a mesma trava de caminho dos rascunhos. */
export function pastaDaAulaPublicadaV2(contentDir: string, id: string): string {
  if (!aulaIdV2Schema.safeParse(id).success) throw new Error(`id de aula inválido: ${id}`);
  const base = path.resolve(contentDir, PASTA_AULAS_V2);
  const pasta = path.resolve(base, id);
  if (!pasta.startsWith(base + path.sep)) throw new Error(`id de aula inválido: ${id}`);
  return pasta;
}

export function caminhoDoPonteiroV2(contentDir: string, id: string): string {
  return path.join(pastaDaAulaPublicadaV2(contentDir, id), "ativa.json");
}

export function caminhoDaPublicacaoV2(contentDir: string, id: string, publicationId: string): string {
  if (!publicationIdSchema.safeParse(publicationId).success) throw new Error(`id de publicação inválido: ${publicationId}`);
  return path.join(pastaDaAulaPublicadaV2(contentDir, id), "publicacoes", `${publicationId}.json`);
}

/** As aulas que têm pasta em `content/aulas-v2/`, em ordem. */
export function idsDeAulasV2(contentDir: string): string[] {
  const base = path.join(contentDir, PASTA_AULAS_V2);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && aulaIdV2Schema.safeParse(entrada.name).success)
    .map((entrada) => entrada.name)
    .sort();
}

/** As publicações guardadas de uma aula, pelo nome do arquivo. */
export function idsDePublicacoesV2(contentDir: string, id: string): string[] {
  const pasta = path.join(pastaDaAulaPublicadaV2(contentDir, id), "publicacoes");
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).filter((nome) => nome.endsWith(".json")).map((nome) => nome.slice(0, -".json".length)).sort();
}

/**
 * O ponteiro da aula, ou `null` se ela não tem publicação v2 ativa.
 * Ponteiro ilegível **lança**: silêncio aqui mandaria o aluno para a aula v1 sem ninguém saber.
 */
export function lerPonteiroV2(contentDir: string, id: string): PonteiroV2 | null {
  const arquivo = caminhoDoPonteiroV2(contentDir, id);
  if (!existsSync(arquivo)) return null;
  return ponteiroV2Schema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
}

/** O pacote cru de uma publicação, ou `null` se o arquivo não existe. Quem valida é `problemasDoPacoteV2`. */
export function lerPublicacaoCruaV2(contentDir: string, id: string, publicationId: string): unknown | null {
  const arquivo = caminhoDaPublicacaoV2(contentDir, id, publicationId);
  if (!existsSync(arquivo)) return null;
  return JSON.parse(readFileSync(arquivo, "utf8"));
}
