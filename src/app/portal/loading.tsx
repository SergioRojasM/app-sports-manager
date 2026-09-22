export default function PortalLoading() {
  return (
    <div className="grit-shell flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-grit-glass-border border-t-grit-cyan" />
        <p className="font-grit-body text-sm text-grit-subtext">Cargando portal...</p>
      </div>
    </div>
  );
}
