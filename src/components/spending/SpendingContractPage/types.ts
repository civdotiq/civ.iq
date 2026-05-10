/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type {
  USASpendingAwardDetailResponse,
  USASpendingAwardResult,
  USASpendingTransactionRow,
} from '@/types/spending';

export interface AwardDetailPayload {
  award: USASpendingAwardDetailResponse;
  dataAsOf: string;
}

export interface AwardTransactionsPayload {
  awardId: string;
  transactions: USASpendingTransactionRow[];
  totalCount: number;
  truncated: boolean;
  dataAsOf: string;
}

export interface AwardRelatedPayload {
  awardId: string;
  related: USASpendingAwardResult[];
  dataAsOf: string;
}

export interface ModificationRow {
  index: number;
  date: string;
  modNumber: string | null;
  actionType: string | null;
  description: string | null;
  obligated: number;
  cumulative: number;
}
