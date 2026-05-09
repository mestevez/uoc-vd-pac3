import fs from 'node:fs/promises';
import path from 'node:path';
import { csvFormat, csvParse } from 'd3-dsv';

const workspaceRoot = process.cwd();
const inputPath = process.argv[2] ?? path.join(workspaceRoot, 'data/raw/hotel_bookings.csv');
const outputPath = process.argv[3] ?? path.join(workspaceRoot, 'public/data/hotel_bookings_ready.csv');

const monthMap = new Map([
  ['january', 1],
  ['february', 2],
  ['march', 3],
  ['april', 4],
  ['may', 5],
  ['june', 6],
  ['july', 7],
  ['august', 8],
  ['september', 9],
  ['october', 10],
  ['november', 11],
  ['december', 12],
]);

const normalizeText = (value, fallback = 'Unknown') => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const toMonthIndex = (value) => {
  const key = normalizeText(value).toLowerCase();
  return monthMap.get(key) ?? null;
};

const pad2 = (value) => String(value).padStart(2, '0');

async function main() {
  const rawCsv = await fs.readFile(inputPath, 'utf8');
  const parsedRows = csvParse(rawCsv);

  const cleanedRows = [];
  let droppedRows = 0;

  for (const row of parsedRows) {
    const isCanceled = toNumber(row.is_canceled);
    const leadTime = toNumber(row.lead_time);
    const adr = toNumber(row.adr);
    const staysWeekend = toNumber(row.stays_in_weekend_nights);
    const staysWeek = toNumber(row.stays_in_week_nights);
    const adults = toNumber(row.adults);
    const babies = toNumber(row.babies);
    const children = toNumber(row.children) ?? 0;
    const arrivalYear = toNumber(row.arrival_date_year);
    const arrivalDay = toNumber(row.arrival_date_day_of_month);
    const arrivalMonthIndex = toMonthIndex(row.arrival_date_month);
    const staysTotalNights =
      staysWeekend === null || staysWeek === null ? null : staysWeekend + staysWeek;
    const totalGuests = adults === null || babies === null ? null : adults + children + babies;
    const hasValidChildren = Number.isFinite(children);

    if (
      !hasValidChildren ||
      adr === null ||
      adr <= 0 ||
      staysTotalNights === null ||
      staysTotalNights <= 0 ||
      totalGuests === null ||
      totalGuests <= 0
    ) {
      droppedRows += 1;
      continue;
    }

    const arrivalYm =
      arrivalYear !== null && arrivalMonthIndex !== null
        ? `${arrivalYear}-${pad2(arrivalMonthIndex)}`
        : 'Unknown';

    cleanedRows.push({
      hotel: normalizeText(row.hotel),
      is_canceled: isCanceled,
      lead_time: leadTime,
      adr,
      stays_total_nights: staysTotalNights,
      adults,
      children,
      babies,
      total_guests: totalGuests,
      arrival_year: arrivalYear,
      arrival_month: normalizeText(row.arrival_date_month),
      arrival_day: arrivalDay,
      arrival_month_index: arrivalMonthIndex,
      arrival_ym: arrivalYm,
      market_segment: normalizeText(row.market_segment),
      deposit_type: normalizeText(row.deposit_type),
      country: normalizeText(row.country),
    });
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, csvFormat(cleanedRows), 'utf8');

  console.log(`Input file: ${inputPath}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`Rows read: ${parsedRows.length}`);
  console.log(`Rows written: ${cleanedRows.length}`);
  console.log(`Rows dropped: ${droppedRows}`);
}

main().catch((error) => {
  console.error('Data treatment failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

