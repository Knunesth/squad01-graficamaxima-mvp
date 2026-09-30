import logoPlaceholder from '../../assets/images/logo-placeholder.svg';
import { cn } from '../../lib/cn';

export function Logo({ className, ...props }) {
  return (
    <div className={cn("flex items-center justify-center p-2 border border-dashed border-line rounded", className)} {...props}>
      <img src={logoPlaceholder} alt="Logotipo da Gráfica Máxima" className="h-8 object-contain" />
    </div>
  );
}
