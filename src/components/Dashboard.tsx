import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Servico, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  cloudData: Servico[];
  profile: UserProfile | null;
  userEmail: string;
}

export function Dashboard({ cloudData, profile, userEmail }: DashboardProps) {
  const [techFilter, setTechFilter] = useState('todos');

  const techs = useMemo(() => {
    const uniqueTechs = new Map();
    cloudData.forEach(i => {
      if (i.tecnico && i.tecnico_perfil) {
        uniqueTechs.set(i.tecnico, i.tecnico_perfil.nome || i.tecnico_perfil.empresa_nome || i.tecnico);
      }
    });
    return Array.from(uniqueTechs.entries()).map(([id, name]) => ({ id, name }));
  }, [cloudData]);

  const filteredData = useMemo(() => {
    // Se for técnico, vê apenas o dele
    if (profile?.role === 'tecnico') {
      return cloudData.filter(i => i.tecnico === profile.id);
    }
    
    // Se for admin, usa o filtro selecionado
    if (techFilter === 'todos') return cloudData;
    return cloudData.filter(i => i.tecnico === techFilter);
  }, [cloudData, techFilter, profile]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const faturamento = filteredData.reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const horas = filteredData.reduce((acc, curr) => acc + (curr.horas || 0), 0);
    return { total, faturamento, horas };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    filteredData.forEach(i => {
      const date = i.created_at ? formatDate(i.created_at) : 'N/A';
      days[date] = (days[date] || 0) + 1;
    });

    const labels = Object.keys(days).reverse();
    const values = labels.map(l => days[l]);

    return {
      labels,
      datasets: [
        {
          label: 'Serviços por Dia',
          data: values,
          borderColor: '#ffcc00',
          backgroundColor: 'rgba(255, 204, 0, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [filteredData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-muted)' }
      },
      y: {
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--text-muted)' }
      }
    },
    plugins: {
      legend: {
        labels: { color: 'var(--text-muted)', font: { weight: 'bold' as const } }
      }
    }
  };

  return (
    <div className="space-y-6">
      {profile?.role === 'admin' && (
        <div className="card-hardware p-4">
          <div className="flex-1">
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
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiBox label="Serviços Realizados" value={kpis.total.toString()} />
        <KpiBox label="Faturamento Total" value={formatCurrency(kpis.faturamento)} />
        <KpiBox label="Horas Trabalhadas" value={`${kpis.horas.toFixed(1)}h`} />
      </div>

      <div className="card-hardware p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[var(--primary)] rounded-full" />
          <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-sm">Volume de Serviços</h3>
        </div>
        <div className="h-[350px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-hardware p-8 text-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)] opacity-20 group-hover:opacity-100 transition-opacity" />
      <div className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-[0.2em] mb-3">{label}</div>
      <div className="text-4xl font-black text-[var(--primary)] font-mono tracking-tighter">{value}</div>
    </div>
  );
}
