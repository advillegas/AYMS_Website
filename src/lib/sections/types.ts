import type { ComponentType } from "react";
import type { SectionType } from "@/lib/builder-store";

/**
 * A field exposed in a section's properties panel. Keep these declarative so
 * the panel is fully schema-driven — no per-section panel code.
 */
export interface SectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "toggle" | "number" | "select" | "image";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
}

/** Props passed to every section's render component. */
export interface SectionRenderProps {
  /** This instance's props (merged over defaults). */
  props: Record<string, unknown>;
  /** True while the admin is editing the page (enables inline affordances). */
  editing: boolean;
}

/**
 * One entry in the section catalog. A section renders the REAL marketing
 * component so the live design is preserved exactly; the builder adds
 * structure (add / reorder / duplicate / hide) and section-level styling.
 */
export interface SectionDef {
  /** Namespaced unique type, e.g. "section.home.hero". */
  type: SectionType;
  /** Human label shown in the builder + add-section library. */
  label: string;
  /** Page group for the add-section library ("Home", "Trips", ...). */
  group: string;
  description?: string;
  /** Renders the section. Usually wraps the existing landing component. */
  Component: ComponentType<SectionRenderProps>;
  /** Optional deep link to a structured editor for this section's list data. */
  manageHref?: string;
  manageLabel?: string;
  /** Extra panel fields beyond the common ones (visibility, background). */
  fields?: SectionField[];
  /** Seed props for new instances. */
  defaultProps?: Record<string, unknown>;
  /** If true, this section can't be deleted (e.g. page chrome). */
  locked?: boolean;
}

/** Common props every section instance understands. */
export interface SectionCommonProps {
  /** Custom label override for the outline/tree. */
  _label?: string;
  /** Hidden from visitors when false (still shown, dimmed, in the editor). */
  visible?: boolean;
  /** CSS color / gradient painted behind the section (empty = component default). */
  bg?: string;
  /** Extra vertical padding (px) added above/below the section. */
  padTop?: string;
  padBottom?: string;
}
