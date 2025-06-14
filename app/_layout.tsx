"use client"

import { DefaultTheme, ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import React from "react"
import { ActivityIndicator, View } from "react-native"
import "react-native-reanimated"

import { AuthProvider, useAuth } from "../context/AuthContext"

function MainStack() {
  const { user, isLoading } = useAuth()

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <Stack>
      {!user ? (
        <Stack.Screen 
          name="(auth)" 
          options={{ 
            headerShown: false,
            animation: 'none'
          }} 
        />
      ) : (
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            animation: 'none'
          }} 
        />
      )}
      <Stack.Screen 
        name="+not-found" 
        options={{ 
          title: 'Not Found',
          animation: 'none'
        }} 
      />
    </Stack>
  )
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  // Show nothing while fonts are loading
  if (!loaded) {
    return null
  }

  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <MainStack />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  )
}
