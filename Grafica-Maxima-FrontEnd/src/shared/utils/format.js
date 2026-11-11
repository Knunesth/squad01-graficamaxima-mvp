export const moeda = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const decimal = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
export const inteiro = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export function dataBR(value) {
  if (!value) return "—";
  const date = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.split("-").reverse().join("/")
    : "—";
}
/** Data no formato do <input type="date"> (AAAA-MM-DD), ou "" se vazia. */
export function dataISO(value) {
  const date = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}
export const aprovado = (status) => ["Aprovado", "Finalizado"].includes(status);

const digitos = (value) => String(value || "").replace(/\D/g, "");

/** 000.000.000-00 ou 00.000.000/0000-00, conforme a quantidade de dígitos. */
export function documentoBR(value) {
  const d = digitos(value).slice(0, 14);
  if (d.length <= 11)
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** (00) 0000-0000 ou (00) 00000-0000. */
export function telefoneBR(value) {
  const d = digitos(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = `(${d.slice(0, 2)}) `;
  const numero = d.slice(2);
  if (numero.length <= 4) return ddd + numero;
  const corte = numero.length > 8 ? 5 : 4;
  return `${ddd}${numero.slice(0, corte)}-${numero.slice(corte)}`;
}
