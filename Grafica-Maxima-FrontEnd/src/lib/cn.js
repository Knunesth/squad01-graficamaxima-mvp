import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para mesclar classes de forma condicional, 
 * resolvendo conflitos do Tailwind.
 * 
 * @param {...(string|Object|Array)} inputs - Classes para mesclar
 * @returns {string} Classes mescladas
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
