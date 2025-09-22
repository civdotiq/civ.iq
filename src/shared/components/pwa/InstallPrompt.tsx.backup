'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallButton: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installResult: 'accepted' | 'dismissed' | null;
}

export function InstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    deferredPrompt: null,
    showInstallButton: false,
    isInstalled: false,
    isStandalone: false,
    installResult: null,
  });

  useEffect(() => {
    // Check if app is already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setState(prev => ({ ...prev, isStandalone }));

    // Check if app is already installed
    const isInstalled = localStorage.getItem('pwa-installed') === 'true' || isStandalone;
    setState(prev => ({ ...prev, isInstalled }));

    if (isInstalled) return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      console.log('[PWA] Install prompt event received');

      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Save the event so it can be triggered later
      setState(prev => ({
        ...prev,
        deferredPrompt: event,
        showInstallButton: true,
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      localStorage.setItem('pwa-installed', 'true');
      setState(prev => ({
        ...prev,
        isInstalled: true,
        showInstallButton: false,
        deferredPrompt: null,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS specific detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInIOSStandalone = (window.navigator as any).standalone;

    if (isIOS && !isInIOSStandalone) {
      // Show iOS install instructions after a delay
      setTimeout(() => {
        setState(prev => ({ ...prev, showInstallButton: true }));
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!state.deferredPrompt) {
      // For iOS or other browsers without install prompt
      showIOSInstallInstructions();
      return;
    }

    console.log('[PWA] Showing install prompt');

    // Show the install prompt
    await state.deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await state.deferredPrompt.userChoice;

    console.log('[PWA] User choice:', outcome);

    setState(prev => ({
      ...prev,
      installResult: outcome,
      showInstallButton: false,
      deferredPrompt: null,
    }));

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
    }
  };

  const dismissInstallPrompt = () => {
    setState(prev => ({ ...prev, showInstallButton: false }));
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  const showIOSInstallInstructions = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    `;

    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Install CivicHub</h3>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
        To install this app on your iPhone/iPad:
      </p>
      <div style="text-align: left; margin: 0 0 20px 0;">
        <p style="margin: 8px 0; display: flex; align-items: center;">
          <span style="margin-right: 8px;">1.</span>
          <span>Tap the Share button</span>
          <span style="margin-left: 8px; font-size: 18px;">⎆</span>
        </p>
        <p style="margin: 8px 0; display: flex; align-items: center;">
          <span style="margin-right: 8px;">2.</span>
          <span>Tap "Add to Home Screen"</span>
          <span style="margin-left: 8px; font-size: 18px;">📱</span>
        </p>
        <p style="margin: 8px 0; display: flex; align-items: center;">
          <span style="margin-right: 8px;">3.</span>
          <span>Tap "Add"</span>
          <span style="margin-left: 8px; font-size: 18px;">✅</span>
        </p>
      </div>
      <button id="ios-install-close" style="
        background: #e11d07;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      ">Got it!</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('ios-install-close')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      dismissInstallPrompt();
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        dismissInstallPrompt();
      }
    });
  };

  // Don't show if already installed or in standalone mode
  if (state.isInstalled || state.isStandalone || !state.showInstallButton) {
    return null;
  }

  // Check if user recently dismissed
  const dismissedTime = localStorage.getItem('pwa-dismissed');
  if (dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
    return null; // Don't show for 24 hours after dismissal
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'linear-gradient(135deg, #e11d07, #0a9338)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>📱</span>
        <div>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Install CivicHub</div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            Access your representatives offline
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            background: 'white',
            color: '#e11d07',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Install
        </button>
        <button
          onClick={dismissInstallPrompt}
          style={{
            background: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Utility hook for PWA detection
export function usePWADetection() {
  const [isPWA, setIsPWA] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    setIsPWA(isStandalone);

    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return { isPWA, isInstallable };
}
