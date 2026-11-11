import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Janela modal sobre o <dialog> nativo: foco preso, Esc para fechar e clique
 * fora da caixa também fecha.
 */
export function Modal({ title, description, onClose, size = "md", children }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
