import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile, Servico } from './types';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Lancamento } from './components/Lancamento';
import { Nuvem } from './components/Nuvem';
import { Equipe } from './components/Equipe';
import { Integracao } from './components/Integracao';
import { Loader } from './components/Loader';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { handleError } from './lib/utils';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('lancamento');
  const [localData, setLocalData] = useState<Servico[]>([]);
  const [cloudData, setCloudData] = useState<Servico[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    // Initial loading
    checkUser();

    // Load local data
    const savedData = localStorage.getItem('oficina_db');
    if (savedData) {
      try {
        setLocalData(JSON.parse(savedData));
      } catch (e) {
        handleError(e, 'Leitura de Dados Locais');
      }
    }

    // Real-time subscription
    const subscription = supabase
      .channel('public:servicos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos' }, () => {
        fetchCloudData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile) {
      fetchCloudData();
    }
  }, [profile]);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      await loadProfile(session.user.id);
    }
    setLoading(false);
  }

  async function loadProfile(userId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Se não encontrar no banco, tenta recuperar dos metadados do Auth
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          
          let empresaId = null;
          if (meta.company_name) {
            const { data: empData, error: empFetchError } = await supabase
              .from('empresas')
              .select('id')
              .eq('nome', meta.company_name)
              .maybeSingle();
            
            if (empData) {
              empresaId = empData.id;
            } else if (meta.intended_role === 'admin' && !empFetchError) {
              // Tenta criar a empresa se for admin e ela não existir
              try {
                const { data: newEmpData, error: newEmpError } = await supabase
                  .from('empresas')
                  .insert({ nome: meta.company_name })
                  .select('id')
                  .single();
                
                if (newEmpError) throw newEmpError;
                if (newEmpData) empresaId = newEmpData.id;
              } catch (err) {
                console.error('Erro ao criar empresa na recuperação:', err);
              }
            }
          }

          if (!empresaId && meta.intended_role !== 'admin') {
             // Se não for admin e não tiver empresa, algo está errado no cadastro
             console.error('Usuário sem empresa vinculada');
          }

          const recoveredProfile: UserProfile = {
            id: userId,
            nome: meta.full_name || user.email?.split('@')[0] || 'Usuário',
            role: meta.intended_role || 'tecnico',
            empresa_id: empresaId,
            empresa_nome: meta.company_name || 'Empresa'
          };
          setProfile(recoveredProfile);
          if (recoveredProfile.role === 'admin') setActiveSection('dashboard');
          
          if (empresaId) {
            await supabase.from('perfis').upsert({
              id: userId,
              nome: recoveredProfile.nome,
              empresa_id: empresaId,
              role: recoveredProfile.role,
              empresa_nome: recoveredProfile.empresa_nome
            });
          }
          return;
        }
        throw error;
      }

      setProfile(data);
      
      // Se o perfil existe mas o nome está vazio, tenta atualizar com o metadado
      if (!data.nome && user?.user_metadata?.full_name) {
        await supabase
          .from('perfis')
          .update({ nome: user.user_metadata.full_name })
          .eq('id', userId);
        setProfile({ ...data, nome: user.user_metadata.full_name });
      }
      
      // Verificação extra: se o metadado diz que é admin mas o perfil não, tenta atualizar
      if (user?.user_metadata?.intended_role === 'admin' && data.role !== 'admin') {
        const { data: updatedData, error: updateError } = await supabase
          .from('perfis')
          .update({ role: 'admin' })
          .eq('id', userId)
          .select()
          .single();
        
        if (!updateError && updatedData) {
          setProfile(updatedData);
          setActiveSection('dashboard');
        }
      } else if (data.role === 'admin') {
        setActiveSection('dashboard');
      }
    } catch (e) {
      handleError(e, 'Carregamento de Perfil');
      // Não define perfil padrão aqui para evitar que o usuário opere sem empresa_id
      // mas permite que ele veja a tela de erro ou tente novamente
    }
  }

  async function fetchCloudData() {
    if (!profile?.empresa_id) return;

    try {
      const { data, error } = await supabase
        .from('servicos')
        .select(`
          *,
          tecnico_perfil:perfis!servicos_tecnico_fkey (
            nome,
            empresa_nome,
            role
          )
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCloudData(data || []);
    } catch (e) {
      handleError(e, 'Busca de Dados em Nuvem');
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    localStorage.clear();
    window.location.reload();
  };

  if (loading) return <Loader />;

  if (!user) return <Auth onLogin={checkUser} />;

  return (
    <Layout 
      profile={profile} 
      activeSection={activeSection} 
      setActiveSection={setActiveSection}
      onLogout={handleLogout}
      onDeleteAccount={() => setIsDeleteModalOpen(true)}
      userEmail={user.email}
    >
      {activeSection === 'dashboard' && <Dashboard cloudData={cloudData} profile={profile} userEmail={user.email} />}
      {activeSection === 'lancamento' && (
        <Lancamento 
          profile={profile} 
          userEmail={user.email}
          localData={localData} 
          setLocalData={(data) => {
            setLocalData(data);
            localStorage.setItem('oficina_db', JSON.stringify(data));
          }}
          onNavigateToNuvem={() => setActiveSection('nuvem')}
          onRefresh={fetchCloudData}
        />
      )}
      {activeSection === 'nuvem' && (
        <Nuvem 
          profile={profile} 
          userEmail={user.email}
          localData={localData} 
          cloudData={cloudData}
          setLocalData={(data) => {
            setLocalData(data);
            localStorage.setItem('oficina_db', JSON.stringify(data));
          }}
          onRefresh={fetchCloudData}
        />
      )}
      {activeSection === 'equipe' && <Equipe profile={profile} />}
      {activeSection === 'integracao' && <Integracao profile={profile} />}
      
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        userEmail={user.email} 
      />
    </Layout>
  );
}
