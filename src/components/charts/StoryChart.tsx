import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { feature, mesh } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import type { HotelBookingReadyRow } from '../../lib/hotelData';

type StoryChartProps = {
  rows: HotelBookingReadyRow[];
  chartId: StoryChartId;
};

export type StoryChartId =
  | 'routes-map-world'
  | 'routes-map-local'
  | 'cancel-share-overall'
  | 'cancel-by-country'
  | 'cancel-rate-by-hotel'
  | 'cancel-rate-by-motivation'
  | 'cancel-rate-by-stay_length'
  | 'cancel-rate-by-month'
  | 'cancel-rate-by-updates'
  | 'cancel-rate-by-room-type'
  | 'cancel-rate-by-customer-type'
  | 'cancel-rate-by-agent'
  | 'cancel-rate-by-company'
  | 'cancel-rate-by-waiting-time'
  | 'cancel-rate-by-lead-time'
  | 'cancel-rate-by-customer-fidelity'
  | 'cancel-rate-by-adr'
  | 'overbooking-summary-matrix';

type RoutePoint = {
  country: string;
  hotel: 'Resort Hotel' | 'City Hotel';
  trips: number;
  origin: [number, number];
  destination: [number, number];
};

const COUNTRY_COORDS: Record<string, [number, number]> = {
  PRT: [-8.2, 39.5],
  ESP: [-3.7, 40.4],
  FRA: [2.2, 46.2],
  GBR: [-2.5, 54.5],
  DEU: [10.5, 51.2],
  IRL: [-8.2, 53.4],
  ITA: [12.5, 42.8],
  BEL: [4.5, 50.8],
  NLD: [5.3, 52.1],
  CHE: [8.2, 46.8],
  AUT: [14.5, 47.6],
  SWE: [18.6, 60.2],
  NOR: [8.5, 60.4],
  DNK: [9.5, 56.1],
  POL: [19.1, 52.1],
  CZE: [15.3, 49.8],
  ROU: [24.9, 45.8],
  RUS: [37.6, 55.7],
  UKR: [31.2, 49.0],
  TUR: [35.2, 39.0],
  USA: [-98.5, 39.8],
  CAN: [-106.3, 56.1],
  BRA: [-51.9, -14.2],
  ARG: [-64.0, -34.5],
  MEX: [-102.5, 23.8],
  CHN: [104.2, 35.8],
  JPN: [138.2, 36.2],
  KOR: [127.8, 36.4],
  IND: [78.9, 22.8],
  AUS: [134.5, -25.7],
  NZL: [172.6, -41.5],
  ZAF: [24.7, -29.0],
  MAR: [-6.0, 31.8],
  DZA: [2.6, 28.0],
  TUN: [9.5, 34.0],
  EGY: [30.8, 26.8],
  SAU: [45.1, 23.9],
  ARE: [54.3, 24.3],
};

const HOTEL_DESTINATIONS: Record<RoutePoint['hotel'], [number, number]> = {
  'City Hotel': [-9.1393, 38.7223],
  'Resort Hotel': [-8.0, 37.1],
};

