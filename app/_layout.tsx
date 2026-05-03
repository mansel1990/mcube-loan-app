import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getSessionCookie } from "@/lib/auth";

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getSessionCookie().then((cookie) => {
      setChecking(false);
      if (!cookie) router.replace("/login");
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
