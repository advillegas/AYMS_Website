"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Heart } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Contact() {
  return (
    <section id="contact" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Contact Us
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Join the{" "}
              <span className="text-primary">Family</span>?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Have questions about events, trips, or membership? We&apos;d love
              to hear from you. Reach out and we&apos;ll get back to you
              shortly.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href="https://www.instagram.com/amigasymassocial/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/30"
              >
                <InstagramIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">@amigasymassocial</p>
                  <p className="text-xs text-muted-foreground">
                    Follow us on Instagram
                  </p>
                </div>
              </a>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    hello@amigasymassocial.com
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email us anytime
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4">
                <Heart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Become an Amiga</p>
                  <p className="text-xs text-muted-foreground">
                    Join for free and access the community portal
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Newsletter</h3>
                <p className="text-sm text-muted-foreground">
                  Stay updated on events, trips, and community news.
                </p>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Subscribe
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
