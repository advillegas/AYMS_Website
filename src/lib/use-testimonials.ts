"use client";

/**
 * Firestore-backed testimonials with realtime subscription and automatic
 * seed migration from the static TESTIMONIALS_SEED array.
 *
 * Mirrors use-events.ts: graceful Firebase guard, onSnapshot read (no
 * orderBy — sorted client-side), and a one-time seed when the collection
 * is empty. When Firestore isn't configured the hook falls back to the
 * static seed so the marketing site still renders testimonials.
 *
 * The seed array is the canonical hardcoded content lifted out of
 * testimonials.tsx so the component and the hook share one source.
 */

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  doc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  trip: string;
  en: string;
  es: string;
  initials: string;
  gradient: string;
  featured: boolean;
}

interface TestimonialDoc {
  name?: string;
  location?: string;
  trip?: string;
  en?: string;
  es?: string;
  initials?: string;
  gradient?: string;
  featured?: boolean;
}

/**
 * Canonical hardcoded testimonials (formerly inline in testimonials.tsx).
 * Used both as the Firestore seed and as the offline fallback.
 */
export const TESTIMONIALS_SEED: Testimonial[] = [
  {
    id: "sofia-r",
    name: "Sofia R.",
    location: "Miami, FL",
    trip: "Cancún, 2025",
    en: "AYMS gave me a second family. The trips are incredible and the friendships are real. I've never felt so welcomed anywhere.",
    es: "AYMS me dio una segunda familia. Los viajes son increíbles y las amistades son reales. Nunca me he sentido tan bienvenida.",
    initials: "SR",
    gradient: "from-[#FF0099] to-[#B51760]",
    featured: true,
  },
  {
    id: "valentina-l",
    name: "Valentina L.",
    location: "New York, NY",
    trip: "Coffee & Cuties, 2026",
    en: "From the first Coffee & Cuties event, I knew I was home. The sisterhood here is unlike anything I've experienced before.",
    es: "Desde el primer evento de Coffee & Cuties, supe que estaba en casa. La hermandad aquí es única.",
    initials: "VL",
    gradient: "from-[#DAA520] to-[#C44B3F]",
    featured: true,
  },
  {
    id: "camila-t",
    name: "Camila T.",
    location: "Chicago, IL",
    trip: "Summer Camp, 2025",
    en: "Summer camp changed my life. The bonds we built in three days will last a lifetime. Can't wait for next year!",
    es: "El campamento de verano cambió mi vida. Los lazos que construimos en tres días durarán toda la vida.",
    initials: "CT",
    gradient: "from-[#9B2C8A] to-[#FF0099]",
    featured: true,
  },
  {
    id: "isabella-m",
    name: "Isabella M.",
    location: "Austin, TX",
    trip: "Bali, 2024",
    en: "Everything was planned perfectly but still felt spontaneous. The temples, the food, the friendships — Bali with AYMS was a dream.",
    es: "Todo estaba planeado perfectamente pero se sentía espontáneo. Los templos, la comida, las amistades — Bali con AYMS fue un sueño.",
    initials: "IM",
    gradient: "from-[#2D8B6F] to-[#DAA520]",
    featured: true,
  },
  {
    id: "diana-p",
    name: "Diana P.",
    location: "Los Angeles, CA",
    trip: "Morocco, 2025",
    en: "The Sahara glamping was something out of a movie. I never thought I'd ride a camel at sunset with 13 amazing women. Thank you AYMS!",
    es: "El glamping en el Sahara fue algo de película. Nunca pensé que montaría un camello al atardecer con 13 mujeres increíbles.",
    initials: "DP",
    gradient: "from-[#C44B3F] to-[#DAA520]",
    featured: false,
  },
  {
    id: "ana-g",
    name: "Ana G.",
    location: "Houston, TX",
    trip: "Colombia, 2025",
    en: "Cartagena was magical. The salsa lessons, the street food, the rooftop dinners — every single detail was curated to perfection.",
    es: "Cartagena fue mágica. Las clases de salsa, la comida callejera, las cenas en la azotea — cada detalle fue curado a la perfección.",
    initials: "AG",
    gradient: "from-[#B51760] to-[#9B2C8A]",
    featured: false,
  },
  {
    id: "lucia-r",
    name: "Lucia R.",
    location: "Phoenix, AZ",
    trip: "Napa Valley, 2025",
    en: "I was nervous traveling alone for the first time. By day two, I had 15 new best friends. If you're hesitating — just go. You won't regret it.",
    es: "Estaba nerviosa viajando sola por primera vez. Para el segundo día, tenía 15 nuevas mejores amigas. Si estás dudando — solo ve.",
    initials: "LR",
    gradient: "from-[#FF0099] to-[#FF6BA8]",
    featured: false,
  },
  {
    id: "carmen-s",
    name: "Carmen S.",
    location: "San Diego, CA",
    trip: "Safari, 2025",
    en: "Seeing the Big Five with my amigas was a bucket list moment I'll cherish forever. AYMS makes the impossible feel effortless.",
    es: "Ver los Big Five con mis amigas fue un momento de mi lista de deseos que atesoraré para siempre. AYMS hace lo imposible fácil.",
    initials: "CS",
    gradient: "from-[#DAA520] to-[#8B4513]",
    featured: false,
  },
];

