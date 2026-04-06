# CIV.IQ AI Intelligence Layer — Technical & Philosophical Overview

_For evaluation by an AI research assistant. Self-contained: no codebase access required._

---

## 1. What CIV.IQ Is

CIV.IQ is a civic intelligence platform that builds representative profiles from real government data — campaign finance, voting records, lobbying disclosures, stock trades, regulations, and enforcement actions. It is infrastructure, not investigation. Think Wikipedia for civic data, not a journalism tool. The platform serves citizens who want to understand what their elected officials do with public trust.

**Stack**: Next.js 16, TypeScript (strict), React 18, deployed on Vercel.
**Data**: 181 API endpoints consuming real government APIs (Congress.gov, FEC, Senate LDA, Federal Register, EPA, OSHA, SEC, Census, BLS, etc.). Zero mock data, ever.

---

## 2. Philosophy

### Statistics First, AI Second

Every analyzer computes numbers before calling an LLM. The AI layer exists to _narrate_ pre-computed statistical findings in plain language, not to discover them. If the LLM fails, the system falls back to a statistical summary — the insight still ships.

### Correlation, Never Causation

The system detects patterns: "Legislator X received 62% of donations from the energy sector and sits on the Energy Committee." It never says "donations caused X to vote this way." Language is constrained to: pattern, correlation, association. The words "caused," "influenced," and "resulted in" are banned from all generated text.

### Provenance on Every Insight

Every insight carries:

- `confidence` (0-1) with method (computed/heuristic/mixed)
- `dataAsOf` (freshest source data timestamp)
- `methodology` (how computed, in plain language)
- `disclaimer` (standard correlation != causation text)
- `sources[]` (structured citations with record counts)
- `signal` classification (alert / pattern / tracking / baseline)

### Plain Language Mandate

All AI-generated text must pass Flesch-Kincaid Grade Level <= 8 (with 1 grade tolerance). The system implements the federal Plain Language Guidelines (Plain Writing Act of 2010). A `ReadingLevelValidator` class validates every generated narrative, with up to 3 regeneration attempts before falling back to statistical summary.

### Minimum Sample Sizes (Hard Floors)

No insight ships below these thresholds:

- 10 votes per sector for correlation analysis
- 4 quarters for temporal trends
- 3 trades for stock analysis
- 5 filings for lobbying analysis
- 3 PAC recipients for PAC vote analysis
- 5 peers for meaningful percentile comparisons

---

## 3. Architecture Overview

```
Government APIs (Congress.gov, FEC, Senate LDA, Federal Register, EPA, OSHA, SEC, ...)
        |
        v
Data Services (23 services in src/lib/data-sources/)
        |
        v
Entity Resolution (company names, committee matching, ticker-to-sector, lobbying codes)
        |
        v
Intelligence Analyzers (19 analyzers — statistics + optional AI narrative)
        |
        v
Redis Cache (7-day TTL for insights, 30-day for model outputs)
        |
        v
24 API Routes (/api/intelligence/...)
        |
        v
UI Components (34 components in src/components/intelligence/)
        |
        v
Citizens
```

---

## 4. ML Models & NLP Pipelines

### 4.1 Transformer Models (via @huggingface/transformers 3.8.1)

All models run server-side via WASM backend (onnxruntime-web bundled). No native onnxruntime-node dependency. Lazy-loaded once per process, cached as singletons.

