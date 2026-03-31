import React from 'react';
import { 
  User, 
  Database, 
  CloudDownload, 
  CloudUpload, 
  Trash2, 
  Moon, 
  Sun, 
  Settings, 
  Info,
  ShieldCheck
} from 'lucide-react';

interface AjustesProps {
  tecnico: string;
  setTecnico: (nome: string) => void;
  onClearData: () => void;
  onImportCloud: () => void;
  onSyncAll: () => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  totalRecords: number;
}

export const Ajustes: React.FC<AjustesProps> = ({ 
  tecnico, 
  setTecnico, 
  onClearData, 
  onImportCloud, 
  onSyncAll,
  theme,
  setTheme,
  totalRecords
}) => {
  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="brand-name">AJUSTES / EQUIPE</h1>

      {/* Profile Card */}
      <div className="card-hardware p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-3 rounded-full border border-primary/20">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[0.85rem] font-black uppercase text-white">Perfil do Técnico</h3>
            <p className="text-[0.65rem] font-black uppercase text-muted">Configurações de Identidade</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[0.65rem] font-black uppercase text-muted">Nome do Técnico</label>
          <input 
            type="text" 
            value={tecnico} 
            onChange={e => setTecnico(e.target.value)}
            className="input-hardware" 
            placeholder="Seu nome completo"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-500" />}
            <span className="text-[0.75rem] font-black uppercase">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-12 h-6 bg-white/10 rounded-full relative transition-colors"
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-primary transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Database Card */}
      <div className="card-hardware p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-500/10 p-3 rounded-full border border-blue-500/20">
            <Database size={24} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-[0.85rem] font-black uppercase text-white">Banco de Dados</h3>
            <p className="text-[0.65rem] font-black uppercase text-muted">Gerenciamento de Dados Locais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={onSyncAll}
            className="btn-primary w-full bg-blue-600 text-white"
          >
            <CloudUpload size={18} /> Sincronizar Tudo
          </button>
          <button 
            onClick={onImportCloud}
            className="btn-primary w-full bg-purple-600 text-white"
          >
            <CloudDownload size={18} /> Importar da Nuvem
          </button>
          <button 
            onClick={onClearData}
            className="btn-primary w-full bg-red-600 text-white"
          >
            <Trash2 size={18} /> Limpar Banco Local
          </button>
        </div>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
          <span className="text-[0.7rem] font-black uppercase text-muted">Registros Locais</span>
          <span className="text-[0.85rem] font-black text-primary">{totalRecords}</span>
        </div>
      </div>

      {/* App Info */}
      <div className="card-hardware p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Info size={16} />
          <span className="text-[0.7rem] font-black uppercase">Informações do Sistema</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[0.75rem]">
            <span className="text-muted">Versão:</span>
            <span className="font-black">v21.5.0</span>
          </div>
          <div className="flex justify-between text-[0.75rem]">
            <span className="text-muted">Status do Servidor:</span>
            <span className="text-success font-black flex items-center gap-1">
              <ShieldCheck size={12} /> ONLINE
            </span>
          </div>
          <div className="flex justify-between text-[0.75rem]">
            <span className="text-muted">Último Backup:</span>
            <span className="font-black">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-[0.6rem] font-black uppercase text-muted tracking-[2px]">
          VERTICAL LOCAÇÕES © 2026
        </p>
      </div>
    </div>
  );
};
