import { useEffect, useMemo, useState } from 'react';
import scrollama from 'scrollama';
import StoryChart from './components/charts/StoryChart';
import { loadHotelBookingsReadyCsv, type HotelBookingReadyRow } from './lib/hotelData';

type StoryStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
};

const steps: StoryStep[] = [
  {
    id: 'discover',
    eyebrow: 'Introducció',
    title: 'Comencem pel context',
    body:
      'Portugal és una destinació turística molt atractiva, que rep viatgers de molts països i amb interessos molt diversos.',
    accent: '#7c3aed',
  },
  {
    id: 'focus',
    eyebrow: 'Pas 02',
    title: 'Segmentar ajuda a predir millor',
    body:
      'No tots els canals de venda es comporten igual: alguns reserven amb molta antelació i cancel·len més sovint.',
    accent: '#0ea5e9',
  },
  {
    id: 'respond',
    eyebrow: 'Pas 03',
    title: 'La temporalitat també importa',
    body:
      'L’evolució mensual de les cancel·lacions permet detectar períodes de més risc i anticipar decisions d’inventari.',
    accent: '#f97316',
  },
  {
    id: 'finish',
    eyebrow: 'Pas 04',
    title: 'Cap a una estratègia d’overbooking informada',
    body:
      'Els patrons de dipòsit i preu mitjà (ADR) poden guiar polítiques d’overbooking més precises i menys arriscades.',
    accent: '#22c55e',
  },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [rows, setRows] = useState<HotelBookingReadyRow[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const activeStory = useMemo(() => steps[activeStep] ?? steps[0], [activeStep]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches);
    updateMotionPreference();

    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    loadHotelBookingsReadyCsv()
      .then((loadedRows) => {
        setRows(loadedRows);
        setDataError(null);
      })
      .catch((error) => {
        setRows([]);
        setDataError(
          error instanceof Error
            ? error.message
            : 'No s\'ha pogut carregar el fitxer hotel_bookings_ready.csv.',
        );
      });
  }, []);

  useEffect(() => {
    const scroller = scrollama();

    const handleStepEnter = (response: { index: number }) => {
      setActiveStep(response.index);
    };

    const setup = () => {
      scroller
        .setup({
          step: '.story-step',
          offset: 0.6,
          progress: false,
        })
        .onStepEnter(handleStepEnter);
    };

    setup();
    window.addEventListener('resize', scroller.resize);

    return () => {
      window.removeEventListener('resize', scroller.resize);
      scroller.destroy();
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Vite + React + scrollama</p>
        <h1>Anticipant cancel·lacions per controlar l’overbooking</h1>
        <p className="hero-copy">
          Un recorregut basat en dades de reserves hoteleres de dues localitzacions de Portugal que explora patrons de cancel·lació i com aquests poden ajudar a gestionar l’overbooking de manera més informada.
        </p>
      </section>

      <section className="story-layout" aria-label="Scrollytelling story">
        <div className="story-visual sticky-panel" aria-live="polite">
          <div
            className="story-visual__card"
            style={{
              borderColor: activeStory.accent,
              boxShadow: `0 0 0 1px ${activeStory.accent}33, 0 24px 80px ${activeStory.accent}22`,
            }}
          >
            <p className="story-visual__eyebrow">{activeStory.eyebrow}</p>
            <h2>{activeStory.title}</h2>
            <p>{activeStory.body}</p>

            {dataError ? (
              <p className="story-chart__error">
                No s\'han pogut carregar les dades preparades. Executa `npm run data:treat` per
                generar `public/data/hotel_bookings_ready.csv`.
              </p>
            ) : (
              <StoryChart rows={rows} activeStep={activeStep} />
            )}

            <div className="story-visual__meter" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={index === activeStep ? 'is-active' : ''}
                  style={{ backgroundColor: index === activeStep ? step.accent : undefined }}
                />
              ))}
            </div>

            <p className="story-visual__hint">
              {isReducedMotion
                ? 'Tens activat el moviment reduït, per això les actualitzacions són simples i directes.'
                : 'Desplaça’t per avançar en la història i moure’t entre els diferents passos.'}
            </p>
          </div>
        </div>

        <div className="story-copy">
          {steps.map((step, index) => (
            <article
              key={step.id}
              className={`story-step ${index === activeStep ? 'is-active' : ''}`}
              data-step-index={index}
            >
              <p className="story-step__eyebrow">{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

