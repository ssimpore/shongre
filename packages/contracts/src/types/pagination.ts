export interface PageInfo {
  hasNextPage: boolean;
  nextCursor?: string;
}
export interface Connection<T> {
  items: T[];
  pageInfo: PageInfo;
}
