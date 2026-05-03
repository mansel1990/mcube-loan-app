import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, shadows, radius } from "@/constants/theme";

interface Props {
  label: string;
  value: string;
  color: string;
  tint?: string;
}

export function SummaryCard({ label, value, color, tint }: Props) {
  return (
    <View style={[styles.card, tint ? { backgroundColor: tint } : null]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    flex: 1,
    ...shadows.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
});
