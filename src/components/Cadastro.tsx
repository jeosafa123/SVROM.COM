import React, { useState } from 'react';
import { Building2, Printer, UserPlus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Cadastro: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<'empresa' | 'impressora' | 'tecnico'>('tecnico');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Empresa Form State
  const [empresaNome, setEmpresaNome] = useState('');

  // Impressora Form State
  const [printerModelo, setPrinterModelo] = useState('');
  const [printerSerie, setPrinterSerie] = useState('');
  const [printerPatrimonio, setPrinterPatrimonio] = useState('');
  const [printerEmpresaId, setPrinterEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Tecnico Form State
  const [tecnicoNome, setTecnicoNome] = useState('');
  const [tecnicoEmail, setTecnicoEmail] = useState('');
  const [tecnicoSenha, setTecnicoSenha] = useState('');
  const [tecnicoEmpresaId, setTecnicoEmpresaId] = useState('');

  const fetchEmpresas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('perfis').select('*').eq('id', user.id).single();
    setUserProfile(profile);

    if (profile?.role === 'admin') {
      setPrinterEmpresaId(profile.empresa_id);
      setTecnicoEmpresaId(profile.empresa_id);
      setActiveForm('tecnico');
    }

    const { data, error } = await supabase.from('empresas').select('*');
    if (error) {
      console.error('Erro ao buscar empresas:', error);
    } else {
      setEmpresas(data || []);
    }
  };

  React.useEffect(() => {
    fetchEmpresas();
  }, []);

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('empresas').insert([{ nome: empresaNome }]);
    setLoading(false);
    if (error) {
      alert('Erro ao cadastrar empresa: ' + error.message);
    } else {
      alert('Empresa cadastrada com sucesso!');
      setEmpresaNome('');
      fetchEmpresas();
    }
  };

  const handleSaveImpressora = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('impressoras').insert([{
      modelo: printerModelo,
      numero_serie: printerSerie,
      patrimonio: printerPatrimonio,
      empresa_id: printerEmpresaId
    }]);
    setLoading(false);
    if (error) {
      alert('Erro ao cadastrar impressora: ' + error.message);
    } else {
      alert('Impressora cadastrada com sucesso!');
      setPrinterModelo('');
      setPrinterSerie('');
      setPrinterPatrimonio('');
    }
  };

  const handleSaveTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/create-tecnico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: tecnicoEmail,
          password: tecnicoSenha,
          fullName: tecnicoNome,
          companyId: tecnicoEmpresaId,
          companyName: empresas.find(e => e.id === tecnicoEmpresaId)?.nome || userProfile?.empresa_nome
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar técnico');
      }

      alert('Técnico cadastrado com sucesso!');
      setTecnicoNome('');
      setTecnicoEmail('');
      setTecnicoSenha('');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-black uppercase tracking-widest mb-6 text-primary">Cadastros</h1>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {userProfile?.role !== 'admin' && (
          <button 
            onClick={() => setActiveForm('empresa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeForm === 'empresa' ? 'bg-primary text-black' : 'bg-surface text-muted'}`}
          >
            <Building2 size={16} /> Empresa
          </button>
        )}
        <button 
          onClick={() => setActiveForm('impressora')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeForm === 'impressora' ? 'bg-primary text-black' : 'bg-surface text-muted'}`}
        >
          <Printer size={16} /> Impressora
        </button>
        <button 
          onClick={() => setActiveForm('tecnico')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeForm === 'tecnico' ? 'bg-primary text-black' : 'bg-surface text-muted'}`}
        >
          <UserPlus size={16} /> Técnico
        </button>
      </div>

      <div className="bg-surface p-6 rounded-2xl border border-line">
        {activeForm === 'empresa' && (
          <form onSubmit={handleSaveEmpresa} className="space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building2 className="text-primary" /> Nova Empresa
            </h2>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Nome da Empresa</label>
              <input 
                type="text" 
                value={empresaNome}
                onChange={(e) => setEmpresaNome(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="Ex: Vertical Locações"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </form>
        )}

        {activeForm === 'impressora' && (
          <form onSubmit={handleSaveImpressora} className="space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Printer className="text-primary" /> Nova Impressora
            </h2>
            {userProfile?.role !== 'admin' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Empresa</label>
                <select 
                  value={printerEmpresaId}
                  onChange={(e) => setPrinterEmpresaId(e.target.value)}
                  required
                  className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Modelo</label>
              <input 
                type="text" 
                value={printerModelo}
                onChange={(e) => setPrinterModelo(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="Ex: HP LaserJet Pro"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Nº de Série</label>
              <input 
                type="text" 
                value={printerSerie}
                onChange={(e) => setPrinterSerie(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="Ex: ABC123XYZ"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Patrimônio</label>
              <input 
                type="text" 
                value={printerPatrimonio}
                onChange={(e) => setPrinterPatrimonio(e.target.value)}
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="Ex: PAT-001"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Impressora'}
            </button>
          </form>
        )}

        {activeForm === 'tecnico' && (
          <form onSubmit={handleSaveTecnico} className="space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus className="text-primary" /> Novo Técnico
            </h2>
            {userProfile?.role !== 'admin' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Empresa</label>
                <select 
                  value={tecnicoEmpresaId}
                  onChange={(e) => setTecnicoEmpresaId(e.target.value)}
                  required
                  className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={tecnicoNome}
                onChange={(e) => setTecnicoNome(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">E-mail</label>
              <input 
                type="email" 
                value={tecnicoEmail}
                onChange={(e) => setTecnicoEmail(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="tecnico@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-1">Senha Provisória</label>
              <input 
                type="password" 
                value={tecnicoSenha}
                onChange={(e) => setTecnicoSenha(e.target.value)}
                required
                className="w-full bg-black border border-line rounded-xl p-3 focus:border-primary outline-none"
                placeholder="******"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Técnico'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
