"use client";

import { useActionState } from "react";
import { criarAluno, type EstadoDoCadastro } from "./acoes";

export function CadastroDeAluno() {
  const [estado, agir, pendente] = useActionState<EstadoDoCadastro, FormData>(criarAluno, {});

  return (
    <div className="flex flex-col gap-4">
      <form action={agir} className="flex flex-col gap-4 rounded-xl border border-borda bg-carta p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do aluno" nome="nome" placeholder="João Pedro Silva" obrigatorio />
          <Campo
            rotulo="Nome de usuário"
            nome="usuario"
            placeholder="joaopedro"
            dica="Em branco, sai do nome."
          />
          <label className="flex flex-col gap-1.5">
            <span className="rotulo text-tinta-fraca">Equipe</span>
            <select
              name="equipe"
              defaultValue=""
              className="foco rounded-lg border border-borda bg-papel px-3 py-2.5 text-base text-tinta"
            >
              <option value="">Sem equipe</option>
              <option value="M">Masculina</option>
              <option value="F">Feminina</option>
            </select>
          </label>
          <Campo
            rotulo="Rating estimado"
            nome="rating"
            placeholder="1200"
            dica="Escolhe onde a série de tática começa."
          />
          <Campo
            rotulo="PIN"
            nome="pin"
            placeholder="em branco = sorteado"
            dica="6 números."
          />
        </div>

        {estado.erro ? (
          <p role="alert" className="rounded-lg bg-erro-superficie/12 px-3 py-2 text-sm text-erro-tinta">
            {estado.erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pendente}
          className="foco self-start rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-60"
        >
          {pendente ? "Criando…" : "Criar conta"}
        </button>
      </form>

      {estado.criado ? (
        <div className="flex flex-col gap-2 rounded-xl border border-borda-forte bg-aviso-superficie/12 p-4">
          <p className="rotulo text-aviso-tinta">Anote agora — o PIN não aparece de novo</p>
          <p className="text-sm text-tinta-media">
            Depois desta tela o PIN vira um código embaralhado no servidor. Nem você consegue
            lê-lo: o que sobra é gerar outro.
          </p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-tinta-fraca">Aluno</dt>
            <dd className="font-medium text-tinta">{estado.criado.nome}</dd>
            <dt className="text-tinta-fraca">Usuário</dt>
            <dd className="font-mono font-medium text-tinta">{estado.criado.usuario}</dd>
            <dt className="text-tinta-fraca">PIN</dt>
            <dd className="font-mono text-lg font-semibold tracking-[0.3em] text-tinta">
              {estado.criado.pin}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function Campo({
  rotulo,
  nome,
  placeholder,
  dica,
  obrigatorio,
}: {
  rotulo: string;
  nome: string;
  placeholder?: string;
  dica?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="rotulo text-tinta-fraca">{rotulo}</span>
      <input
        name={nome}
        required={obrigatorio}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize={nome === "nome" ? "words" : "none"}
        className="foco rounded-lg border border-borda bg-papel px-3 py-2.5 text-base text-tinta placeholder:text-tinta-muda"
      />
      {dica ? <span className="text-xs text-tinta-fraca">{dica}</span> : null}
    </label>
  );
}
