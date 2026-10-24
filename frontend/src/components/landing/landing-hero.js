import { getImageProps } from 'next/image';

export default function LandingHero() {
  const { props: heroImageProps } = getImageProps({
    alt: '',
    src: '/images/hero-background.png',
    width: 1672,
    height: 941,
    sizes: '100vw',
    fetchPriority: 'high',
  });

  return (
    <section
      id="inicio"
      className="relative isolate aspect-[1672/941] w-full overflow-hidden bg-[#101211] max-lg:aspect-auto max-lg:pt-32 lg:h-dvh"
      aria-labelledby="hero-title"
    >
      <picture className="absolute inset-0 block max-lg:relative max-lg:inset-auto max-lg:aspect-[1672/941] max-[40rem]:aspect-[3/2]" aria-hidden="true">
        <img
          {...heroImageProps}
          className="h-full w-full object-cover max-[40rem]:object-[-6vw_center]"
        />
      </picture>
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,transparent_35%,rgb(0_0_0_/_38%)_100%)] max-lg:top-32 max-[40rem]:bg-[linear-gradient(180deg,transparent_8%,rgb(0_0_0_/_55%)_38%,rgb(0_0_0_/_82%)_70%,rgb(0_0_0_/_90%)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto h-full w-full max-w-[1700px] px-[clamp(1.5rem,6vw,5rem)] [animation:fade-in-up_1s_ease-in-out_both] max-lg:absolute max-lg:inset-[8rem_0_0] max-lg:h-auto max-lg:px-[4vw]">
        <div className="ml-auto mr-[clamp(3rem,6vw,8rem)] flex h-full w-[min(46vw,38rem)] flex-col items-end justify-center text-right max-lg:mr-0 max-lg:w-[46%] min-[40.0625rem]:max-lg:w-[56%] min-[40.0625rem]:max-lg:-translate-x-[clamp(1rem,3.5vw,1.75rem)] max-[40rem]:m-0 max-[40rem]:w-full max-[40rem]:gap-[clamp(.5rem,1.8vw,.75rem)]">
          <span className="mb-6 max-w-full rounded-full border border-[#0e7490] px-4 py-1 text-[clamp(.6rem,.8vw,.9rem)] leading-[1.5] font-semibold tracking-[.3em] text-white/80 uppercase max-lg:mb-[clamp(.375rem,1.5vw,.875rem)] max-lg:px-[.8em] max-lg:py-[.2em] max-lg:text-[clamp(.45rem,1.1vw,.65rem)] max-lg:tracking-[.2em] min-[40.0625rem]:max-lg:text-[clamp(.55rem,1.2vw,.75rem)] max-[40rem]:mb-0 max-[40rem]:text-[clamp(.55rem,1.5vw,.7rem)] max-[40rem]:tracking-[.15em]">
            Tradición Ancestral
          </span>
          <h1
            id="hero-title"
            className="mb-3 whitespace-nowrap font-display text-[clamp(2rem,3vw,4rem)] leading-[1.5] font-normal tracking-[.025em] text-white uppercase max-lg:mb-[clamp(.25rem,1vw,.625rem)] max-lg:text-[clamp(1rem,3vw,2rem)] max-lg:leading-[1.2] min-[40.0625rem]:max-lg:text-[clamp(1.6rem,4vw,2.5rem)] max-[40rem]:mb-0 max-[40rem]:text-[clamp(1.5rem,6vw,2.25rem)] max-[40rem]:[text-shadow:0_2px_8px_rgb(0_0_0_/_80%)]"
          >
            Señor del Mictlán
          </h1>
          <p className="mb-5 font-display text-[clamp(1rem,1.4vw,1.4rem)] leading-[1.5] text-[#d6d3d1] max-lg:mb-[clamp(.5rem,1.5vw,1rem)] max-lg:text-[clamp(.625rem,1.5vw,.875rem)] max-lg:leading-[1.4] min-[40.0625rem]:max-lg:text-[clamp(.75rem,1.7vw,1rem)] max-[40rem]:mb-0 max-[40rem]:text-[clamp(.875rem,2.3vw,1rem)] max-[40rem]:[text-shadow:0_2px_8px_rgb(0_0_0_/_80%)]">
            100% agave cupreata · Etúcuaro, Michoacán
          </p>
          <a
            className="group relative ml-2 border-0 bg-transparent px-[2.6rem] py-[.975rem] text-[clamp(.8rem,.9vw,1rem)] text-white no-underline outline-0 max-lg:whitespace-nowrap max-lg:px-[clamp(.975rem,3.25vw,2.6rem)] max-lg:py-[clamp(.65rem,1.56vw,.975rem)] max-lg:text-[clamp(.625rem,1.3vw,.8rem)] max-[40rem]:px-[1.3rem] max-[40rem]:py-[.8125rem] max-[40rem]:text-xs focus-visible:outline-2 focus-visible:outline-[#f2c98f] focus-visible:outline-offset-4"
            href="#coleccion"
          >
            <span
              className="absolute inset-0 [clip-path:polygon(0_0,100%_0,100%_100%,10%_100%,0_75%)] bg-[#0f766e] transition-[transform,background-color] duration-300 ease-out group-hover:scale-110 group-hover:bg-[rgba(13,148,136,.9)]"
              aria-hidden="true"
            />
            <span className="pointer-events-none relative z-[1] font-sans leading-[1.25] font-semibold tracking-[.1em] uppercase">
              Conocer la colección
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
