import { v4 as uuid } from "uuid";
import type { BuilderElement } from "@/lib/builder-store";
import { ownSectionsForPage } from "./registry";

/**
 * Build the default section list for a page from its registered sections, in
 * registry order, all visible. Used to seed the editor the first time a page
 * is opened in the section builder (mirrors the coded page exactly).
 */
export function seedSectionsForPage(slug: string): BuilderElement[] {
  return ownSectionsForPage(slug).map((def) => ({
    id: uuid(),
    type: def.type,
    props: { visible: true, ...(def.defaultProps ?? {}) },
  }));
}
