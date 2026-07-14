import Image from 'next/image';

export default function AdministrationDashboardImage() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[640px]">
      <div className="landing-operation-mockup absolute inset-y-6 left-10 right-0 sm:-right-6" />
      <Image
        src="/landing/administration/dashboard-general.png"
        alt=""
        width={1536}
        height={1024}
        sizes="(min-width: 1024px) 640px, 100vw"
        className="landing-operation-image-pop relative h-auto w-full rounded-2xl border border-landing-border"
      />
    </div>
  );
}
