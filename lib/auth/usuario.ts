/**
 * O nome de usuário, e o e-mail que ninguém vê.
 *
 * O aluno digita **usuário e PIN**. O Supabase Auth só sabe entrar com e-mail e
 * senha. A ponte entre as duas coisas é uma função só, e mora aqui: duas
 * receitas para montar o mesmo e-mail seriam duas chances de o aluno digitar o
 * PIN certo e não entrar.
 *
 * O domínio é `alunos.olesc.local` — uma TLD reservada, que não existe e não
 * pode existir. Nenhuma mensagem sai daqui, e nenhuma chega.
 */

export const DOMINIO = "alunos.olesc.local";

/**
 * O usuário como ele fica gravado: minúsculas, sem acento, sem espaço.
 *
 * A normalização é o que faz `João`, `joao` e ` JOAO ` entrarem na mesma conta.
 * Sem ela, o aluno que digita o próprio nome com maiúscula na segunda-feira
 * leva "usuário ou PIN incorreto" e não tem como descobrir por quê.
 */
export function normalizarUsuario(bruto: string): string {
  return bruto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Os diacríticos que o `NFD` acabou de separar da letra (U+0300 a U+036F).
    // O intervalo é literal e **invisível num editor** — parece um colchete
    // vazio. É por isso que `usuario.test.ts` afirma que `joão` vira `joao`:
    // se uma cópia desatenta comer estes dois caracteres, o teste fica
    // vermelho em vez de o aluno não conseguir entrar.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

/** O problema do nome de usuário em português, ou `null` se ele serve. */
export function problemaDoUsuario(usuario: string): string | null {
  if (usuario.length < 3) return "o nome de usuário precisa de pelo menos 3 letras";
  if (usuario.length > 24) return "o nome de usuário passou de 24 letras";
  if (!/^[a-z]/.test(usuario)) return "o nome de usuário começa por letra";
  return null;
}

/**
 * O PIN: exatamente 6 dígitos.
 *
 * Seis e não quatro porque o Supabase exige senha de 6 caracteres — abaixo
 * disso a criação da conta é recusada pelo servidor, e o professor descobriria
 * isso com doze alunos na frente dele.
 */
export const TAMANHO_DO_PIN = 6;

export function problemaDoPin(pin: string): string | null {
  if (!/^[0-9]+$/.test(pin)) return "o PIN é só de números";
  if (pin.length !== TAMANHO_DO_PIN) return `o PIN tem ${TAMANHO_DO_PIN} números`;
  return null;
}

/** O e-mail sintético da conta. Nunca aparece na tela. */
export function emailDoUsuario(usuario: string): string {
  return `${normalizarUsuario(usuario)}@${DOMINIO}`;
}

/**
 * Um PIN sorteado, para o professor não ter de inventar doze.
 *
 * `crypto.getRandomValues` e não `Math.random`: é o mesmo custo, e o PIN é a
 * única credencial que o aluno tem.
 */
export function sortearPin(): string {
  const bytes = new Uint8Array(TAMANHO_DO_PIN);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}
