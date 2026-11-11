// Cliente escolhido na primeira etapa do novo orçamento. Fica na sessão do
// navegador só até o orçamento ser salvo.
const CHAVE = "orcamento_cliente";

export function lerClienteDoOrcamento() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) || "null");
  } catch {
    return null;
  }
}

export function guardarClienteDoOrcamento(cliente) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(cliente));
  } catch {
    // Sem sessionStorage o orçamento segue sem cliente pré-selecionado.
  }
}

export function limparClienteDoOrcamento() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar.
  }
}
