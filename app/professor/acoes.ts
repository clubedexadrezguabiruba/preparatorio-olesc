"use server";

import { revalidatePath } from "next/cache";
import { professorAtual } from "@/lib/auth/perfil";
import {
  emailDoUsuario,
  normalizarUsuario,
  problemaDoPin,
  problemaDoUsuario,
  sortearPin,
} from "@/lib/auth/usuario";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EstadoDoCadastro = {
  erro?: string;
  criado?: { nome: string; usuario: string; pin: string };
};

/**
 * O professor cria a conta do aluno.
 *
 * O aluno **nunca** se cadastra: não há tela de cadastro, e o Auth do projeto
 * fica com o registro público desligado. Quem entra é quem o professor pôs
 * aqui, e a credencial sai desta tela em papel.
 *
 * O PIN volta em claro **uma vez só**, no retorno desta ação. Depois disso ele
 * é um hash no Supabase e nem o professor consegue lê-lo — o que sobra é gerar
 * outro. Por isso a tela manda anotar antes de fechar.
 */
export async function criarAluno(
  _anterior: EstadoDoCadastro,
  dados: FormData,
): Promise<EstadoDoCadastro> {
  // A primeira linha, e não a última: daqui para baixo roda a chave de serviço,
  // que ignora toda a RLS. Ela não sabe quem pediu, e não vai perguntar.
  await professorAtual();

  const nome = String(dados.get("nome") ?? "").trim();
  const usuario = normalizarUsuario(String(dados.get("usuario") ?? "") || nome);
  const equipeBruta = String(dados.get("equipe") ?? "");
  const ratingBruto = String(dados.get("rating") ?? "").trim();
  const pinBruto = String(dados.get("pin") ?? "").trim();

  if (!nome) return { erro: "Escreva o nome do aluno." };
  const problemaUsuario = problemaDoUsuario(usuario);
  if (problemaUsuario) return { erro: `Nome de usuário: ${problemaUsuario}.` };

  const pin = pinBruto || sortearPin();
  const problemaPin = problemaDoPin(pin);
  if (problemaPin) return { erro: `PIN: ${problemaPin}.` };

  const equipe = equipeBruta === "M" || equipeBruta === "F" ? equipeBruta : null;
  const rating = ratingBruto ? Number(ratingBruto) : null;
  if (rating !== null && (!Number.isFinite(rating) || rating < 100 || rating > 3000)) {
    return { erro: "O rating estimado precisa ficar entre 100 e 3000 — ou fique em branco." };
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: pin,
    // Sem isto a conta nasce esperando a confirmação de um e-mail que não
    // existe e não pode existir — e o aluno digitaria o PIN certo para sempre.
    email_confirm: true,
    user_metadata: {
      usuario,
      nome,
      papel: "aluno",
      equipe: equipe ?? "",
      rating: rating === null ? "" : String(rating),
    },
  });

  if (error) {
    const jaExiste = /already|exists|duplicate/i.test(error.message);
    return {
      erro: jaExiste
        ? `Já existe conta com o usuário "${usuario}". Escolha outro nome de usuário.`
        : `O Supabase recusou: ${error.message}`,
    };
  }

  revalidatePath("/professor");
  return { criado: { nome, usuario, pin } };
}
