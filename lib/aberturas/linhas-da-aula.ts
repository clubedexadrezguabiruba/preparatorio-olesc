import "server-only";
import type { AulaDoAlunoV2 } from "../editor-v2/fluxo-do-aluno.ts";
import { linhasDaAbertura } from "../repertorio/banco.ts";

/**
 * O move trainer da aula de abertura com as linhas dentro (§18.1): a etapa aponta para ids do
 * repertório compilado, e o player precisa das linhas inteiras. Lidas aqui, no servidor, pelo mesmo
 * `linhasDaAbertura` de `/aberturas` — e na ordem que a aula declara. Linha que sumiu do compilado
 * simplesmente não vem; quem impede isso de ser publicado é `TREINADOR_LINHA_AUSENTE`.
 */
export async function comLinhasDosTreinadores(aula: AulaDoAlunoV2): Promise<AulaDoAlunoV2> {
  if (!aula.etapas.some((etapa) => etapa.tipo === "treinador")) return aula;
  const etapas = await Promise.all(aula.etapas.map(async (etapa) => {
    if (etapa.tipo !== "treinador") return etapa;
    const porId = new Map((await linhasDaAbertura(etapa.cor, etapa.abertura)).map((linha) => [linha.id, linha]));
    return { ...etapa, linhas: etapa.linhaIds.flatMap((id) => porId.get(id) ?? []) };
  }));
  return { ...aula, etapas };
}
