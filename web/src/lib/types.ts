export type GroupItem = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
};

export type ImageItem = {
  id: string;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  deletedAt: string | null;
  favorite: boolean;
  rating: number;
  group: { id: string; name: string } | null;
  keywords: string[];
  thumbnailUrl: string;
  originalUrl: string;
};

export type ImageFilters = {
  groupId?: string | null;
  keywords?: string[];
  trash?: "exclude" | "only" | "include";
  favorite?: boolean;
  minRating?: number;
  cursor?: string | null;
  limit?: number;
};

export type SimilarImageMatch = {
  image: ImageItem;
  distance: number;
  similarity: number;
};

export type ImageListResult = {
  items: ImageItem[];
  total: number;
  nextCursor: string | null;
};

export type ImportReport = {
  imported: number;
  skipped: number;
  groupsCreated: number;
  errors: Array<{ file: string; reason: string }>;
};
