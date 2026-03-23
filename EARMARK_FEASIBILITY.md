# Earmark Data Feasibility Assessment

**Date:** 2026-03-22
**Scope:** Can CIV.IQ show congressional earmarks (Community Project Funding / Congressionally Directed Spending) per representative?
**Verdict:** Yes, with caveats. No API exists. Best path is GAO bulk data + House Excel files.

---

## Background

Congress banned earmarks from 2011 to 2020. They returned in 2021 under new names:

- **House:** Community Project Funding (CPF)
- **Senate:** Congressionally Directed Spending (CDS)

Data covers FY2022 through FY2026 (current cycle). Pre-ban earmark data (FY2008-2010) exists from Taxpayers for Common Sense but uses a different format and disclosure standard.

---

## Sources Evaluated

### Tier 1: Ready to Use

| Source                       | Format       | Coverage  | Member ID                   | Spending Lifecycle                        | Effort |
| ---------------------------- | ------------ | --------- | --------------------------- | ----------------------------------------- | ------ |
| **GAO "Tracking the Funds"** | CSV + Excel  | FY22-24   | Yes (by name)               | Yes (appropriated / obligated / outlayed) | Low    |
| **House Appropriations CPF** | Excel        | FY22-26   | Yes (name, state, district) | No (requested + funded only)              | Low    |
| **Demand Progress Enhanced** | Google Sheet | FY24 only | Yes (bioguide ID included)  | No                                        | Low    |

**GAO** is the strongest source. It tracks whether earmarked money was actually spent, not just appropriated. Data downloads at [gao.gov/tracking-funds](https://www.gao.gov/tracking-funds). CSV and Excel with data definitions.

**House Appropriations** publishes Excel spreadsheets per fiscal year. Fields: member name, state, district, party, recipient, amount, project purpose. No bioguide IDs — requires name matching against our member data.

**Demand Progress** (FY24 only) already added bioguide IDs and standardized addresses to the House data. Published as a Google Sheet. Useful as a template but not a recurring source.

### Tier 2: Usable With Extra Work

| Source                                   | Format     | Coverage | Issue                                                                       |
| ---------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------- |
| **Senate Appropriations CDS (requests)** | HTML table | FY22-26  | Scrapeable DataTables widget. No download button.                           |
| **Senate Appropriations CDS (funded)**   | PDF        | FY22-26  | Per-subcommittee PDFs. Needs PDF table extraction (Camelot or similar).     |
| **OpenSecrets / TCS**                    | CSV bulk   | FY08-10  | Pre-ban era only. Different disclosure format. Good for historical context. |

Senate request data is in an HTML table that could be scraped. Senate funded data is PDF-only — the Bipartisan Policy Center demonstrated extraction using Python's Camelot library for FY22 House data ([GitHub repo](https://github.com/rachelorey/FY2022-Congressionally-Directed-Spending)).

### Tier 3: Not Viable

| Source               | Reason                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| **USASpending.gov**  | No earmark flag. Earmarked awards are mixed with all other federal spending. |
| **Congress.gov API** | No earmark endpoint. Data is buried in committee report full text.           |
| **ProPublica**       | Congress API sunset July 2024. No earmark data even when active.             |

---

## Recommended Integration Path

### Phase A: Static Data Import (Low Effort)

1. Download GAO "Tracking the Funds" CSV for FY22-24
2. Download House Appropriations CPF Excel for FY22-26
3. Write a processing script (like `process-election-data.ts`) to:
   - Parse CSV/Excel into typed TypeScript records
   - Match member names to bioguide IDs using existing member data
   - Output `earmarks-by-member.ts` keyed by bioguide ID
4. Create `EarmarkTab` or add earmark section to existing finance tab

**Data model:**

```typescript
interface Earmark {
  fiscalYear: number;
  member: string; // As listed in source
  bioguideId: string; // Resolved via name matching
  recipient: string;
  amount: number;
  projectPurpose: string;
  location: { state: string; city?: string };
  status: 'requested' | 'funded' | 'obligated' | 'outlayed';
  source: 'house-approps' | 'senate-approps' | 'gao';
}
```

**Estimated scope:** ~200 lines of processing script, ~100 lines of service, ~150 lines of UI. Medium total.

### Phase B: Senate Data (Medium Effort)

5. Scrape Senate requests HTML table (DataTables widget)
6. Extract Senate funded data from PDFs using Python + Camelot
7. Merge into same data model

### Phase C: Ongoing Updates (Annual)

8. Each fiscal year, download new GAO + House Excel + Senate data
9. Re-run processing script
10. No automated pipeline needed — data publishes once per year

---

## Risks and Limitations

1. **No real-time data.** Earmark data publishes on an annual appropriations cycle. Months may pass between a request and a funding decision.
2. **Name matching is fragile.** House/GAO data uses display names ("Rep. Smith, John"), not bioguide IDs. The Demand Progress enhanced dataset proves this is solvable but requires maintenance.
3. **Senate funded data requires PDF parsing.** This is brittle if the committee changes their PDF layout.
4. **Pre-2022 data uses a different format.** Integrating FY2008-2010 TCS/OpenSecrets data would require a separate pipeline.
5. **Not all earmark requests get funded.** Must clearly distinguish "requested" from "funded" from "spent" in the UI.
6. **Dollar amounts shift.** A request for $5M may be funded at $2M. GAO tracks the actual obligation/outlay.

---

## Recommendation

**Proceed with Phase A.** The GAO CSV + House Excel path gives us per-member earmark data for FY22-24 with low integration effort. The annual update cadence matches a static-data approach (no API polling needed).

**Skip Senate funded PDFs for now.** The PDF extraction adds complexity for marginal gain — House data covers Representatives, and Senate request data (HTML) covers Senators' asks even if we cannot confirm final funded amounts without PDF parsing.

**Do not attempt real-time or API-based integration.** No such API exists. The static-data pattern (like election results) is the right fit.
