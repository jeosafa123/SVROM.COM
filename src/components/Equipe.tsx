import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Users, Mail, Shield, User } from 'lucide-react';
import { UserProfile } from '../types';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/utils';

// Cliente temporário para cadastro sem deslogar o admin
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface EquipeProps {
  profile: UserProfile | null;
}

export function Equipe({ profile }: EquipeProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'tecnico',
    token: ''
  });

  useEffect(() => {
    fetchTeam();
  }, [profile]);

  const fetchTeam = async () => {
    if (!profile?.empresa_id || profile.role !== 'admin') return;
    
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setTeam(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return alert('Acesso negado');
    if (!profile?.empresa_nome) return alert('⚠️ Erro: Sua conta não está vinculada a uma empresa. Não é possível cadastrar colaboradores.');

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
            full_name: formData.nome.trim(),
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
        setFormData({ nome: '', email: '', password: '', role: 'tecnico', token: '' });
        fetchTeam(); // Atualiza a lista
      }
    } catch (err: any) {
      handleError(err, 'Cadastro de Colaborador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
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
          {/* ... existing form fields ... */}
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" 
              placeholder="Nome do colaborador"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              className="input-hardware"
              required
            />
          </div>

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

      {/* Lista da Equipe */}
      <div className="card-hardware p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
          <div className="bg-[var(--primary)]/10 p-3 rounded-xl text-[var(--primary)]">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-[var(--primary)] text-xl font-black tracking-widest uppercase">EQUIPE ATUAL</h3>
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mt-1">Gerencie os membros da sua empresa</p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : team.length > 0 ? (
          <div className="grid gap-4">
            {team.map((member) => (
              <div 
                key={member.id} 
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-[var(--primary)]/30 transition-all gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--primary)]/5 p-3 rounded-full text-[var(--primary)]">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="text-[var(--text-main)] font-black uppercase tracking-widest text-sm">
                      {member.nome || 'Sem Nome'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield size={12} className="text-[var(--primary)]" />
                      <span className="text-[var(--primary)] text-[10px] font-black uppercase tracking-widest">
                        {member.role === 'admin' ? 'ADMINISTRADOR' : member.role === 'tecnico' ? 'TÉCNICO' : 'CLIENTE'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:border-l md:border-white/10 md:pl-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">
                      <Mail size={12} />
                      ID DO USUÁRIO
                    </div>
                    <div className="text-[var(--text-muted)] text-[10px] font-mono mt-1 opacity-50">
                      {member.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs font-black uppercase tracking-widest opacity-30">
            Nenhum colaborador cadastrado além de você.
          </div>
        )}
      </div>
    </div>
  );
}
