/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Lowercase with accents removed, so a search for "Diaz" finds "Díaz-Balart"
 * and "María" finds "Maria". Fold both the query and the text it is matched
 * against.
 */
export function foldForSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
