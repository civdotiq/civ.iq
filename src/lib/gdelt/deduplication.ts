/**
 * GDELT News Article Deduplication System
 *
 * Implements MinHash and Jaccard similarity for detecting and removing
 * duplicate news articles from GDELT API responses.
 *
 * Features:
 * - MinHash implementation for 80% similarity threshold
 * - URL normalization for domain consolidation
 * - Title similarity using Jaccard coefficient
 * - Efficient Set-based operations for large datasets
 */

export interface GDELTArticle {
  readonly url: string;
  readonly title: string | null;
  readonly urltone: number | null;
  readonly domain: string | null;
  readonly urlpubtimedate: string | null;
  readonly urlpubtime: string | null;
  readonly socialimage: string | null;
  readonly seendate: string;
  readonly tone: number | null;
  readonly country: string | null;
  readonly lang: string | null;
}

export interface DeduplicationResult {
  readonly unique: ReadonlyArray<GDELTArticle>;
  readonly duplicateCount: number;
  readonly originalCount: number;
  readonly deduplicationRate: number;
}

export interface DeduplicationConfig {
  readonly similarityThreshold: number;
  readonly minHashPermutations: number;
  readonly enableUrlNormalization: boolean;
  readonly enableTitleSimilarity: boolean;
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  similarityThreshold: 0.8,
  minHashPermutations: 128,
  enableUrlNormalization: true,
  enableTitleSimilarity: true,
};

/**
 * MinHash implementation for approximate similarity detection
 */
export class MinHash {
  private readonly permutations: number;
  private readonly hashValues: number[];

  constructor(permutations: number = 128) {
    this.permutations = permutations;
    this.hashValues = new Array(permutations).fill(Number.MAX_SAFE_INTEGER);
  }

  /**
   * Update MinHash with a set of shingles
   */
  update(shingles: Set<string>): void {
    for (const shingle of shingles) {
      for (let i = 0; i < this.permutations; i++) {
        const hash = this.hash(shingle, i);
        const currentHash = this.hashValues[i];
        if (currentHash !== undefined && hash < currentHash) {
          this.hashValues[i] = hash;
        }
      }
    }
  }

  /**
   * Calculate Jaccard similarity with another MinHash
   */
  similarity(other: MinHash): number {
    let matches = 0;
    for (let i = 0; i < this.permutations; i++) {
      if (this.hashValues[i] === other.hashValues[i]) {
        matches++;
      }
    }
    return matches / this.permutations;
  }

  /**
   * Simple hash function with salt
   */
  private hash(value: string, salt: number): number {
    let hash = salt;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }

  /**
   * Get hash signature for external storage/comparison
   */
  getSignature(): ReadonlyArray<number> {
    return [...this.hashValues];
  }

  /**
   * Create MinHash from existing signature
   */
  static fromSignature(signature: ReadonlyArray<number>): MinHash {
    const minHash = new MinHash(signature.length);
    minHash.hashValues.splice(0, minHash.hashValues.length, ...signature);
    return minHash;
  }
}

/**
 * URL normalization utilities
 */
export class URLNormalizer {
  /**
   * Normalize URL for comparison by removing query params, fragments, and common variations
   */
  static normalize(url: string): string {
    try {
      const parsed = new URL(url.toLowerCase());

      // Remove common tracking parameters
      const trackingParams = new Set([
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
        'gclid',
        'ref',
        'source',
        'campaign_id',
        '_ga',
        'mc_cid',
        'mc_eid',
        'msclkid',
        'igshid',
        'ncid',
      ]);

      for (const param of trackingParams) {
        parsed.searchParams.delete(param);
      }

      // Normalize domain variations
      let hostname = parsed.hostname;
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      if (hostname.startsWith('m.')) {
        hostname = hostname.substring(2);
      }
      if (hostname.startsWith('mobile.')) {
        hostname = hostname.substring(7);
      }

      // Remove trailing slashes from pathname
      let pathname = parsed.pathname;
      if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
      }

      // Rebuild normalized URL
      const normalized = `${parsed.protocol}//${hostname}${pathname}`;
      const searchParams = parsed.searchParams.toString();

      return searchParams ? `${normalized}?${searchParams}` : normalized;
    } catch {
      // If URL parsing fails, return lowercase original
      return url.toLowerCase();
    }
  }

  /**
   * Extract canonical domain from URL
   */
  static getDomain(url: string): string {
    try {
      const parsed = new URL(url);
      let hostname = parsed.hostname.toLowerCase();

      // Remove subdomains for major news sites
      const rootDomains = new Set([
        'cnn.com',
        'bbc.com',
        'reuters.com',
        'apnews.com',
        'npr.org',
        'washingtonpost.com',
        'nytimes.com',
        'wsj.com',
        'usatoday.com',
        'abc.com',
        'cbs.com',
        'nbc.com',
        'fox.com',
        'politico.com',
        'thehill.com',
        'axios.com',
        'bloomberg.com',
      ]);

      for (const domain of rootDomains) {
        if (hostname.endsWith(domain)) {
          return domain;
        }
      }

      // Remove common prefixes
      if (hostname.startsWith('www.')) hostname = hostname.substring(4);
      if (hostname.startsWith('m.')) hostname = hostname.substring(2);
      if (hostname.startsWith('mobile.')) hostname = hostname.substring(7);

      return hostname;
    } catch {
      return url.toLowerCase();
    }
  }
}

