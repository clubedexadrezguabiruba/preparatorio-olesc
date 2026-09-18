"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { problemaParaExcluir, problemaParaNovoPin, type ContaAlvo } from "@/lib/auth/gerir-conta";
import { professorAtual } from "@/lib/auth/perfil";
import {
  emailDoUsuario,
  normalizarUsuario,
  problemaDoPin,
  problemaDoUsuario,
  sortearPin,
} from "@/lib/auth/usuario";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehIdDeConta, ehTurma, NOME_DA_TURMA } from "@/lib/turma/turma";

export type EstadoDoCadastro = {
  erro?: string;
  criado?: { nome: string; usuario: string; pin: string; turma: string };
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

  const turmaBruta = String(dados.get("turma") ?? "olesc");
  if (!ehTurma(turmaBruta)) return { erro: "Escolha a turma: OLESC ou Testadores." };
  const turma = turmaBruta;
  // Testador não tem equipe (o `check` da migration 0019 recusaria de qualquer jeito).
  const equipe = turma === "olesc" && (equipeBruta === "M" || equipeBruta === "F") ? equipeBruta : null;
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
      turma,
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
  return { criado: { nome, usuario, pin, turma: NOME_DA_TURMA[turma] } };
}

export type EstadoDaConta = { erro?: string; pinNovo?: string };

/** A conta que o formulário aponta, lida com a chave de serviço — ou `null`. */
async function contaDoFormulario(dados: FormData): Promise<ContaAlvo | null> {
  const id = String(dados.get("id") ?? "");
  if (!ehIdDeConta(id)) return null;
  const { data, error } = await criarClienteAdmin().from("perfis").select("id, usuario, papel").eq("id", id).maybeSingle();
  if (error) throw new Error(`não foi possível ler a conta: ${error.message}`);
  return data;
}

/**
 * Gera um PIN novo para o aluno que esqueceu o dele. Como no cadastro, o PIN volta em claro
 * **uma vez só**; o antigo deixa de valer na hora. Em branco, o PIN é sorteado.
 */
export async function gerarNovoPin(_anterior: EstadoDaConta, dados: FormData): Promise<EstadoDaConta> {
  await professorAtual();

  const conta = await contaDoFormulario(dados);
  const problema = problemaParaNovoPin(conta);
  if (problema || !conta) return { erro: problema ?? "Essa conta não existe mais." };

  const pin = String(dados.get("pin") ?? "").trim() || sortearPin();
  const problemaPin = problemaDoPin(pin);
  if (problemaPin) return { erro: `PIN: ${problemaPin}.` };

  const { error } = await criarClienteAdmin().auth.admin.updateUserById(conta.id, { password: pin });
  if (error) return { erro: `O Supabase recusou: ${error.message}` };
  return { pinNovo: pin };
}

/**
 * Exclui a conta do aluno **e tudo o que é dele no banco** — sem lixeira. As regras e o porquê
 * de o apagamento ir junto estão em `lib/auth/gerir-conta.ts`.
 */
export async function excluirConta(_anterior: EstadoDaConta, dados: FormData): Promise<EstadoDaConta> {
  const professor = await professorAtual();

  const conta = await contaDoFormulario(dados);
  const problema = problemaParaExcluir(conta, professor.id, String(dados.get("confirmacao") ?? ""));
  if (problema || !conta) return { erro: problema ?? "Essa conta não existe mais." };

  const admin = criarClienteAdmin();
  const { error } = await admin.auth.admin.deleteUser(conta.id);
  if (error) return { erro: `O Supabase recusou: ${error.message}` };

  // O cascade é do banco; aqui só se confere que ele aconteceu, em vez de supor.
  const { data: sobrou } = await admin.from("perfis").select("id").eq("id", conta.id).maybeSingle();
  if (sobrou) return { erro: "O login da conta foi apagado, mas o perfil ficou no banco. O aluno já não entra; os dados dele continuam lá." };

  revalidatePath("/professor");
  revalidatePath("/turma");
  redirect("/professor");
}
