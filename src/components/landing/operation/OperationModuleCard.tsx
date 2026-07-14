import Image from 'next/image';

interface OperationModuleCardProps {
  icon: string;
  title: string;
  items: string[];
  backgroundImage: string;
}

export default function OperationModuleCard({ icon, title, items, backgroundImage }: OperationModuleCardProps) {
  return (
    <article className="relative min-h-[360px] overflow-hidden rounded-2xl border border-landing-border lg:min-h-[420px]">
      <Image
        src={backgroundImage}
        alt=""
        fill
        sizes="(min-width: 1024px) 405px, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07111F] via-[#0B1526]/85 to-transparent" />

      <div className="relative z-10 flex h-full flex-col gap-3.5 p-7">
        <div className="flex size-14 items-center justify-center rounded-full border border-landing-primary/20 bg-landing-primary/10">
          <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-landing-primary">
            {icon}
          </span>
        </div>

        <h3 className="font-landing-display text-[22px] font-bold italic leading-tight text-landing-text">
          {title}
        </h3>

        <div className="h-[3px] w-10 rounded-full bg-landing-primary" />

        <ul className="mt-1 flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-landing-primary">
                check_circle
              </span>
              <span className="font-landing-body text-[15px] text-landing-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
