import {pool} from '../db/pool.js';
import {DEFAULT_OPENING_HOURS} from '../constants/openingHours.js';
import {DEFAULT_LUNCH_OFFER} from '../constants/lunchOffer.js';

export async function getOpeningHours() {
  const [rows] = await pool.query(
    `SELECT
      label,
      title,
      weekdays_label,
      weekdays_hours,
      weekends_label,
      weekends_hours,
      lunch_note
     FROM opening_hours
     LIMIT 1`
  );

  const row = rows[0];

  if (!row) {
    return {...DEFAULT_OPENING_HOURS};
  }

  return {
    label: row.label,
    title: row.title,
    weekdaysLabel: row.weekdays_label,
    weekdaysHours: row.weekdays_hours,
    weekendsLabel: row.weekends_label,
    weekendsHours: row.weekends_hours,
    lunchNote: row.lunch_note,
  };
}

function normalizeLunchOfferRow(row) {
  if (!row) {
    return {...DEFAULT_LUNCH_OFFER};
  }

  return {
    label: row.label,
    title: row.title,
    discountPercent: Number(row.discount_percent),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    activeText: row.active_text,
    inactiveText: row.inactive_text,
  };
}

export async function getLunchOffer() {
  const [rows] = await pool.query(
    `SELECT
      label,
      title,
      discount_percent,
      start_time,
      end_time,
      active_text,
      inactive_text
     FROM lunch_offers
     LIMIT 1`
  );

  return normalizeLunchOfferRow(rows[0]);
}

export async function updateLunchOffer({
  label,
  title,
  discountPercent,
  startTime,
  endTime,
  activeText,
  inactiveText,
}) {
  const [rows] = await pool.query(
    `SELECT lunch_offer_id FROM lunch_offers LIMIT 1`
  );

  if (rows.length === 0) {
    throw new Error('Lunch offer row not found');
  }

  const id = rows[0].lunch_offer_id;

  const [result] = await pool.query(
    `UPDATE lunch_offers
     SET label = ?,
         title = ?,
         discount_percent = ?,
         start_time = ?,
         end_time = ?,
         active_text = ?,
         inactive_text = ?
     WHERE lunch_offer_id = ?`,
    [
      String(label).trim(),
      String(title).trim(),
      Number(discountPercent),
      String(startTime).trim(),
      String(endTime).trim(),
      String(activeText).trim(),
      String(inactiveText).trim(),
      id,
    ]
  );

  return result.affectedRows > 0;
}