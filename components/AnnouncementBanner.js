import { getActiveAnnouncement } from "@/lib/cms";
import AnnouncementBannerClient from "./AnnouncementBannerClient";

/**
 * AnnouncementBanner — server component that reads the active announcement from Redis.
 * Renders nothing if no active announcement exists.
 */
export default async function AnnouncementBanner() {
  let announcement = null;
  try {
    announcement = await getActiveAnnouncement();
  } catch {
    // Redis unavailable — render nothing
  }

  if (!announcement || !announcement.active || !announcement.text) {
    return null;
  }

  return <AnnouncementBannerClient announcement={announcement} />;
}
