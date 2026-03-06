import React, { useEffect, useState } from 'react';

export function Loader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 animate-zoom-bg"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579412691525-46f34a06700c?q=80&w=1470&auto=format&fit=crop')" }}
      />
      
      <div className="relative z-10 w-full max-w-md px-10">
        <div className="border-l-8 border-[var(--primary)] pl-5 mb-20">
          <h1 className="text-5xl font-black text-white tracking-[5px] uppercase">VERTICAL</h1>
          <p className="text-[var(--primary)] font-bold tracking-[3px] mt-2">OFICINA SMART v20.11</p>
        </div>

        <div className="absolute bottom-12 right-12 w-64">
          <div className="text-right text-[10px] text-gray-400 mb-1 uppercase tracking-wider">
            Carregando Módulos...
          </div>
          <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
