/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legistar Types
 *
 * Types for Legistar API data including city council members,
 * meetings, and legislation from municipal governments.
 *
 * API Documentation: https://webapi.legistar.com/Help
 */

// Supported cities with open Legistar APIs (no auth required)
export type LegistarCity =
  | 'chicago'
  | 'seattle'
  | 'boston'
  | 'denver'
  | 'austin'
  | 'portland'
  | 'oakland'
  | 'minneapolis'
  | 'philadelphia'
  | 'detroit';

// City configuration for API access
export interface LegistarCityConfig {
  id: LegistarCity;
  name: string;
  state: string;
  apiClient: string; // Legistar client identifier
  population?: number;
}

// Raw person from Legistar API
export interface LegistarPerson {
  PersonId: number;
  PersonGuid: string;
  PersonLastModifiedUtc: string;
  PersonRowVersion: string;
  PersonFirstName: string;
  PersonLastName: string;
  PersonFullName: string;
  PersonActiveFlag: number;
  PersonCanViewFlag: number;
  PersonUsedSponsorFlag: number;
  PersonAddress1: string | null;
  PersonCity1: string | null;
  PersonState1: string | null;
  PersonZip1: string | null;
  PersonPhone: string | null;
  PersonFax: string | null;
  PersonEmail: string | null;
  PersonWWW: string | null;
  PersonAddress2: string | null;
  PersonCity2: string | null;
  PersonState2: string | null;
  PersonZip2: string | null;
  PersonPhone2: string | null;
  PersonFax2: string | null;
  PersonEmail2: string | null;
  PersonWWW2: string | null;
}

// Raw office record from Legistar API
export interface LegistarOfficeRecord {
  OfficeRecordId: number;
  OfficeRecordGuid: string;
  OfficeRecordLastModifiedUtc: string;
  OfficeRecordRowVersion: string;
  OfficeRecordFirstName: string;
  OfficeRecordLastName: string;
  OfficeRecordEmail: string | null;
  OfficeRecordFullName: string;
  OfficeRecordStartDate: string;
  OfficeRecordEndDate: string | null;
  OfficeRecordSort: number;
  OfficeRecordPersonId: number;
  OfficeRecordBodyId: number;
  OfficeRecordBodyName: string;
  OfficeRecordTitle: string | null;
  OfficeRecordVoteDivider: number;
  OfficeRecordExtendFlag: number;
  OfficeRecordMemberTypeId: number;
  OfficeRecordMemberType: string;
  OfficeRecordSupportNameId: number | null;
  OfficeRecordSupportFullName: string | null;
}

// Simplified council member for display
export interface CouncilMember {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  active: boolean;
  title: string | null;
  bodyName: string | null;
  district: string | null;
  startDate: string | null;
  endDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

// City council response
export interface CityCouncilResponse {
  success: boolean;
  city: {
    id: string;
    name: string;
    state: string;
  };
  members: CouncilMember[];
  totalMembers: number;
  activeMembers: number;
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Raw body (committee/council) from Legistar API
export interface LegistarBody {
  BodyId: number;
  BodyGuid: string;
  BodyLastModifiedUtc: string;
  BodyRowVersion: string;
  BodyName: string;
  BodyTypeId: number;
  BodyTypeName: string;
  BodyMeetFlag: number;
  BodyActiveFlag: number;
  BodySort: number;
  BodyDescription: string | null;
  BodyContactNameId: number | null;
  BodyContactFullName: string | null;
  BodyContactPhone: string | null;
  BodyContactEmail: string | null;
  BodyUsedControlFlag: number;
  BodyNumberOfMembers: number;
  BodyUsedActingFlag: number;
  BodyUsedTargetFlag: number;
  BodyUsedSponsorFlag: number;
}

// Raw matter (legislation) from Legistar API
export interface LegistarMatter {
  MatterId: number;
  MatterGuid: string;
  MatterLastModifiedUtc: string;
  MatterRowVersion: string;
  MatterFile: string;
  MatterName: string | null;
  MatterTitle: string;
  MatterTypeId: number;
  MatterTypeName: string;
  MatterStatusId: number;
  MatterStatusName: string;
  MatterBodyId: number;
  MatterBodyName: string;
  MatterIntroDate: string;
  MatterAgendaDate: string | null;
  MatterPassedDate: string | null;
  MatterEnactmentDate: string | null;
  MatterEnactmentNumber: string | null;
  MatterRequester: string | null;
  MatterNotes: string | null;
  MatterVersion: string;
  MatterText1: string | null;
  MatterText2: string | null;
  MatterText3: string | null;
  MatterText4: string | null;
  MatterText5: string | null;
  MatterEXText1: string | null;
  MatterEXText2: string | null;
  MatterEXText3: string | null;
  MatterEXText4: string | null;
  MatterEXText5: string | null;
  MatterEXText6: string | null;
  MatterEXText7: string | null;
  MatterEXText8: string | null;
  MatterEXText9: string | null;
  MatterEXText10: string | null;
  MatterEXText11: string | null;
}

// Simplified legislation for display
export interface CityLegislation {
  id: number;
  fileNumber: string;
  title: string;
  type: string;
  status: string;
  body: string;
  introducedDate: string;
  passedDate: string | null;
  enactedDate: string | null;
  enactmentNumber: string | null;
}

// City legislation response
export interface CityLegislationResponse {
  success: boolean;
  city: {
    id: string;
    name: string;
    state: string;
  };
  legislation: CityLegislation[];
  pagination: {
    total: number;
    pageSize: number;
    skip: number;
  };
  filters: {
    type?: string;
    status?: string;
    year?: number;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}
