import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { formatINR } from "@/lib/format";

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

  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.type}>{type}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Borrowed</Text>
          <Text style={styles.statValue}>{formatINR(originalAmount)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Paid</Text>
          <Text style={[styles.statValue, { color: "#10b981" }]}>{formatINR(totalPaid)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={[styles.statValue, { color: "#ef4444" }]}>{formatINR(remaining)}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <ProgressBar percent={progress} color={color} />
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  type: {
    fontSize: 12,
    color: "#9ca3af",
    textTransform: "capitalize",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    width: 32,
    textAlign: "right",
  },
});
