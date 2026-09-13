"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarAberturaNovaAcao } from "@/app/editor/repertorio/acoes";
import { slugDaAbertura } from "@/lib/repertorio/editor/sessao";

/**
 * "Nova abertura" — §21: "nova linha ou abertura nasce por dados, não por alteração
 * manual de rota".
 *
 * O formulário cria **só o rascunho** com as tags. A abertura entra em
 * `content/repertorio/` quando o professor aplica e ela compila — o que exige ao menos
 * uma linha completa. `/aberturas` lê o índice compilado, então nenhuma rota é escrita
 * à mão. Fechar o formulário não chama o servidor e não cria arquivo.
 *
 * O endereço (slug) aparece em tempo real e pode ser ajustado: ele vira o nome do
 * arquivo, a URL do aluno e o prefixo do id de cada linha, e quem cria precisa vê-lo.
 */
export function FormularioDeAberturaNova() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [cor, setCor] = useState<"brancas" | "pretas">("brancas");
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [nivel, setNivel] = useState<"base" | "avancado">("base");
  const [fonte, setFonte] = useState("");
  const [problemas, setProblemas] = useState<string[]>([]);
  const [criando, comTransicao] = useTransition();

  const endereco = slugDaAbertura(slug || nome);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="foco w-fit rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta">
        + Nova abertura
      </button>
    );
  }

  const criar = () => {
    setProblemas([]);
    comTransicao(async () => {
      const resposta = await criarAberturaNovaAcao({ cor, nome, slug: slug || undefined, nivel, fonte });
      if (resposta.ok) router.push(`/editor/repertorio/${resposta.arquivo}`);
      else setProblemas(resposta.problemas);
    });
  };

  return (
    <form
      className="cartao-vazio flex flex-col gap-3 p-4"
      aria-label="Nova abertura"
      onSubmit={(evento) => { evento.preventDefault(); criar(); }}
    >
      <h2 className="text-sm font-semibold text-tinta">Nova abertura</h2>
      <fieldset className="flex gap-4 text-sm text-tinta">
        <legend className="mb-1 text-xs text-tinta-fraca">Cor do aluno</legend>
        {(["brancas", "pretas"] as const).map((c) => (
          <label key={c} className="flex items-center gap-1.5">
            <input type="radio" name="cor" value={c} checked={cor === c} onChange={() => setCor(c)} />
            {c === "brancas" ? "Brancas" : "Pretas"}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="foco rounded-md border border-borda bg-papel px-2 py-1.5" placeholder="Gambito Evans" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Endereço
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="foco rounded-md border border-borda bg-papel px-2 py-1.5" placeholder={slugDaAbertura(nome) || "gerado a partir do nome"} />
        <span className="text-xs text-tinta-fraca">
          Arquivo {cor}-{endereco || "…"}.pgn · o aluno abre em /aberturas/{cor}/{endereco || "…"}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nível das linhas
        <select value={nivel} onChange={(e) => setNivel(e.target.value as "base" | "avancado")} className="foco w-fit rounded-md border border-borda bg-papel px-2 py-1.5">
          <option value="base">Base</option>
          <option value="avancado">Avançado</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Fonte
        <textarea value={fonte} onChange={(e) => setFonte(e.target.value.replace(/\s*\n\s*/g, " "))} rows={2} className="foco rounded-md border border-borda bg-papel px-2 py-1.5" placeholder="De onde vêm os lances: curso, capítulo, autor" />
      </label>
      {problemas.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-erro-texto">
          {problemas.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
      <p className="text-xs text-tinta-fraca">
        Cria um rascunho só com o cabeçalho. A abertura entra no repertório quando tiver ao menos uma linha
        completa e você aplicar.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setAberto(false); setProblemas([]); }} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
        <button type="submit" disabled={criando} className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40">
          {criando ? "Criando…" : "Criar rascunho"}
        </button>
      </div>
    </form>
  );
}
