// Status de orçamento aceitos pela API e a cor de cada um na interface.
// "Aberto", "Pré-Orçamento" e "Em análise" vêm de dados antigos: continuam
// sendo exibidos, mas não são oferecidos como opção nova.
const VARIANTES = {
  "Não aprovado": "warning",
  Aberto: "warning",
  "Pré-Orçamento": "warning",
  "Em análise": "info",
  "Em negociação": "info",
  Aprovado: "success",
  Finalizado: "brand",
  Inativo: "neutral",
};

export const STATUS_OPCOES = [
  "Não aprovado",
  "Em negociação",
  "Aprovado",
  "Finalizado",
  "Inativo",
];

export function varianteStatus(status) {
  return VARIANTES[status] || "neutral";
}
