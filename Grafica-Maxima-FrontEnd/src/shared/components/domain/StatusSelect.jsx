import React from "react";
import { STATUS_OPCOES, varianteStatus } from "./status.js";

/**
 * Status do orçamento como lista de opções: mostra o estado atual com a cor
 * correspondente e troca ao escolher outro.
 */
export function StatusSelect({ status, onChange, disabled = false, label }) {
  const atual = status || "Não aprovado";
  const opcoes = STATUS_OPCOES.includes(atual)
    ? STATUS_OPCOES
    : [atual, ...STATUS_OPCOES];
  return (
    <select
      className={`status-select status-${varianteStatus(atual)}`}
      aria-label={label}
      value={atual}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {opcoes.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}
