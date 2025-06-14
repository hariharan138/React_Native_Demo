"use client"

import type React from "react"

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { View, ActivityIndicator } from "react-native"
import { useEffect } from "react"
import { useRouter, useSegments } from "expo-router"
import "react-native-reanimated"

import { useColorScheme } from "@/hooks/useColorScheme"
import { AuthProvider, useAuth } from "../context/AuthContext"

// This component handles the navigation logic
function NavigationHandler({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login")
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace("/(tabs)")
    }
  }, [user, segments, isLoading])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <>{children}</>
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  if (!loaded) {
    return null
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <NavigationHandler>
          <RootLayoutNav />
        </NavigationHandler>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  )
}

