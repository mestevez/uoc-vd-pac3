import { useEffect, useMemo, useState } from 'react';
import scrollama from 'scrollama';

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
    eyebrow: 'Step 01',
    title: 'Build a clear narrative arc',
    body:
      'Start with a strong opening, keep each section focused, and let the visualization update as the reader scrolls.',
    accent: '#7c3aed',
  },
  {
    id: 'focus',
    eyebrow: 'Step 02',
    title: 'Use a sticky canvas or panel',
    body:
      'Keep the visual context visible while the copy changes. This is the core pattern scrollama is great at enabling.',
    accent: '#0ea5e9',
  },
  {
    id: 'respond',
    eyebrow: 'Step 03',
    title: 'Animate with intention',
    body:
      'Trigger lightweight transitions on step enter and reset or reveal state as needed when the user scrolls back.',
    accent: '#f97316',
  },
  {
    id: 'finish',
    eyebrow: 'Step 04',
    title: 'End with a takeaway',
    body:
      'Close with a concise conclusion and a next action so the story feels complete and ready for expansion.',
    accent: '#22c55e',
  },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const activeStory = useMemo(() => steps[activeStep] ?? steps[0], [activeStep]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches);
    updateMotionPreference();

    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
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
        <h1>Scrollytelling starter for interactive web stories</h1>
        <p className="hero-copy">
          This project gives you a fast foundation for narrative scrolling, step-driven
          visualization updates, and future expansion into charts, maps, or data-rich sequences.
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
                ? 'Reduced motion is enabled, so updates stay simple and direct.'
                : 'Scroll to advance the story and trigger step changes.'}
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

