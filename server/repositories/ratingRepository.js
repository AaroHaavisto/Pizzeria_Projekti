import {pool} from '../db/pool.js';

export async function getRatings() {
  const [rows] = await pool.query(
    `SELECT rating_id, score, description
     FROM ratings
     ORDER BY rating_id ASC`
  );
  return rows.map(row => ({
    id: row.rating_id,
    score: row.score,
    description: row.description,
  }));
}

export async function updateRating(ratingId, {score, description}) {
  if (!ratingId) {
    throw new Error('ratingId is required');
  }

  const updates = [];
  const values = [];

  if (score != null) {
    updates.push('score = ?');
    values.push(String(score).trim());
  }

  if (description != null) {
    updates.push('description = ?');
    values.push(String(description).trim());
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(ratingId);

  const [result] = await pool.query(
    `UPDATE ratings
     SET ${updates.join(', ')}
     WHERE rating_id = ?`,
    values
  );

  return result.affectedRows > 0;
}