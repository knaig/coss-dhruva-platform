/**
 * Utility functions for handling base path in the application
 */

// Get the base path from Next.js config
export const BASE_PATH = '/dhruva';

/**
 * Get the full asset path with base path prefix
 * @param assetPath - The asset path starting with /
 * @returns The full path with base path prefix
 */
export function getAssetPath(assetPath: string): string {
  // Next.js automatically handles basePath for static assets
  // We don't need to manually add the prefix
  return assetPath;
}

/**
 * Get the pathname without base path for comparison
 * @param pathname - The full pathname from router
 * @returns The pathname without base path
 */
export function getPathnameWithoutBase(pathname: string): string {
  // In Next.js with basePath, router.pathname already excludes the base path
  // So we just return the pathname as is
  return pathname;
}

/**
 * Check if current path matches a route (handles base path)
 * @param currentPath - Current router pathname (already without base path)
 * @param targetPath - Target path to match
 * @returns Whether the paths match
 */
export function pathMatches(currentPath: string, targetPath: string): boolean {
  // router.pathname in Next.js already excludes the basePath
  // so we can directly compare
  return currentPath === targetPath || currentPath.startsWith(targetPath);
}

/**
 * Check if current path starts with a specific route
 * @param currentPath - Current router pathname
 * @param targetPath - Target path to check
 * @returns Whether the current path starts with target path
 */
export function pathStartsWith(currentPath: string, targetPath: string): boolean {
  return currentPath.startsWith(targetPath);
}
