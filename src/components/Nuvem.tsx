import React, { useState, useMemo } from 'react';
import { Cloud, FileSpreadsheet, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { Servico, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency, formatDate, handleError } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion } from 'framer-motion';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface NuvemProps {
  profile: UserProfile | null;
  userEmail: string;
  localData: Servico[];
  cloudData: Servico[];
  setLocalData: (data: Servico[]) => void;
  onRefresh: () => Promise<void>;
}

export function Nuvem({ profile, userEmail, localData, cloudData, setLocalData, onRefresh }: NuvemProps) {
  const [syncing, setSyncing] = useState(false);
  const [techFilter, setTechFilter] = useState('todos');

  const techs = useMemo(() => {
    const uniqueTechs = new Map();
    cloudData.forEach(i => {
      if (i.tecnico && i.tecnico_perfil) {
        uniqueTechs.set(i.tecnico, i.tecnico_perfil.empresa_nome || i.tecnico);
      }
    });
    return Array.from(uniqueTechs.entries()).map(([id, name]) => ({ id, name }));
  }, [cloudData]);

  const filteredCloudData = useMemo(() => {
    if (profile?.role === 'tecnico') {
      return cloudData.filter(i => i.tecnico === profile.id);
    }
    if (techFilter === 'todos') return cloudData;
    return cloudData.filter(i => i.tecnico === techFilter);
  }, [cloudData, techFilter, profile]);

  const filteredLocalData = useMemo(() => {
    if (profile?.role === 'tecnico') {
      return localData.filter(i => i.tecnico === profile.id);
    }
    if (techFilter === 'todos') return localData;
    return localData.filter(i => i.tecnico === techFilter);
  }, [localData, techFilter, profile]);

  const getTechName = (item: Servico) => {
    if (item.tecnico === profile?.id) return 'VOCÊ';
    return item.tecnico_perfil?.empresa_nome || item.tecnico?.split('-')[0] || '---';
  };

  const handleSync = async () => {
    if (localData.length === 0) {
      alert('Nenhum dado novo para sincronizar.');
      await onRefresh();
      return;
    }

    if (!profile?.empresa_id) {
      return alert('⚠️ Erro de Perfil: Empresa não identificada. Por favor, saia e entre novamente.');
    }

    setSyncing(true);
    try {
      const { error } = await supabase.from('servicos').insert(
        localData.map(i => ({
          empresa_id: profile.empresa_id,
          tecnico: i.tecnico,
          om: i.om,
          patrimonio: i.patrimonio,
          equipamento: i.equipamento,
          horas: i.horas,
          valor: i.valor,
          identificacao: i.identificacao,
          data_inicio: i.data_inicio,
          data_fim: i.data_fim,
          status: 'concluido',
          created_at: i.created_at || new Date().toISOString()
        }))
      );

      if (error) throw error;

      alert('Dados sincronizados com sucesso!');
      setLocalData([]);
      await onRefresh();
    } catch (err: any) {
      handleError(err, 'Sincronização de Dados');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    const allData = [...localData, ...cloudData];
    if (allData.length === 0) return alert('Nenhum dado para exportar');

    const exportData = allData.map(i => ({
      OM: i.om,
      Patrimônio: i.patrimonio,
      Equipamento: i.equipamento,
      Horas: i.horas,
      'Valor (R$)': i.valor,
      Identificação: i.identificacao ? 'SIM' : 'NÃO',
      Técnico: i.tecnico === profile?.id ? profile.empresa_nome : (i.tecnico_perfil?.empresa_nome || i.tecnico),
      Data: i.data || (i.created_at ? formatDate(i.created_at) : 'N/A')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Serviços');
    XLSX.writeFile(wb, `relatorio_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const allData = [...localData, ...cloudData];
    if (allData.length === 0) return alert('Nenhum dado para exportar');

    const doc = new jsPDF();
    
    // Add Branding
    doc.setFontSize(22);
    doc.setTextColor(255, 204, 0); // #ffcc00
    doc.text('VERTICAL LOCAÇÕES', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Relatório de Oficina Smart - v20.11', 14, 30);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 37);

    const tableBody = allData.map(i => [
      i.data || (i.created_at ? formatDate(i.created_at) : 'N/A'),
      i.om,
      i.patrimonio || 'S/N',
      i.equipamento,
      i.tecnico === profile?.id ? (profile.empresa_nome || 'VOCÊ') : (i.tecnico_perfil?.empresa_nome || '---'),
      formatCurrency(i.valor)
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Data', 'OM', 'Patr.', 'Equipamento', 'Técnico', 'Valor']],
      body: tableBody,
      headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45 },
      theme: 'striped'
    });

    doc.save(`relatorio_vertical_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="card-hardware p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {profile?.role === 'admin' && (
            <div className="w-full md:w-64">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-1 block">Filtrar Técnico</label>
              <select 
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="input-hardware py-2.5"
              >
                <option value="todos">Todos os Técnicos</option>
                {techs.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 md:flex-none bg-[#3b82f6] text-white font-black px-6 py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_10px_20px_rgba(59,130,246,0.2)]"
            >
              <Cloud size={18} />
              {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
            </button>
            <button 
              onClick={handleExport}
              className="flex-1 md:flex-none bg-[var(--success)] text-white font-black px-6 py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)]"
            >
              <FileSpreadsheet size={18} />
              EXCEL
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex-1 md:flex-none bg-[#ef4444] text-white font-black px-6 py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
            >
              <FileText size={18} />
              PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-[var(--border)] rounded-xl bg-black/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="p-5 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">Data</th>
                <th className="p-5 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">OM</th>
                <th className="p-5 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">Técnico</th>
                <th className="p-5 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">Máquina</th>
                <th className="p-5 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {/* Local Data (Pending) */}
              {filteredLocalData.length > 0 && (
                <>
                  <tr className="bg-[var(--warning)]/10">
                    <td colSpan={5} className="p-3 text-center text-[var(--warning)] text-[10px] font-black uppercase tracking-[0.3em] border-y border-[var(--warning)]/20">
                      ⏳ PENDENTES DE SINCRONIZAÇÃO ({filteredLocalData.length})
                    </td>
                  </tr>
                  {filteredLocalData.map((item, idx) => (
                    <tr key={`local-${idx}`} className="bg-[var(--warning)]/5 hover:bg-[var(--warning)]/10 transition-colors">
                      <td className="p-5 text-xs font-mono text-[var(--text-main)]">{item.data}</td>
                      <td className="p-5 text-xs font-black text-[var(--text-main)] tracking-wider">{item.om}</td>
                      <td className="p-5 text-xs text-[var(--text-muted)] font-bold uppercase">{getTechName(item)} <span className="text-[10px] opacity-50">(LOCAL)</span></td>
                      <td className="p-5 text-xs text-[var(--text-muted)]">{item.equipamento}</td>
                      <td className="p-5 text-sm font-black text-[var(--primary)] font-mono">{formatCurrency(item.valor)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Cloud Data */}
              {filteredCloudData.length > 0 ? (
                filteredCloudData.map((item, idx) => (
                  <tr key={`cloud-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="p-5 text-xs text-[var(--text-muted)] font-mono">
                      {item.created_at ? formatDate(item.created_at) : 'N/A'}
                    </td>
                    <td className="p-5 text-xs font-black text-[var(--text-main)] tracking-wider group-hover:text-[var(--primary)] transition-colors">{item.om}</td>
                    <td className="p-5 text-xs text-[var(--text-muted)] font-bold uppercase">{getTechName(item)}</td>
                    <td className="p-5 text-xs text-[var(--text-muted)]">{item.equipamento}</td>
                    <td className="p-5 text-sm font-black text-[var(--primary)] font-mono">{formatCurrency(item.valor)}</td>
                  </tr>
                ))
              ) : (
                filteredLocalData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-[var(--text-muted)] text-xs font-black uppercase tracking-widest opacity-30">
                      Nenhum registro encontrado no sistema.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
