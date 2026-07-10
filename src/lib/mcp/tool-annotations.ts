/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/**
 * Every CIV.IQ MCP tool is a read-only lookup against external government
 * data sources. OpenAI's app review requires retrieval tools to carry
 * readOnlyHint; openWorldHint is set because results come from external
 * systems (Congress.gov, FEC, EPA, …), not a closed dataset.
 */
export const READ_ONLY_EXTERNAL: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
};
