import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { colors, radius } from "@/constants/theme";

interface Props {
  percent: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ percent, color = colors.primary, height = 8 }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          { width, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    overflow: "hidden",
    flex: 1,
  },
  fill: {
    height: "100%",
  },
});
