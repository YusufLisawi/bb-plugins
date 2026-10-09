import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const itemSchema = z.object({ id: z.number().int(), title: z.string(), createdAt: z.string() });
const responseSchema = z.object({ items: z.array(itemSchema) });
export type Item = z.infer<typeof itemSchema>;
const cacheKey = "__APP_SLUG__.items.v1";

export async function loadItems(): Promise<{ items: Item[]; offline: boolean }> {
  try {
    const base = process.env.EXPO_PUBLIC_API_URL;
    if (!base) throw new Error("Set EXPO_PUBLIC_API_URL in apps/mobile/.env");
    const response = await fetch(`${base}/v1/items`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = responseSchema.parse(await response.json());
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return { items: data.items, offline: false };
  } catch (error) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        return { items: responseSchema.parse(JSON.parse(cached)).items, offline: true };
      } catch {
        await AsyncStorage.removeItem(cacheKey);
      }
    }
    throw error;
  }
}
