"use server";

import { redirect } from "next/navigation";
import { emailDoUsuario, normalizarUsuario, problemaDoPin } from "@/lib/auth/usuario";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type EstadoDaEntrada = { erro?: string };

/**
 * Entrar com usuário e PIN.
 *
 * **A mensagem de erro é a mesma para usuário inexistente e PIN errado**, e
 * isso é de propósito. Distinguir as duas transformaria a tela numa lista de
 * quem tem conta — e a conta aqui é de criança, com PIN de seis dígitos.
 */
export async function entrar(
  _anterior: EstadoDaEntrada,
  dados: FormData,
): Promise<EstadoDaEntrada> {
  const usuario = normalizarUsuario(String(dados.get("usuario") ?? ""));
  const pin = String(dados.get("pin") ?? "").trim();

  if (!usuario) return { erro: "Escreva o seu nome de usuário." };
  const problema = problemaDoPin(pin);
  if (problema) return { erro: `O PIN não confere: ${problema}.` };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDoUsuario(usuario),
    password: pin,
  });

  if (error) return { erro: "Usuário ou PIN incorreto. Confira o papel que o professor entregou." };

  const proxima = String(dados.get("proxima") ?? "");
  redirect(proxima.startsWith("/") ? proxima : "/painel");
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
