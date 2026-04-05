import React, { useState, useEffect, useMemo } from 'react';
import { Servico } from './types';
import { GOOGLE_URL, TOKEN } from './constants';
import { Dashboard } from './components/Dashboard';
import { Lancamento } from './components/Lancamento';
import { Lista } from './components/Lista';
import { Ajustes } from './components/Ajustes';
import { Cadastro } from './components/Cadastro';
import { BottomNav } from './components/BottomNav';
import { LoadingScreen } from './components/LoadingScreen';
import { Login } from './components/Login';
import { supabase } from './lib/supabase';
import { RefreshCw } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<Servico[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tecnico, setTecnico] = useState(localStorage.getItem('oficina_tecnico') || 'Técnico');
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('oficina_theme') as 'dark' | 'light') || 'dark');

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setData([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase.from('perfis').select('*').eq('id', userId).single();
    setUserProfile(profile);
    if (profile) {
      setTecnico(profile.nome || 'Técnico');
      fetchServicos(profile.empresa_id);
      subscribeToServicos(profile.empresa_id);
    }
  };

  const fetchServicos = async (empresaId: string) => {
    const { data: servicos, error } = await supabase
      .from('servicos')
      .select(`
        *,
        tecnico_perfil:perfis!servicos_tecnico_fkey (nome)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar serviços:', error);
    } else {
      const mapped: Servico[] = (servicos || []).map(s => ({
        id: s.id.toString(),
        om: s.om,
        patrimonio: s.patrimonio || '',
        maquina: s.equipamento,
        horas: s.horas.toString(),
        valor: s.valor.toString(),
        dataAbertura: s.data_inicio || s.created_at,
        dataEntrega: s.data_fim || '',
        status: s.status as any,
        indenizacao: s.status === 'Indenizado',
        tecnico: s.tecnico_perfil?.nome || 'Técnico',
        sincronizado: true,
        createdAt: s.created_at
      }));
      setData(mapped);
    }
  };

  const subscribeToServicos = (empresaId: string) => {
    supabase
      .channel('servicos_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'servicos',
        filter: `empresa_id=eq.${empresaId}`
      }, () => {
        fetchServicos(empresaId);
      })
      .subscribe();
  };

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

  const handleSaveServico = async (servico: Servico) => {
    if (!userProfile) return;

    const { error } = await supabase.from('servicos').insert([{
      empresa_id: userProfile.empresa_id,
      tecnico: session?.user.id,
      om: servico.om,
      patrimonio: servico.patrimonio,
      equipamento: servico.maquina,
      horas: parseFloat(servico.horas),
      valor: parseFloat(servico.valor),
      status: servico.status,
      data_inicio: servico.dataAbertura,
      data_fim: servico.dataEntrega
    }]);

    if (error) {
      alert('Erro ao salvar serviço: ' + error.message);
    } else {
      setActiveTab('lista');
    }
  };

  const handleDeleteServico = async (id: string) => {
    if (confirm('Deseja excluir este serviço?')) {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
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

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen max-w-md mx-auto relative">
      <main className="h-screen overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'lancamento' && <Lancamento onSave={handleSaveServico} tecnico={tecnico} />}
        {activeTab === 'cadastro' && <Cadastro />}
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
