import { useEffect, useMemo, useState } from 'react';
import scrollama from 'scrollama';
import StoryChart, { type StoryChartId } from './components/charts/StoryChart';
import { loadHotelBookingsReadyCsv, type HotelBookingReadyRow } from './lib/hotelData';

type StoryVisual =
  | {
      kind: 'image';
      src: string;
      alt: string;
    }
  | {
      kind: 'chart';
      chartId: StoryChartId;
    };

type StoryStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  visual: StoryVisual;
};

const steps: StoryStep[] = [
  {
    id: 'intro-context',
    eyebrow: '',
    title: 'Portugal, destinacio clau',
    body: 'Portugal és una destinació turística molt atractiva, amb un gran volum de viatges locals i l’arribada de viatgers de molts països, amb interessos molt diversos.',
    accent: '#7c3aed',
    visual: {
      kind: 'chart',
      chartId: 'routes-map',
    },
  },
  {
    id: 'intro-problem',
    eyebrow: '',
    title: 'Gran volúm de cancel·lacions',
    body:
      'Les cancel·lacions són un repte important per a la gestió hotelera, ja que poden afectar la previsió d’ocupació i les decisions d’inventari.',
    accent: '#8b5cf6',
    visual: {
      kind: 'chart',
      chartId: 'cancel-share-overall',
    },
  },
  {
    id: 'intro-risk',
    eyebrow: 'Pas 03',
    title: 'Per que cal anticipar cancel·lacions',
    body:
      'Quan hi ha moltes reserves flexibles, una part important es pot cancel·lar en els dies previs i desajustar la previsio docupacio.',
    accent: '#6366f1',
    visual: {
      kind: 'image',
      src: 'images/intro/cancellation-risk.svg',
      alt: 'Indicador de risc de cancel·lacio sobre reserves futures.',
    },
  },
  {
    id: 'focus',
    eyebrow: 'Pas 04',
    title: 'Segmentar ajuda a predir millor',
    body:
      'No tots els canals de venda es comporten igual: alguns reserven amb molta antelació i cancel·len més sovint.',
    accent: '#0ea5e9',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-hotel',
    },
  },
  {
    id: 'respond',
    eyebrow: 'Pas 05',
    title: 'La temporalitat també importa',
    body:
      'L’evolució mensual de les cancel·lacions permet detectar períodes de més risc i anticipar decisions d’inventari.',
    accent: '#f97316',
    visual: {
      kind: 'chart',
      chartId: 'monthly-cancel-trend',
    },
  },
  {
    id: 'lead-time',
    eyebrow: 'Pas 06',
    title: 'El lead time dona pistes addicionals',
    body:
      'Els segments que reserven amb mes antelacio poden reaccionar de forma diferent davant canvis de preu o condicions.',
    accent: '#06b6d4',
    visual: {
      kind: 'chart',
      chartId: 'lead-time-by-segment',
    },
  },
  {
    id: 'finish',
    eyebrow: 'Pas 07',
    title: 'Cap a una estratègia d’overbooking informada',
    body:
      'Els patrons de dipòsit i preu mitjà (ADR) poden guiar polítiques d’overbooking més precises i menys arriscades.',
    accent: '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'adr-by-deposit',
    },
  },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [rows, setRows] = useState<HotelBookingReadyRow[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const activeStory = useMemo(() => steps[activeStep] ?? steps[0], [activeStep]);

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
          offset: 0.5,
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
        <div className="story-copy">
          {steps.map((step, index) => (
            <article
              key={step.id}
              className={`story-step ${index === activeStep ? 'is-active' : ''}`}
              data-step-index={index}
            >
              <div className="story-step__title">
                <p className="story-step__eyebrow">{step.eyebrow}</p>
                <h3>{step.title}</h3>
              </div>
              <div className="story-step__content">
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="story-visual sticky-panel" aria-live="polite">
          <div
            className="story-visual__card"
            style={{
              borderColor: activeStory.accent,
              boxShadow: `0 0 0 1px ${activeStory.accent}33, 0 24px 80px ${activeStory.accent}22`,
            }}
          >
            <div className="story-visual__content">
              {activeStory.visual.kind === 'image' ? (
                <div className="story-visual__media" role="img" aria-label={activeStory.visual.alt}>
                  <img
                    src={`${import.meta.env.BASE_URL}${activeStory.visual.src}`}
                    alt={activeStory.visual.alt}
                  />
                </div>
              ) : dataError ? (
                <div className="story-chart__error" aria-label="Chart data unavailable" />
              ) : (
                <StoryChart rows={rows} chartId={activeStory.visual.chartId} />
              )}
            </div>

            <div className="story-visual__meter" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={index === activeStep ? 'is-active' : ''}
                  style={{ backgroundColor: index === activeStep ? step.accent : undefined }}
                />
              ))}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}

