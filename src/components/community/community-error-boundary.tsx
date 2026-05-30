"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere inside the community area so a
 * single bad component doesn't blow up the whole renderer (which on
 * Edge/Chromium can present as a "this page couldn't load" tab
 * crash). Renders an inline recovery card with options to reload or
 * go back home.
 */
export class CommunityErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to the console so Vercel + browser devtools both pick it up.
    console.error("[community] render error", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-2xl border border-rosa/30 bg-card p-6 text-card-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-coral/15 text-coral">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-base font-[family-name:var(--font-heading)]">
                Something glitched out
              </h2>
              <p className="text-xs text-muted-foreground">
                The community surface hit an unexpected error.
              </p>
            </div>
          </div>

          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-foreground/80 whitespace-pre-wrap break-words">
            {error.message || String(error)}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                this.handleReset();
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="bg-primary text-primary-foreground hover:bg-magenta"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Reload
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={this.handleReset}
              className="border-rosa/40"
            >
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Home className="mr-2 h-4 w-4" /> Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
