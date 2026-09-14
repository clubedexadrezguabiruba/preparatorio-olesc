import { limpar } from "./limpeza.ts";

export default async function globalTeardown() {
  const { apagados, contas, problemas } = await limpar();
  console.log(`[e2e] apagados ${apagados.length} restos do ensaio; contas apagadas: ${contas.join(", ") || "nenhuma"}.`);
  if (problemas.length) throw new Error(`A limpeza encontrou arquivos protegidos diferentes:\n- ${problemas.join("\n- ")}`);
}
