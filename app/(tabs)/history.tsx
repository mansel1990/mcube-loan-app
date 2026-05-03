import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { PaymentRow } from "@/components/PaymentRow";
import { LogPaymentModal } from "@/components/LogPaymentModal";
import { formatINR } from "@/lib/format";
import { colors, shadows, radius } from "@/constants/theme";

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

function getMonthGroup(dateStr: string) {
  const d = new Date(dateStr);
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function groupByMonth(payments: Payment[]) {
  const groups: { month: string; payments: Payment[]; total: number }[] = [];
  const map: Record<string, number> = {};
  for (const p of payments) {
    const key = getMonthGroup(p.date);
    if (map[key] === undefined) {
      map[key] = groups.length;
      groups.push({ month: key, payments: [], total: 0 });
    }
    const idx = map[key];
    groups[idx].payments.push(p);
    groups[idx].total += p.amount;
  }
  return groups;
}

export default function HistoryScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const groups = groupByMonth(payments);

  return (
    <View style={styles.wrapper}>
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
        {payments.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{total} payments recorded</Text>
            <Text style={styles.totalAmount}>
              {formatINR(payments.reduce((s, p) => s + p.amount, 0))}
            </Text>
          </View>
        )}

        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyText}>Tap the + button below to record your first payment</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.month} style={styles.group}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{group.month}</Text>
                <Text style={styles.monthTotal}>{formatINR(group.total)}</Text>
              </View>
              <View style={styles.list}>
                {group.payments.map((p) => (
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
            </View>
          ))
        )}

        {/* bottom space for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <LogPaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setLoading(true); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.success,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 240,
  },

  group: {
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthTotal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.success,
  },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    ...shadows.sm,
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
