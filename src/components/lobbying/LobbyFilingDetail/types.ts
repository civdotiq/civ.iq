/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface LobbyFilingIssue {
  code: string;
  label: string;
  description: string;
}

export interface LobbyFilingLobbyist {
  name: string;
  coveredOfficialPosition: string | null;
}

export interface LobbyFilingContact {
  body: string;
  officials: string | null;
  issueCode: string | null;
}

export interface LobbyFilingDetailData {
  filingUuid: string;
  registrant: { id: string; name: string };
  client: { id: string; name: string };
  filingType: string;
  filingTypeDisplay: string;
  filingPeriod: string;
  filingYear: number;
  income: number | null;
  expenses: number | null;
  amount: number;
  amountKind: 'income' | 'expenses' | 'unknown';
  postedDate: string | null;
  filingDate: string | null;
  termination: boolean;
  registrantContactName: string | null;
  registrantCountry: string | null;
  clientCountry: string | null;
  issues: LobbyFilingIssue[];
  lobbyists: LobbyFilingLobbyist[];
  contacts: LobbyFilingContact[];
  bills: string[];
  documentUrl: string | null;
}
