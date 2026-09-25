import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

interface UiState {
  toasts: Toast[];
  addToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: number) => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: (message, variant = "success") => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
