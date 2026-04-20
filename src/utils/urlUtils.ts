export const MINIO_BASE_URL = "https://minio-api.infoviz.co/wedgo/";

export const getFullMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  return `${MINIO_BASE_URL}${cleanUrl}`;
};