const COLLECTION = "testimonials";

function docToTestimonial(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Testimonial {
  const data = d.data() as TestimonialDoc;
  return {
    id: d.id,
    name: data.name ?? "",
    location: data.location ?? "",
    trip: data.trip ?? "",
    en: data.en ?? "",
    es: data.es ?? "",
    initials: data.initials ?? "",
    gradient: data.gradient ?? "from-[#FF0099] to-[#B51760]",
    featured: data.featured ?? false,
  };
}

/* ------------------------------------------------------------------ */
/* Supabase mirror (testimonials table)                                */
/* ------------------------------------------------------------------ */

interface TestimonialRow {
  id: string;
  name: string | null;
  location: string | null;
  trip: string | null;
  en: string | null;
  es: string | null;
  initials: string | null;
  gradient: string | null;
  featured: boolean | null;
  created_at: string | null;
}

function rowToTestimonial(r: TestimonialRow): Testimonial {
  return {
    id: r.id,
    name: r.name ?? "",
    location: r.location ?? "",
    trip: r.trip ?? "",
    en: r.en ?? "",
    es: r.es ?? "",
    initials: r.initials ?? "",
    gradient: r.gradient ?? "from-[#FF0099] to-[#B51760]",
    featured: r.featured ?? false,
  };
}

let sbSeeded = false;

async function seedSupabaseIfEmpty(): Promise<void> {
  if (sbSeeded) return;
  const sb = getSupabase();
  if (!sb) return;
  sbSeeded = true;
  try {
    const { count } = await sb
      .from("testimonials")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    const rows = TESTIMONIALS_SEED.map((t) => ({
      id: t.id,
      name: t.name,
      location: t.location,
      trip: t.trip,
      en: t.en,
      es: t.es,
      initials: t.initials,
      gradient: t.gradient,
      featured: t.featured,
    }));
    await sb.from("testimonials").upsert(rows);
    console.debug("[testimonials:sb] seeded with TESTIMONIALS_SEED");
  } catch (err) {
    console.warn("[testimonials:sb] seed failed", err);
    sbSeeded = false;
  }
}

/* ------------------------------------------------------------------ */
/* Seed migration                                                      */
/* ------------------------------------------------------------------ */

let seeded = false;

async function seedIfEmpty(): Promise<void> {
  if (seeded || !isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  seeded = true;
  try {
    const snap = await getDocs(query(collection(db, COLLECTION), limit(1)));
    if (!snap.empty) return;
    for (const t of TESTIMONIALS_SEED) {
      await setDoc(doc(db, COLLECTION, t.id), {
        name: t.name,
        location: t.location,
        trip: t.trip,
        en: t.en,
        es: t.es,
        initials: t.initials,
        gradient: t.gradient,
        featured: t.featured,
        createdAt: serverTimestamp(),
      });
    }
    console.debug("[testimonials] seeded Firestore with TESTIMONIALS_SEED");
  } catch (err) {
    console.warn("[testimonials] seed failed", err);
    seeded = false;
  }
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export interface UseTestimonialsResult {
  testimonials: Testimonial[];
  loading: boolean;
  isFirestore: boolean;
}

export function useTestimonials(): UseTestimonialsResult {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    // Render the seed immediately so SSR + first paint always have content;
    // the snapshot replaces it once Firestore responds.
    TESTIMONIALS_SEED,
  );
  const [loading, setLoading] = useState<boolean>(
    isFirebaseConfigured || useSupabaseBackend,
  );
  const isFirestore = isFirebaseConfigured || useSupabaseBackend;

  useEffect(() => {
    if (useSupabaseBackend) {
      void seedSupabaseIfEmpty();
      return subscribeQuery<TestimonialRow>(
        "testimonials",
        (sb) => sb.from("testimonials").select("*").limit(200),
        (rows) => {
          if (rows.length === 0) {
            // Seed may still be in-flight — keep the static content visible.
            setTestimonials(TESTIMONIALS_SEED);
          } else {
            setTestimonials(
              rows
                .map(rowToTestimonial)
                .filter((t) => t.en)
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
          setLoading(false);
        },
        (msg) => {
          console.warn("[testimonials:sb] query failed", msg);
          setTestimonials(TESTIMONIALS_SEED);
          setLoading(false);
        },
      );
    }
    if (!isFirebaseConfigured) {
      setTestimonials(TESTIMONIALS_SEED);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setTestimonials(TESTIMONIALS_SEED);
      setLoading(false);
      return;
    }
    void seedIfEmpty();
    const q = query(collection(db, COLLECTION), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          // Seed may still be in-flight — keep the static content visible.
          setTestimonials(TESTIMONIALS_SEED);
        } else {
          const list = snap.docs
            .map(docToTestimonial)
            .filter((t) => t.en)
            .sort((a, b) => a.name.localeCompare(b.name));
          setTestimonials(list);
        }
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[testimonials] snapshot failed", err);
        setTestimonials(TESTIMONIALS_SEED);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { testimonials, loading, isFirestore };
}
