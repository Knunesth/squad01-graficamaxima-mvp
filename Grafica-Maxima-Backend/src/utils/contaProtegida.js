// A conta administradora principal não pode ter perfil, acesso ou senha
// alterados por outra pessoa, nem ser desativada. É identificada pelo login:
// "admin", ou o valor de PROTECTED_ADMIN_LOGIN quando definido.

function loginProtegido() {
  return (process.env.PROTECTED_ADMIN_LOGIN || "admin").trim().toLowerCase();
}

function contaProtegida(login) {
  return typeof login === "string" && login.trim().toLowerCase() === loginProtegido();
}

module.exports = { contaProtegida, loginProtegido };
