// Add zod to the mobile workspace; adapt URL, schema, and key for each resource.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const responseSchema = z.object({
  items: z.array(z.object({ id: z.number().int(), title: z.string() })),
});
type Item = z.infer<typeof responseSchema>["items"][number];
const KEY = "app.items.v1";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function loadItems(): Promise<Item[]> {
  try {
    if (!API_URL) throw new Error("API URL is missing");
    const response = await fetch(`${API_URL}/v1/items`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { items } = responseSchema.parse(await response.json());
    await AsyncStorage.setItem(KEY, JSON.stringify({ items }));
    return items;
  } catch (error) {
    const cached = await AsyncStorage.getItem(KEY);
    if (cached) {
      try {
        return responseSchema.parse(JSON.parse(cached)).items;
      } catch {
        await AsyncStorage.removeItem(KEY);
      }
    }
    throw error;
  }
}
