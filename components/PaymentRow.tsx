import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatINR, formatDate } from "@/lib/format";
import { colors, radius } from "@/constants/theme";

interface Creditor {
  name: string;
  color: string;
}

interface Props {
  amount: number;
  date: string;
  method: string;
  creditorId: Creditor | string;
  notes?: string;
}

export function PaymentRow({ amount, date, method, creditorId, notes }: Props) {
  const creditor = typeof creditorId === "object" ? creditorId : null;
  const color = creditor?.color ?? colors.textLight;
  const creditorName = creditor?.name ?? "—";
  const methodLabel = method.replace(/_/g, " ");

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.info}>
        <Text style={styles.creditor}>{creditorName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDate(date)}</Text>
          <View style={[styles.methodBadge]}>
            <Text style={styles.methodText}>{methodLabel}</Text>
          </View>
        </View>
        {notes ? <Text style={styles.notes}>{notes}</Text> : null}
      </View>
      <Text style={styles.amount}>{formatINR(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginTop: 5,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  creditor: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  methodBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  methodText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  notes: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 3,
    fontStyle: "italic",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.success,
  },
});
