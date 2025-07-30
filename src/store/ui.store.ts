/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UIState {
  // Navigation
  isMenuOpen: boolean;
  isMobileMenuOpen: boolean;
  activeTab: string | null;

  // Notifications
  notifications: Notification[];

  // Modals
  modalOpen: string | null;
  modalData: Record<string, unknown> | null;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Actions
  toggleMenu: () => void;
  setMenuOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: string | null) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modal actions
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isMenuOpen: false,
      isMobileMenuOpen: false,
      activeTab: null,
      notifications: [],
      modalOpen: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: null,

      // Menu actions
      toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen }), false, 'toggleMenu'),

      setMenuOpen: isMenuOpen => set({ isMenuOpen }, false, 'setMenuOpen'),

      toggleMobileMenu: () =>
        set(state => ({ isMobileMenuOpen: !state.isMobileMenuOpen }), false, 'toggleMobileMenu'),

      setMobileMenuOpen: isMobileMenuOpen => set({ isMobileMenuOpen }, false, 'setMobileMenuOpen'),

      setActiveTab: activeTab => set({ activeTab }, false, 'setActiveTab'),

      // Notification actions
      addNotification: notification => {
        const id = `notification-${Date.now()}-${Math.random()}`;
        const newNotification: Notification = { ...notification, id };

        set(
          state => ({
            notifications: [...state.notifications, newNotification],
          }),
          false,
          'addNotification'
        );

        // Auto-remove after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || 5000);
        }
      },

      removeNotification: id =>
        set(
          state => ({
            notifications: state.notifications.filter(n => n.id !== id),
          }),
          false,
          'removeNotification'
        ),

      clearNotifications: () => set({ notifications: [] }, false, 'clearNotifications'),

      // Modal actions
      openModal: (modalOpen, modalData?) =>
        set({ modalOpen, modalData: modalData || null }, false, 'openModal'),

      closeModal: () => set({ modalOpen: null, modalData: null }, false, 'closeModal'),

      // Loading actions
      setGlobalLoading: (globalLoading, loadingMessage?: string) =>
        set({ globalLoading, loadingMessage }, false, 'setGlobalLoading'),
    }),
    {
      name: 'UIStore',
    }
  )
);
