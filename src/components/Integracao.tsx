import React, { useState, useEffect } from 'react';
import { Plug, Save, RefreshCw, Code, Copy, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/utils';

interface IntegracaoProps {
  profile: UserProfile | null;
}

export function Integracao({ profile }: IntegracaoProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    apiUrl: '',
    apiKey: '',
    gsheetId: ''
  });
  const [generatedScript, setGeneratedScript] = useState('');

  useEffect(() => {
    loadConfig();
  }, [profile]);

  const loadConfig = async () => {
    if (!profile?.empresa_id) return;
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('api_url, api_key')
        .eq('empresa_id', profile.empresa_id)
        .maybeSingle();

      if (error) throw error;
      
      const defaultUrl = `${window.location.origin}/api/export`;
      
      if (data) {
        setConfig(prev => ({
          ...prev,
          apiUrl: data.api_url || defaultUrl,
          apiKey: data.api_key || ''
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          apiUrl: defaultUrl
        }));
      }
    } catch (err) {
      handleError(err, 'Carregamento de Configurações de API');
    }
  };

  const handleSaveConfig = async () => {
    if (!config.apiUrl || !config.apiKey) return alert('Preencha a URL e a chave da API');
    
    let empresaId = profile?.empresa_id;

    // Tentativa de recuperação de emergência se o empresa_id estiver nulo
    if (!empresaId && profile?.empresa_nome) {
      setLoading(true);
      try {
        const { data: empData } = await supabase
          .from('empresas')
          .select('id')
          .eq('nome', profile.empresa_nome)
          .maybeSingle();
        
        if (empData) {
          empresaId = empData.id;
          // Tenta atualizar o perfil localmente e no banco para futuras operações
          await supabase.from('perfis').upsert({
            id: profile.id,
            empresa_id: empresaId,
            role: profile.role,
            empresa_nome: profile.empresa_nome
          });
        }
      } catch (err) {
        console.error('Erro na recuperação de empresa_id', err);
      }
    }

    if (!empresaId) return alert('Empresa não identificada. Por favor, saia e entre novamente ou contate o suporte.');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          empresa_id: empresaId,
          api_url: config.apiUrl,
          api_key: config.apiKey,
          updated_at: new Date().toISOString()
        }, { onConflict: 'empresa_id' });

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      handleError(err, 'Salvamento de Configurações de API');
    } finally {
      setLoading(false);
    }
  };

  const generateScript = () => {
    if (!config.apiUrl || !config.apiKey) {
      alert('Primeiro configure a URL e a chave da API.');
      return;
    }

    const urlCompleta = config.apiUrl.includes('?') 
      ? `${config.apiUrl}&api_key=${config.apiKey}` 
      : `${config.apiUrl}?api_key=${config.apiKey}`;

    const script = `/**
 * Importa dados da API para o Google Sheets.
 * Execute esta função no editor do Apps Script.
 */
function importarDados() {
  const url = '${urlCompleta}';
  const response = UrlFetchApp.fetch(url);
  const dados = JSON.parse(response.getContentText());
  
  // Abre a planilha
  let planilha;
  if ('${config.gsheetId}') {
    planilha = SpreadsheetApp.openById('${config.gsheetId}');
  } else {
    planilha = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  // Seleciona a primeira aba
  const aba = planilha.getSheets()[0] || planilha.insertSheet('Dados API');
  
  // Limpa a aba
  aba.clear();
  
  // Define os cabeçalhos
  const cabecalhos = ['OM', 'Patrimônio', 'Equipamento', 'Horas', 'Valor (R$)', 'Identificação', 'Técnico', 'Data'];
  aba.appendRow(cabecalhos);
  
  // Adiciona os dados
  dados.forEach(item => {
    const linha = [
      item.om || '',
      item.patrimonio || '',
      item.equipamento || '',
      item.horas || 0,
      item.valor || 0,
      item.identificacao ? 'SIM' : 'NÃO',
      item.tecnico || '',
      item.data || (item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '')
    ];
    aba.appendRow(linha);
  });
  
  // Formata a coluna de valores como moeda
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha > 1) {
    aba.getRange(2, 5, ultimaLinha-1, 1).setNumberFormat('R$ #,##0.00');
  }
  
  SpreadsheetApp.flush();
  console.log('Dados importados com sucesso!');
}`;

    setGeneratedScript(script);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript).then(() => {
      alert('Script copiado!');
    });
  };

  return (
    <div className="space-y-6">
      <div className="card-hardware p-8 space-y-8">
        <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
          <div className="bg-[var(--primary)]/10 p-3 rounded-xl text-[var(--primary)]">
            <Plug size={24} />
          </div>
          <div>
            <h3 className="text-[var(--primary)] text-xl font-black tracking-widest uppercase">CONFIGURAR INTEGRAÇÃO</h3>
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mt-1">Conecte seus dados a ferramentas externas</p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest leading-relaxed opacity-80">
            Defina abaixo a URL da API e sua chave de acesso. Essas informações serão salvas no banco e ficarão disponíveis para administradores da empresa.
          </p>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">URL da API</label>
              <input 
                type="url" 
                placeholder="https://sua-api.com/endpoint"
                value={config.apiUrl}
                onChange={e => setConfig({ ...config, apiUrl: e.target.value })}
                className="input-hardware"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">Chave da API</label>
              <input 
                type="text" 
                placeholder="Sua chave secreta"
                value={config.apiKey}
                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                className="input-hardware"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={handleSaveConfig}
                disabled={loading}
                className="flex-1 btn-hardware-primary"
              >
                <Save size={18} />
                SALVAR CONFIGURAÇÃO
              </button>
              <button 
                onClick={loadConfig}
                className="btn-hardware-outline px-6"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--border)] space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                <Code size={20} />
              </div>
              <h4 className="text-[var(--text-main)] font-black tracking-widest uppercase text-sm">Integração com Google Sheets</h4>
            </div>

            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest opacity-60">
              Utilize o script abaixo no Google Apps Script para importar os dados da API para uma planilha.
            </p>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest ml-1">ID da Planilha (opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={config.gsheetId}
                  onChange={e => setConfig({ ...config, gsheetId: e.target.value })}
                  className="input-hardware"
                />
              </div>

              <button 
                onClick={generateScript}
                className="w-full btn-hardware-outline border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black"
              >
                📋 GERAR SCRIPT
              </button>

              {generatedScript && (
                <div className="relative mt-4">
                  <pre className="bg-black/50 p-6 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto max-h-64 border border-[var(--border)] custom-scrollbar">
                    {generatedScript}
                  </pre>
                  <button 
                    onClick={copyToClipboard}
                    className="absolute top-3 right-3 bg-white/10 p-2 rounded-lg text-white hover:bg-white/20 transition-all"
                    title="Copiar Script"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 p-4 rounded-xl flex gap-3">
            <AlertTriangle size={20} className="text-[var(--warning)] shrink-0" />
            <p className="text-[var(--warning)] text-[10px] font-black uppercase leading-relaxed tracking-wider">
              Mantenha sua chave em segredo. Qualquer pessoa com ela pode acessar todos os dados da sua empresa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
