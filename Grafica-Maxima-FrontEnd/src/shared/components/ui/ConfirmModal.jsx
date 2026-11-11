import { createElement } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "./Button.jsx";
import { Modal } from "./Modal.jsx";

export function ConfirmModal({ title, description, action, onConfirm, onClose, busy = false, icon = Trash2 }) {
  return (
    <Modal title={title} description={description} onClose={onClose} size="sm">
      <div className="form-actions">
        <Button variant="subtle" disabled={busy} onClick={onClose}><X size={18} aria-hidden="true" /> Cancelar</Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>{createElement(icon, { size: 18, "aria-hidden": "true" })} {action}</Button>
      </div>
    </Modal>
  );
}