const HOTEL_LABELS: Record<RoutePoint['hotel'], string> = {
  'City Hotel': 'Lisbon (City Hotel)',
  'Resort Hotel': 'Algarve (Resort Hotel)',
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

type ComboPoint = {
  label: string;
  reservations: number;
  cancelRate: number;
};

type BubblePoint = {
  hotel: string;
  motivation: string;
  reservations: number;
  cancelRate: number;
};

type ChartModel =
  | { kind: 'bar'; title: string; subtitle: string; data: BarPoint[]; format: (value: number) => string }
  | { kind: 'bar-horizontal'; title: string; subtitle: string; data: BarPoint[]; format: (value: number) => string }
  | { kind: 'line'; title: string; subtitle: string; data: LinePoint[]; format: (value: number) => string }
  | {
      kind: 'bar-line-dual-axis';
      title: string;
      subtitle: string;
      data: ComboPoint[];
      leftFormat: (value: number) => string;
      rightFormat: (value: number) => string;
      rotateXLabel: boolean;
    }
  | {
      kind: 'bubble-matrix';
      title: string;
      subtitle: string;
      xLabel: string;
      yLabel: string;
      xDomain: string[];
      yDomain: string[];
      data: BubblePoint[];
    };

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

function getCombinedBarsLineChartModel(
    rows: HotelBookingReadyRow[],
    chartId: StoryChartId,
    category: keyof HotelBookingReadyRow,
    rotateXLabel?: boolean,
    minGroupSize?: number,
    customOrder?: string[]
): ChartModel {
  const grouped = Array.from(
      d3.rollup(
          rows,
          (values) => ({
            reservations: values.length,
            canceled: d3.sum(values, (d) => d.isCanceled),
          }),
          (d) => d[category],
      ),
      ([label, value]) => ({
        label: String(label),
        reservations: value.reservations,
        canceled: value.canceled,
      }),
  );

  const majorGroupValues = grouped.filter((d) => d.reservations >= (minGroupSize ?? 0));
  const otherValues = grouped.filter((d) => d.reservations < (minGroupSize ?? 0));
  const otherReservations = d3.sum(otherValues, (d) => d.reservations);
  const otherCanceled = d3.sum(otherValues, (d) => d.canceled);

  const data: ComboPoint[] = majorGroupValues.map((d) => ({
    label: d.label,
    reservations: d.reservations,
    cancelRate: d.reservations > 0 ? (d.canceled / d.reservations) * 100 : 0,
  }));

  if (otherReservations > 0) {
    data.push({
      label: 'Altres',
      reservations: otherReservations,
      cancelRate: (otherCanceled / otherReservations) * 100,
    });
  }

  // Apply custom order if provided, otherwise sort by reservations
  if (customOrder && customOrder.length > 0) {
    data.sort((a, b) => {
      const aIndex = customOrder.indexOf(a.label);
      const bIndex = customOrder.indexOf(b.label);

      // Both items are in customOrder, sort by their position
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // Item a is in customOrder, it comes first
      if (aIndex !== -1) return -1;
      // Item b is in customOrder, it comes first
      if (bIndex !== -1) return 1;

      // Neither is in customOrder, maintain existing order
      return 0;
    });
  } else {
    data.sort((a, b) => b.reservations - a.reservations);
  }

  return {
    kind: 'bar-line-dual-axis',
    title: 'Volum de reserves i cancel·lació per país',
    subtitle: 'Barres: volum de reserves (eix esquerre). Àrea: % cancel·lació (eix dret).',
    data,
    leftFormat: (value) => d3.format('~s')(value),
    rightFormat: (value) => `${value.toFixed(1)}%`,
    rotateXLabel: rotateXLabel === true
  };
}

function getOverbookingSummaryMatrixModel(rows: HotelBookingReadyRow[]): Extract<ChartModel, { kind: 'bubble-matrix' }> {
  const grouped = d3.rollups(
    rows,
    (values) => ({
      reservations: values.length,
      canceled: d3.sum(values, (d) => d.isCanceled),
    }),
    (d) => d.hotel,
    (d) => d.motivation,
  );

  const data: BubblePoint[] = [];
  for (const [hotel, motivationGroups] of grouped) {
    for (const [motivation, stats] of motivationGroups) {
      data.push({
        hotel,
        motivation,
        reservations: stats.reservations,
        cancelRate: stats.reservations > 0 ? (stats.canceled / stats.reservations) * 100 : 0,
      });
    }
  }

  const xDomain = d3
    .rollups(rows, (values) => values.length, (d) => d.motivation)
    .sort((a, b) => b[1] - a[1])
    .map(([motivation]) => motivation);

  const preferredHotelOrder = ['City Hotel', 'Resort Hotel'];
  const presentHotels = new Set(rows.map((d) => d.hotel));
  const yDomain = preferredHotelOrder.filter((hotel) => presentHotels.has(hotel));

  return {
    kind: 'bubble-matrix',
    title: 'Resum de risc per hotel i motivació',
    subtitle: 'Color: taxa de cancel·lació. Mida: volum de reserves.',
    xLabel: 'Motivació del viatge',
    yLabel: "Tipus d'hotel",
    xDomain,
    yDomain,
    data,
  };
}

function getChartModel(rows: HotelBookingReadyRow[], chartId: StoryChartId): ChartModel {
  if (chartId === 'cancel-share-overall') {
    const canceledShare = (d3.mean(rows, (d) => d.isCanceled) ?? 0) * 100;
    const data = [
      { label: 'Cancel·lades', value: canceledShare },
      { label: 'No cancel·lades', value: Math.max(0, 100 - canceledShare) },
    ];

    return {
      kind: 'bar-horizontal',
      title: 'Proporció total de cancel·lacions',
      subtitle: 'Percentatge de reserves cancel·lades vs no cancel·lades.',
      data,
      format: (value) => `${value.toFixed(1)}%`,
    };
  }

  if (chartId === 'cancel-rate-by-hotel') {
    return getCombinedBarsLineChartModel(rows, chartId, 'hotel');
  }

  if (chartId === 'cancel-by-country') {
    return getCombinedBarsLineChartModel(rows, chartId, 'country', true, 1000);
  }

  if (chartId === 'cancel-rate-by-motivation') {
    return getCombinedBarsLineChartModel(rows, chartId, 'motivation');
  }

  if (chartId === 'cancel-rate-by-stay_length') {
    return getCombinedBarsLineChartModel(rows, chartId, 'stayLength', false, undefined, ['short', 'middle', 'long']);
  }

  if (chartId === 'cancel-rate-by-month') {
    return getCombinedBarsLineChartModel(rows, chartId, 'arrivalMonth', true, undefined, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
  }

  if (chartId === 'cancel-rate-by-updates') {
    return getCombinedBarsLineChartModel(rows, chartId, 'bookingChangesCat', false, undefined, ['none', 'little', 'many']);
  }

  if (chartId === 'cancel-rate-by-room-type') {
    return getCombinedBarsLineChartModel(rows, chartId, 'reservedRoomType');
  }

  if (chartId === 'cancel-rate-by-customer-type') {
    return getCombinedBarsLineChartModel(rows, chartId, 'customerType');
  }

  if (chartId === 'cancel-rate-by-agent') {
    return getCombinedBarsLineChartModel(rows, chartId, 'agent', true, 500);
  }

  if (chartId === 'cancel-rate-by-company') {
    return getCombinedBarsLineChartModel(rows, chartId, 'company', true, 100);
  }

  if (chartId === 'cancel-rate-by-waiting-time') {
    return getCombinedBarsLineChartModel(rows, chartId, 'daysInWaitingListCat', false, 0, ["none", "little", "many"]);
  }

  if (chartId === 'cancel-rate-by-lead-time') {
    return getCombinedBarsLineChartModel(rows, chartId, 'leadTimeCat', false, 0, ["<1-month", "1-2-months", "2-6-months", ">6-months"]);
  }

  if (chartId === 'cancel-rate-by-customer-fidelity') {
    return getCombinedBarsLineChartModel(rows, chartId, 'customerFidelity', false, 0, ["very low", "normal", "high", "very high"]);
  }

  if (chartId === 'cancel-rate-by-adr') {
    return getCombinedBarsLineChartModel(rows, chartId, 'adrCat', false, 0, ["low", "normal", "high", "luxe"]);
  }

  if (chartId === 'overbooking-summary-matrix') {
    return getOverbookingSummaryMatrixModel(rows);
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

export default function StoryChart({ rows, chartId }: StoryChartProps) {
  if (rows.length === 0) {
    return <div className="story-chart__empty" aria-label="No chart data available" />;
  }

  if (chartId === 'routes-map-world') {
    return <RouteMapChart rows={rows} mapView="world" />;
  }

  if (chartId === 'routes-map-local') {
    return <RouteMapChart rows={rows} mapView="europe" />;
  }

  if (chartId === 'overbooking-summary-matrix') {
    return <OverbookingSummaryMatrixWithFilters rows={rows} />;
  }

  const model = getChartModel(rows, chartId);
  const width = 620;
  const height = 520;
  const margin = { top: 20, right: 20, bottom: 56, left: 64 };
  const comboMargin = { top: 20, right: 72, bottom: 72, left: 64 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const comboInnerWidth = width - comboMargin.left - comboMargin.right;
  const comboInnerHeight = height - comboMargin.top - comboMargin.bottom;
  const matrixMargin = { top: 56, right: 28, bottom: 114, left: 148 };
  const matrixInnerWidth = width - matrixMargin.left - matrixMargin.right;
  const matrixInnerHeight = height - matrixMargin.top - matrixMargin.bottom;

  return (
    <div className="story-chart">
      {model.kind === 'bar' ? (
        <BarChart model={model} width={width} height={height} margin={margin} innerWidth={innerWidth} innerHeight={innerHeight} />
      ) : model.kind === 'bar-horizontal' ? (
        <HorizontalBarChart
          model={model}
          width={width}
          height={height}
          margin={{ top: 44, right: 28, bottom: 40, left: 130 }}
          innerWidth={width - 130 - 28}
          innerHeight={height - 44 - 40}
        />
      ) : model.kind === 'bar-line-dual-axis' ? (
        <ComboBarLineChart
          model={model}
          width={width}
          height={height}
          margin={comboMargin}
          innerWidth={comboInnerWidth}
          innerHeight={comboInnerHeight}
        />
      ) : model.kind === 'bubble-matrix' ? (
        <BubbleMatrixChart
          model={model}
          width={width}
          height={height}
          margin={matrixMargin}
          innerWidth={matrixInnerWidth}
          innerHeight={matrixInnerHeight}
        />
      ) : (
        <LineChart model={model} width={width} height={height} margin={margin} innerWidth={innerWidth} innerHeight={innerHeight} />
      )}
    </div>
  );
}

function OverbookingSummaryMatrixWithFilters({ rows }: { rows: HotelBookingReadyRow[] }) {
  const width = 620;
  const height = 520;
  const margin = { top: 56, right: 28, bottom: 114, left: 148 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const fidelityOrder = ['very low', 'normal', 'high', 'very high'];
  const leadTimeOrder = ['<1-month', '1-2-months', '2-6-months', '>6-months'];

  const fidelityValues = useMemo(() => {
    const uniques = Array.from(new Set(rows.map((d) => d.customerFidelity)));
    return uniques.sort((a, b) => {
      const aIndex = fidelityOrder.indexOf(a);
      const bIndex = fidelityOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [rows]);

  const leadTimeValues = useMemo(() => {
    const uniques = Array.from(new Set(rows.map((d) => d.leadTimeCat)));
    return uniques.sort((a, b) => {
      const aIndex = leadTimeOrder.indexOf(a);
      const bIndex = leadTimeOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [rows]);

  const countryOptions = useMemo(() => {
    const volumes = d3.rollups(rows, (values) => values.length, (d) => d.country);
    volumes.sort((a, b) => b[1] - a[1]);
    const major = volumes.filter(([, count]) => count >= 1000).map(([country]) => country);
    const hasOthers = volumes.some(([, count]) => count < 1000);
    return { major, hasOthers };
  }, [rows]);

  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedFidelityValues, setSelectedFidelityValues] = useState<string[] | null>(null);
  const [selectedLeadTimeValues, setSelectedLeadTimeValues] = useState<string[] | null>(null);

  const activeFidelityValues = useMemo(() => {
    if (selectedFidelityValues === null) {
      return fidelityValues;
    }
    const validSelections = selectedFidelityValues.filter((value) => fidelityValues.includes(value));
    return validSelections;
  }, [fidelityValues, selectedFidelityValues]);

  const activeFidelitySet = useMemo(() => new Set(activeFidelityValues), [activeFidelityValues]);

  const activeLeadTimeValues = useMemo(() => {
    if (selectedLeadTimeValues === null) {
      return leadTimeValues;
    }
    const validSelections = selectedLeadTimeValues.filter((value) => leadTimeValues.includes(value));
    return validSelections;
  }, [leadTimeValues, selectedLeadTimeValues]);

  const activeLeadTimeSet = useMemo(() => new Set(activeLeadTimeValues), [activeLeadTimeValues]);

  const filteredRows = useMemo(() => {
    const majorCountrySet = new Set(countryOptions.major);
    return rows.filter((row) => {
      if (selectedCountry === 'Others') {
        if (majorCountrySet.has(row.country)) return false;
      } else if (selectedCountry !== 'All') {
        if (row.country !== selectedCountry) return false;
      }
      if (!activeFidelitySet.has(row.customerFidelity)) return false;
      if (!activeLeadTimeSet.has(row.leadTimeCat)) return false;
      return true;
    });
  }, [rows, selectedCountry, countryOptions.major, activeFidelitySet, activeLeadTimeSet]);

  const globalReservationExtent = useMemo((): [number, number] => {
    const grouped = d3.rollups(
      rows,
      (values) => values.length,
      (d) => d.hotel,
      (d) => d.motivation,
    );
    const allCounts = grouped.flatMap(([, motivations]) => motivations.map(([, count]) => count));
    return [d3.min(allCounts) ?? 0, d3.max(allCounts) ?? 1];
  }, [rows]);

  const model = getOverbookingSummaryMatrixModel(filteredRows);

  const toggleFidelity = (fidelity: string) => {
    setSelectedFidelityValues((previous) => {
      const next = new Set(previous ?? fidelityValues);
      if (next.has(fidelity)) {
        next.delete(fidelity);
      } else {
        next.add(fidelity);
      }
      return fidelityValues.filter((value) => next.has(value));
    });
  };

  const toggleLeadTime = (leadTime: string) => {
    setSelectedLeadTimeValues((previous) => {
      const next = new Set(previous ?? leadTimeValues);
      if (next.has(leadTime)) {
        next.delete(leadTime);
      } else {
        next.add(leadTime);
      }
      return leadTimeValues.filter((value) => next.has(value));
    });
  };

  return (
    <div className="story-chart">
      <div className="story-chart__filters">
        <div className="story-chart__filters-row">
          <label htmlFor="country-filter" className="story-chart__filters-label">
            País d'origen:
          </label>
          <select
            id="country-filter"
            className="story-chart__filter-select"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="All">Tots els països</option>
            {countryOptions.major.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
            {countryOptions.hasOthers && <option value="Others">Altres</option>}
          </select>
        </div>

        <div className="story-chart__filters-row" role="group" aria-label="Filtrar per fidelitat del client">
          <span className="story-chart__filters-label">Fidelitat del client:</span>
          {fidelityValues.map((value) => {
            const isActive = activeFidelitySet.has(value);
            return (
              <button
                key={value}
                type="button"
                className={`story-chart__filter-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => toggleFidelity(value)}
                aria-pressed={isActive}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="story-chart__filters-row" role="group" aria-label="Filtrar per antelacio de la reserva">
          <span className="story-chart__filters-label">Antelació de la reserva:</span>
          {leadTimeValues.map((value) => {
            const isActive = activeLeadTimeSet.has(value);
            return (
              <button
                key={value}
                type="button"
                className={`story-chart__filter-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => toggleLeadTime(value)}
                aria-pressed={isActive}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="story-chart__empty" aria-label="No chart data available for selected customer fidelity filters" />
      ) : (
        <BubbleMatrixChart
          model={model}
          width={width}
          height={height}
          margin={margin}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          reservationExtent={globalReservationExtent}
        />
      )}
    </div>
  );
}

function getRouteData(rows: HotelBookingReadyRow[]): RoutePoint[] {
  const routeCounts = d3.rollups(
    rows,
    (values) => values.length,
    (d) => d.country,
    (d) => d.hotel,
  );

  const routes: RoutePoint[] = [];

  for (const [country, byHotel] of routeCounts) {
    const origin = COUNTRY_COORDS[country];
    if (!origin) {
      continue;
    }

    for (const [hotel, trips] of byHotel) {
      if (hotel !== 'Resort Hotel' && hotel !== 'City Hotel') {
        continue;
      }

      routes.push({
        country,
        hotel,
        trips,
        origin,
        destination: HOTEL_DESTINATIONS[hotel],
      });
    }
  }

  return routes.sort((a, b) => b.trips - a.trips);
}

function RouteMapChart({ rows, mapView }: { rows: HotelBookingReadyRow[], mapView: 'world' | 'europe' }) {
  const routeData = getRouteData(rows);

  if (routeData.length === 0) {
    return <div className="story-chart__empty" aria-label="No route data available" />;
  }

  const width = 620;
  const height = 560;
  const worldData = worldAtlas as {
    objects: { countries: unknown };
  };
  const land = feature(worldData as never, worldData.objects.countries as never);
  const boundaries = mesh(
    worldData as never,
    worldData.objects.countries as never,
    (a: unknown, b: unknown) => a !== b,
  );
  const europeCenter = [5, 45];
  const europeScale = 650;

  const projection =
    mapView === 'world'
      ? d3
          .geoAzimuthalEqualArea()
          .fitExtent(
            [
              [0, 0],
              [width, height],
            ],
            { type: 'Sphere' },
          )
      : d3
          .geoMercator()
            .center(europeCenter)
            .scale(europeScale)
            .translate([width / 2, height / 2]);

  const geoPath = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();
  const maxTrips = d3.max(routeData, (d) => d.trips) ?? 1;
  const strokeWidth = d3.scaleSqrt().domain([1, maxTrips]).range([0.8, 5.2]);
  const strokeOpacity = d3.scaleLinear().domain([1, maxTrips]).range([0.12, 0.92]);
  const highlightThreshold = d3.quantile(routeData.map((d) => d.trips), 0.85) ?? maxTrips;

  return (
    <div className="story-chart story-chart--map">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa de rutes per origen i hotel">
        <path d={geoPath({ type: 'Sphere' }) ?? ''} className="story-map__sphere" />
        <path d={geoPath(land as never) ?? ''} className="story-map__land" />
        <path d={geoPath(boundaries as never) ?? ''} className="story-map__boundaries" />
        <path d={geoPath(graticule) ?? ''} className="story-map__graticule" />

        {routeData.map((route) => {
          const linePath = geoPath({
            type: 'LineString',
            coordinates: [route.origin, route.destination],
          });
          if (!linePath) {
            return null;
          }

          const color = route.hotel === 'Resort Hotel' ? '#f59e0b' : '#38bdf8';
          const isHighlighted = route.trips >= highlightThreshold;

          return (
            <path
              key={`${route.country}-${route.hotel}`}
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth(route.trips)}
              strokeOpacity={strokeOpacity(route.trips)}
              className={isHighlighted ? 'story-map__route--highlight' : 'story-map__route'}
            />
          );
        })}

        {(['City Hotel', 'Resort Hotel'] as const).map((hotel) => {
          const [x, y] = projection(HOTEL_DESTINATIONS[hotel]) ?? [null, null];
          if (x === null || y === null) {
            return null;
          }

          return (
            <g key={hotel}>
              <circle cx={x} cy={y} r={5} className="story-map__hotel-dot" />
              <text x={x + 8} y={y - 8} className="story-map__label">
                {HOTEL_LABELS[hotel]}
              </text>
            </g>
          );
        })}
      </svg>
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
                y={innerHeight + 22}
                textAnchor="middle"
                transform={`rotate(-90, ${x.bandwidth() / 2}, ${innerHeight + 22})`}
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

function ComboBarLineChart({ model, width, height, margin, innerWidth, innerHeight }: ChartBoxProps & { model: Extract<ChartModel, { kind: 'bar-line-dual-axis' }> }) {
  const x = d3
    .scaleBand<string>()
    .domain(model.data.map((d) => d.label))
    .range([0, innerWidth])
    .padding(0.22);

  const maxReservations = d3.max(model.data, (d) => d.reservations) ?? 0;
  const yLeft = d3.scaleLinear().domain([0, maxReservations * 1.1]).nice().range([innerHeight, 0]);
  const yRight = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

  const leftTicks = yLeft.ticks(4);
  const rightTicks = [0, 25, 50, 75, 100];
  const areaData = d3
    .area<ComboPoint>()
    .x((d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
    .y0(innerHeight)
    .y1((d) => yRight(d.cancelRate))(model.data);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model.title}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {leftTicks.map((tick) => (
          <g key={`left-${tick}`} transform={`translate(0,${yLeft(tick)})`}>
            <line x1={0} x2={innerWidth} y1={0} y2={0} className="story-chart__grid" />
            <text x={-10} y={4} textAnchor="end" className="story-chart__axis-text">
              {model.leftFormat(tick)}
            </text>
          </g>
        ))}

        {rightTicks.map((tick) => (
          <g key={`right-${tick}`} transform={`translate(${innerWidth},${yRight(tick)})`}>
            <text
              x={10}
              y={0}
              textAnchor="start"
              dominantBaseline="middle"
              className="story-chart__axis-text story-chart__axis-text--right"
            >
              {model.rightFormat(tick)}
            </text>
          </g>
        ))}

        {model.data.map((point) => {
          const xPos = x(point.label);
          if (xPos === undefined) {
            return null;
          }

          return (
            <g key={point.label} transform={`translate(${xPos},0)`}>
              <rect
                y={yLeft(point.reservations)}
                width={x.bandwidth()}
                height={innerHeight - yLeft(point.reservations)}
                rx={6}
                className="story-chart__bar"
              />
              <text
                x={x.bandwidth() / 2}
                y={innerHeight + (model.rotateXLabel ? 10 : 20)}
                textAnchor={model.rotateXLabel ? 'start' : 'middle'}
                transform={`rotate(${model.rotateXLabel ? '90' : '0'}, ${x.bandwidth() / 2}, ${innerHeight + (model.rotateXLabel ? 10 : 20)})`}
                className="story-chart__axis-text"
              >
                {point.label}
              </text>
            </g>
          );
        })}

        {areaData && <path d={areaData} className="story-chart__area--cancel" />}

        {model.data.map((point) => {
          const centerX = (x(point.label) ?? 0) + x.bandwidth() / 2;
          return <circle key={`dot-${point.label}`} cx={centerX} cy={yRight(point.cancelRate)} r={4} className="story-chart__dot story-chart__dot--cancel" />;
        })}
      </g>
    </svg>
  );
}

function BubbleMatrixChart({ model, width, height, margin, innerWidth, innerHeight, reservationExtent }: ChartBoxProps & { model: Extract<ChartModel, { kind: 'bubble-matrix' }>; reservationExtent?: [number, number] }) {
  const x = d3
    .scaleBand<string>()
    .domain(model.xDomain)
    .range([0, innerWidth])
    .padding(0.24);

  const y = d3
    .scaleBand<string>()
    .domain(model.yDomain)
    .range([0, innerHeight])
    .padding(0.28);

  const minReservations = reservationExtent?.[0] ?? (d3.min(model.data, (d) => d.reservations) ?? 0);
  const maxReservations = reservationExtent?.[1] ?? (d3.max(model.data, (d) => d.reservations) ?? 1);
  const sizeMin = 8;
  const sizeMax = 32;
  const radiusScale =
    minReservations === maxReservations
      ? () => (sizeMin + sizeMax) / 2
      : d3.scaleSqrt().domain([minReservations, maxReservations]).range([sizeMin, sizeMax]);
  const getRadius = (reservations: number) => radiusScale(reservations);

  const color = d3
    .scaleLinear<string>()
    .domain([0, 30, 80])
    .range(['#22c55e', '#facc15', '#ef4444'])
    .clamp(true);

  const gradientId = 'cancel-rate-gradient';
  const legendStops = [0, 30, 60, 100];
  const legendX = d3.scaleLinear().domain([0, 100]).range([0, 140]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model.title}>
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          {legendStops.map((stop) => (
            <stop key={stop} offset={`${stop}%`} stopColor={color(stop)} />
          ))}
        </linearGradient>
      </defs>

      <g transform={`translate(${margin.left},${margin.top})`}>
        {model.yDomain.map((hotel) => {
          const yPos = y(hotel);
          if (yPos === undefined) {
            return null;
          }

          return (
            <line
              key={`h-grid-${hotel}`}
              x1={0}
              x2={innerWidth}
              y1={yPos + y.bandwidth() / 2}
              y2={yPos + y.bandwidth() / 2}
              className="story-chart__grid"
            />
          );
        })}

        {model.xDomain.map((motivation) => {
          const xPos = x(motivation);
          if (xPos === undefined) {
            return null;
          }

          return (
            <line
              key={`v-grid-${motivation}`}
              x1={xPos + x.bandwidth() / 2}
              x2={xPos + x.bandwidth() / 2}
              y1={0}
              y2={innerHeight}
              className="story-chart__grid"
            />
          );
        })}

        {model.yDomain.map((hotel) => {
          const yPos = y(hotel);
          if (yPos === undefined) {
            return null;
          }

          return (
            <text key={`y-label-${hotel}`} x={-12} y={yPos + y.bandwidth() / 2 + 4} textAnchor="end" className="story-chart__axis-text">
              {hotel}
            </text>
          );
        })}

        {model.xDomain.map((motivation) => {
          const xPos = x(motivation);
          if (xPos === undefined) {
            return null;
          }

          return (
            <text
              key={`x-label-${motivation}`}
              x={xPos + x.bandwidth() / 2}
              y={innerHeight + 12}
              textAnchor="start"
              transform={`rotate(35, ${xPos + x.bandwidth() / 2}, ${innerHeight + 12})`}
              className="story-chart__axis-text"
            >
              {motivation}
            </text>
          );
        })}

        {model.data.map((point) => {
          const xPos = x(point.motivation);
          const yPos = y(point.hotel);
          if (xPos === undefined || yPos === undefined) {
            return null;
          }

          return (
            <circle
              key={`${point.hotel}-${point.motivation}`}
              cx={xPos + x.bandwidth() / 2}
              cy={yPos + y.bandwidth() / 2}
              r={getRadius(point.reservations)}
              fill={color(point.cancelRate)}
              className="story-chart__bubble"
            >
              <title>
                {`${point.hotel} - ${point.motivation}: ${d3.format(',')(point.reservations)} reserves, ${point.cancelRate.toFixed(1)}% cancel·lació`}
              </title>
            </circle>
          );
        })}

        <text x={innerWidth / 2} y={innerHeight + 88} textAnchor="middle" className="story-chart__axis-text">
          {model.xLabel}
        </text>

        <text
          x={-innerHeight / 2}
          y={-108}
          textAnchor="middle"
          transform="rotate(-90)"
          className="story-chart__axis-text"
        >
          {model.yLabel}
        </text>

        <g transform={`translate(${Math.max(0, innerWidth - 150)}, ${Math.max(0, innerHeight - 400)})`}>
          <rect x={0} y={0} width={140} height={10} rx={0} fill={`url(#${gradientId})`} />
          <text x={0} y={24} className="story-chart__axis-text">0%</text>
          <text x={legendX(30)} y={24} textAnchor="middle" className="story-chart__axis-text">30%</text>
          <text x={legendX(60)} y={24} textAnchor="middle" className="story-chart__axis-text">80%</text>
          <text x={legendX(100)} y={24} textAnchor="end" className="story-chart__axis-text">{'>=80%'}</text>
          <text x={70} y={40} textAnchor="middle" className="story-chart__axis-text">Taxa de cancel·lació</text>
        </g>
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

function HorizontalBarChart({ model, width, height, margin, innerWidth, innerHeight }: ChartBoxProps & { model: Extract<ChartModel, { kind: 'bar-horizontal' }> }) {
  const y = d3
    .scaleBand<string>()
    .domain(model.data.map((d) => d.label))
    .range([0, innerHeight])
    .padding(0.28);

  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
  const ticks = x.ticks(5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={model.title}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(${x(tick)},0)`}>
            <line x1={0} x2={0} y1={0} y2={innerHeight} className="story-chart__grid" />
            <text x={0} y={innerHeight + 18} textAnchor="middle" className="story-chart__axis-text">
              {model.format(tick)}
            </text>
          </g>
        ))}

        {model.data.map((point) => {
          const yPos = y(point.label);
          if (yPos === undefined) {
            return null;
          }

          const valueX = x(point.value);
          const placeLabelOutside = valueX < innerWidth - 70;

          return (
            <g key={point.label} transform={`translate(0,${yPos})`}>
              <rect
                x={0}
                y={0}
                width={valueX}
                height={y.bandwidth()}
                rx={8}
                className={`story-chart__bar ${point.label === 'Cancel·lades' ? 'story-chart__bar--cancelled' : 'story-chart__bar--secondary'}`}
              />

              <text x={-10} y={y.bandwidth() / 2 + 4} textAnchor="end" className="story-chart__axis-text">
                {point.label}
              </text>

              <text
                x={placeLabelOutside ? valueX + 8 : valueX - 8}
                y={y.bandwidth() / 2 + 4}
                textAnchor={placeLabelOutside ? 'start' : 'end'}
                className="story-chart__value-text"
              >
                {model.format(point.value)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

