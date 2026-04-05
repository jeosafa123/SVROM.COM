import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend as RechartsLegend
} from 'recharts';
import { Servico } from '../types';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Users, 
  Printer,
  Calendar,
  Filter
} from 'lucide-react';

interface DashboardProps {
  data: Servico[];
}

const COLORS = ['#F27D26', '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#eab308', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  const filteredData = useMemo(() => {
    const now = new Date();
    return data.filter(s => {
      const date = new Date(s.createdAt || s.dataAbertura);
      if (timeFilter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'quarter') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return date >= threeMonthsAgo;
      }
      if (timeFilter === 'year') {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [data, timeFilter]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const faturamento = filteredData
      .filter(s => s.status === 'Liberado' || s.status === 'Indenizado')
      .reduce((acc, s) => acc + parseFloat(s.valor || '0'), 0);
    
    const horas = filteredData.reduce((acc, s) => acc + parseFloat(s.horas || '0'), 0);
    const pendentes = filteredData.filter(s => s.status === 'Aberto').length;
    const concluidos = filteredData.filter(s => s.status !== 'Aberto').length;

    // Dados para Gráfico de Faturamento por Mês (sempre baseado no ano todo para contexto)
    const faturamentoPorMes = data.reduce((acc: any, s) => {
      const date = new Date(s.createdAt || s.dataAbertura);
      if (date.getFullYear() === new Date().getFullYear()) {
        const month = date.toLocaleString('pt-BR', { month: 'short' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += parseFloat(s.valor || '0');
      }
      return acc;
    }, {});

    const faturamentoData = Object.keys(faturamentoPorMes).map(month => ({
      name: month,
      valor: faturamentoPorMes[month]
    }));

    // Dados para Gráfico de Status
    const statusCounts = filteredData.reduce((acc: any, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status]
    }));

    // Ranking de Técnicos (Faturamento)
    const tecnicoPerformance = filteredData.reduce((acc: any, s) => {
      acc[s.tecnico] = (acc[s.tecnico] || 0) + parseFloat(s.valor || '0');
      return acc;
    }, {});

    const tecnicoData = Object.keys(tecnicoPerformance).map(tecnico => ({
      name: tecnico,
      valor: tecnicoPerformance[tecnico]
    })).sort((a, b) => b.valor - a.valor).slice(0, 5);

    // Faturamento por Equipamento
    const equipamentoPerformance = filteredData.reduce((acc: any, s) => {
      acc[s.maquina] = (acc[s.maquina] || 0) + parseFloat(s.valor || '0');
      return acc;
    }, {});

    const equipamentoData = Object.keys(equipamentoPerformance).map(equip => ({
      name: equip,
      valor: equipamentoPerformance[equip]
    })).sort((a, b) => b.valor - a.valor).slice(0, 5);

    return { 
      total, 
      faturamento, 
      horas, 
      pendentes, 
      concluidos,
      faturamentoData,
      statusData,
      tecnicoData,
      equipamentoData
    };
  }, [data, filteredData]);

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="brand-name">DASHBOARD</h1>
            <p className="text-[0.6rem] font-black uppercase text-muted tracking-widest">Analytics & Performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[0.6rem] font-black uppercase text-muted tracking-widest">Live</span>
          </div>
        </div>

        {/* Time Filter */}
        <div className="flex gap-1 bg-card-bg p-1 rounded-lg border border-line self-start">
          {(['month', 'quarter', 'year', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 text-[0.6rem] font-black uppercase rounded transition-all ${
                timeFilter === f ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-primary'
              }`}
            >
              {f === 'month' ? 'Mês' : f === 'quarter' ? 'Trim' : f === 'year' ? 'Ano' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* Mini Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={<TrendingUp size={18} className="text-primary" />} 
          label="Faturamento" 
          value={`R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          color="border-l-primary"
        />
        <StatCard 
          icon={<FileText size={18} className="text-green-400" />} 
          label="Total de OS" 
          value={stats.total} 
          color="border-l-green-500"
        />
        <StatCard 
          icon={<Clock size={18} className="text-blue-400" />} 
          label="Horas Oficina" 
          value={`${stats.horas.toFixed(1)}h`} 
          color="border-l-blue-500"
        />
        <StatCard 
          icon={<AlertCircle size={18} className="text-red-400" />} 
          label="OS em Aberto" 
          value={stats.pendentes} 
          color="border-l-red-500"
        />
      </div>

      {/* Faturamento Mensal Chart */}
      <div className="card-hardware p-4">
        <h3 className="text-[0.7rem] font-black uppercase text-muted mb-6 flex items-center gap-2">
          <Calendar size={14} /> Faturamento Mensal (Ano Atual)
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.faturamentoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#151619', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#F27D26', fontWeight: 'bold' }}
              />
              <Bar dataKey="valor" fill="#F27D26" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Status Distribution */}
        <div className="card-hardware p-4">
          <h3 className="text-[0.7rem] font-black uppercase text-muted mb-4 flex items-center gap-2">
            <Filter size={14} /> Distribuição de Status
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid #333', borderRadius: '8px' }}
                />
                <RechartsLegend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[0.6rem] font-black uppercase text-muted">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technician Ranking */}
        <div className="card-hardware p-4">
          <h3 className="text-[0.7rem] font-black uppercase text-muted mb-4 flex items-center gap-2">
            <Users size={14} /> Top 5 Técnicos (Faturamento)
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tecnicoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={80} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Bar dataKey="valor" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Ranking */}
        <div className="card-hardware p-4">
          <h3 className="text-[0.7rem] font-black uppercase text-muted mb-4 flex items-center gap-2">
            <Printer size={14} /> Top 5 Equipamentos (Faturamento)
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.equipamentoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={80} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="card-hardware p-4 flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Printer size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-[0.65rem] font-black uppercase text-muted">Patrimônios Ativos</p>
            <p className="text-lg font-black">{[...new Set(filteredData.map(s => s.patrimonio))].length}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-black uppercase text-muted">Eficiência Período</p>
          <p className="text-[0.75rem] font-black text-green-400">
            {stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(0) : 0}% CONCLUÍDO
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`card-hardware p-3 flex flex-col justify-between border-l-4 ${color}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[0.65rem] font-black uppercase text-muted">{label}</span>
      {icon}
    </div>
    <span className="text-lg font-black truncate">{value}</span>
  </div>
);
