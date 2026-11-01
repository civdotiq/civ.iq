# Measurement: visits and AI citations

How we tell whether the findability work (crawlable HTML, real dates, internal links, answer-first openings) brings in real visits and AI citations. One command, read the same sections each time, compare with the baseline below.

## The command

```bash
npm run stats          # human-readable
npm run stats --json   # the same report as JSON, for saving
```

It reads only what we already collect: Redis counters written by the middleware, GA4, Google Search Console and Bing Webmaster Tools. Nothing is estimated. A source that is not configured says so instead of printing a number.

## Which section answers which question

| Question                                                         | Section of `npm run stats`                         | Window                     | Source                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Are real people visiting, and from where?                        | "GA4 — real humans" (users, sessions, top sources) | 7 days                     | GA4 property 515335080, Singapore bot city excluded                         |
| Are people arriving from AI assistants?                          | "GA4 — real humans" → "AI assistant referrals"     | 7 days                     | GA4 session source (chatgpt.com, perplexity.ai, …)                          |
| Is Google showing us, and for what?                              | "Google Search — top queries / top pages"          | 28 days, ending 3 days ago | Search Console API, domain property                                         |
| Is Bing (and so ChatGPT Search, Copilot, DuckDuckGo) showing us? | "Bing Search — impressions / clicks"               | 28 days, ending yesterday  | Bing Webmaster Tools API                                                    |
| Are AI crawlers reading the site?                                | "Search / AI crawlers on page paths"               | 7 days                     | Middleware counter, curated User-Agent list                                 |
| Which pages do assistants open to answer a question?             | "Pages AI assistants opened for a user's question" | 7 days                     | Middleware counter for ChatGPT-User and Perplexity-User, per path (PR #321) |

The last section is the closest thing we have to a citation count: ChatGPT-User and Perplexity-User fetch a page live when an assistant is answering someone, so each hit is a page the assistant read for a real question. Index crawlers (OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot) build indexes and are counted separately.

## Setup that is local only

These credentials live in `.env.local` on the machine that runs the report. They are never set on Vercel.

- **GA4 and Search Console:** `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` (one service account; see `scripts/ga4-client.ts` and `scripts/gsc-client.ts`).
- **Bing Webmaster Tools:** `BING_WEBMASTER_API_KEY`. Generate it signed in as the site owner: Bing Webmaster Tools → Settings → API Access → Generate API Key (one key per user; it covers every verified site). See `scripts/bing-client.ts`.
- **Redis counters:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Baseline, 2026-11-01

Taken the day the audit's crawlability, dates and internal-link PRs (#328–#334) and the AI-page counter (#321) went live. Compare later readings with this table.

| Measure                                                         | Value                                           | Window                                            |
| --------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Google Search clicks                                            | 1,740                                           | 2026-10-02 to 2026-10-29                          |
| Google Search impressions                                       | 205,929                                         | same                                              |
| Google Search CTR / average position                            | 0.8% / 13.4                                     | same                                              |
| Google Search, earlier reading                                  | 1,408 clicks, 169,303 impressions, 0.8%, 13.6   | 28 days to 2026-10-24                             |
| GA4 users / sessions / pageviews                                | 834 / 916 / 1,148                               | 7 days to 2026-11-01                              |
| GA4 sessions from google / bing / chatgpt.com                   | 561 / 18 / 9                                    | same                                              |
| ChatGPT-User page fetches                                       | 484                                             | 7 days                                            |
| Perplexity-User page fetches                                    | 0 recorded (not in the crawler totals)          | 7 days                                            |
| OAI-SearchBot / ClaudeBot / PerplexityBot / Bingbot / Googlebot | 18,058 / 9,767 / 3,494 / 6,710 / 3,516          | 7 days                                            |
| Pages AI assistants opened                                      | none yet (counter live from 2026-11-01 evening) | 7 days                                            |
| Bing Search impressions / clicks / CTR                          | 6,432 / 66 / 1.0%                               | 2026-10-04 to 2026-10-31 (27 of 28 days reported) |

Top Google pages were state-legislator profiles and two House voting-record pages; top queries were "[name] voting record" searches. Bing's top pages were `/ask/bills-sponsored` and `/ask/contact-info` question pages and state-legislature pages, reached from long, specific questions ("rick scott office phone number"). Google is the only search source that sends meaningful traffic: Bing sends about a thirtieth of Google's clicks, and ChatGPT reads the site hundreds of times a week but sends about 9 visits.

## How to read a change

- **Visits:** GA4 sessions from google, week over week, with the Singapore line still near zero. Search Console clicks confirm the trend with a 3-day lag.
- **Search visibility:** Search Console impressions and average position, then the same from Bing once the key is set.
- **AI citations:** the "Pages AI assistants opened" list. Growth there, and especially growth in `chatgpt.com` referrals, is the signal. A dead address in that list is a link an assistant invented; those pages are worth making real or redirecting.
- Read the numbers, not the totals: raw Vercel request counts and MCP initializes are mostly registry scanners and are not in this table on purpose.
