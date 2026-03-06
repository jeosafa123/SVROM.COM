import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/utils';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function DeleteAccountModal({ isOpen, onClose, userEmail }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!password) return alert('Digite sua senha para confirmar.');
    
    setLoading(true);
    try {
      // Re-authenticate user to ensure they have permission to delete
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });

      if (signInError) throw new Error('Senha incorreta. Verifique e tente novamente.');

      // Call the RPC function we created in the migrations
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;

      alert('Sua conta foi excluída com sucesso.');
      localStorage.clear();
      window.location.reload();
    } catch (err: any) {
      handleError(err, 'Exclusão de Conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[var(--bg-card)] border border-[var(--danger)] p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="flex justify-center">
              <div className="bg-[var(--danger)]/10 p-4 rounded-full text-[var(--danger)]">
                <AlertTriangle size={48} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[var(--danger)] text-xl font-black tracking-widest uppercase">EXCLUIR CONTA</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Esta ação é <strong className="text-[var(--danger)]">IRREVERSÍVEL</strong>. Todos os seus dados e serviços serão removidos permanentemente.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Confirme sua senha</label>
              <input 
                type="password" 
                placeholder="Sua senha atual"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-hardware border-[var(--danger)]/30 focus:border-[var(--danger)]"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={onClose}
                className="flex-1 btn-hardware-outline"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-[var(--danger)] text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
              >
                <Trash2 size={18} />
                {loading ? 'EXCLUINDO...' : 'EXCLUIR'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
