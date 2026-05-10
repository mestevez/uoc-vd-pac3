import * as d3 from 'd3';

export type HotelBookingReadyRow = {
  hotel: string;
  isCanceled: number;
  leadTime: number;
  adr: number;
  staysTotalNights: number;
  stayLength: string;
  bookingChangesCat: string;
  daysInWaitingListCat: string;
  customerFidelity: string;
  leadTimeCat: string;
  adrCat: string;
  arrivalYear: number;
  arrivalMonth: string;
  arrivalMonthIndex: number;
  arrivalYm: string;
  marketSegment: string;
  depositType: string;
  country: string;
  motivation: string;
  reservedRoomType: string;
  customerType: string;
  agent: string;
  company: string;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function loadHotelBookingsReadyCsv(): Promise<HotelBookingReadyRow[]> {
  const url = `${import.meta.env.BASE_URL}data/hotel_bookings_ready.csv`;

  return d3.csv(url, (row) => ({
    hotel: row.hotel ?? 'Unknown',
    isCanceled: toNumber(row.is_canceled ?? '0'),
    leadTime: toNumber(row.lead_time ?? '0'),
    adr: toNumber(row.adr ?? '0'),
    staysTotalNights: toNumber(row.stays_total_nights ?? '0'),
    stayLength: row.stay_length ?? 'Unknown',
    bookingChangesCat: row.booking_changes_cat ?? 'Unknown',
    daysInWaitingListCat: row.days_in_waiting_list_cat ?? 'Unknown',
    customerFidelity: row.customer_fidelity ?? 'Unknown',
    leadTimeCat: row.lead_time_cat ?? 'Unknown',
    adrCat: row.adr_cat ?? 'Unknown',
    arrivalYear: toNumber(row.arrival_year ?? '0'),
    arrivalMonth: row.arrival_month ?? 'Unknown',
    arrivalMonthIndex: toNumber(row.arrival_month_index ?? '0'),
    arrivalYm: row.arrival_ym ?? 'Unknown',
    marketSegment: row.market_segment ?? 'Unknown',
    depositType: row.deposit_type ?? 'Unknown',
    country: row.country ?? 'Unknown',
    motivation: row.motivation ?? 'Unknown',
    reservedRoomType: row.reserved_room_type ?? 'Unknown',
    customerType: row.customer_type ?? 'Unknown',
    agent: row.agent ?? 'Unknown',
    company: row.company ?? 'Unknown',
  }));
}

