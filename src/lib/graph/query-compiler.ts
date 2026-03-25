/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Natural Language → Structured Query Compiler
 *
 * Uses Gemini Flash (via existing generateAIText) to compile natural language
 * queries into structured graph traversals. Zod validates the output.
 */

import { z } from 'zod';
import { generateAIText } from '@/lib/ai/provider';
import logger from '@/lib/logging/simple-logger';
import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES } from '@/types/graph';
import type { GraphNodeType, GraphEdgeType } from '@/types/graph';

// ── Structured Query Schema ─────────────────────────────────────────

const FilterSchema = z.object({
  field: z.string(),
  op: z.enum(['eq', 'gt', 'lt', 'contains', 'member_of']),
  value: z.union([z.string(), z.number()]),
});

const TraversalSchema = z.object({
  // z.enum requires a mutable tuple [string, ...string[]], but our const arrays are readonly — cast is the standard zod workaround
  edge: z.enum(GRAPH_EDGE_TYPES as unknown as [string, ...string[]]),
  direction: z.enum(['incoming', 'outgoing']),
  nodeFilter: FilterSchema.optional(),
  edgeFilter: FilterSchema.optional(),
});

const StructuredQuerySchema = z.object({
  // z.enum requires a mutable tuple [string, ...string[]], but our const arrays are readonly — cast is the standard zod workaround
  find: z.enum(GRAPH_NODE_TYPES as unknown as [string, ...string[]]),
  filters: z.array(FilterSchema),
  traversals: z.array(TraversalSchema),
  timeRange: z
    .object({
      since: z.string().optional(),
      until: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).optional(),
});

export type StructuredQuery = z.infer<typeof StructuredQuerySchema>;

// ── System Prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a civic data query compiler. Convert natural language questions about US politics into structured JSON queries.

Available node types: ${GRAPH_NODE_TYPES.join(', ')}
Available edge types: ${GRAPH_EDGE_TYPES.join(', ')}

Node properties by type:
- representative: name, party (D/R/I), state (2-letter), chamber (House/Senate), district
- bill: title, number, congress, type (hr/s/hjres/sjres)
- committee: name, chamber, code
- organization: name
- agency: name
- sector: name (Agribusiness, Communications/Electronics, Construction, Defense, Energy/Natural Resources, Finance/Insurance/Real Estate, Health, Lawyers & Lobbyists, Transportation, Misc Business, Labor, Ideology/Single-Issue, Other)

Edge directions:
- donated_to: org → rep
- lobbied: org → committee
- serves_on: rep → committee
- voted_on: rep → bill
- sponsored: rep → bill
- oversees: committee → agency
- affects_sector: bill → sector
- in_sector: org → sector

Filter operators: eq (equals), gt (greater than), lt (less than), contains (substring match), member_of (set membership)

Respond with ONLY valid JSON matching the schema. No explanation, no markdown.

Examples:
Q: "Which senators received defense money?"
A: {"find":"representative","filters":[{"field":"chamber","op":"eq","value":"Senate"}],"traversals":[{"edge":"donated_to","direction":"incoming","nodeFilter":{"field":"name","op":"contains","value":"defense"}}],"limit":20}

Q: "Bills about healthcare in the 119th Congress"
A: {"find":"bill","filters":[{"field":"congress","op":"eq","value":119}],"traversals":[{"edge":"affects_sector","direction":"outgoing","nodeFilter":{"field":"name","op":"eq","value":"Health"}}],"limit":20}`;

// ── Compiler ────────────────────────────────────────────────────────

export interface CompileResult {
  success: true;
  query: StructuredQuery;
}

export interface CompileError {
  success: false;
  error: string;
  suggestions: string[];
}

export async function compileQuery(naturalLanguage: string): Promise<CompileResult | CompileError> {
  if (!naturalLanguage.trim()) {
    return {
      success: false,
      error: 'Please enter a question.',
      suggestions: [
        'Which California representatives serve on the Armed Services Committee?',
        'What organizations donated to senators on the Finance Committee?',
        'Bills about healthcare in the 119th Congress',
      ],
    };
  }

  try {
    const result = await generateAIText(SYSTEM_PROMPT, naturalLanguage, {
      maxTokens: 500,
      temperature: 0.1,
    });

    if (!result) {
      return {
        success: false,
        error: 'Could not process query. Try rephrasing.',
        suggestions: [],
      };
    }

    // Extract JSON from response (handle possible markdown wrapping)
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const validated = StructuredQuerySchema.parse(parsed);

    return { success: true, query: validated };
  } catch (error) {
    logger.warn('[Graph:Query] Compilation failed', {
      query: naturalLanguage,
      error: String(error),
    });

    return {
      success: false,
      error: 'Could not understand that query. Try being more specific.',
      suggestions: [
        'Which senators received oil money and voted against climate bills?',
        'What organizations lobbied the Armed Services Committee?',
        'Representatives from Texas who serve on Energy committees',
      ],
    };
  }
}
