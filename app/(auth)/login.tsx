"use client"

import { useState } from "react"
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/context/AuthContext"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = () => {
    // Hardcoded credentials
    const validUser = "admin"
    const validPass = "1234"

    if (username === validUser && password === validPass) {
      login({ username })
      router.replace("/(tabs)/Alarm")
    } else {
      Alert.alert("Invalid Credentials", "Username or password is incorrect")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>
      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 26,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
})
