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
  footer?: string;
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
    id: 'country-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions per país d’origen',
    body:
      'El gràfic mostra que els viatges locals concentren tant el percentatge més alt de cancel·lacions (més del 50%) com el major volum de reserves, fet que els converteix en un aspecte clau a analitzar.',
    accent: '#ef4444',
    visual: {
      kind: 'chart',
      chartId: 'cancel-by-country',
    },
  },
  {
    id: 'hotel-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions per tipus d’hotel',
    body:
      'Les dades mostren que els hotels de ciutat concentren una part significativa del volum de reserves i de les cancel·lacions, fet que els situa com un focus rellevant de l’estudi.',
    accent: '#ef4444',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-hotel',
    },
  },
  {
    id: 'motivation-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions per motiu del viatge',
    body:
      'Tot i que la taxa de cancel·lació és similar segons la motivació del viatge, els viatges de feina destaquen pel seu major volum de reserves.',
    accent: '#efab44',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-motivation',
    },
  },
  {
    id: 'stay-length-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions per la durada del viatge',
    body:
      'Tot i que la taxa de cancel·lació és similar segons la motivació del viatge, els viatges de feina destaquen pel seu major volum de reserves.',
    accent : '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-stay_length',
    },
  },
  {
    id: 'season-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions segons estacionalitat',
    body:
      "Les cancel·lacions presenten una distribució força homogènia al llarg de tot l’any.",
    accent : '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-month',
    },
  },
  {
    id: 'updates-cancellations',
    eyebrow: '',
    title: 'Cancel·lacions en funció del ajustos fets a la reserva',
    body:
      "Les dades indiquen que les reserves amb algun tipus d’ajust tenen una menor tendència a ser cancel·lades.",
    footer: 'Ajustos: cap (0), pocs (1–5) o molts (més de 5)',
    accent : '#efab44',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-updates',
    },
  },
  {
    id: 'room-type-cancellations',
    eyebrow: '',
    title: "Cancel·lacions per tipus d'habitació",
    body:
      "El tipus d’habitació no sembla tenir un impacte rellevant en la probabilitat de cancel·lació.",
    accent : '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-room-type',
    },
  },
  {
    id: 'customer-type-cancellations',
    eyebrow: '',
    title: "Cancel·lacions per tipus de client",
    body:
      "Encara que els clients Transient mostren una taxa de cancel·lació clarament superior, el seu elevat pes en el volum total de reserves fa que aquesta variable, per si sola, tingui una capacitat limitada per orientar decisions.",
    accent : '#efab44',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-customer-type',
    },
  },
  {
    id: 'agent-cancellations',
    eyebrow: '',
    title: "Cancel·lacions per Agència",
    body:
      "El gràfic mostra que algunes agencies presenten un índex molt baix de cancel·lacions, mentre que d’altres registren valors significativament elevats. En aquest sentit, aquest factor podria ser rellevant a l’hora d’afinar l’anàlisi del risc de cancel·lació.",
    accent : '#efab44',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-agent',
    },
  },
  {
    id: 'company-cancellations',
    eyebrow: '',
    title: "Cancel·lacions per Companyia client",
    body:
      "Encara que algunes companyies presenten pics puntuals de cancel·lació, la majoria de reserves no es realitzen per aquest canal, cosa que en redueix l’impacte global.",
    accent : '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-company',
    },
  },
  {
    id: 'waiting-time-cancellations',
    eyebrow: '',
    title: "Cancel·lacions segons els dies en espera",
    body:
      "Sembla que el fet d’haver fet esperar els clients en el procés de reserva s’associa a una major taxa de cancel·lacions. Tanmateix, el nombre de reserves amb temps d’espera és molt reduït, fet que indica que aquest factor ja es troba, en gran mesura, controlat.",
    accent : '#efab44',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-waiting-time',
    },
  },
  {
    id: 'lead-time-cancellations',
    eyebrow: '',
    title: "Cancel·lacions segons els dies d’antelació a la reserva",
    body:
      "Les dades mostren una tendència clara en que quan més dies d’antelació es fa la reserva, més alta és la probabilitat de cancel·lació.",
    accent : '#ef4444',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-lead-time',
    },
  },
  {
    id: 'customer-fidelity-cancellations',
    eyebrow: '',
    title: "Cancel·lacions segons la fidelitat del client",
    body:
      "Els clients amb un nivell de fidelitat més alt presenten una taxa de cancel·lació clarament inferior. De fet, els clients amb un grau elevat de fidelitat mostren valors molt propers a zero.",
    accent : '#ef4444',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-customer-fidelity',
    },
  },
  {
    id: 'adr-cancellations',
    eyebrow: '',
    title: "Cancel·lacions segons el preu de la reserva (ADR)",
    body:
      "El preu de la reserva no presenta una relació significativa amb les cancel·lacions.",
    accent : '#22c55e',
    visual: {
      kind: 'chart',
      chartId: 'cancel-rate-by-adr',
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
              <div className="story-step__footer">
                <p>{step.footer}</p>
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

