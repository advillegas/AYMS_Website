import { redirect } from "next/navigation";

/**
 * Meetups and events were merged into one "Events" category. The standalone
 * meetups surface (list + map + host form) now lives on the unified calendar:
 * grid / list / map views, a member "Host" button, RSVP, and host-or-admin
 * delete. This route is kept as a permanent redirect so old links, bookmarks,
 * and notification deep-links don't 404.
 */
export default function MeetupsRedirect() {
  redirect("/community/calendar");
}
