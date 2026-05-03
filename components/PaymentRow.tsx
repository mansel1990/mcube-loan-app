import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatINR, formatDate } from "@/lib/format";

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
  const color = creditor?.color ?? "#6b7280";
  const creditorName = creditor?.name ?? "—";

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.info}>
        <Text style={styles.creditor}>{creditorName}</Text>
        <Text style={styles.meta}>
          {formatDate(date)} · {method.replace("_", " ")}
        </Text>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  creditor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "capitalize",
  },
  notes: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10b981",
  },
});
