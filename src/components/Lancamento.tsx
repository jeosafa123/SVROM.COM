import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Camera, Save, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Servico, UserProfile } from '../types';
import { MAQUINAS } from '../constants/maquinas';
import { createWorker } from 'tesseract.js';
import { cn, formatCurrency, handleError } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface LancamentoProps {
  profile: UserProfile | null;
  userEmail: string;
  localData: Servico[];
  setLocalData: (data: Servico[]) => void;
  onNavigateToNuvem: () => void;
}

export function Lancamento({ profile, userEmail, localData, setLocalData, onNavigateToNuvem }: LancamentoProps) {
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isIdent, setIsIdent] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    om: '',
    patrimonio: '',
    equipamento: '',
    horas: '',
    valor: '',
    inicio: '',
    fim: ''
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedStart = localStorage.getItem('t_start');
    if (savedStart) {
      setTimerActive(true);
      const start = new Date(savedStart).getTime();
      const now = new Date().getTime();
      setTimerSeconds(Math.floor((now - start) / 1000));
      
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimerToggle = () => {
    if (!timerActive) {
      const now = new Date();
      localStorage.setItem('t_start', now.toISOString());
      setTimerActive(true);
      setTimerSeconds(0);
      
      const off = now.getTimezoneOffset() * 60000;
      setFormData(prev => ({
        ...prev,
        inicio: new Date(now.getTime() - off).toISOString().slice(0, 16)
      }));

      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerActive(false);
      
      const start = new Date(localStorage.getItem('t_start')!);
      const now = new Date();
      const hrs = (now.getTime() - start.getTime()) / 3600000;
      
      const off = now.getTimezoneOffset() * 60000;
      setFormData(prev => ({
        ...prev,
        horas: Math.max(0, hrs).toFixed(2),
        fim: new Date(now.getTime() - off).toISOString().slice(0, 16)
      }));
      
      localStorage.removeItem('t_start');
      autoFill(formData.equipamento, Math.max(0, hrs));
    }
  };

  const autoFill = (equipNome: string, currentHoras?: number) => {
    const m = MAQUINAS.find(x => x.nome === equipNome);
    if (m) {
      let v = m.valor;
      if (isIdent) v = v * 1.5;
      
      setFormData(prev => ({
        ...prev,
        equipamento: equipNome,
        horas: prev.horas || m.horas.toString(),
        valor: v.toFixed(2)
      }));
    }
  };

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const worker = await createWorker('por');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Improved regex based on HTML source
      const omMatch = text.match(/OM\s*N[º°]?\s*(\d+)/i);
      const patMatch = text.match(/Patrim[oô]nio[:\s]*([A-Z0-9]+)/i);

      setFormData(prev => ({
        ...prev,
        om: omMatch ? omMatch[1] : (prev.om || ''),
        patrimonio: patMatch ? patMatch[1] : (prev.patrimonio || '')
      }));

      if (!omMatch && !patMatch) {
        // Fallback to generic number search if specific labels not found
        const genericMatches = text.match(/\d{4,}/g);
        if (genericMatches && genericMatches.length > 0) {
          setFormData(prev => ({ ...prev, om: genericMatches[0] }));
        } else {
          alert('Nenhum dado claro (OM/Patrimônio) encontrado na imagem.');
        }
      }
    } catch (err) {
      handleError(err, 'Processamento OCR');
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (!profile?.empresa_id) {
      return alert('⚠️ Erro de Perfil: Empresa não identificada. Por favor, saia e entre novamente.');
    }
    if (!formData.om) return alert('OM é obrigatória');
    if (!formData.equipamento) return alert('Selecione um equipamento');
    if (!formData.horas || parseFloat(formData.horas) <= 0) return alert('Horas inválidas');
    
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    const m = MAQUINAS.find(x => x.nome === formData.equipamento);
    const valorBase = m?.valor || parseFloat(formData.valor) || 0;
    const valorFinal = isIdent ? valorBase * 1.5 : valorBase;

    const newItem: Servico = {
      empresa_id: profile?.empresa_id || null,
      tecnico: profile?.id || 'offline',
      om: formData.om,
      patrimonio: formData.patrimonio || 'S/N',
      equipamento: formData.equipamento,
      horas: parseFloat(formData.horas),
      valor: valorFinal,
      valor_base: valorBase,
      identificacao: isIdent,
      data_inicio: formData.inicio,
      data_fim: formData.fim,
      data: new Date().toLocaleDateString('pt-BR'),
      created_at: new Date().toISOString()
    };

    setSaving(true);
    try {
      // Tenta salvar diretamente na nuvem
      const { error } = await supabase.from('servicos').insert({
        empresa_id: newItem.empresa_id,
        tecnico: newItem.tecnico,
        om: newItem.om,
        patrimonio: newItem.patrimonio,
        equipamento: newItem.equipamento,
        horas: newItem.horas,
        valor: newItem.valor,
        identificacao: newItem.identificacao,
        data_inicio: newItem.data_inicio,
        data_fim: newItem.data_fim,
        status: 'concluido',
        created_at: newItem.created_at
      });

      if (error) throw error;
      
      alert('✅ Serviço sincronizado com a nuvem!');
    } catch (err) {
      console.log('Salvando localmente devido a erro ou falta de conexão');
      setLocalData([newItem, ...localData]);
      alert('⚠️ Salvo localmente (sem conexão). Sincronize mais tarde.');
    } finally {
      setSaving(false);
      setShowConfirm(false);
      setFormData({
        om: '',
        patrimonio: '',
        equipamento: '',
        horas: '',
        valor: '',
        inicio: '',
        fim: ''
      });
      setIsIdent(false);
    }
  };

  const handleIdentToggle = () => {
    const nextIdent = !isIdent;
    setIsIdent(nextIdent);
    
    // Recalcular valor se houver equipamento selecionado
    const m = MAQUINAS.find(x => x.nome === formData.equipamento);
    if (m) {
      let v = m.valor;
      if (nextIdent) v = v * 1.5;
      setFormData(prev => ({ ...prev, valor: v.toFixed(2) }));
    }
  };

  return (
    <div className="space-y-6">
      {localData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--bg-card)] border border-[var(--warning)] p-4 rounded-xl flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3 text-[var(--warning)]">
            <AlertTriangle size={20} />
            <span className="font-bold text-sm">
              Você tem <strong>{localData.length}</strong> itens pendentes para sincronizar.
            </span>
          </div>
          <button 
            onClick={onNavigateToNuvem}
            className="bg-[var(--warning)] text-black px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider hover:brightness-110"
          >
            SINCRONIZAR
          </button>
        </motion.div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--success)] p-6 rounded-2xl shadow-xl text-center">
        {!timerActive ? (
          <button 
            onClick={handleTimerToggle}
            className="w-full bg-[var(--success)] text-white font-black py-4 rounded-xl uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all"
          >
            <Play size={24} fill="currentColor" />
            INICIAR SERVIÇO
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-5xl font-black text-[var(--success)] font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]">
              {formatTimer(timerSeconds)}
            </div>
            <button 
              onClick={handleTimerToggle}
              className="w-full bg-[var(--danger)] text-white font-black py-4 rounded-xl uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all"
            >
              <Square size={24} fill="currentColor" />
              FINALIZAR
            </button>
          </div>
        )}
      </div>

      <div className="card-hardware p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Início</label>
            <input 
              type="datetime-local" 
              value={formData.inicio}
              onChange={e => setFormData({ ...formData, inicio: e.target.value })}
              className="input-hardware text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Fim</label>
            <input 
              type="datetime-local" 
              value={formData.fim}
              onChange={e => setFormData({ ...formData, fim: e.target.value })}
              className="input-hardware text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">OM</label>
            <input 
              type="text" 
              placeholder="Nº da OM"
              value={formData.om}
              onChange={e => setFormData({ ...formData, om: e.target.value })}
              className="input-hardware font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Patrimônio</label>
            <input 
              type="text" 
              placeholder="Nº patrimônio"
              value={formData.patrimonio}
              onChange={e => setFormData({ ...formData, patrimonio: e.target.value })}
              className="input-hardware font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Equipamento</label>
          <select 
            value={formData.equipamento}
            onChange={e => autoFill(e.target.value)}
            className="input-hardware"
          >
            <option value="">Selecione o equipamento...</option>
            {MAQUINAS.map(m => (
              <option key={m.nome} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleIdentToggle}
          className={cn(
            "w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all border-2",
            isIdent 
              ? "bg-[var(--primary)] text-black border-[var(--primary)] shadow-[0_0_20px_rgba(255,204,0,0.3)]" 
              : "bg-transparent text-[var(--primary)] border-[var(--primary)] hover:bg-[var(--primary)]/5"
          )}
        >
          {isIdent ? '✅ IDENTIFICAÇÃO ATIVA (+50%)' : '🔍 IDENTIFICAÇÃO (OFF)'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Horas</label>
            <input 
              type="number" 
              step="0.1"
              value={formData.horas}
              onChange={e => setFormData({ ...formData, horas: e.target.value })}
              className="input-hardware font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Valor R$</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.valor}
              onChange={e => setFormData({ ...formData, valor: e.target.value })}
              className="input-hardware font-mono text-[var(--primary)] font-bold"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <label className="flex-1 btn-hardware-outline cursor-pointer">
            <Camera size={20} />
            <span>{ocrLoading ? '...' : 'OCR'}</span>
            <input type="file" hidden accept="image/*" capture="environment" onChange={handleOcr} disabled={ocrLoading} />
          </label>
          <button 
            onClick={handleSave}
            className="flex-[2] btn-hardware-primary"
          >
            <Save size={20} />
            SALVAR SERVIÇO
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[var(--bg-card)] border border-[var(--primary)] p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-6"
            >
              <h3 className="text-[var(--primary)] text-xl font-black text-center tracking-widest uppercase">📋 CONFIRMAR SERVIÇO</h3>
              
              <div className="space-y-3">
                <ConfirmRow label="OM" value={formData.om} />
                <ConfirmRow label="Patrimônio" value={formData.patrimonio || 'S/N'} />
                <ConfirmRow label="Equipamento" value={formData.equipamento} />
                <ConfirmRow label="Horas" value={`${formData.horas}h`} />
                <ConfirmRow label="Valor Base" value={formatCurrency(MAQUINAS.find(x => x.nome === formData.equipamento)?.valor || 0)} />
                <ConfirmRow label="Identificação" value={isIdent ? 'SIM (+50%)' : 'NÃO'} />
                <div className="flex justify-between items-center pt-4 border-t-2 border-[var(--primary)]">
                  <span className="text-[var(--text-muted)] font-bold text-sm">VALOR FINAL</span>
                  <span className="text-[var(--success)] text-2xl font-black">{formatCurrency(parseFloat(formData.valor))}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 border border-[var(--danger)] text-[var(--danger)] font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-[var(--danger)] hover:text-white transition-all"
                >
                  CORRIGIR
                </button>
                <button 
                  onClick={confirmSave}
                  disabled={saving}
                  className="flex-1 bg-[var(--success)] text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'CONFIRMAR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-[var(--border)] py-2">
      <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-[var(--text-main)] font-black text-sm">{value}</span>
    </div>
  );
}
