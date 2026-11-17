// Regras e força da senha do cadastro.
// A API exige no mínimo 12 caracteres; a tela exige também maiúscula,
// minúscula e número, e orienta o uso de símbolo e de senhas mais longas.

export const TAMANHO_MINIMO = 12;

export function avaliarSenha(senha = "", login = "") {
  const loginLimpo = login.trim().toLowerCase();
  const contemLogin = loginLimpo.length >= 3 && senha.toLowerCase().includes(loginLimpo);

  const requisitos = [
    { id: "tamanho", texto: `Pelo menos ${TAMANHO_MINIMO} caracteres`, ok: senha.length >= TAMANHO_MINIMO, obrigatorio: true },
    { id: "caixa", texto: "Letra maiúscula e minúscula", ok: /[a-zà-ÿ]/.test(senha) && /[A-ZÀ-ß]/.test(senha), obrigatorio: true },
    { id: "numero", texto: "Pelo menos um número", ok: /\d/.test(senha), obrigatorio: true },
    { id: "simbolo", texto: "Um símbolo, como ! ? # @ (recomendado)", ok: /[^A-Za-zÀ-ÿ0-9\s]/.test(senha), obrigatorio: false },
  ];

  const obrigatoriosOk = requisitos.filter((r) => r.obrigatorio).every((r) => r.ok);
  const pontos =
    requisitos.filter((r) => r.ok).length + (senha.length >= 16 ? 1 : 0);

  // 0–5 pontos. Conter o login derruba a senha para "Fraca".
  let nivel = 0;
  if (senha) {
    if (contemLogin || pontos <= 2) nivel = 1;
    else if (pontos === 3) nivel = 2;
    else if (pontos === 4) nivel = 3;
    else nivel = 4;
  }
  if (!obrigatoriosOk && nivel > 2) nivel = 2;

  const rotulos = ["", "Fraca", "Razoável", "Boa", "Forte"];
  return {
    nivel,
    rotulo: rotulos[nivel],
    requisitos,
    contemLogin,
    valida: obrigatoriosOk && !contemLogin,
  };
}
