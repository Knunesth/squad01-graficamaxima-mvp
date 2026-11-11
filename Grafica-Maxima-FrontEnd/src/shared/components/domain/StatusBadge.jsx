import React from "react";
import { Badge } from "@/shared/components/ui/Badge.jsx";
import { varianteStatus } from "./status.js";

export function StatusBadge({ status }) {
  const texto = status || "Não aprovado";
  return (
    <Badge variant={varianteStatus(texto)} className="status-badge">
      {texto}
    </Badge>
  );
}
