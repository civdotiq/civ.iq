# GAP doc — verification notes (2026-05-04)

Cross-check of `GAP-redesign-coverage-2026-05.md` against actual files in this project.

## ✅ Verified accurate

**Handoff framing:**

- `handoff/IMPLEMENTATION_NOTES.md` line 3 confirms "**reference spec**, not code to import" — matches doc's framing.
- Line 72 confirms "Recommended implementation order (small PRs)" — matches doc's "small PRs" guidance.
- `handoff/tokens.css` and `handoff/fonts.css` exist as referenced.

**All 16 templates exist as named in §1:**
| Template | File | Verified function |
|---|---|---|
| Landing | `Landing.jsx` | `LandingPage` ✓ |
| Address result | `Landing.jsx` | `AddressResultPage` ✓ |
| Search results | `SearchResults.jsx` | exists ✓ |
| Profile (Hybrid) | `ProfileHybrid.jsx` | exists ✓ |
| Profile alts | `ProfileRefined.jsx`, `ProfileDossier.jsx`, `ProfileMoneyFirst.jsx` | all exist ✓ |
| Bill detail | `BillDetail.jsx` | exists ✓ |
| Committee detail | `CommitteeDetail.jsx` | exists ✓ |
| Roll call detail | `RollLobby.jsx` | `RollCallDetail` ✓ |
| Lobby filing | `RollLobby.jsx` | `LobbyFilingDetail` ✓ |
| FEC filing | `FECIndustry.jsx` | `FECFilingDetail` ✓ |
| Industry / sector | `FECIndustry.jsx` | `IndustrySectorPage` ✓ |
| State legislator profile | `StateLegislator.jsx` | `StateLegislatorProfile` ✓ |
| State legislature page | `StateLegislator.jsx` | `StateLegislaturePage` ✓ |
| State overview | `StateOverview.jsx` | exists ✓ |
| Methodology / About / 404 | `SystemPages.jsx` | `MethodologyPage`, `AboutPage`, `NotFoundPage` ✓ |

**Chassis files exist:** `redesign/chrome.jsx`, `redesign/primitives.jsx`, `handoff/tokens.css` ✓.

## ⚠️ Discrepancies — doc undercounts the templates available

The doc says the handoff "ships 16 page templates." The `redesign/` folder actually contains **8 additional page-level templates** the doc does not account for:

| File                   | Page function          | Maps to which live route?                      | Doc treatment                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `Compare.jsx`          | `ComparePage`          | (no live route — would be `/compare/[a]/[b]`?) | **Not mentioned**                                                      |
| `DistrictPage.jsx`     | `DistrictPage`         | `/districts/[districtId]`                      | Doc says inherit from StateOverview — **but a direct template exists** |
| `Election.jsx`         | `ElectionPage`         | `/elections/[id]`?                             | **Not mentioned** — doc puts `/elections` under "inheritable"          |
| `IssueTopic.jsx`       | `IssueTopicPage`       | `/topics/[topic]`                              | **Doc says "no mock exists" for topic hubs — but this IS the mock**    |
| `LocalCouncil.jsx`     | `LocalCouncilPage`     | `/local`                                       | Doc says inherit from StateOverview — direct template exists           |
| `PACProfile.jsx`       | `PACProfilePage`       | `/lobby/[registrantId]` or new PAC route?      | **Not mentioned**                                                      |
| `SpendingContract.jsx` | `SpendingContractPage` | `/spending/[id]`?                              | **Not mentioned** — doc puts `/spending` under inheritable             |
| `VotingRecord.jsx`     | `VotingRecordPage`     | sub-page of profile                            | **Not mentioned**                                                      |

This is the doc's most material inaccuracy. **§5 ¶2** explicitly claims topic hubs have no mock and need a new shared template — but `IssueTopic.jsx` already exists and looks like exactly that. Similarly **§3c** routes `/local` and **§3d** topic hubs are listed as inheritable when direct templates exist.

**Also:** `ui_kits/web/` contains `LandingScreen.jsx`, `AddressResultScreen.jsx`, `OfficialDetailScreen.jsx`, `Primitives.jsx`, `TopNav.jsx` — earlier/parallel versions of the same screens. The doc cites `redesign/ + ui_kits/web/` as the source for the §1 table but doesn't reconcile the duplication.

## Recommendations before you circulate this doc

1. **Recount templates as 24, not 16.** Add `Compare`, `DistrictPage`, `Election`, `IssueTopic`, `LocalCouncil`, `PACProfile`, `SpendingContract`, `VotingRecord` to §1.
2. **Move `/topics/*`** out of §3d "needs new shared template" into §2 "covered" — `IssueTopic.jsx` is the template.
3. **Move `/districts/[districtId]`** and `/local` from §3b/§3c into §2 — `DistrictPage.jsx` and `LocalCouncil.jsx` cover them.
4. **Reconcile `ui_kits/web/` vs `redesign/`** — pick canonical source-of-truth folder and call out the other as superseded.
5. **§6 scorecard recount:** Direct template column should rise from ~14 to ~22; "Bespoke needed" can stay at 3 (AI flows). Hub/overview and Topic hubs categories shrink.
