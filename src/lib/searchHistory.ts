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