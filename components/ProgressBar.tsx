import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  percent: number;
  color?: string;
}

export function ProgressBar({ percent, color = "#3b82f6" }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
