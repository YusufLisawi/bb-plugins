import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadItems, type Item } from "../lib/api";

export default function HomeScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadItems();
      setItems(result.items);
      setOffline(result.offline);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load items");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.heading}>__APP_NAME__</Text>
      <Text style={styles.subheading}>{offline ? "Showing saved data" : "Latest items"}</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading items" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <Text style={styles.item}>{item.title}</Text>}
        ListEmptyComponent={!loading && !error ? <Text>No items yet. Add one in the admin.</Text> : null}
        contentContainerStyle={styles.list}
      />
      <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.button}>
        <Text style={styles.buttonText}>Refresh</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f5", padding: 20 },
  heading: { fontSize: 30, fontWeight: "700", color: "#222" },
  subheading: { marginTop: 4, marginBottom: 20, color: "#555" },
  error: { color: "#a42222", marginBottom: 12 },
  list: { flexGrow: 1, gap: 8 },
  item: { padding: 16, backgroundColor: "#fff", borderRadius: 12, color: "#222" },
  button: { padding: 16, borderRadius: 12, backgroundColor: "#222", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" }
});
