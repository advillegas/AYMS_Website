"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Styles the confirm button as destructive and focuses Cancel by default. */
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & { open: boolean };

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

/**
 * App-wide accessible replacement for window.confirm().
 * Wrap the tree once in ConfirmProvider, then call `const confirm = useConfirm()`
 * and `await confirm({ title, description, destructive })`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({
    open: false,
    title: "",
  });
  const resolveRef = React.useRef<((value: boolean) => void) | undefined>(
    undefined,
  );

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const close = React.useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = undefined;
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{state.title}</DialogTitle>
            {state.description ? (
              <DialogDescription>{state.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => close(false)}
              autoFocus={state.destructive}
            >
              {state.cancelText ?? "Cancel"}
            </Button>
            <Button
              variant={state.destructive ? "destructive" : "default"}
              onClick={() => close(true)}
              autoFocus={!state.destructive}
            >
              {state.confirmText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
