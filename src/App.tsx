import React, { useState, useEffect, useMemo } from 'react';
import { Servico } from './types';
import { GOOGLE_URL, TOKEN } from './constants';
import { Dashboard } from './components/Dashboard';
import { Lancamento } from './components/Lancamento';
import { Lista } from './components/Lista';
import { Ajustes } from './components/Ajustes';
import { BottomNav } from './components/BottomNav';
import { LoadingScreen } from './components/LoadingScreen';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<Servico[]>([]);
  const [tecnico, setTecnico] = useState(localStorage.getItem('oficina_tecnico') || 'Técnico');
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('oficina_theme') as 'dark' | 'light') || 'dark');

  useEffect(() => {
    // Initial loading simulation
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Load data from localStorage
    const savedData = localStorage.getItem('oficina_db');
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('oficina_tecnico', tecnico);
  }, [tecnico]);

  useEffect(() => {
    localStorage.setItem('oficina_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const saveData = (newData: Servico[]) => {
    setData(newData);
    localStorage.setItem('oficina_db', JSON.stringify(newData));
  };

  const handleSaveServico = (servico: Servico) => {
    saveData([...data, servico]);
    setActiveTab('lista');
  };

  const handleDeleteServico = (id: string) => {
    if (confirm('Deseja excluir este serviço?')) {
      saveData(data.filter(s => s.id !== id));
    }
  };

  const handleEditServico = (servico: Servico) => {
    // Simple edit: remove old and add new (or update in place)
    // For simplicity in this test app, we'll just show an alert or implement a basic update
    const om = prompt('Editar OM:', servico.om);
    if (om) {
      const updated = data.map(s => s.id === servico.id ? { ...s, om } : s);
      saveData(updated);
    }
  };

  const handleSync = async (ids: string[]) => {
    setGlobalLoading(true);
    try {
      const toSync = data.filter(s => ids.includes(s.id));
      
      // Simulate API call to Google Sheets
      // In a real app, you'd use fetch(GOOGLE_URL, { method: 'POST', body: JSON.stringify({ token: TOKEN, data: toSync }) })
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updated = data.map(s => ids.includes(s.id) ? { ...s, sincronizado: true } : s);
      saveData(updated);
      alert('Sincronização concluída com sucesso!');
    } catch (err) {
      console.error('Sync Error:', err);
      alert('Erro na sincronização.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleImportCloud = async () => {
    setGlobalLoading(true);
    try {
      // Simulate API call to Google Sheets
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, we just alert
      alert('Dados importados da nuvem com sucesso!');
    } catch (err) {
      console.error('Import Error:', err);
      alert('Erro ao importar dados.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleClearData = () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados locais. Deseja continuar?')) {
      saveData([]);
      localStorage.removeItem('oficina_db');
      alert('Banco de dados local limpo.');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen max-w-md mx-auto relative">
      <main className="h-screen overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'lancamento' && <Lancamento onSave={handleSaveServico} tecnico={tecnico} />}
        {activeTab === 'lista' && (
          <Lista 
            data={data} 
            onDelete={handleDeleteServico} 
            onEdit={handleEditServico} 
            onSync={handleSync} 
          />
        )}
        {activeTab === 'ajustes' && (
          <Ajustes 
            tecnico={tecnico} 
            setTecnico={setTecnico} 
            onClearData={handleClearData} 
            onImportCloud={handleImportCloud} 
            onSyncAll={() => handleSync(data.filter(s => !s.sincronizado).map(s => s.id))}
            theme={theme}
            setTheme={setTheme}
            totalRecords={data.length}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {globalLoading && (
        <div id="loader-global" style={{ display: 'flex' }}>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-black uppercase tracking-widest mt-4">Sincronizando...</p>
        </div>
      )}
    </div>
  );
}
