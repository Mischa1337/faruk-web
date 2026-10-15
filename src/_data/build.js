/**
 * Values computed at build time, available in templates as `build.*`.
 */
import { execSync } from 'node:child_process';

const today = () => new Date().toISOString().slice(0, 10);

/** Date (YYYY-MM-DD) of the last commit that touched the site sources – used as sitemap lastmod. */
function lastContentChange() {
  try {
    return execSync('git log -1 --format=%cs -- src', { encoding: 'utf8' }).trim() || today();
  } catch {
    return today();
  }
}

export default {
  year: new Date().getFullYear(),
  lastModified: lastContentChange(),
};
