export interface GeneratedImageSummary {
  itemId: string;
  seq: number;
  revisedPrompt: string | null;
  mimeType: string;
  url: string;
}

export interface GeneratedImagesResponse {
  images: GeneratedImageSummary[];
}

export const GENERATED_IMAGES_OPEN_PANEL_EVENT =
  "bb-generated-images:open-panel";
export const GENERATED_IMAGES_STORAGE_PREFIX = "bb-generated-images:tray:";

export function generatedImagesPendingIndexKey(threadId: string): string {
  return `${GENERATED_IMAGES_STORAGE_PREFIX}${threadId}:pending-index`;
}