| Model                          | Size       | Params | Task                                    | Used For                                                                                                   |
| ------------------------------ | ---------- | ------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Xenova/all-MiniLM-L6-v2`      | 23MB (q8)  | 33M    | Feature extraction (384-dim embeddings) | Bill sector classification, bill-lobbying semantic similarity                                              |
| `Xenova/nli-deberta-v3-xsmall` | 60MB (q8)  | 22M    | Natural language inference (zero-shot)  | Bill sector fallback classification, stance detection (support/oppose legislation)                         |
| `Xenova/bert-base-NER`         | 170MB (q8) | 110M   | Token-level NER (BIO tagging)           | Entity extraction from Federal Register documents (ORG, PER, LOC, MISC) + regex augmentation (MONEY, DATE) |

**Total model footprint**: ~253MB quantized (q8), loaded on-demand.

**Inference timeout**: 10 seconds per classification operation (including cold model load).

### 4.2 Vote Prediction Model (XGBoost via ONNX)

**Architecture**: XGBoost binary classifier (yea/nay), exported to ONNX format.
**Runtime**: onnxruntime-web (WASM), 5-second inference timeout.
**Model path**: `models/vote-prediction.onnx` (~1-5MB)

**Feature vector (35 dimensions)**:

1. Donor sector percentages (13 features — one per OpenSecrets-style sector)
2. Party one-hot (2: R, D — Independent is baseline)
3. Chamber (1: Senate=1, House=0)
4. Seniority (1: years in office)
5. Bill sector flags (13: binary per sector)
6. Cosponsor count (1)
7. Sponsor same party (1)
8. Interaction: donor-bill sector overlap (1)
9. Interaction: max single-sector donation % in bill sectors (1)

**Output**: yea probability (0-1), predicted vote (yea/nay/uncertain at 0.55 threshold), top SHAP factors with direction (toward_yea / toward_nay).

**Training pipeline**:

- `scripts/collect-training-data.ts` — Fetches ~50-100K vote-donor records from Congress.gov + FEC for ~535 legislators
- `scripts/train-vote-model.py` — StratifiedGroupKFold (k=5, grouped by legislator), XGBoost with n_estimators=200, max_depth=6, lr=0.1
- Exports ONNX model + metadata JSON (test accuracy, AUC, feature importance, SHAP values)
- Prediction threshold: 0.6 (conservative)

**Used for**: Independence score — ratio of votes where legislator deviated from the model's donor-predicted position. Higher = more independent from donor influence.

### 4.3 Influence Clustering (UMAP + HDBSCAN, offline)

**Script**: `scripts/compute-influence-clusters.py`
**Input**: 13-dimensional donor sector distribution per legislator (L1 normalized)
**Algorithm**:

1. UMAP projection to 2D (cosine metric, n_neighbors=10, min_dist=0.1)
2. HDBSCAN clustering on full 13D space (min_cluster_size=3, min_samples=2)
3. Cross-party cluster detection (clusters containing both D and R members)

**Output**: `influence-clusters.json` — precomputed, checked into git (~100-150KB). Serves cluster membership, UMAP coordinates for visualization, and cluster metadata.

### 4.4 Bill Sector Classification (4-Tier Fallback)

This is the most used NLP pipeline — classifying which industry sectors a bill affects:

1. **Cached AI summary** — If the bill has been previously summarized by the LLM, use `affectedIndustries` from that summary (fastest, most accurate)
2. **Semantic embedding** — Embed bill title with all-MiniLM-L6-v2, compute cosine similarity against pre-embedded sector descriptions. Threshold: 0.28 (empirically calibrated). Max 3 sectors.
3. **Zero-shot NLI** — Classify bill title against all 13 IndustrySector labels using nli-deberta-v3-xsmall. Threshold: 0.15 confidence. Max 3 sectors.
4. **Keyword matching** — Static rules. Always works, least accurate.

### 4.5 Stance Classification

Detects whether lobbying filings or regulatory comments support or oppose legislation:

- Reuses the nli-deberta-v3-xsmall zero-shot pipeline
- Labels: supports/opposes legislation (or regulation), seeks amendment, neutral
- Confidence threshold: 0.3
- Used by lobbying-pipeline-analyzer to classify organization stances

### 4.6 Bill-Lobbying Semantic Similarity

Matches lobbying filings to bills by semantic meaning (not just keyword overlap):

- Embeds bill text (first 2000 chars) and lobbying issue text using all-MiniLM-L6-v2
- Cosine similarity with 0.55 threshold for "strong match"
- Max 100 filings compared per bill (performance bound)
- Used by bill-intelligence-analyzer

### 4.7 Named Entity Recognition (Federal Register)

Extracts entities from regulatory documents:

- bert-base-NER with overlapping 1600-char windows (handles 512-token limit)
- BIO tag merging + deduplication across windows
- Augmented with regex for MONEY (`$X million/billion`) and DATE patterns
- Used by federal-register-extractor for regulation analysis

---

## 5. LLM Integration (Narrative Generation)

### Provider

- **Primary**: Google Gemini 2.0 Flash via `@ai-sdk/google` (Vercel AI SDK)
- **Abstraction**: `src/lib/ai/provider.ts` — provider-agnostic wrapper, model configurable via `AI_MODEL` env var
- **Planned**: Ollama support for self-hosted inference (commented out, ready to wire)

### How Narratives Are Generated

The `generateInsightNarrative()` function in `shared.ts`:

1. Receives pre-computed statistics as structured context
2. Applies `PLAIN_LANGUAGE_SYSTEM_PROMPT` (nonpartisan, factual, JSON-only, no editorializing)
3. Calls Gemini at temperature 0.3, max 1000 tokens
4. Validates output with `ReadingLevelValidator` (Flesch-Kincaid <= 8)
5. Retries up to 3 times if reading level fails
6. Falls back to statistical summary if all attempts fail

### System Prompt Constraints

```
- Follow federal Plain Language Guidelines (plainlanguage.gov)
- Use ONLY the data provided
- Be strictly nonpartisan and factual
- Never editorialize, use analogies, or speculate
- Output valid JSON only
```

Plus 13 specific Plain Language rules (active voice, <20 words/sentence, everyday words, "must" not "shall", no nominalizations, specific numbers).

### Where LLMs Are Used

1. **Insight narratives** — Every analyzer can generate a plain-language summary of its statistical findings
2. **Bill summaries** — Legislation text summarized for citizen consumption
3. **Civic briefs** — 2-minute synthesis of a legislator's profile across all domains
4. **District impact analysis** — How legislation affects a specific district

### Where LLMs Are NOT Used

- Sector classification (embeddings + zero-shot, no LLM)
- Entity resolution (fuzzy string matching, no LLM)
- Vote prediction (XGBoost, no LLM)
- Statistical computation (simple-statistics library)
- Anomaly detection (modified Z-score, no LLM)
- Clustering (UMAP + HDBSCAN, no LLM)

---

## 6. Statistical Methods

### Library: `simple-statistics` 7.8.8 (via `@civiq/civic-statistics` package)

**Correlation**: Spearman rank or Pearson, chosen after data profiling. Minimum sample size enforced (10 votes per sector).

**Peer comparison**: Percentile rank within peer group (same party, same chamber). Minimum 5 peers required. Reports `lowPeerCount` flag when near threshold.

**Confidence scoring**: Weighted formula — 50% sample size adequacy, 30% data completeness (0-1), 20% peer count adequacy.

**Anomaly detection**: Modified Z-score using Median Absolute Deviation (MAD). Default threshold 3.5 (very conservative). Robust to outliers — critical for small peer groups. Falls back to standard deviation when MAD=0.

**Signal classification**:

- `alert`: anomaly flagged AND (percentile >= 90 or <= 10 or value >= 2x peer average)
- `pattern`: confidence >= 0.7
- `tracking`: confidence >= 0.5
- `baseline`: everything else

---

## 7. Entity Resolution

### Package: `@civiq/entity-resolution` (published npm package)

**Company name normalization**: Strip suffixes (Inc, LLC, Corp, etc.), expand abbreviations (JNJ -> JOHNSON AND JOHNSON, 60+ mappings), Levenshtein distance for fuzzy matching.

**Lobbying committee resolution**: 3-tier — noise filter (generic strings like "Congress") -> exact alias match -> Fuse.js fuzzy match. Returns committee code + confidence.

**Ticker-to-sector**: Stock ticker -> SIC code (via SEC EDGAR) -> IndustrySector (13 categories). Filters out ETFs and mutual funds.

**Bioguide-FEC mapping**: 537-entry static table linking Congress.gov bioguideId to FEC candidate ID.

**LDA issue-to-policy mapping**: Senate lobbying issue codes (ACC, AGR, BAN, etc.) to Congress.gov policy areas.

---

## 8. The 19 Analyzers

Each follows the pattern: cache check -> fetch data -> compute statistics -> peer comparison -> anomaly detection -> generate narrative -> cache result -> fallback on error.

| #   | Analyzer                   | What It Measures                                                                |
| --- | -------------------------- | ------------------------------------------------------------------------------- |
| 1   | finance-jurisdiction       | Overlap: donor sectors vs. committee jurisdictions                              |
| 2   | vote-finance               | Correlation: donor sectors vs. voting alignment                                 |
| 3   | vote-prediction            | ML independence score (votes against donor-predicted position)                  |
| 4   | temporal-vote              | Quarterly shifts in party-line voting alignment                                 |
| 5   | lobbying-pipeline          | Lobbying spend -> committee -> bill introduction alignment                      |
| 6   | bill-intelligence          | Sponsor/cosponsor funding + lobbying for a specific bill                        |
| 7   | pac-vote                   | PAC contributions -> recipient voting patterns                                  |
| 8   | stock-committee            | Stock trades in sectors regulated by legislator's committees                    |
| 9   | influence-chain            | End-to-end: lobbying org -> contribution -> committee -> bill -> vote           |
| 10  | influence-graph            | Extended chain: + regulation -> enforcement outcomes                            |
| 11  | regulation                 | Federal Register rules linked to committee jurisdictions                        |
| 12  | enforcement                | EPA/OSHA/SEC/CFPB enforcement actions by sector/state/org                       |
| 13  | federal-register-extractor | Preamble parsing + entity extraction from regulatory docs                       |
| 14  | temporal-proximity         | Timing clusters: contributions, lobbying, and votes by date                     |
| 15  | sector-leaderboard         | Legislators ranked by sector alignment score                                    |
| 16  | stock-trade-leaderboard    | Legislators ranked by trade count/value/late filings                            |
| 17  | civic-brief-assembler      | 2-minute synthesis across all insight domains                                   |
| 18  | money-report-assembler     | Composite report card for a congressional district                              |
| 19  | civic-brief-patterns       | Pattern detection for civic briefs (funding alignment, voting divergence, etc.) |

---

## 9. MCP Server

CIV.IQ exposes a Model Context Protocol server at `/api/mcp` using `@modelcontextprotocol/sdk` v1.25.2. This allows external AI agents to query civic data programmatically.

**~40 tools** across 9 categories: intelligence analysis, representative profiles, legislation, campaign finance, environment (EPA), safety (FEMA, CFPB, NHTSA), health (CMS, Open Payments), economy (EIA, FDIC, NIH).

**3 resource templates**: `civiq://legislators/{id}`, `civiq://bills/{congress}/{type}/{number}`, `civiq://districts/{state}/{district}`

