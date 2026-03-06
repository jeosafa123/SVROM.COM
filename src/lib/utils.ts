import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function handleError(error: any, context: string) {
  let message = error?.message || 'Ocorreu um erro inesperado.';
  
  if (message === 'Failed to fetch') {
    message = 'Erro de conexão: Não foi possível alcançar o servidor. Verifique sua internet ou se o banco de dados está ativo.';
  }

  console.error(`[Error in ${context}]:`, error);
  
  alert(`Erro em ${context}: ${message}`);
  
  return message;
}
