// Modrinth API v2 Type Definitions

export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  icon_url: string;
  downloads: number;
  follows: number;
  author: string;
  date_created: string;
  date_modified: string;
  latest_version: string;
  license: string;
  client_side: 'required' | 'optional' | 'unsupported';
  server_side: 'required' | 'optional' | 'unsupported';
  gallery: string[];
  featured_gallery: string | null;
  versions: string[];
  color: number | null;
  project_type: 'mod' | 'modpack' | 'resourcepack' | 'shader';
}

export interface ModrinthSearchResult {
  hits: ModrinthSearchHit[];
  offset: number;
  limit: number;
  total_hits: number;
}

export interface ModrinthProject {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  client_side: 'required' | 'optional' | 'unsupported';
  server_side: 'required' | 'optional' | 'unsupported';
  body: string;
  icon_url: string;
  downloads: number;
  followers: number;
  date_created: string;
  date_modified: string;
  license: { id: string; name: string; url: string | null };
  versions: string[];
  game_versions: string[];
  loaders: string[];
  gallery: { url: string; featured: boolean; title: string | null; description: string | null; created: string; ordering: number }[];
  id: string;
  project_type: 'mod' | 'modpack' | 'resourcepack' | 'shader';
}

export interface ModrinthFile {
  hashes: { sha1: string; sha512: string };
  url: string;
  filename: string;
  primary: boolean;
  size: number;
}

export interface ModrinthDependency {
  version_id: string | null;
  project_id: string | null;
  file_name: string | null;
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  changelog: string;
  game_versions: string[];
  loaders: string[];
  featured: boolean;
  files: ModrinthFile[];
  dependencies: ModrinthDependency[];
  date_published: string;
  downloads: number;
  version_type: 'release' | 'beta' | 'alpha';
}

export interface ModrinthCategory {
  icon: string;
  name: string;
  project_type: string;
  header: string;
}

export interface SearchFilters {
  query: string;
  facets?: string[][];
  index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated';
  offset?: number;
  limit?: number;
  projectType?: 'mod' | 'modpack' | 'resourcepack' | 'shader';
}

export interface InstalledMod {
  projectId: string;
  versionId: string;
  slug: string;
  title: string;
  iconUrl: string;
  author: string;
  fileName: string;
  fileSize: number;
  installedAt: string;
  gameVersions: string[];
  loaders: string[];
}
