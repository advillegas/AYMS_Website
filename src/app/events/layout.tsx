import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & Meetups for Latinas",
  description:
    "Coffee meetups, camp weekends, city adventures, and more. " +
    "Find upcoming Latina community events near you and RSVP to connect with your new amigas.",
  openGraph: {
    title: "Latina Community Events & Meetups | Amigas Y Más Social",
    description:
      "Coffee & Cuties, Summer Camp, city tours — find your next Latina community event.",
  },
  alternates: {
    canonical: "/events",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
