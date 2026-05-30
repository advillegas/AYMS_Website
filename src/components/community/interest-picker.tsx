"use client";

import { useState } from "react";
import { INTEREST_CATEGORIES } from "@/lib/profile-constants";
import { cn } from "@/lib/utils";
import { X, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InterestPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

const COLORS = [
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

function colorFor(interest: string): string {
  let hash = 0;
  for (let i = 0; i < interest.length; i++) {
    hash = (hash * 31 + interest.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function InterestPicker({
  selected,
  onChange,
  readOnly,
}: InterestPickerProps) {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");

  if (readOnly) {
    if (selected.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {selected.map((i) => (
          <span
            key={i}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
              colorFor(i),
            )}
          >
            {i}
          </span>
        ))}
      </div>
    );
  }

  const filtered = INTEREST_CATEGORIES.filter(
    (c) =>
      !selected.includes(c) &&
      c.toLowerCase().includes(search.toLowerCase()),
  );

  function add(interest: string) {
    if (!selected.includes(interest)) {
      onChange([...selected, interest]);
    }
    setSearch("");
    setCustom("");
  }

  function remove(interest: string) {
    onChange(selected.filter((s) => s !== interest));
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustom("");
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium border",
                colorFor(i),
              )}
            >
              {i}
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search interests..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => add(c)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-dashed hover:border-solid transition-colors",
              colorFor(c),
            )}
          >
            <Plus className="h-3 w-3" />
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add your own..."
          className="h-8 text-xs flex-1"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-magenta disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
