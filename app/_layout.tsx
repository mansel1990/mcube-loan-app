import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getSessionToken } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // Stage 1: check stored session before mounting any screen
  useEffect(() => {
    getSessionToken()
      .then((t) => setLoggedIn(!!t))
      .catch(() => setLoggedIn(false))
      .finally(() => setChecking(false));
  }, []);

  // Stage 2: once Stack is mounted, redirect if not logged in
  useEffect(() => {
    if (checking) return;
    if (!loggedIn) router.replace("/login");
  }, [checking, loggedIn]);

  // While checking, show nothing but a splash — tabs must NOT mount yet
  // so they don't fire API calls before we know auth state.
  if (checking) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.header} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
