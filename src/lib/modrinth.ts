import type {
  ModrinthSearchResult,
  ModrinthProject,
  ModrinthVersion,
  ModrinthCategory,
  SearchFilters,
} from '../types/modrinth';

const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'MarinMC-Launcher/0.9.2 (github.com/musbabaff/marinmc-launcher)';

async function modrinthFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${MODRINTH_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Modrinth API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/** Search projects on Modrinth */
export async function searchProjects(filters: SearchFilters): Promise<ModrinthSearchResult> {
  const params: Record<string, string> = {};

  if (filters.query) params.query = filters.query;
  if (filters.index) params.index = filters.index;
  if (filters.offset !== undefined) params.offset = String(filters.offset);
  if (filters.limit !== undefined) params.limit = String(filters.limit);

  // Build facets
  const facets: string[][] = [];
  if (filters.projectType) {
    facets.push([`project_type:${filters.projectType}`]);
  }
  if (filters.facets) {
    facets.push(...filters.facets);
  }
  if (facets.length > 0) {
    params.facets = JSON.stringify(facets);
  }

  return modrinthFetch<ModrinthSearchResult>('/search', params);
}

/** Get a single project by ID or slug */
export async function getProject(idOrSlug: string): Promise<ModrinthProject> {
  return modrinthFetch<ModrinthProject>(`/project/${encodeURIComponent(idOrSlug)}`);
}

/** Get versions for a project */
export async function getProjectVersions(
  projectId: string,
  loaders?: string[],
  gameVersions?: string[]
): Promise<ModrinthVersion[]> {
  const params: Record<string, string> = {};
  if (loaders && loaders.length > 0) {
    params.loaders = JSON.stringify(loaders);
  }
  if (gameVersions && gameVersions.length > 0) {
    params.game_versions = JSON.stringify(gameVersions);
  }
  return modrinthFetch<ModrinthVersion[]>(`/project/${encodeURIComponent(projectId)}/version`, params);
}

/** Get a specific version */
export async function getVersion(versionId: string): Promise<ModrinthVersion> {
  return modrinthFetch<ModrinthVersion>(`/version/${encodeURIComponent(versionId)}`);
}

/** Get all categories */
export async function getCategories(): Promise<ModrinthCategory[]> {
  return modrinthFetch<ModrinthCategory[]>('/tag/category');
}

/** Get game versions list */
export async function getGameVersions(): Promise<{ version: string; version_type: string; date: string; major: boolean }[]> {
  return modrinthFetch('/tag/game_version');
}

/** Format download count (e.g. 1234567 -> "1.2M") */
export function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}
