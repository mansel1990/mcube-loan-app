import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { formatINR } from "@/lib/format";
import { colors, shadows, radius } from "@/constants/theme";

interface Props {
  name: string;
  type: string;
  originalAmount: number;
  totalPaid: number;
  remaining: number;
  color: string;
}

export function CreditorCard({ name, type, originalAmount, totalPaid, remaining, color }: Props) {
  const progress = originalAmount > 0 ? Math.round((totalPaid / originalAmount) * 100) : 0;

  // Lighten the creditor color for the header tint
  const tintBg = color + "18";

  return (
    <View style={[styles.card]}>
      {/* Colored left strip */}
      <View style={[styles.strip, { backgroundColor: color }]} />

      <View style={styles.inner}>
        {/* Header row */}
        <View style={[styles.header, { backgroundColor: tintBg }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{name}</Text>
            <Text style={[styles.type, { color }]}>{type}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{progress}%</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Borrowed</Text>
            <Text style={styles.statValue}>{formatINR(originalAmount)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatINR(totalPaid)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>{formatINR(remaining)}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <ProgressBar percent={progress} color={color} height={6} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    ...shadows.sm,
  },
  strip: {
    width: 4,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  type: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 3,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  progressRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
