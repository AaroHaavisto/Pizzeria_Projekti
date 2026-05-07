import express from 'express';
import {requireAdmin} from '../middleware/requireAdmin.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';

const router = express.Router();

let announcements = [
  {
    id: 'summer-opening-hours',
    announcementId: 'summer-opening-hours',
    title: 'Kesän aukioloajat',
    message: 'Olemme kesällä avoinna joka päivä klo 10–22.',
    content: 'Olemme kesällä avoinna joka päivä klo 10–22.',
    active: true,
  },
  {
    id: 'new-pizza',
    announcementId: 'new-pizza',
    title: 'Uusi pizza listalla',
    message: 'Kokeile uutta tulista Diavola-pizzaamme.',
    content: 'Kokeile uutta tulista Diavola-pizzaamme.',
    active: true,
  },
];

function normalizeAnnouncement(announcement) {
  return {
    ...announcement,
    id: announcement.id || announcement.announcementId,
    message: announcement.message || announcement.content,
  };
}

function createAnnouncementId(title) {
  return String(title || 'tiedote')
    .trim()
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .concat('-', Date.now());
}

function validateAnnouncement(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('title is required and must be string');
  }

  if (!payload.content || typeof payload.content !== 'string' || !payload.content.trim()) {
    errors.push('content is required and must be string');
  }

  if (payload.active != null && typeof payload.active !== 'boolean') {
    errors.push('active must be boolean');
  }

  return errors;
}

router.get('/', (_req, res) => {
  res.json({announcements: announcements.map(normalizeAnnouncement)});
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const errors = validateAnnouncement(req.body);

    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const announcementId = createAnnouncementId(req.body.title);

    const announcement = {
      id: announcementId,
      announcementId,
      title: req.body.title.trim(),
      message: req.body.content.trim(),
      content: req.body.content.trim(),
      active: Boolean(req.body.active),
    };

    announcements = [announcement, ...announcements];

    res.status(201).json({
      message: 'Announcement created',
      announcement: normalizeAnnouncement(announcement),
      announcements: announcements.map(normalizeAnnouncement),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:announcementId', requireAdmin, (req, res) => {
  try {
    const errors = validateAnnouncement(req.body);

    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const announcementId = req.params.announcementId;
    const existing = announcements.find(
      announcement => announcement.announcementId === announcementId
    );

    if (!existing) {
      throw createHttpError(
        404,
        'ANNOUNCEMENT_NOT_FOUND',
        'Announcement not found'
      );
    }

    const updatedAnnouncement = {
      ...existing,
      title: req.body.title.trim(),
      message: req.body.content.trim(),
      content: req.body.content.trim(),
      active: Boolean(req.body.active),
    };

    announcements = announcements.map(announcement =>
      announcement.announcementId === announcementId
        ? updatedAnnouncement
        : announcement
    );

    res.json({
      message: 'Announcement updated',
      announcement: normalizeAnnouncement(updatedAnnouncement),
      announcements: announcements.map(normalizeAnnouncement),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/:announcementId', requireAdmin, (req, res) => {
  try {
    const announcementId = req.params.announcementId;
    const exists = announcements.some(
      announcement => announcement.announcementId === announcementId
    );

    if (!exists) {
      throw createHttpError(
        404,
        'ANNOUNCEMENT_NOT_FOUND',
        'Announcement not found'
      );
    }

    announcements = announcements.filter(
      announcement => announcement.announcementId !== announcementId
    );

    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
});

export default router;  