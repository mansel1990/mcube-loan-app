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
  Dimensions,
} from "react-native";
import { router, Tabs } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-gifted-charts";
import { LineChart } from "react-native-gifted-charts";
import { apiFetch } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { SummaryCard } from "@/components/SummaryCard";
import { LogPaymentModal } from "@/components/LogPaymentModal";
import { formatINR, formatDate } from "@/lib/format";
import { colors, shadows, radius } from "@/constants/theme";

const SCREEN_W = Dimensions.get("window").width;

interface Stats {
  totalBorrowed: number;
  totalPaid: number;
  totalRemaining: number;
  progressPercent: number;
  monthlyBudget: number;
  projection: { months: number; clearByDate: string };
}

interface Payment {
  _id: string;
  amount: number;
  date: string;
  method: string;
  creditorId: { name: string; color: string } | string;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthShort(key: string) {
  const [year, month] = key.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[parseInt(month, 10) - 1] + " '" + year.slice(2);
}

function buildTrendData(payments: Payment[]) {
  const totals: Record<string, number> = {};
  for (const p of payments) {
    const key = getMonthKey(p.date);
    totals[key] = (totals[key] ?? 0) + p.amount;
  }
  const sorted = Object.keys(totals).sort().slice(-6);
  return sorted.map((key) => ({
    value: Math.round(totals[key] / 1000),
    label: formatMonthShort(key),
    dataPointColor: colors.primary,
  }));
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trendData, setTrendData] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  async function load() {
    try {
      const [statsData, paymentsData] = await Promise.all([
        apiFetch<Stats>("/api/house-loan/stats"),
        apiFetch<PaymentsResponse>("/api/house-loan/payments?limit=200"),
      ]);
      setStats(statsData);
      setTrendData(buildTrendData(paymentsData.payments));
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
        <ActivityIndicator size="large" color={colors.primary} />
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
  const pieData = [
    { value: stats.totalPaid, color: colors.success },
    { value: stats.totalRemaining, color: colors.danger },
  ];
  const chartWidth = SCREEN_W - 64;

  return (
    <>
      {/* Header buttons */}
      <Tabs.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(true)}
                style={styles.headerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.headerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

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
        {/* Summary cards */}
        <View style={styles.cardRow}>
          <SummaryCard
            label="Total Borrowed"
            value={formatINR(stats.totalBorrowed)}
            color={colors.textMuted}
          />
          <SummaryCard
            label="Progress"
            value={`${stats.progressPercent}%`}
            color={colors.primary}
            tint={colors.primaryLight}
          />
        </View>
        <View style={styles.cardRow}>
          <SummaryCard
            label="Total Paid"
            value={formatINR(stats.totalPaid)}
            color={colors.success}
            tint={colors.successLight}
          />
          <SummaryCard
            label="Remaining"
            value={formatINR(stats.totalRemaining)}
            color={colors.danger}
            tint={colors.dangerLight}
          />
        </View>

        {/* Donut chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Repayment Progress</Text>
          <View style={styles.donutWrapper}>
            <PieChart
              data={pieData}
              donut
              radius={90}
              innerRadius={60}
              centerLabelComponent={() => (
                <View style={styles.donutCenter}>
                  <Text style={styles.donutPct}>{stats.progressPercent}%</Text>
                  <Text style={styles.donutLabel}>paid</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Paid · {formatINR(stats.totalPaid)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Remaining · {formatINR(stats.totalRemaining)}</Text>
            </View>
          </View>
        </View>

        {/* Line chart — monthly trend */}
        {trendData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Payments</Text>
            <Text style={styles.chartSub}>Amounts in ₹ thousands</Text>
            <LineChart
              data={trendData}
              width={chartWidth}
              height={160}
              color={colors.primary}
              thickness={2.5}
              startFillColor={colors.primaryLight}
              endFillColor="transparent"
              areaChart
              curved
              hideDataPoints={false}
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              xAxisColor={colors.border}
              yAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              rulesColor={colors.borderLight}
              rulesType="solid"
              noOfSections={4}
              initialSpacing={20}
              endSpacing={20}
            />
          </View>
        )}

        {/* Projection banner */}
        <View style={styles.banner}>
          <View style={styles.bannerAccent} />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLabel}>Projected debt-free date</Text>
            <Text style={styles.bannerDate}>{clearBy}</Text>
            <Text style={styles.bannerMonths}>
              ~{stats.projection.months} months · {formatINR(stats.monthlyBudget)}/mo budget
            </Text>
          </View>
        </View>
      </ScrollView>

      <LogPaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={() => { setLoading(true); load(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  errorText: { color: colors.textMuted, fontSize: 14 },
  cardRow: { flexDirection: "row", gap: 12, marginBottom: 12 },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    gap: 4,
  },
  headerBtn: {
    padding: 6,
  },

  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 12,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  chartSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
  },
  donutWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  donutCenter: {
    alignItems: "center",
  },
  donutPct: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  donutLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },

  banner: {
    backgroundColor: colors.header,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerAccent: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    marginRight: 16,
  },
  bannerContent: {
    flex: 1,
  },
  bannerLabel: {
    color: "#a8a29e",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bannerDate: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  bannerMonths: { color: "#78716c", fontSize: 13 },
});
