/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

const SEARCH_HISTORY_KEY = 'civiq-zip-search-history';
const MAX_HISTORY_ITEMS = 5;

export interface SearchHistoryItem {
  zipCode: string;
  timestamp: number;
  displayName?: string; // For showing "ZIP - State, District" format later
}

export class SearchHistory {
  static getHistory(): SearchHistoryItem[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = sessionStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored) as SearchHistoryItem[];
      return history.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    } catch (error) {
      console.error('Error reading search history:', error);
      return [];
    }
  }

  static addSearch(zipCode: string, displayName?: string): void {
    try {
      const history = this.getHistory();
      
      // Remove existing entry for this ZIP code if it exists
      const filteredHistory = history.filter(item => item.zipCode !== zipCode);
      
      // Add new entry at the beginning
      const newItem: SearchHistoryItem = {
        zipCode,
        timestamp: Date.now(),
        displayName
      };
      
      const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  static clearHistory(): void {
    try {
      sessionStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  static removeSearch(zipCode: string): void {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(item => item.zipCode !== zipCode);
      sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing search from history:', error);
    }
  }

  static updateSearchDisplayName(zipCode: string, displayName: string): void {
    try {
      const history = this.getHistory();
      const updatedHistory = history.map(item => 
        item.zipCode === zipCode 
          ? { ...item, displayName }
          : item
      );
      sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error updating search display name:', error);
    }
  }
}