import { NOME_DO_GRAU, type Grau } from "@/lib/progresso/grau";

/**
 * O grau de um item — Novato a Mestre — num desenho só (17/9/2026).
 *
 * ## Uma escadinha, e não estrelas nem metal
 *
 * O metal (Madeira → Ouro) já é do **Nível** do curso, nos cartões de `/tatica`; pôr metal aqui
 * faria o aluno ler "Prata" num tema do nível 1 e achar que é o nível 4. Estrela é nota, e o grau
 * não é nota: é **onde está a memória hoje**, e ele desce. Cinco barrinhas crescentes dizem isso —
 * degraus que se enchem e se esvaziam —, e a palavra ao lado diz o nome. Novato é a escada vazia.
 *
 * As barras são `aria-hidden`; a palavra é o que o leitor de tela lê (a regra de `Barra` e
 * `Bolinhas`). Cor só do método: o verde cheio é "chegou", o trilho é o mesmo `carta-toque` da
 * `Barra`, que no escuro ainda se distingue do cartão.
 */
export function SeloDoGrau({
  grau,
  tamanho = "normal",
  className = "",
}: {
  grau: Grau;
  /** `grande` no painel de fim da passada, onde o grau é a notícia. */
  tamanho?: "normal" | "grande";
  className?: string;
}) {
  const grande = tamanho === "grande";
  return (
    <span className={`inline-flex shrink-0 items-end gap-1.5 ${className}`}>
      <DegrausDoGrau grau={grau} tamanho={tamanho} />
      <span
        className={`leading-none ${grande ? "text-sm" : "text-xs"} ${
          grau === 0 ? "text-tinta-fraca" : grau >= 3 ? "font-semibold text-metodo-tinta" : "font-medium text-tinta-media"
        }`}
      >
        {NOME_DO_GRAU[grau]}
      </span>
    </span>
  );
}

/**
 * Só a escadinha, sem a palavra — para quem põe o nome em outro lugar, como a escada dos graus no
 * topo de `/progresso`, que empilha degraus, nome e contagem numa coluna.
 *
 * `aria-hidden` sempre: quem a usa sozinha escreve o nome do grau em texto ao lado.
 */
export function DegrausDoGrau({ grau, tamanho = "normal" }: { grau: Grau; tamanho?: "normal" | "grande" }) {
  const grande = tamanho === "grande";
  const alturas = grande ? [6, 9, 12, 15, 18] : [4, 6, 8, 10, 12];
  return (
    <span aria-hidden className="flex items-end gap-0.5">
      {alturas.map((altura, i) => (
        <span
          key={i}
          style={{ height: altura }}
          className={`${grande ? "w-1.5" : "w-1"} rounded-[1px] ${i < grau ? "bg-metodo-cheio" : "bg-carta-toque"}`}
        />
      ))}
    </span>
  );
}
