import React, { useState, useMemo } from 'react';
import { Servico } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

interface ListaProps {
  data: Servico[];
  onDelete: (id: string) => void;
  onEdit: (servico: Servico) => void;
  onSync: (ids: string[]) => void;
}

export const Lista: React.FC<ListaProps> = ({ data, onDelete, onEdit, onSync }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter(s => {
      const matchesSearch = s.om.includes(searchTerm) || s.patrimonio.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = monthFilter ? s.dataAbertura.startsWith(monthFilter) : true;
      return matchesSearch && matchesMonth;
    });
  }, [data, searchTerm, monthFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(s => ({
      OM: s.om,
      Patrimônio: s.patrimonio,
      Máquina: s.maquina,
      Horas: s.horas,
      Valor: s.valor,
      Abertura: s.dataAbertura,
      Entrega: s.dataEntrega,
      Status: s.status,
      Técnico: s.tecnico,
      Sincronizado: s.sincronizado ? 'Sim' : 'Não'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Serviços");
    XLSX.writeFile(wb, `Oficina_Smart_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Serviços - Oficina Smart", 14, 15);
    
    const tableData = filteredData.map(s => [
      s.om, 
      s.patrimonio, 
      s.maquina, 
      s.horas, 
      `R$ ${s.valor}`, 
      s.status
    ]);

    (doc as any).autoTable({
      head: [['OM', 'Patrimônio', 'Máquina', 'Horas', 'Valor', 'Status']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0] }
    });

    doc.save(`Oficina_Smart_Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSyncSelected = () => {
    const toSync = selectedIds.filter(id => {
      const item = data.find(s => s.id === id);
      return item && !item.sincronizado;
    });
    if (toSync.length > 0) {
      onSync(toSync);
      setSelectedIds([]);
    } else {
      alert('Selecione itens não sincronizados para enviar.');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="brand-name">LISTA DE SERVIÇOS</h1>

      {/* Filters */}
      <div className="card-hardware p-3 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Buscar por OM ou Patrimônio..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-hardware pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="month" 
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="input-hardware pl-10 text-[0.75rem]"
            />
          </div>
          <button 
            onClick={() => {setSearchTerm(''); setMonthFilter('');}}
            className="btn-primary bg-white/10 text-white px-4"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-primary bg-green-600 text-white p-2">
            <FileSpreadsheet size={18} />
          </button>
          <button onClick={handleExportPDF} className="btn-primary bg-red-600 text-white p-2">
            <FileText size={18} />
          </button>
        </div>
        <button 
          onClick={handleSyncSelected}
          disabled={selectedIds.length === 0}
          className={`btn-primary flex-1 ${selectedIds.length === 0 ? 'opacity-50 grayscale' : ''}`}
        >
          <RefreshCw size={18} /> Sincronizar ({selectedIds.length})
        </button>
      </div>

      {/* Table */}
      <div className="card-hardware overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#141414] z-10 border-b border-white/10">
              <tr>
                <th className="p-3 w-10">
                  <input 
                    type="checkbox" 
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(filteredData.map(s => s.id));
                      else setSelectedIds([]);
                    }}
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    className="accent-primary"
                  />
                </th>
                <th className="p-3 text-[0.6rem] font-black uppercase text-muted">OM / Patr.</th>
                <th className="p-3 text-[0.6rem] font-black uppercase text-muted">Máquina</th>
                <th className="p-3 text-[0.6rem] font-black uppercase text-muted">Valor</th>
                <th className="p-3 text-[0.6rem] font-black uppercase text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted italic text-sm">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map(s => (
                  <tr 
                    key={s.id} 
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${s.sincronizado ? 'sincronizado' : 'pendente'}`}
                  >
                    <td className="p-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="accent-primary"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-black text-primary text-[0.85rem]">{s.om}</div>
                      <div className="text-[0.65rem] text-muted font-bold">{s.patrimonio}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-[0.75rem] font-bold truncate max-w-[80px]">{s.maquina}</div>
                      <div className="text-[0.6rem] text-muted">{s.horas}h</div>
                    </td>
                    <td className="p-3">
                      <div className="text-[0.75rem] font-black">R$ {parseFloat(s.valor).toFixed(0)}</div>
                      <div className={`text-[0.55rem] font-black uppercase ${s.status === 'Aberto' ? 'text-yellow-500' : 'text-success'}`}>
                        {s.status}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit(s)}
                          className="text-primary hover:scale-110 transition-transform"
                        >
                          <Edit3 size={16} />
                        </button>
                        {!s.sincronizado && (
                          <button 
                            onClick={() => onDelete(s.id)}
                            className="text-danger hover:scale-110 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {s.sincronizado ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : (
                          <AlertCircle size={16} className="text-danger animate-pulse" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-[0.65rem] font-black uppercase text-muted px-2">
        <span>Total: {filteredData.length} registros</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-success rounded-full" /> Sinc.</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-danger rounded-full" /> Pend.</span>
        </div>
      </div>
    </div>
  );
};
