import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { SummaryCard } from "@/components/SummaryCard";
import { ProgressBar } from "@/components/ProgressBar";
import { formatINR, formatDate } from "@/lib/format";

interface Stats {
  totalBorrowed: number;
  totalPaid: number;
  totalRemaining: number;
  progressPercent: number;
  monthlyBudget: number;
  projection: { months: number; clearByDate: string };
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<Stats>("/api/house-loan/stats");
      setStats(data);
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

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load data. Pull down to retry.</Text>
      </View>
    );
  }

  const clearBy = formatDate(stats.projection.clearByDate);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Summary cards */}
      <View style={styles.cardRow}>
        <SummaryCard label="Total Borrowed" value={formatINR(stats.totalBorrowed)} color="#6b7280" />
        <SummaryCard label="Total Paid" value={formatINR(stats.totalPaid)} color="#10b981" />
      </View>
      <View style={styles.cardRow}>
        <SummaryCard label="Remaining" value={formatINR(stats.totalRemaining)} color="#ef4444" />
        <SummaryCard label="Progress" value={`${stats.progressPercent}%`} color="#3b82f6" />
      </View>

      {/* Overall progress bar */}
      <View style={styles.section}>
        <ProgressBar percent={stats.progressPercent} color="#3b82f6" />
      </View>

      {/* Projection banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Projected clear date</Text>
        <Text style={styles.bannerDate}>{clearBy}</Text>
        <Text style={styles.bannerMonths}>
          ~{stats.projection.months} months at {formatINR(stats.monthlyBudget)}/mo
        </Text>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  errorText: { color: "#6b7280", fontSize: 14 },
  cardRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  section: { marginBottom: 16 },
  banner: {
    backgroundColor: "#1e3a5f",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  bannerLabel: { color: "#93c5fd", fontSize: 12, fontWeight: "500", marginBottom: 6 },
  bannerDate: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  bannerMonths: { color: "#93c5fd", fontSize: 13 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
});
