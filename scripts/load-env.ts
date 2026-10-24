/**
 * Loads .env.local. Import it first, before any `@/` module:
 *
 *   import './load-env';
 *
 * A `dotenv.config()` call in a script's body runs only after every import has
 * been evaluated, so a module that reads credentials at load time (the Redis
 * cache) sees none and silently falls back to an in-memory cache.
 */
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
