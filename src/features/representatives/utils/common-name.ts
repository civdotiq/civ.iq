/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The name a member goes by, from the congress-legislators `nickname` field:
 * "Bernie Sanders", not "Bernard Sanders"; "Andy Barr", not "Garland Barr".
 * People search for that name, so page titles use it. Members without a
 * nickname keep their listed first + last name.
 */
export function commonName(rep: {
  name: string;
  fullName?: { last: string; nickname?: string };
}): string {
  const nickname = rep.fullName?.nickname?.trim();
  const last = rep.fullName?.last?.trim();
  return nickname && last ? `${nickname} ${last}` : rep.name;
}
