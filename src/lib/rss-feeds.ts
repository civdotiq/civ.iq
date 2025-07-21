/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Government RSS Feeds Integration
 * 
 * This module provides utilities for fetching and parsing RSS feeds
 * from official government sources and news organizations.
 */

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  author?: string;
  category?: string[];
  source: string;
  feedUrl: string;
}

interface RSSFeed {
  title: string;
  description: string;
  link: string;
  lastBuildDate: string;
  items: RSSItem[];
  source: string;
  category: 'government' | 'congress' | 'executive' | 'judicial' | 'news';
}

interface GovernmentRSSConfig {
  timeout: number;
  maxItems: number;
  cacheTimeout: number;
}

// Government and news RSS feed sources
const RSS_FEEDS = {
  government: [
    {
      name: 'White House Press Releases',
      url: 'https://www.whitehouse.gov/feed/',
      category: 'executive' as const,
      priority: 'high'
    },
    {
      name: 'Federal Register',
      url: 'https://www.federalregister.gov/documents/search.rss',
      category: 'government' as const,
      priority: 'medium'
    },
    {
      name: 'U.S. Senate Press Releases',
      url: 'https://www.senate.gov/rss/feeds/news.xml',
      category: 'congress' as const,
      priority: 'high'
    },
    {
      name: 'House of Representatives News',
      url: 'https://www.house.gov/rss/press-releases.xml',
      category: 'congress' as const,
      priority: 'high'
    },
    {
      name: 'Supreme Court News',
      url: 'https://www.supremecourt.gov/rss/news.xml',
      category: 'judicial' as const,
      priority: 'medium'
    },
    {
      name: 'GAO Reports',
      url: 'https://www.gao.gov/rss/reports.xml',
      category: 'government' as const,
      priority: 'low'
    },
    {
      name: 'CBO Publications',
      url: 'https://www.cbo.gov/rss/publications.xml',
      category: 'government' as const,
      priority: 'low'
    }
  ],
  news: [
    {
      name: 'Politico Congress',
      url: 'https://www.politico.com/rss/congress.xml',
      category: 'news' as const,
      priority: 'high'
    },
    {
      name: 'The Hill Congress',
      url: 'https://thehill.com/news/house/feed/',
      category: 'news' as const,
      priority: 'high'
    },
    {
      name: 'Roll Call News',
      url: 'https://rollcall.com/feed/',
      category: 'news' as const,
      priority: 'high'
    },
    {
      name: 'Congress.gov Blog',
      url: 'https://blogs.loc.gov/law/category/congress/feed/',
      category: 'government' as const,
      priority: 'medium'
    },
    {
      name: 'Federal News Network Congress',
      url: 'https://federalnewsnetwork.com/category/congress/feed/',
      category: 'news' as const,
      priority: 'medium'
    }
  ]
};

// Rate limiter for RSS feeds
class RSSRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerMinute = 60;

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.requests[0]);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

class GovernmentRSSFetcher {
  private config: GovernmentRSSConfig;
  private cache: Map<string, { data: RSSFeed; timestamp: number }>;
  private rateLimiter: RSSRateLimiter;

  constructor(config?: Partial<GovernmentRSSConfig>) {
    this.config = {
      timeout: 15000,
      maxItems: 50,
      cacheTimeout: 30 * 60 * 1000, // 30 minutes
      ...config
    };
    
    this.cache = new Map();
    this.rateLimiter = new RSSRateLimiter();
  }

