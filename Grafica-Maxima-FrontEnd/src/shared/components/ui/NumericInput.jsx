import { forwardRef, useState } from "react";

function numeroValido(valor) {
  return valor !== "" && valor != null && Number.isFinite(Number(valor));
}

/** Texto exibido fora de edição: 1.234,50 */
function formatar(valor, decimals, minDecimals) {
  if (!numeroValido(valor)) return "";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  });
}

/** Texto exibido durante a edição: 1234,5 (sem separador de milhar) */
function editavel(valor, decimals) {
  if (!numeroValido(valor)) return "";
  return String(Number(Number(valor).toFixed(decimals))).replace(".", ",");
}

/** Mantém só dígitos e uma vírgula decimal. O sinal de menos nunca entra. */
function limpar(texto, decimals) {
  const bruto = String(texto);
  // "1.234,56" colado: o ponto é milhar. "12.5" digitado: o ponto é decimal.
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "")
    : bruto.replace(/\./g, ",");
  const [inteiro, ...resto] = normalizado.replace(/[^\d,]/g, "").split(",");
  const semZeros = inteiro.replace(/^0+(?=\d)/, "");
  if (decimals === 0 || !resto.length) return semZeros;
  return `${semZeros || "0"},${resto.join("").slice(0, decimals)}`;
}

/**
 * Campo numérico no padrão brasileiro. O valor externo é sempre um número
 * (ou "" quando vazio); a formatação fica só na tela.
 *
 * - `decimals={0}` aceita apenas inteiros (quantidade).
 * - Valores negativos não podem ser digitados nem colados.
 * - Acima de `max`, a digitação é ignorada.
 */
export const NumericInput = forwardRef(function NumericInput(
  {
    value,
    onChange,
    onBlur,
    onFocus,
    decimals = 2,
    minDecimals = decimals === 0 ? 0 : 2,
    max,
    prefix,
    suffix,
    className = "",
    ...props
  },
  ref,
) {
  const [rascunho, setRascunho] = useState(null);
  const emEdicao = rascunho !== null;

  const campo = (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode={decimals === 0 ? "numeric" : "decimal"}
      autoComplete="off"
      className={`numeric-input ${className}`}
      value={emEdicao ? rascunho : formatar(value, decimals, minDecimals)}
      onFocus={(event) => {
        setRascunho(editavel(value, decimals));
        onFocus?.(event);
      }}
      onChange={(event) => {
        const texto = limpar(event.target.value, decimals);
        const numero = texto === "" ? "" : Number(texto.replace(",", "."));
        if (numero !== "" && max != null && numero > max) return;
        setRascunho(texto);
        onChange?.(numero);
      }}
      onBlur={(event) => {
        setRascunho(null);
        onBlur?.(event);
      }}
    />
  );

  if (!prefix && !suffix) return campo;
  return (
    <span className="numeric-field">
      {prefix && <span className="numeric-affix" aria-hidden="true">{prefix}</span>}
      {campo}
      {suffix && <span className="numeric-affix" aria-hidden="true">{suffix}</span>}
    </span>
  );
});