/**
 * Text similarity utilities using Jaccard coefficient
 */
export class TextSimilarity {
  /**
   * Generate k-shingles from text
   */
  static generateShingles(text: string, k: number = 3): Set<string> {
    if (!text || text.length < k) {
      return new Set([text.toLowerCase().trim()]);
    }

    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const shingles = new Set<string>();
    for (let i = 0; i <= normalized.length - k; i++) {
      shingles.add(normalized.substring(i, i + k));
    }

    return shingles;
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  static jaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate title similarity using Jaccard coefficient on word shingles
   */
  static titleSimilarity(title1: string | null, title2: string | null): number {
    if (!title1 || !title2) return 0;
    if (title1 === title2) return 1;

    // Use word-level similarity for titles
    const words1 = new Set(
      title1
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
    );
    const words2 = new Set(
      title2
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

    return this.jaccardSimilarity(words1, words2);
  }
}

/**
 * Main deduplication engine
 */
export class NewsDeduplicator {
  private readonly config: DeduplicationConfig;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Deduplicate array of GDELT articles
   */
  deduplicate(articles: ReadonlyArray<GDELTArticle>): DeduplicationResult {
    if (articles.length === 0) {
      return {
        unique: [],
        duplicateCount: 0,
        originalCount: 0,
        deduplicationRate: 0,
      };
    }

    const originalCount = articles.length;
    const processedArticles = this.preprocessArticles(articles);
    const unique = this.findUniqueArticles(processedArticles);
    const duplicateCount = originalCount - unique.length;

    return {
      unique,
      duplicateCount,
      originalCount,
      deduplicationRate: duplicateCount / originalCount,
    };
  }

  /**
   * Preprocess articles for comparison
   */
  private preprocessArticles(articles: ReadonlyArray<GDELTArticle>): ArticleWithSignature[] {
    return articles.map(article => {
      const normalizedUrl = this.config.enableUrlNormalization
        ? URLNormalizer.normalize(article.url)
        : article.url;

      // Generate content fingerprint from title and URL
      const contentText = [article.title || '', URLNormalizer.getDomain(article.url)].join(' ');

      const shingles = TextSimilarity.generateShingles(contentText, 3);
      const minHash = new MinHash(this.config.minHashPermutations);
      minHash.update(shingles);

      return {
        article,
        normalizedUrl,
        minHashSignature: minHash.getSignature(),
        titleShingles:
          this.config.enableTitleSimilarity && article.title
            ? TextSimilarity.generateShingles(article.title, 2)
            : new Set<string>(),
      };
    });
  }

  /**
   * Find unique articles using similarity analysis
   */
  private findUniqueArticles(processedArticles: ArticleWithSignature[]): GDELTArticle[] {
    const unique: GDELTArticle[] = [];
    const urlSeen = new Set<string>();

    for (const processed of processedArticles) {
      // Fast exact URL duplicate check
      if (urlSeen.has(processed.normalizedUrl)) {
        continue;
      }

      // Check similarity with existing unique articles
      let isDuplicate = false;

      for (const uniqueProcessed of unique.map(
        u => processedArticles.find(p => p.article === u)!
      )) {
        if (this.areSimilar(processed, uniqueProcessed)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(processed.article);
        urlSeen.add(processed.normalizedUrl);
      }
    }

    return unique;
  }

  /**
   * Check if two processed articles are similar
   */
  private areSimilar(a: ArticleWithSignature, b: ArticleWithSignature): boolean {
    // Exact URL match
    if (a.normalizedUrl === b.normalizedUrl) {
      return true;
    }

    // MinHash similarity
    const minHashA = MinHash.fromSignature(a.minHashSignature);
    const minHashB = MinHash.fromSignature(b.minHashSignature);
    const minHashSimilarity = minHashA.similarity(minHashB);

    if (minHashSimilarity >= this.config.similarityThreshold) {
      return true;
    }

    // Title similarity (if enabled and both have titles)
    if (this.config.enableTitleSimilarity && a.titleShingles.size > 0 && b.titleShingles.size > 0) {
      const titleSimilarity = TextSimilarity.jaccardSimilarity(a.titleShingles, b.titleShingles);
      if (titleSimilarity >= this.config.similarityThreshold) {
        return true;
      }
    }

    return false;
  }
}

interface ArticleWithSignature {
  readonly article: GDELTArticle;
  readonly normalizedUrl: string;
  readonly minHashSignature: ReadonlyArray<number>;
  readonly titleShingles: Set<string>;
}

/**
 * Factory function for easy deduplication
 */
export function deduplicateNews(
  articles: ReadonlyArray<GDELTArticle>,
  config?: Partial<DeduplicationConfig>
): DeduplicationResult {
  const deduplicator = new NewsDeduplicator(config);
  return deduplicator.deduplicate(articles);
}

/**
 * Utility function to get deduplication statistics
 */
export function getDeduplicationStats(result: DeduplicationResult): string {
  const { originalCount, duplicateCount, deduplicationRate } = result;
  const percentage = (deduplicationRate * 100).toFixed(1);

  return `Removed ${duplicateCount}/${originalCount} duplicates (${percentage}%)`;
}
