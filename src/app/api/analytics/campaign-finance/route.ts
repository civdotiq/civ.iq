/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// THIS ENDPOINT IS INTENTIONALLY DISABLED DUE TO A DATA INTEGRITY VIOLATION.
// IT PREVIOUSLY RETURNED DYNAMICALLY GENERATED FAKE DATA.
// DO NOT RE-ENABLE UNTIL CONNECTED TO A VERIFIED, REAL DATA SOURCE.
export async function GET(_req: Request) {
  return new Response(
    'This analytics feature is temporarily disabled to ensure data integrity.',
    { status: 501 } // 501 Not Implemented
  );
}