**3 prompt templates**: legislator accountability analysis, bill impact analysis, policy comparison.

---

## 10. Caching Strategy

- **Redis (Upstash)**: Primary cache. 7-day TTL for insights, 30-day for model outputs (embeddings, classifications, NER).
- **In-memory LRU**: Fallback when Redis unavailable.
- **Process-level singletons**: ML model pipelines loaded once per serverless function lifecycle.
- **Cache keys**: `insight:{type}:{entityId}` for insights, SHA256 hash for model outputs.

---

## 11. What's Working Well

- **4-tier fallback for sector classification** ensures 100% coverage even when ML fails
- **Statistics-first design** means insights are grounded regardless of LLM quality
- **SHAP explanations** on vote predictions provide genuine interpretability
- **ReadingLevelValidator** enforces accessibility rigorously
- **Entity resolution** handles the real-world messiness of government data (name variations, fuzzy matching)
- **Anomaly detection** with MAD is appropriate for small peer groups (5-50 legislators)

## 12. Known Limitations & Open Questions

### Model Size vs. Quality

- All transformer models are quantized to q8 and small (22M-110M params). Are there better models in the same size class now? The field has moved fast since these were selected.
- `all-MiniLM-L6-v2` is a 2021 model. Newer sentence transformers (e.g., gte-small, bge-small, nomic-embed-text) may offer better semantic quality at similar size.
- `nli-deberta-v3-xsmall` works well for zero-shot but only has 22M params. How does it compare to newer small NLI models?

