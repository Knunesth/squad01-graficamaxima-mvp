import React, { forwardRef, useId, useState } from "react";
import { Check, Eye, EyeOff, Circle } from "lucide-react";
import { avaliarSenha } from "@/shared/utils/password.js";

// Campo de senha com botão de mostrar/ocultar.
export const PasswordField = forwardRef(function PasswordField(
  { label, id, error, className = "", children, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const [visivel, setVisivel] = useState(false);
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field ${className}`}>
      <label htmlFor={fieldId}>{label}</label>
      <div className="password-wrap">
        <input
          {...props}
          id={fieldId}
          ref={ref}
          type={visivel ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visivel ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visivel}
          onClick={() => setVisivel((v) => !v)}
        >
          {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {children}
      {error && (
        <small id={errorId} role="alert" className="error-text">
          {error}
        </small>
      )}
    </div>
  );
});

// Medidor de força e lista de requisitos, atualizados enquanto a pessoa digita.
export function PasswordStrength({ senha, login }) {
  const { nivel, rotulo, requisitos, contemLogin } = avaliarSenha(senha, login);
  return (
    <div className="password-strength" data-level={nivel}>
      <div className="strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= nivel ? "on" : ""} />
        ))}
      </div>
      <p className="strength-label" aria-live="polite">
        {senha ? `Força da senha: ${rotulo}` : "Crie uma senha forte"}
      </p>
      <ul className="strength-list">
        {requisitos.map((r) => (
          <li key={r.id} className={r.ok ? "ok" : ""}>
            {r.ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
            <span>
              {r.texto}
              <span className="sr-only">{r.ok ? " — cumprido" : " — pendente"}</span>
            </span>
          </li>
        ))}
        {contemLogin && (
          <li className="bad">
            <Circle size={14} aria-hidden="true" />
            <span>A senha não pode conter o seu login</span>
          </li>
        )}
      </ul>
    </div>
  );
}
