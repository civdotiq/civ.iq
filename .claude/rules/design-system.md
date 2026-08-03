# UI Design System (Aicher/Ulm School)

Function drives form. Every design decision must serve the citizen's task. Aicher was systematic, not dogmatic — where a rule hurts usability, the rule is wrong.

## Identity (DO NOT CHANGE)

| Element         | Value                             | Notes                                                    |
| --------------- | --------------------------------- | -------------------------------------------------------- |
| Font            | Braun Linear                      | Weights 300-700 for UI; 100 only for display text >=48px |
| Grid            | 8px base                          | All spacing in multiples                                 |
| Design language | Structured, geometric, systematic | No decoration without function                           |

## Color System

| Color         | Hex           | Role                              | Notes                                                                                                             |
| ------------- | ------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Red           | #e11d07       | Republican party ONLY             | Never for errors or system state                                                                                  |
| Democrat blue | #2563eb       | Democrat party ONLY               | Darker than interactive blue on purpose; never for links or system state. Tokens: `--party-democrat`, `party-dem` |
| Blue          | #3ea2d4       | Links, interactive, active states | Active tabs, focus rings, CTAs. Never for party identification                                                    |
| Green         | #0a9338       | Legacy brand green                | Retired from party use 2026-06 (was Democrat). Never for success/system state. Avoid in new UI                    |
| Amber         | #d97706       | Warnings, attention               | System warnings, data caveats                                                                                     |
| Gray ramp     | neutral grays | Non-partisan data, borders, text  | Primary UI chrome color                                                                                           |
| Black         | #000000       | Primary text, structural borders  |                                                                                                                   |

Party colors (red #e11d07 / Democrat blue #2563eb) are ONLY for political party identification. All system states (success, error, warning, info) use interactive blue, amber, gray, and black. The two blues are deliberately distinct hues so citizens never read partisan meaning into UI chrome, and vice versa. Use the central helpers (`src/lib/party-colors.ts` for classes, `SEMANTIC_COLORS`/`getPartyColor` in `src/lib/constants/chart-colors.ts` for charts) — never inline party hex values.

## Border Hierarchy

| Weight | Role                           | Example                       |
| ------ | ------------------------------ | ----------------------------- |
| 1px    | Dividers, secondary separators | Table rows, list items        |
| 2px    | Structural, primary containers | Cards, inputs, buttons        |
| 3px    | Emphasis, selected states      | Active tabs, focus indicators |

Not everything gets the same border weight. Hierarchy creates scanability.

## Corners & Depth

- **Border radius**: 0px for layout containers (cards, sections). 2-4px allowed on interactive elements (buttons, inputs, chips, badges) — this is a tactile affordance, not decoration.
- **Shadows**: Allowed ONLY for elevation (modals, dropdowns, tooltips, popovers). Use tight functional shadows (e.g., `0 1px 3px rgba(0,0,0,0.12)`). Never decorative. Borders remain the primary spatial tool.

## Loading & Feedback

- **Skeleton loaders**: Allowed for data-loading states. Use the existing shimmer animation with the Aicher grid structure. Skeletons communicate "data is coming in this shape" — superior to bare spinners for 3-8 second API calls.
- **Spinners**: Still valid for short indeterminate waits. MUST include context text: "Fetching voting records..." not just a spinner.
- **Toast/snackbar**: Allowed for transient action feedback (2-4 seconds, auto-dismiss). Use existing design language (2px border, Braun Linear, blue/amber/gray). For persistent state messages, continue using inline status cards with colored left borders.
- **Empty states**: Required. When data is unavailable, show a designed empty state explaining why, not a blank bordered card. Example: "No campaign finance filings found for this representative in the current cycle."

## Typography

- **Uppercase**: Labels and short category tags ONLY (<=3 words). Headings, tab names, and multi-word text use sentence case for readability — all-caps destroys word shape recognition.
- **Minimum weight**: 400 for body text, 300 for secondary/caption text. Weight 100 only for display text >=48px.
- **Letter spacing**: Body text 0.02-0.03em (tighter than before). Labels/caps keep 0.05-0.08em.

## Wayfinding

Aicher designed the Munich airport signage. CIV.IQ needs the same clarity:

- **Breadcrumbs**: Required on any page >=2 levels deep (e.g., Representatives -> [Name] -> Voting Record).
- **Active state**: Blue (not red) for active tabs and nav items. Red is a party color, not a UI state.
- **Back navigation**: Always clear. Users drill deep into data — they must always know where they are and how to go back.

## BANNED

Purple gradients, gradient buttons, Inter/Roboto/system fonts, decorative emojis, decorative shadows, rounded corners >4px.
