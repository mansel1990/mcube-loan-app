import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { CreditorCard } from "@/components/CreditorCard";

interface Creditor {
  _id: string;
  name: string;
  type: string;
  originalAmount: number;
  totalPaid: number;
  remaining: number;
  color: string;
  isActive: boolean;
}

export default function CreditorsScreen() {
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<Creditor[]>("/api/house-loan/creditors");
      setCreditors(data);
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (creditors.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No creditors found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.heading}>{creditors.length === 1 ? "Your Record" : "All Creditors"}</Text>
      {creditors.map((c) => (
        <CreditorCard
          key={c._id}
          name={c.name}
          type={c.type}
          originalAmount={c.originalAmount}
          totalPaid={c.totalPaid}
          remaining={c.remaining}
          color={c.color}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  emptyText: { color: "#6b7280", fontSize: 14 },
  heading: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
});
