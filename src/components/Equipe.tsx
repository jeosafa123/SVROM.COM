import React, { useState } from 'react';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { createClient } from '@supabase/supabase-js';
import { handleError } from '../lib/utils';

// Cliente temporário para cadastro sem deslogar o admin
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface EquipeProps {
  profile: UserProfile | null;
}

export function Equipe({ profile }: EquipeProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'tecnico',
    token: ''
  });

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return alert('Acesso negado');

    if (formData.role === 'tecnico' && formData.token !== '20') return alert('Para TÉCNICO o token é 20');
    if (formData.role === 'cliente' && formData.token !== '30') return alert('Para CLIENTE o token é 30');

    if (formData.password.length < 6) return alert('Senha deve ter no mínimo 6 caracteres');

    setLoading(true);
    try {
      // Criar um cliente Supabase que não persiste sessão para não deslogar o admin
      const tempSupabase = createClient(SB_URL, SB_KEY, {
        auth: { persistSession: false }
      });

      const { data, error } = await tempSupabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            intended_role: formData.role,
            company_name: profile.empresa_nome,
            // empresa_id será vinculado pelo trigger handle_new_user usando o company_name
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        // O trigger 'on_auth_user_created' no banco de dados cuidará 
        // de criar o perfil automaticamente na tabela 'public.perfis'
        
        if (!data.session) {
          alert('✅ Colaborador cadastrado! Ele deve verificar o e-mail para confirmar a conta antes de acessar.');
        } else {
          alert('✅ Colaborador cadastrado com sucesso!');
        }
        setFormData({ email: '', password: '', role: 'tecnico', token: '' });
      }
    } catch (err: any) {
      handleError(err, 'Cadastro de Colaborador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-hardware p-8 space-y-8">
        <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
          <div className="bg-[var(--primary)]/10 p-3 rounded-xl text-[var(--primary)]">
            <UserPlus size={24} />
          </div>
          <div>
            <h3 className="text-[var(--primary)] text-xl font-black tracking-widest uppercase">NOVO COLABORADOR</h3>
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mt-1">Adicione membros à sua equipe</p>
          </div>
        </div>

        <form onSubmit={handleAddStaff} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">E-mail de Acesso</label>
            <input 
              type="email" 
              placeholder="colaborador@email.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="input-hardware"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Senha Provisória</label>
            <input 
              type="password" 
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="input-hardware"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Cargo / Permissão</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="input-hardware"
              >
                <option value="tecnico">Técnico (Operacional)</option>
                <option value="cliente">Cliente (Consulta)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-1">
                Token de Segurança
                <ShieldCheck size={12} className="text-[var(--primary)]" />
              </label>
              <input 
                type="password" 
                placeholder="Téc: 20 | Cli: 30"
                value={formData.token}
                onChange={e => setFormData({ ...formData, token: e.target.value })}
                className="input-hardware border-[var(--primary)]/30"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full btn-hardware-primary mt-4"
          >
            {loading ? 'CADASTRANDO...' : 'CADASTRAR COLABORADOR'}
          </button>
        </form>
      </div>
    </div>
  );
}
