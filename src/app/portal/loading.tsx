export default function PortalLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-navy-deep">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-[#00d4ff]" />
        <p className="text-sm text-slate-400">Cargando portal...</p>
      </div>
    </div>
  );
}
