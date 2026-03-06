export interface UserProfile {
  id: string;
  empresa_id: string | null;
  role: 'admin' | 'tecnico' | 'cliente';
  empresa_nome: string | null;
}

export interface Servico {
  id?: number;
  empresa_id: string | null;
  tecnico: string;
  om: string;
  patrimonio: string;
  equipamento: string;
  horas: number;
  valor: number;
  valor_base?: number;
  identificacao: boolean;
  data_inicio: string;
  data_fim: string;
  status?: string;
  created_at?: string;
  data?: string; // For local storage compatibility
  tecnico_perfil?: {
    empresa_nome: string;
    role: string;
  };
}

export interface ApiConfig {
  empresa_id: string;
  api_url: string;
  api_key: string;
  updated_at: string;
}
