import React from 'react';
import { LayoutDashboard, PlusCircle, List, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lancamento', label: 'Lançamento', icon: PlusCircle },
    { id: 'cadastro', label: 'Cadastro', icon: Settings },
    { id: 'lista', label: 'Lista', icon: List },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className="nav-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
        >
          <tab.icon size={20} />
          <span className="mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
