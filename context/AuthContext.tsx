"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  username: string
}

interface AuthContextType {
  user: User | null
  login: (userData: User) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate checking for existing session
    // In a real app, you'd check AsyncStorage or secure storage here
    const checkAuthState = async () => {
      try {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Check if user was previously logged in
        // const savedUser = await AsyncStorage.getItem('user')
        // if (savedUser) {
        //   setUser(JSON.parse(savedUser))
        // }

        setIsLoading(false)
      } catch (error) {
        console.error("Error checking auth state:", error)
        setIsLoading(false)
      }
    }

    checkAuthState()
  }, [])

  const login = async (userData: User) => {
    setUser(userData)
    // In a real app, save to AsyncStorage
    // await AsyncStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = async () => {
    setUser(null)
    // In a real app, remove from AsyncStorage
    // await AsyncStorage.removeItem('user')
  }

  const isAuthenticated = user !== null

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
