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
import { PaymentRow } from "@/components/PaymentRow";

interface Payment {
  _id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
  creditorId: { name: string; color: string } | string;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
}

export default function HistoryScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<PaymentsResponse>("/api/house-loan/payments?limit=50");
      setPayments(data.payments);
      setTotal(data.total);
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

  if (payments.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No payments recorded yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.heading}>
        {total} payment{total !== 1 ? "s" : ""} recorded
      </Text>
      <View style={styles.list}>
        {payments.map((p) => (
          <PaymentRow
            key={p._id}
            amount={p.amount}
            date={p.date}
            method={p.method}
            creditorId={p.creditorId}
            notes={p.notes}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  emptyText: { color: "#6b7280", fontSize: 14 },
  heading: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  list: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
