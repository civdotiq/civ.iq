/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { structuredLogger } from '@/lib/logging/universal-logger';

export interface CardData {
  cardId: string;
  repId: string;
  repName: string;
  stats: string[];
  template: string;
  timestamp: string;
  templateId?: string;
}

export class CardTracker {
  private static readonly STORAGE_KEY = 'civiq_trading_cards';

  /**
   * Generate a unique card ID
   */
  static generateCardId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Store card data in localStorage
   */
  static storeCard(cardData: CardData): void {
    try {
      const existingCards = this.getStoredCards();
      const updatedCards = [...existingCards, cardData];

      // Keep only the last 50 cards to prevent storage overflow
      const cardsToStore = updatedCards.slice(-50);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cardsToStore));
    } catch (error) {
      structuredLogger.error('Failed to store card data', {
        component: 'cardTracking',
        error: error as Error,
      });
    }
  }

  /**
   * Get all stored cards
   */
  static getStoredCards(): CardData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      structuredLogger.error('Failed to retrieve stored cards', {
        component: 'cardTracking',
        error: error as Error,
      });
      return [];
    }
  }

  /**
   * Get a specific card by ID
   */
  static getCard(cardId: string): CardData | null {
    const cards = this.getStoredCards();
    return cards.find(card => card.cardId === cardId) || null;
  }

  /**
   * Get cards for a specific representative
   */
  static getCardsForRepresentative(repId: string): CardData[] {
    const cards = this.getStoredCards();
    return cards.filter(card => card.repId === repId);
  }

  /**
   * Get recent cards
   */
  static getRecentCards(limit: number = 10): CardData[] {
    const cards = this.getStoredCards();
    return cards
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clear all stored cards
   */
  static clearCards(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      structuredLogger.error('Failed to clear cards', {
        component: 'cardTracking',
        error: error as Error,
      });
    }
  }

  /**
   * Generate sharing URL for a card
   */
  static generateSharingUrl(cardId: string, source: string = 'share'): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://civ.iq';
    return `${baseUrl}/c/${cardId}?utm_source=${source}&utm_medium=share&utm_campaign=trading_card`;
  }

  /**
   * Generate QR code URL for a card
   */
  static generateQRUrl(cardId: string): string {
    return this.generateSharingUrl(cardId, 'qr');
  }

  /**
   * Track card view/interaction
   */
  static trackCardInteraction(cardId: string, interaction: 'view' | 'share' | 'download'): void {
    // This would typically send to an analytics service
    // For now, we'll just log it
    structuredLogger.info('Card interaction tracked', {
      component: 'cardTracking',
      metadata: {
        cardId,
        interaction,
        timestamp: new Date().toISOString(),
      },
    });

    // Store interaction in localStorage for basic analytics
    try {
      const interactionKey = `civiq_card_interactions_${cardId}`;
      const existing = localStorage.getItem(interactionKey);
      const interactions = existing ? JSON.parse(existing) : [];

      interactions.push({
        interaction,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      });

      localStorage.setItem(interactionKey, JSON.stringify(interactions));
    } catch (error) {
      structuredLogger.error('Failed to track interaction', {
        component: 'cardTracking',
        error: error as Error,
      });
    }
  }
}

export default CardTracker;
