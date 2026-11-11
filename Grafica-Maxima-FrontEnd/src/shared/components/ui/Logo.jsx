import { cn } from "@/shared/utils/cn.js";

export function Logo({ className, ...props }) {
  return (
    <div className={cn("brand-logo", className)} {...props}>
      <img
        src="/logomarca-grafica-maxima.png"
        alt="Logotipo da Gráfica Máxima"
      />
    </div>
  );
}
