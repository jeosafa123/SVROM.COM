import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div id="loading-screen">
      <div className="relative flex flex-col items-center gap-8">
        <div className="brand-name">OFICINA SMART</div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-black uppercase tracking-[4px] animate-pulse">
            Carregando Sistema...
          </p>
        </div>
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="fixed bottom-10 text-muted font-black uppercase text-[0.65rem] tracking-[2px]">
        Vertical Locações v21.5
      </div>
    </div>
  );
};
