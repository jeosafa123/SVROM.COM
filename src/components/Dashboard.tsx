import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Servico } from '../types';
import { TrendingUp, Clock, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  data: Servico[];
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const stats = useMemo(() => {
    const total = data.length;
    const faturamento = data
      .filter(s => s.status === 'Liberado' || s.status === 'Indenizado')
      .reduce((acc, s) => acc + parseFloat(s.valor || '0'), 0);
    
    const horas = data.reduce((acc, s) => acc + parseFloat(s.horas || '0'), 0);
    const pendentes = data.filter(s => !s.sincronizado).length;
    const sincronizados = data.filter(s => s.sincronizado).length;

    return { total, faturamento, horas, pendentes, sincronizados };
  }, [data]);

  const chartData = {
    labels: data.slice(-10).map(s => s.om),
    datasets: [
      {
        label: 'Valor (R$)',
        data: data.slice(-10).map(s => parseFloat(s.valor || '0')),
        backgroundColor: '#ffcc00',
        borderColor: '#ffcc00',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141414',
        titleColor: '#ffcc00',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#888' },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#888' },
      },
    },
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="brand-name">DASHBOARD</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full status-dot ${stats.pendentes > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-[0.65rem] font-black uppercase text-muted">
            {stats.pendentes > 0 ? 'Sincronização Pendente' : 'Sincronizado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={<FileText size={18} className="text-primary" />} 
          label="Total Ordens" 
          value={stats.total} 
        />
        <StatCard 
          icon={<TrendingUp size={18} className="text-success" />} 
          label="Faturamento" 
          value={`R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
        />
        <StatCard 
          icon={<Clock size={18} className="text-blue-400" />} 
          label="Horas Totais" 
          value={`${stats.horas.toFixed(1)}h`} 
        />
        <StatCard 
          icon={<AlertCircle size={18} className="text-danger" />} 
          label="Pendentes" 
          value={stats.pendentes} 
        />
      </div>

      <div className="card-hardware p-4 h-[250px]">
        <h3 className="text-[0.7rem] font-black uppercase text-muted mb-4 flex items-center gap-2">
          <TrendingUp size={14} /> Histórico Recente (Últimas 10 OMs)
        </h3>
        <div className="h-[180px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="card-hardware p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-500/10 p-2 rounded-lg">
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div>
            <p className="text-[0.65rem] font-black uppercase text-muted">Sincronizados</p>
            <p className="text-lg font-black">{stats.sincronizados}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-black uppercase text-muted">Status Geral</p>
          <p className={`text-[0.75rem] font-black ${stats.pendentes === 0 ? 'text-success' : 'text-danger'}`}>
            {stats.pendentes === 0 ? 'BANCO ATUALIZADO' : 'AGUARDANDO SYNC'}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="card-hardware p-3 flex flex-col justify-between">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[0.65rem] font-black uppercase text-muted">{label}</span>
      {icon}
    </div>
    <span className="text-lg font-black truncate">{value}</span>
  </div>
);
