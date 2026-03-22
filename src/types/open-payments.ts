/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Open Payments Types
 *
 * Types for pharma/device manufacturer payments to physicians.
 *
 * API: https://openpaymentsdata.cms.gov/api/1/
 * No API key required.
 */

/** Open Payments general payment record */
export interface OpenPayment {
  recordId: string;
  payerName: string;
  recipientState: string;
  recipientCity: string;
  recipientSpecialty: string;
  totalAmount: number;
  paymentNature: string;
  formOfPayment: string;
  productName: string | null;
  productCategory: string | null;
  productType: string | null;
  paymentDate: string;
  programYear: number;
}

/** Aggregated payment data by state */
export interface OpenPaymentAggregate {
  state: string;
  totalPayments: number;
  totalAmount: number;
  byCompany: Array<{ company: string; count: number; totalAmount: number }>;
  bySpecialty: Array<{ specialty: string; count: number; totalAmount: number }>;
  byNature: Array<{ nature: string; count: number; totalAmount: number }>;
}

// ── Raw API response types ──────────────────────────────────────

/** Raw general payment record from Open Payments API */
export interface RawOpenPaymentRecord {
  record_id: string;
  applicable_manufacturer_or_applicable_gpo_making_payment_name: string;
  recipient_state: string;
  recipient_city: string;
  covered_recipient_specialty_1: string;
  total_amount_of_payment_usdollars: string;
  nature_of_payment_or_transfer_of_value: string;
  form_of_payment_or_transfer_of_value: string;
  name_of_drug_or_biological_or_device_or_medical_supply_1: string;
  indicate_drug_or_biological_or_device_or_medical_supply_1: string;
  covered_or_noncovered_indicator_1: string;
  date_of_payment: string;
  program_year: string;
}
