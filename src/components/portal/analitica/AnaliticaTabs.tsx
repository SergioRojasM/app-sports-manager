'use client';

export type AnaliticaTab = 'resumen' | 'ingresos' | 'operacion' | 'equipo';

const tabs: Array<{ id: AnaliticaTab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'operacion', label: 'Operación' },
  { id: 'equipo', label: 'Equipo' },
];

export function AnaliticaTabs({ activeTab, onChange }: { activeTab: AnaliticaTab; onChange: (tab: AnaliticaTab) => void }) {
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const targetIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : null;
    if (targetIndex === null) return;
    event.preventDefault();
    const next = tabs[targetIndex];
    onChange(next.id);
    document.getElementById(`analitica-tab-${next.id}`)?.focus();
  }

  return (
    <div role="tablist" aria-label="Vistas de analítica" className="flex overflow-x-auto rounded-lg border border-portal-border bg-navy-deep/60 p-1">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`analitica-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`analitica-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-navy-soft text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}