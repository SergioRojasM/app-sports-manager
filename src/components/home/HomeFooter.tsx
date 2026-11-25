import Image from 'next/image';
import Link from 'next/link';
import { GritIcon } from '@/components/ui';

const CONTACT_EMAIL = 'contacto@grit-arena.com';
const WHATSAPP_URL =
  'https://wa.me/573224399865?text=' + encodeURIComponent('Quiero mas informacion de GRIT Arena');

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#060E1A] px-5 pb-7 pt-9 md:px-20 md:pb-9 md:pt-12">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 md:flex-row md:justify-between">
        <Link href="/" className="relative block h-8 w-[130px] md:h-[38px] md:w-[150px]">
          <Image src="/logo-navbar.png" alt="GRIT Arena" fill sizes="150px" className="object-contain" />
        </Link>

        <nav aria-label="Pie de página" className="flex flex-wrap justify-center gap-6 md:gap-9">
          <Link href="/eventos" className="font-grit-body text-sm text-grit-subtext transition hover:text-grit-cyan">
            Eventos
          </Link>
          <Link href="/auth/login" className="font-grit-body text-sm text-grit-subtext transition hover:text-grit-cyan">
            Iniciar sesión
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-grit-body text-sm text-grit-subtext transition hover:text-grit-cyan">
            Contacto
          </a>
        </nav>

        <div className="flex gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribir por WhatsApp"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-grit-subtext transition hover:text-grit-cyan"
          >
            <GritIcon name="chat" size={18} />
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            aria-label={`Enviar correo a ${CONTACT_EMAIL}`}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-grit-subtext transition hover:text-grit-cyan"
          >
            <GritIcon name="mail" size={18} />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-7 max-w-[1280px] border-t border-white/5 pt-6 text-center md:text-left">
        <p className="font-grit-body text-xs text-grit-muted md:text-[13px]">© {year} GRIT Arena. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
