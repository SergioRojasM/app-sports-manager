import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-12 align-middle relative">
          <Image
            src="/logo2.png"
            alt="Wolfpack Logo"
            fill
            className="object-contain"
          />
        </div>
          <h2 className="text-white text-xl font-black tracking-tighter italic">Sport Manager</h2>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          <a className="text-white/70 hover:text-accent-teal text-sm font-medium transition-colors" href="#features">
            Funciones
          </a>
          <a className="text-white/70 hover:text-accent-teal text-sm font-medium transition-colors" href="#pricing">
            Planes
          </a>
          <a className="text-white/70 hover:text-accent-teal text-sm font-medium transition-colors" href="#">
            Empresa
          </a>
        </div>
        
        <Link href="/auth/login">
          <button className="bg-brand-gradient text-white px-6 py-2.5 rounded-full text-sm font-bold tracking-tight hover:scale-105 transition-transform">
            Comenzar ahora
          </button>
        </Link>
      </div>
    </nav>
  );
}
