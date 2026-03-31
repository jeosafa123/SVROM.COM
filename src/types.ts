export interface Servico {
  id: string;
  om: string;
  patrimonio: string;
  maquina: string;
  horas: string;
  valor: string;
  dataAbertura: string;
  dataEntrega: string;
  status: 'Aberto' | 'Liberado' | 'Indenizado';
  indenizacao: boolean;
  tecnico: string;
  sincronizado: boolean;
  createdAt: string;
}

export interface MaquinaPreco {
  nome: string;
  valor: number;
  horas: number;
}
