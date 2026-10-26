import AgeGate from '../../components/age-gate/age-gate';
import SiteHeader from '../../components/header/header';

export default function AccountLayout({ children }) {
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || '';
  return (
    <AgeGate mediaBaseUrl={mediaBaseUrl}>
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_50%_0%,rgba(77,15,22,0.24),transparent_42%),var(--mictlan-background)] text-mictlan-ivory">
        <SiteHeader mediaBaseUrl={mediaBaseUrl} />
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-4 pt-36 pb-6 sm:px-8 lg:px-12">
          {children}
        </main>
        <footer className="shrink-0 border-t border-mictlan-sand/10 px-4 py-6 text-center font-ui text-[0.65rem] uppercase tracking-[0.14em] text-mictlan-earth-muted">
          Señor del Mictlán · Etúcuaro, Michoacán
        </footer>
      </div>
    </AgeGate>
  );
}
