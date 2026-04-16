"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";

const TRIPS = [
  {
    title: "Cancún, Mexico",
    date: "August 20–25, 2026",
    description:
      "All-inclusive resort adventure on the Caribbean coast. Sun, culture, and sisterhood.",
    tag: "International",
    gradient: "from-primary/30 to-coral/20",
  },
  {
    title: "Wine Country, Napa",
    date: "October 10–12, 2026",
    description:
      "A relaxing weekend of wine tastings, spa treatments, and meaningful conversations.",
    tag: "Domestic",
    gradient: "from-gold/30 to-primary/10",
  },
  {
    title: "NYC Weekend",
    date: "November 7–9, 2026",
    description:
      "The city that never sleeps! Broadway, food tours, and shopping with your amigas.",
    tag: "Domestic",
    gradient: "from-coral/20 to-gold/20",
  },
];

export function Trips() {
  return (
    <section id="trips" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Upcoming Trips
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Travel With Your{" "}
            <span className="text-primary">Amigas</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We organize group trips that create lifelong memories. From beach
            getaways to city adventures, there&apos;s something for everyone.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TRIPS.map((trip, i) => (
            <motion.div
              key={trip.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5">
                <div
                  className={`h-48 bg-gradient-to-br ${trip.gradient} flex items-center justify-center`}
                >
                  <MapPin className="h-12 w-12 text-primary/40" />
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{trip.title}</h3>
                    <Badge variant="outline">{trip.tag}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    {trip.date}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {trip.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" render={<Link href="/register" />}>
                    Learn More
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
