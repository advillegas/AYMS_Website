"use client";

/**
 * Name → Lucide icon map for editable section tiles. Section tile data is
 * stored as JSON (cms_config), so icons must travel as string names and be
 * resolved to components at render time. ICON_CHOICES drives the icon picker
 * in the admin tile editors.
 */

import {
  Heart,
  Globe,
  Coffee,
  Sparkles,
  Users,
  Crown,
  Shield,
  MapPin,
  Star,
  Plane,
  Compass,
  Sun,
  Camera,
  Music,
  Gift,
  Calendar,
  Mountain,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

export const SECTION_ICONS: Record<string, LucideIcon> = {
  Heart,
  Globe,
  Coffee,
  Sparkles,
  Users,
  Crown,
  Shield,
  MapPin,
  Star,
  Plane,
  Compass,
  Sun,
  Camera,
  Music,
  Gift,
  Calendar,
  Mountain,
  Utensils,
  Wine,
};

/** Resolve a stored icon name to a component, defaulting to Sparkles. */
export function iconByName(name: string | undefined): LucideIcon {
  return (name && SECTION_ICONS[name]) || Sparkles;
}

/** Ordered list of selectable icon names for the picker. */
export const ICON_CHOICES: string[] = Object.keys(SECTION_ICONS);
