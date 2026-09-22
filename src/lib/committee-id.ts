/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/** Subcommittee thomas_ids are the parent code plus digits ("HSHM09"). */
export function isSubcommitteeId(thomasId: string | undefined): boolean {
  return /^[A-Z]+\d+$/.test(thomasId ?? '');
}
