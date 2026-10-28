import NationalDashboard from './NationalDashboard';
import RegionalDashboard from './RegionalDashboard';
import WorldDashboard from './WorldDashboard';
import ImprovementsDashboard from './ImprovementsDashboard';
import { useState } from 'react';
import { Globe, MapPin, Flag, TrendingUp } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'mundial' | 'regional' | 'nacional' | 'mejora'>('mundial');
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F2A44] flex flex-col font-sans">
      {/* Header Institucional */}
      <header className="bg-[#0F2A44] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-white text-[#0F2A44] font-bold px-3 py-1.5 rounded-lg text-sm shadow">
            PUCP
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Rankings PUCP - Posicionamiento y mejora</h1>
          </div>
        </div>

      </header>

      {/* Navegación por Páginas (4 Tabs) */}
      <nav className="bg-white border-b border-[#E1E5EB] px-6 flex space-x-4 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('mundial')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'mundial'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Situación mundial</span>
        </button>
        <button
          onClick={() => setActiveTab('regional')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'regional'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Situación regional</span>
        </button>
        <button
          onClick={() => setActiveTab('nacional')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'nacional'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Situación nacional</span>
        </button>
        <button
          onClick={() => setActiveTab('mejora')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'mejora'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Caídas y mejoras</span>
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'mundial' && <WorldDashboard />}
        {activeTab === 'regional' && <RegionalDashboard />}
        {activeTab === 'nacional' && <NationalDashboard />}
        {activeTab === 'mejora' && <ImprovementsDashboard />}
      </main>
      {/* Footer */}
      <footer className="bg-white border-t border-[#E1E5EB] py-4 px-6 text-center text-xs text-slate-500 mt-12">
        Rankings PUCP - Posicionamiento y mejora &copy; 2026 - Conectado a base de datos mediante FastAPI
      </footer>

    </div>
  );
}

