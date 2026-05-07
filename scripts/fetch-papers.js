#!/usr/bin/env node

/**
 * fetch-papers.js — DEPRECATED
 *
 * This script has been replaced by scripts/fetch.js (multi-source coordinator).
 * Kept for backward compatibility — delegates to fetch.js.
 *
 * Please update your workflow to use: node scripts/fetch.js
 */

console.log('⚠️  fetch-papers.js is deprecated. Use node scripts/fetch.js instead.\n');

await import('./fetch.js');
