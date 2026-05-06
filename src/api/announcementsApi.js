import fallbackAnnouncementsData from '../data/announcements.json';
import {getAdminRequestHeaders} from '../utils/adminAuth';

const ANNOUNCEMENTS_API_ENDPOINT = '/api/announcements';

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAdminRequestHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export async function fetchAnnouncements() {
  try {
    const payload = await requestJson(ANNOUNCEMENTS_API_ENDPOINT);

    if (Array.isArray(payload.announcements)) {
      return payload.announcements;
    }

    return [];
  } catch {
    return fallbackAnnouncementsData.announcements || [];
  }
}

export async function saveAnnouncement(announcement) {
  const method = announcement?.announcementId ? 'PUT' : 'POST';

  const url = announcement?.announcementId
    ? `${ANNOUNCEMENTS_API_ENDPOINT}/${encodeURIComponent(announcement.announcementId)}`
    : ANNOUNCEMENTS_API_ENDPOINT;

  return requestJson(url, {
    method,
    body: JSON.stringify(announcement),
  });
}

export async function deleteAnnouncement(announcementId) {
  return requestJson(
    `${ANNOUNCEMENTS_API_ENDPOINT}/${encodeURIComponent(announcementId)}`,
    {
      method: 'DELETE',
    }
  );
}