/**
 * @file toastStore.ts
 * @description Store Zustand gérant les notifications toast temporaires
 * (succès, erreur, info) avec auto-dismiss après 3 secondes.
 * Expose aussi des raccourcis statiques : toast.success(), toast.error(), toast.info().
 * @module store/toastStore
 */

import { create } from 'zustand';

/**
 * @typedef ToastType
 * @description Niveau de sévérité d'une notification toast.
 */
export type ToastType = 'success' | 'error' | 'info';

/**
 * @interface ToastItem
 * @description Représente une notification toast affichée dans l'interface.
 */
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

/**
 * @interface ToastStore
 * @description Contrat du store toast : liste des notifications actives
 * et méthodes pour en ajouter ou en supprimer.
 */
interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

/**
 * Hook Zustand exposant la liste des toasts actifs et les actions associées.
 * @returns L'état du store toast (toasts, addToast, removeToast).
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    // Auto-dismiss after 3s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Raccourcis statiques pour afficher rapidement un toast sans accéder au store.
 * @example
 * toast.success('Sauvegarde réussie');
 * toast.error('Erreur lors de l\'export');
 */
export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
};
