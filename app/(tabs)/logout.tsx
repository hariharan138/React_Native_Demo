"use client"

import { View, Text } from "react-native"

// This screen won't actually be shown since we prevent navigation in the tab listener
export default function LogoutScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Logging out...</Text>
    </View>
  )
}
