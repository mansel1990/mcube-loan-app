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
import { colors } from "@/constants/theme";

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
        <ActivityIndicator size="large" color={colors.primary} />
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

  const active = creditors.filter((c) => c.isActive);
  const inactive = creditors.filter((c) => !c.isActive);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {active.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Active · {active.length}</Text>
          {active.map((c) => (
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
        </>
      )}
      {inactive.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Cleared · {inactive.length}</Text>
          {inactive.map((c) => (
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
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionLabelSpaced: {
    marginTop: 8,
  },
});
