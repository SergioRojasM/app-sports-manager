import { PublicTrainingCard, type PublicTrainingCardData } from './PublicTrainingCard';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

function toCardData(item: PublicTrainingListItem): PublicTrainingCardData {
  return {
    nombre: item.nombre,
    tenantNombre: item.tenantNombre,
    descripcion: item.descripcion,
    disciplinaNombre: item.disciplinaNombre,
    escenarioNombre: item.escenarioNombre,
    escenarioUbicacion: item.escenarioUbicacion,
    fechaHora: item.fechaHora,
    duracionMinutos: item.duracionMinutos,
    cupoMaximo: item.cupoMaximo,
    reservasActivas: item.reservasActivas,
    reservaAntelacionHoras: item.reservaAntelacionHoras,
    precio: item.precio,
    bannerUrl: item.bannerUrl,
    serviciosRequeridos: item.serviciosRequeridos,
  };
}

type PublicTrainingsGridProps = {
  featuredItem: PublicTrainingListItem | null;
  standardItems: PublicTrainingListItem[];
  onReservar: (item: PublicTrainingListItem) => void;
};

export function PublicTrainingsGrid({ featuredItem, standardItems, onReservar }: PublicTrainingsGridProps) {
  if (!featuredItem && standardItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-landing-border py-24 text-center">
        <span className="material-symbols-outlined text-4xl text-landing-text-secondary/50" aria-hidden="true">
          sports
        </span>
        <p className="font-landing-body text-sm text-landing-text-secondary">
          No hay entrenamientos públicos disponibles por ahora.
        </p>
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-5 sm:grid-cols-3">
      {featuredItem && (
        <PublicTrainingCard data={toCardData(featuredItem)} featured onReservar={() => onReservar(featuredItem)} />
      )}
      {standardItems.map((item) => (
        <PublicTrainingCard key={item.id} data={toCardData(item)} onReservar={() => onReservar(item)} />
      ))}
    </div>
  );
}