  /**
   * Fetch and parse an RSS feed
   */
  async fetchRSSFeed(
    feedUrl: string, 
    feedName: string, 
    category: RSSFeed['category']
  ): Promise<RSSFeed | null> {
    const cacheKey = feedUrl;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      console.log(`Fetching RSS feed: ${feedName}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const feed = await this.parseRSSXML(xmlText, feedName, feedUrl, category);

      if (feed) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: feed,
          timestamp: Date.now()
        });
      }

      return feed;

    } catch (error) {
      console.error(`Error fetching RSS feed ${feedName}:`, error);
      return null;
    }
  }

  /**
   * Parse RSS XML into structured data
   */
  private async parseRSSXML(
    xmlText: string, 
    feedName: string, 
    feedUrl: string, 
    category: RSSFeed['category']
  ): Promise<RSSFeed | null> {
    try {
      // Basic XML parsing without dependencies
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing error');
      }

      const channel = doc.querySelector('channel');
      if (!channel) {
        throw new Error('Invalid RSS format - no channel element');
      }

      // Extract feed metadata
      const title = this.getTextContent(channel, 'title') || feedName;
      const description = this.getTextContent(channel, 'description') || '';
      const link = this.getTextContent(channel, 'link') || feedUrl;
      const lastBuildDate = this.getTextContent(channel, 'lastBuildDate') || 
                           this.getTextContent(channel, 'pubDate') || 
                           new Date().toISOString();

      // Extract items
      const itemElements = Array.from(channel.querySelectorAll('item'));
      const items: RSSItem[] = [];

      for (const item of itemElements.slice(0, this.config.maxItems)) {
        const rssItem = this.parseRSSItem(item, feedName, feedUrl);
        if (rssItem) {
          items.push(rssItem);
        }
      }

      return {
        title,
        description,
        link,
        lastBuildDate: this.normalizeDate(lastBuildDate),
        items: items.sort((a, b) => 
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        ),
        source: feedName,
        category
      };

    } catch (error) {
      console.error(`Error parsing RSS XML for ${feedName}:`, error);
      return null;
    }
  }

  /**
   * Parse individual RSS item
   */
  private parseRSSItem(item: Element, source: string, feedUrl: string): RSSItem | null {
    try {
      const title = this.getTextContent(item, 'title');
      const description = this.getTextContent(item, 'description') || 
                         this.getTextContent(item, 'summary');
      const link = this.getTextContent(item, 'link');
      const pubDate = this.getTextContent(item, 'pubDate') || 
                     this.getTextContent(item, 'published');
      const guid = this.getTextContent(item, 'guid') || link;
      const author = this.getTextContent(item, 'author') || 
                    this.getTextContent(item, 'dc:creator');

      if (!title || !link) {
        return null;
      }

      // Extract categories
      const categoryElements = Array.from(item.querySelectorAll('category'));
      const categories = categoryElements.map(cat => cat.textContent?.trim()).filter(Boolean) as string[];

      return {
        title: this.cleanText(title),
        description: this.cleanText(description || ''),
        link: link.trim(),
        pubDate: this.normalizeDate(pubDate || ''),
        guid: guid || link,
        author: author ? this.cleanText(author) : undefined,
        category: categories.length > 0 ? categories : undefined,
        source,
        feedUrl
      };

    } catch (error) {
      console.error('Error parsing RSS item:', error);
      return null;
    }
  }

  /**
   * Get text content from XML element
   */
  private getTextContent(parent: Element, tagName: string): string | null {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || null;
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/&quot;/g, '"')
      .replace(/'/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Normalize date format
   */
  private normalizeDate(dateString: string): string {
    if (!dateString) {
      return new Date().toISOString();
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Fetch all government RSS feeds
   */
  async fetchAllGovernmentFeeds(): Promise<RSSFeed[]> {
    const feeds: RSSFeed[] = [];
    const allFeeds = [...RSS_FEEDS.government, ...RSS_FEEDS.news];

    // Fetch high priority feeds first
    const highPriorityFeeds = allFeeds.filter(feed => feed.priority === 'high');
    const mediumPriorityFeeds = allFeeds.filter(feed => feed.priority === 'medium');
    const lowPriorityFeeds = allFeeds.filter(feed => feed.priority === 'low');

    // Process in priority order
    for (const feedGroup of [highPriorityFeeds, mediumPriorityFeeds, lowPriorityFeeds]) {
      const promises = feedGroup.map(feed => 
        this.fetchRSSFeed(feed.url, feed.name, feed.category)
      );
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          feeds.push(result.value);
        } else {
          console.warn(`Failed to fetch feed: ${feedGroup[index].name}`);
        }
      });

      // Small delay between priority groups
      if (feedGroup !== lowPriorityFeeds) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return feeds;
  }

  /**
   * Fetch feeds by category
   */
  async fetchFeedsByCategory(category: RSSFeed['category']): Promise<RSSFeed[]> {
    const allFeeds = [...RSS_FEEDS.government, ...RSS_FEEDS.news];
    const categoryFeeds = allFeeds.filter(feed => feed.category === category);

    const promises = categoryFeeds.map(feed => 
      this.fetchRSSFeed(feed.url, feed.name, feed.category)
    );

    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<RSSFeed> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Search RSS items by keyword
   */
  async searchRSSItems(
    keyword: string, 
    category?: RSSFeed['category']
  ): Promise<RSSItem[]> {
    const feeds = category 
      ? await this.fetchFeedsByCategory(category)
      : await this.fetchAllGovernmentFeeds();

    const allItems: RSSItem[] = [];
    
    feeds.forEach(feed => {
      feed.items.forEach(item => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        if (searchText.includes(keyword.toLowerCase())) {
          allItems.push(item);
        }
      });
    });

    // Sort by publication date (newest first)
    return allItems.sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }

  /**
   * Get recent items across all feeds
   */
  async getRecentItems(
    limit = 20, 
    hoursAgo = 24
  ): Promise<RSSItem[]> {
    const feeds = await this.fetchAllGovernmentFeeds();
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const recentItems: RSSItem[] = [];
    
    feeds.forEach(feed => {
      feed.items.forEach(item => {
        if (new Date(item.pubDate) > cutoffTime) {
          recentItems.push(item);
        }
      });
    });

    return recentItems
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, limit);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Default instance
export const rssReader = new GovernmentRSSFetcher();

// Export types
export type {
  RSSItem,
  RSSFeed,
  GovernmentRSSConfig
};

// Export class for custom instances
export { GovernmentRSSFetcher };

/**
 * Utility functions for RSS data
 */
export const RSSUtils = {
  /**
   * Format relative time
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  },

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'Unknown';
    }
  },

  /**
   * Categorize government items
   */
  categorizeItem(item: RSSItem): {
    type: 'press_release' | 'legislation' | 'hearing' | 'report' | 'announcement' | 'other';
    urgency: 'low' | 'medium' | 'high';
  } {
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    const text = `${title} ${description}`;

    // Determine type
    let type: 'press_release' | 'legislation' | 'hearing' | 'report' | 'announcement' | 'other' = 'other';
    
    if (text.includes('press release') || text.includes('statement')) {
      type = 'press_release';
    } else if (text.includes('bill') || text.includes('legislation') || text.includes('act')) {
      type = 'legislation';
    } else if (text.includes('hearing') || text.includes('testimony') || text.includes('committee')) {
      type = 'hearing';
    } else if (text.includes('report') || text.includes('study') || text.includes('analysis')) {
      type = 'report';
    } else if (text.includes('announce') || text.includes('nomination') || text.includes('appointment')) {
      type = 'announcement';
    }

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'low';
    
    const highUrgencyTerms = ['breaking', 'urgent', 'emergency', 'crisis', 'resign'];
    const mediumUrgencyTerms = ['announces', 'introduces', 'passes', 'votes', 'hearing'];
    
    if (highUrgencyTerms.some(term => text.includes(term))) {
      urgency = 'high';
    } else if (mediumUrgencyTerms.some(term => text.includes(term))) {
      urgency = 'medium';
    }

    return { type, urgency };
  }
};