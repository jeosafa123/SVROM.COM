import React, { useState, useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { Servico } from '../types';
import { TABELA_PRECOS } from '../constants';
import { 
  Play, 
  Square, 
  Camera, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  Hash 
} from 'lucide-react';

interface LancamentoProps {
  onSave: (servico: Servico) => void;
  tecnico: string;
}

export const Lancamento: React.FC<LancamentoProps> = ({ onSave, tecnico }) => {
  const [om, setOm] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [maquina, setMaquina] = useState(TABELA_PRECOS[0].nome);
  const [horas, setHoras] = useState(TABELA_PRECOS[0].horas.toString());
  const [valor, setValor] = useState(TABELA_PRECOS[0].valor.toString());
  const [dataAbertura, setDataAbertura] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrega, setDataEntrega] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Aberto' | 'Liberado' | 'Indenizado'>('Aberto');
  const [indenizacao, setIndenizacao] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMaquinaChange = (nome: string) => {
    const selected = TABELA_PRECOS.find(m => m.nome === nome);
    if (selected) {
      setMaquina(nome);
      setHoras(selected.horas.toString());
      setValor(selected.valor.toString());
      setIsIdentifying(false);
    }
  };

  const toggleIdentificacao = () => {
    const selected = TABELA_PRECOS.find(m => m.nome === maquina);
    if (selected) {
      if (!isIdentifying) {
        setValor((selected.valor * 1.5).toFixed(2));
        setHoras((selected.horas * 1.5).toFixed(2));
      } else {
        setValor(selected.valor.toString());
        setHoras(selected.horas.toString());
      }
      setIsIdentifying(!isIdentifying);
    }
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const worker = await createWorker('por');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Simple regex to find OM numbers (usually digits)
      const match = text.match(/\d{4,8}/);
      if (match) {
        setOm(match[0]);
      } else {
        alert('Não foi possível identificar o número da OM na imagem.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Erro ao processar imagem.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!om || !patrimonio) {
      alert('Preencha OM e Patrimônio!');
      return;
    }

    if (confirm(`Deseja salvar o serviço OM ${om}?`)) {
      const novoServico: Servico = {
        id: Date.now().toString(),
        om,
        patrimonio,
        maquina,
        horas,
        valor,
        dataAbertura,
        dataEntrega,
        status,
        indenizacao,
        tecnico,
        sincronizado: false,
        createdAt: new Date().toISOString()
      };
      onSave(novoServico);
      
      // Reset form
      setOm('');
      setPatrimonio('');
      setSeconds(0);
      setTimerActive(false);
      setIsIdentifying(false);
    }
  };

  const stopTimerAndFill = () => {
    setTimerActive(false);
    const h = (seconds / 3600).toFixed(2);
    setHoras(h);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="brand-name">LANÇAMENTO</h1>

      {/* Timer Card */}
      <div className="card-hardware p-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-muted uppercase font-black text-[0.7rem]">
          <Clock size={14} /> Cronômetro de Serviço
        </div>
        <div className="timer-display text-4xl font-black text-primary">
          {formatTime(seconds)}
        </div>
        <div className="flex gap-3 w-full">
          {!timerActive ? (
            <button 
              onClick={() => setTimerActive(true)}
              className="btn-primary flex-1 bg-green-500 text-white"
            >
              <Play size={16} /> Iniciar
            </button>
          ) : (
            <button 
              onClick={stopTimerAndFill}
              className="btn-primary flex-1 bg-red-500 text-white"
            >
              <Square size={16} /> Parar e Preencher
            </button>
          )}
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="card-hardware p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted flex items-center gap-1">
              <Hash size={10} /> OM
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={om} 
                onChange={e => setOm(e.target.value)}
                className="input-hardware input-om-highlight" 
                placeholder="0000"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleOCR} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted flex items-center gap-1">
              <FileText size={10} /> Patrimônio
            </label>
            <input 
              type="text" 
              value={patrimonio} 
              onChange={e => setPatrimonio(e.target.value)}
              className="input-hardware" 
              placeholder="P000"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[0.65rem] font-black uppercase text-muted">Máquina / Equipamento</label>
          <select 
            value={maquina} 
            onChange={e => handleMaquinaChange(e.target.value)}
            className="input-hardware"
          >
            {TABELA_PRECOS.map(m => (
              <option key={m.nome} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted">Horas</label>
            <input 
              type="number" 
              step="0.01"
              value={horas} 
              onChange={e => setHoras(e.target.value)}
              className="input-hardware" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={valor} 
              onChange={e => setValor(e.target.value)}
              className="input-hardware" 
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
          <input 
            type="checkbox" 
            id="identificacao" 
            checked={isIdentifying}
            onChange={toggleIdentificacao}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="identificacao" className="text-[0.7rem] font-black uppercase text-primary">
            Adicionar Identificação (+50%)
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted">Abertura</label>
            <input 
              type="date" 
              value={dataAbertura} 
              onChange={e => setDataAbertura(e.target.value)}
              className="input-hardware" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted">Entrega</label>
            <input 
              type="date" 
              value={dataEntrega} 
              onChange={e => setDataEntrega(e.target.value)}
              className="input-hardware" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[0.65rem] font-black uppercase text-muted">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value as any)}
              className="input-hardware"
            >
              <option value="Aberto">Aberto</option>
              <option value="Liberado">Liberado</option>
              <option value="Indenizado">Indenizado</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input 
              type="checkbox" 
              id="indenizacao" 
              checked={indenizacao}
              onChange={e => setIndenizacao(e.target.checked)}
              className="w-4 h-4 accent-danger"
            />
            <label htmlFor="indenizacao" className="text-[0.7rem] font-black uppercase text-danger">
              Indenização
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mt-4">
          <Save size={18} /> Salvar Serviço
        </button>
      </form>

      {ocrLoading && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-black uppercase tracking-widest">Processando OCR...</p>
        </div>
      )}
    </div>
  );
};