### WASM Runtime Trade-offs

- WASM backend avoids native dependency hell but is slower than native ONNX. Is this still the right trade-off on Vercel serverless?
- Cold start: first request per serverless instance loads ~253MB of models. How does this affect p95 latency?

### Vote Prediction Model

- XGBoost is interpretable (SHAP) but the feature set is relatively simple (35 dims). Would a more expressive model (e.g., gradient boosted trees with learned embeddings, or a small transformer on vote sequences) improve accuracy without sacrificing interpretability?
- Training data is collected via rate-limited API scraping. Is this sustainable as the dataset grows?

### LLM Dependency

- Gemini 2.0 Flash is the sole LLM provider. No fallback if Google's API is down. The Ollama integration is commented out. Should there be a fallback chain?
- Narrative generation is the only LLM use — it's not critical path (statistical fallback exists). Is the LLM adding enough value to justify the latency and cost?

### Embedding Freshness

- Sector descriptions are embedded once and cached. If the taxonomy changes, stale embeddings could drift. How should this be versioned?

### Clustering Staleness

- Influence clusters are precomputed and checked into git. They reflect a point-in-time snapshot of donor profiles. How often should these be regenerated? Is there a drift detection mechanism?

### Missing Capabilities

- No RAG layer (by design — but limits the system's ability to answer novel questions)
- No time-series forecasting (temporal analyzer detects shifts but doesn't predict)
- No cross-legislator graph analysis beyond clustering (influence graph is per-legislator)
- No automated retraining pipeline for the vote prediction model

---

## 13. Dependencies Summary

| Package                     | Version   | Purpose                                     |
| --------------------------- | --------- | ------------------------------------------- |
| `@huggingface/transformers` | 3.8.1     | Transformer model loading + WASM inference  |
| `@ai-sdk/google`            | 3.0.29    | Gemini LLM access                           |
| `ai`                        | 6.0.90    | Vercel AI SDK (generateText, streamText)    |
| `simple-statistics`         | 7.8.8     | Correlation, percentile, anomaly detection  |
| `fuse.js`                   | 7.1.0     | Fuzzy string matching for entity resolution |
| `@modelcontextprotocol/sdk` | 1.25.2    | MCP server                                  |
| `@upstash/redis`            | 1.35.8    | Redis caching                               |
| `onnxruntime-web`           | (bundled) | ONNX model inference (WASM)                 |

---

## 14. Key Files (for deeper inspection)

| Area                         | Path                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| AI provider                  | `src/lib/ai/provider.ts`                                          |
| Plain language rules         | `src/lib/ai/plain-language.ts`                                    |
| Reading level validator      | `src/features/legislation/services/ai/reading-level-validator.ts` |
| Shared analyzer utilities    | `src/lib/intelligence/analyzers/shared.ts`                        |
| Embedding classifier         | `src/lib/intelligence/embeddings/embedding-classifier.ts`         |
| Zero-shot classifier         | `src/lib/intelligence/embeddings/zero-shot-classifier.ts`         |
| NER pipeline                 | `src/lib/intelligence/embeddings/civic-ner.ts`                    |
| Stance classifier            | `src/lib/intelligence/embeddings/stance-classifier.ts`            |
| Bill-lobbying similarity     | `src/lib/intelligence/embeddings/bill-lobbying-similarity.ts`     |
| Vote predictor               | `src/lib/intelligence/ml/vote-predictor.ts`                       |
| Civic statistics package     | `packages/civic-statistics/src/civic-stats.ts`                    |
| Anomaly detection            | `packages/civic-statistics/src/anomaly-detection.ts`              |
| Entity resolution package    | `packages/entity-resolution/src/`                                 |
| Influence clusters           | `src/lib/intelligence/clusters/`                                  |
| Confidence constants         | `src/lib/intelligence/confidence-constants.ts`                    |
| Type definitions             | `src/lib/intelligence/types.ts`                                   |
| Training data collection     | `scripts/collect-training-data.ts`                                |
| Model training (Python)      | `scripts/train-vote-model.py`                                     |
| Cluster computation (Python) | `scripts/compute-influence-clusters.py`                           |
| MCP server                   | `src/lib/mcp/`                                                    |
| Intelligence API routes      | `src/app/api/intelligence/`                                       |
| Intelligence UI components   | `src/components/intelligence/`                                    |
