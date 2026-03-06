import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { handleError } from '../lib/utils';

interface AuthProps {
  onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    empresa: '',
    token: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (formData.token !== '10') throw new Error('Token de segurança inválido');
        if (!formData.empresa) throw new Error('Nome da empresa é obrigatório');

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.nome.trim(),
              role: 'admin',
              intended_role: 'admin',
              company_name: formData.empresa
            }
          }
        });

        if (authError) {
          console.error("Supabase signUp error details:", authError);
          throw authError;
        }

        // Se não houver sessão imediata (confirmação de e-mail ativa)
        if (authData.user && !authData.session) {
          alert('✅ Cadastro pré-aprovado! Verifique seu e-mail (e a pasta de Spam) para confirmar sua conta antes de entrar.');
          setIsRegister(false);
          setLoading(false);
          return;
        }

        // Se já tiver sessão, o App.tsx cuidará de criar o perfil no loadProfile
        alert('✅ Empresa cadastrada com sucesso!');
        setIsRegister(false);
        onLogin();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password
        });
        if (error) {
          console.error("Supabase signIn error details:", error);
          if (error.message === 'Invalid login credentials') {
            throw new Error('E-mail ou senha incorretos. Verifique seus dados ou se sua conta já foi confirmada por e-mail.');
          }
          throw error;
        }
        onLogin();
      }
    } catch (error: any) {
      console.error("Full auth error object:", error);
      handleError(error, isRegister ? 'Cadastro de Empresa' : 'Login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-body)] flex items-center justify-center p-6 overflow-y-auto">
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 blur-[120px] rounded-full opacity-30" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-hardware p-10 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex flex-col items-center mb-4">
            <span className="text-[var(--primary)] font-black text-4xl tracking-[0.2em] leading-none">VERTICAL</span>
            <span className="text-[var(--text-muted)] text-xs font-black tracking-[0.5em] mt-2">LOCAÇÕES</span>
          </div>
          <div className="h-1 w-12 bg-[var(--primary)] mx-auto rounded-full" />
        </div>

        <h2 className="text-[var(--text-main)] text-sm font-black text-center mb-8 tracking-[0.2em] uppercase opacity-80">
          {isRegister ? 'CADASTRO DE EMPRESA' : 'ACESSO AO SISTEMA'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegister && (
            <>
              <div className="space-y-1.5">
                <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Seu Nome</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  className="input-hardware"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Nome da Empresa</label>
                <input
                  type="text"
                  placeholder="Ex: Oficina Smart"
                  className="input-hardware"
                  value={formData.empresa}
                  onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              className="input-hardware"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              className="input-hardware"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Token de Segurança (Dica: 10)</label>
              <input
                type="text"
                placeholder="Digite 10"
                className="input-hardware border-[var(--primary)]/30"
                value={formData.token}
                onChange={e => setFormData({ ...formData, token: e.target.value })}
                required
              />
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full btn-hardware-primary mt-4"
          >
            {loading ? 'PROCESSANDO...' : isRegister ? 'CADASTRAR EMPRESA' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-8 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--primary)] transition-colors"
        >
          {isRegister ? 'Já possui cadastro? Faça Login' : 'Não tem conta? Cadastrar Empresa'}
        </button>
      </motion.div>
    </div>
  );
}
