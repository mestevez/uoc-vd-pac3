import * as d3 from 'd3';
import type { HotelBookingReadyRow } from '../../lib/hotelData';

type StoryChartProps = {
  rows: HotelBookingReadyRow[];
  activeStep: number;
};

type BarPoint = {
  label: string;
  value: number;
};

type LinePoint = {
  label: string;
  order: number;
  value: number;
};

type ChartModel =
  | { kind: 'bar'; title: string; subtitle: string; data: BarPoint[]; format: (value: number) => string }
  | { kind: 'line'; title: string; subtitle: string; data: LinePoint[]; format: (value: number) => string };

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function makeBarModel(
  title: string,
  subtitle: string,
  data: BarPoint[],
  format: (value: number) => string,
): ChartModel {
  return { kind: 'bar', title, subtitle, data: data.slice(0, 8), format };
}

function byValueDesc<T extends { value: number }>(a: T, b: T): number {
  return b.value - a.value;
}

function getChartModel(rows: HotelBookingReadyRow[], activeStep: number): ChartModel {
  if (activeStep === 0) {
    const grouped = Array.from(
      d3.rollup(
        rows,
        (values) => (d3.mean(values, (d) => d.isCanceled) ?? 0) * 100,
        (d) => d.hotel,
      ),
      ([label, value]) => ({ label, value }),
    ).sort(byValueDesc);

    return makeBarModel(
      'Taxa de cancel·lació per tipus d’hotel',
      'Percentatge de reserves cancel·lades.',
      grouped,
      (value) => `${value.toFixed(1)}%`,
    );
  }

  if (activeStep === 1) {
    const grouped = Array.from(
      d3.rollup(rows, (values) => d3.mean(values, (d) => d.leadTime) ?? 0, (d) => d.marketSegment),
      ([label, value]) => ({ label, value }),
    )
      .sort(byValueDesc)
      .slice(0, 7);

    return makeBarModel(
      'Lead time mitjà per segment de mercat',
      'Dies entre reserva i arribada.',
      grouped,
      (value) => `${value.toFixed(0)} dies`,
    );
  }

  if (activeStep === 2) {
    const grouped = Array.from(
      d3.rollup(rows, (values) => d3.mean(values, (d) => d.isCanceled) ?? 0, (d) => d.arrivalYm),
      ([label, value]) => {
        const [yearText, monthText] = label.split('-');
        const year = Number(yearText);
        const month = Number(monthText);
        return {
          label: `${MONTH_SHORT[month - 1] ?? monthText} ${year}`,
          order: year * 100 + month,
          value: value * 100,
        };
      },
    )
      .sort((a, b) => a.order - b.order)
      .slice(-18);

    return {
      kind: 'line',
      title: 'Evolució mensual de la cancel·lació',
      subtitle: 'Taxa de cancel·lació al llarg del temps.',
      data: grouped,
      format: (value) => `${value.toFixed(1)}%`,
    };
  }

  const grouped = Array.from(
    d3.rollup(rows, (values) => d3.mean(values, (d) => d.adr) ?? 0, (d) => d.depositType),
    ([label, value]) => ({ label, value }),
  ).sort(byValueDesc);

  return makeBarModel(
    'ADR mitjà per tipus de dipòsit',
    'Tarifa diària mitjana (ADR).',
    grouped,
    (value) => `${value.toFixed(1)} EUR`,
  );
}

export default function StoryChart({ rows, activeStep }: StoryChartProps) {
  if (rows.length === 0) {
    return <p className="story-chart__empty">No hi ha dades carregades encara.</p>;
  }

  const model = getChartModel(rows, activeStep);
  const width = 620;
  const height = 260;
  const margin = { top: 20, right: 20, bottom: 56, left: 64 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  return (
    <div className="story-chart">
      <p className="story-chart__title">{model.title}</p>
      <p className="story-chart__subtitle">{model.subtitle}</p>

      {model.kind === 'bar' ? (
        <BarChart model={model} width={width} height={height} margin={margin} innerWidth={innerWidth} innerHeight={innerHeight} />
      ) : (
        <LineChart model={model} width={width} height={height} margin={margin} innerWidth={innerWidth} innerHeight={innerHeight} />
      )}
    </div>
  );
}

type ChartBoxProps = {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  innerWidth: number;
  innerHeight: number;
};

function BarChart({ model, width, height, margin, innerWidth, innerHeight }: ChartBoxProps & { model: Extract<ChartModel, { kind: 'bar' }> }) {
  const x = d3
    .scaleBand<string>()
    .domain(model.data.map((d) => d.label))
    .range([0, innerWidth])
    .padding(0.2);

  const maxValue = d3.max(model.data, (d) => d.value) ?? 0;
  const y = d3.scaleLinear().domain([0, maxValue * 1.1]).nice().range([innerHeight, 0]);

  const ticks = y.ticks(4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model.title}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(0,${y(tick)})`}>
            <line x1={0} x2={innerWidth} y1={0} y2={0} className="story-chart__grid" />
            <text x={-10} y={4} textAnchor="end" className="story-chart__axis-text">
              {model.format(tick)}
            </text>
          </g>
        ))}

        {model.data.map((point) => {
          const xPos = x(point.label);
          if (xPos === undefined) {
            return null;
          }

          const barHeight = innerHeight - y(point.value);
          return (
            <g key={point.label} transform={`translate(${xPos},0)`}>
              <rect
                y={y(point.value)}
                width={x.bandwidth()}
                height={barHeight}
                rx={6}
                className="story-chart__bar"
              />
              <text
                x={x.bandwidth() / 2}
                y={innerHeight + 15}
                textAnchor="end"
                transform={`rotate(-30, ${x.bandwidth() / 2}, ${innerHeight + 15})`}
                className="story-chart__axis-text"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function LineChart({ model, width, height, margin, innerWidth, innerHeight }: ChartBoxProps & { model: Extract<ChartModel, { kind: 'line' }> }) {
  const x = d3
    .scalePoint<string>()
    .domain(model.data.map((d) => d.label))
    .range([0, innerWidth]);

  const maxValue = d3.max(model.data, (d) => d.value) ?? 0;
  const y = d3.scaleLinear().domain([0, maxValue * 1.1]).nice().range([innerHeight, 0]);

  const pathData = d3
    .line<LinePoint>()
    .x((d) => x(d.label) ?? 0)
    .y((d) => y(d.value))(model.data);

  const tickIndexes = new Set([0, Math.floor(model.data.length / 2), model.data.length - 1]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model.title}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {y.ticks(4).map((tick) => (
          <g key={tick} transform={`translate(0,${y(tick)})`}>
            <line x1={0} x2={innerWidth} y1={0} y2={0} className="story-chart__grid" />
            <text x={-10} y={4} textAnchor="end" className="story-chart__axis-text">
              {model.format(tick)}
            </text>
          </g>
        ))}

        {pathData && <path d={pathData} fill="none" className="story-chart__line" />}

        {model.data.map((point, index) => {
          const xPos = x(point.label);
          if (xPos === undefined) {
            return null;
          }

          return (
            <g key={point.label} transform={`translate(${xPos},${y(point.value)})`}>
              <circle r={4} className="story-chart__dot" />
              {tickIndexes.has(index) && (
                <text x={0} y={innerHeight - y(point.value) + 18} textAnchor="middle" className="story-chart__axis-text">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

