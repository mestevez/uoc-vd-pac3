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

const toRWeekday = (year, monthIndex, day) => {
  if (year === null || monthIndex === null || day === null) {
    return null;
  }

  const date = new Date(Date.UTC(year, monthIndex - 1, day));
  const jsWeekday = date.getUTCDay();
  return jsWeekday + 1;
};

const deriveMotivation = ({
  staysWeekend,
  staysWeek,
  children,
  babies,
  arrivalRWeekday,
}) => {
  if (staysWeekend === 0 && children === 0 && babies === 0) {
    return 'work';
  }

  if (staysWeek === 0) {
    return 'weekend';
  }

  if (staysWeek === 1 && arrivalRWeekday === 6) {
    return 'weekend';
  }

  if (staysWeek === 5 && (staysWeekend === 3 || staysWeekend === 4)) {
    return 'package';
  }

  if (staysWeek <= 5 && staysWeekend < 3 && children === 0 && babies === 0) {
    return 'work+rest';
  }

  if (children > 0 || babies > 0) {
    return 'familiy';
  }

  return 'rest';
};

const deriveStayLength = (staysTotalNights) => {
  if (staysTotalNights > 5) {
    return 'long';
  }

  if (staysTotalNights > 2) {
    return 'middle';
  }

  return 'short';
};

const deriveBookingChangesCat = (bookingChanges) => {
  if (bookingChanges > 5) {
    return 'many';
  }

  if (bookingChanges > 0) {
    return 'little';
  }

  return 'none';
};

const deriveDaysInWaitingListCat = (daysInWaitingList) => {
  if (daysInWaitingList > 30) {
    return 'many';
  }

  if (daysInWaitingList > 0) {
    return 'little';
  }

  return 'none';
};

const deriveCustomerFidelity = ({
  isRepeatedGuest,
  previousCancellations,
  previousBookingsNotCanceled,
}) => {
  if (isRepeatedGuest === 0) {
    return 'normal';
  }

  if (previousCancellations > 0) {
    return 'very low';
  }

  if (previousBookingsNotCanceled > 0) {
    return 'very high';
  }

  return 'high';
};

const deriveLeadTimeCat = (leadTime) => {
  if (leadTime > 6 * 30) {
    return '>6-months';
  }

  if (leadTime > 2 * 60) {
    return '2-6-months';
  }

  if (leadTime > 1 * 60) {
    return '1-2-months';
  }

  return '<1-month';
};

const deriveAdrCat = (adr) => {
  if (adr > 250) {
    return 'luxe';
  }

  if (adr > 150) {
    return 'high';
  }

  if (adr > 80) {
    return 'normal';
  }

  return 'low';
};

async function main() {
  const rawCsv = await fs.readFile(inputPath, 'utf8');
  const parsedRows = csvParse(rawCsv);

  const cleanedRows = [];
  let droppedRows = 0;

  for (const row of parsedRows) {
    const isCanceled = toNumber(row.is_canceled);
    const leadTime = toNumber(row.lead_time);
    const bookingChanges = toNumber(row.booking_changes) ?? 0;
    const daysInWaitingList = toNumber(row.days_in_waiting_list) ?? 0;
    const isRepeatedGuest = toNumber(row.is_repeated_guest) ?? 0;
    const previousCancellations = toNumber(row.previous_cancellations) ?? 0;
    const previousBookingsNotCanceled = toNumber(row.previous_bookings_not_canceled) ?? 0;
    const adr = toNumber(row.adr);
    const staysWeekend = toNumber(row.stays_in_weekend_nights);
    const staysWeek = toNumber(row.stays_in_week_nights);
    const adults = toNumber(row.adults);
    const babies = toNumber(row.babies);
    const children = toNumber(row.children) ?? 0;
    const arrivalYear = toNumber(row.arrival_date_year);
    const arrivalDay = toNumber(row.arrival_date_day_of_month);
    const arrivalMonthIndex = toMonthIndex(row.arrival_date_month);
    const arrivalRWeekday = toRWeekday(arrivalYear, arrivalMonthIndex, arrivalDay);
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
    const motivation = deriveMotivation({
      staysWeekend,
      staysWeek,
      children,
      babies,
      arrivalRWeekday,
    });
    const stayLength = deriveStayLength(staysTotalNights);
    const bookingChangesCat = deriveBookingChangesCat(bookingChanges);
    const daysInWaitingListCat = deriveDaysInWaitingListCat(daysInWaitingList);
    const customerFidelity = deriveCustomerFidelity({
      isRepeatedGuest,
      previousCancellations,
      previousBookingsNotCanceled,
    });
    const leadTimeCat = deriveLeadTimeCat(leadTime ?? 0);
    const adrCat = deriveAdrCat(adr);

    cleanedRows.push({
      hotel: normalizeText(row.hotel),
      is_canceled: isCanceled,
      lead_time: leadTime,
      adr,
      stays_total_nights: staysTotalNights,
      stay_length: stayLength,
      booking_changes_cat: bookingChangesCat,
      days_in_waiting_list_cat: daysInWaitingListCat,
      customer_fidelity: customerFidelity,
      lead_time_cat: leadTimeCat,
      adr_cat: adrCat,
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
      motivation,
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

