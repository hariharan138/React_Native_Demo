"use client"

import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, Dimensions, StatusBar, RefreshControl } from "react-native"
import { BarChart, LineChart, PieChart } from "react-native-chart-kit"
import { LinearGradient } from "expo-linear-gradient"

const screenWidth = Dimensions.get("window").width
const { width: SCREEN_WIDTH } = Dimensions.get("window")

type AlarmRecord = {
  id: number
  timestamp: number
  uuid: string
  isOpen: boolean
  priority: number
  userAccount?: string
}

type AlarmStats = {
  total: number
  open: number
  closed: number
  byPriority: {
    high: number
    medium: number
    low: number
    normal: number
  }
  recentActivity: number[]
  hourlyData: { hour: string; count: number }[]
}

const StatCard = ({
  title,
  value,
  subtitle,
  gradientColors = ["#667eea", "#764ba2"],
  textColor = "#FFFFFF",
}: {
  title: string
  value: string | number
  subtitle?: string
  gradientColors?: string[]
  textColor?: string
}) => (
  <LinearGradient 
    colors={gradientColors as [string, string]} 
    style={styles.statCard} 
    start={{ x: 0, y: 0 }} 
    end={{ x: 1, y: 1 }}
  >
    <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    {subtitle && <Text style={[styles.statSubtitle, { color: textColor }]}>{subtitle}</Text>}
  </LinearGradient>
)

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
  </View>
)

const ConnectionStatus = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case "Connected":
        return "#10B981"
      case "Connection Error":
        return "#EF4444"
      case "Disconnected":
        return "#6B7280"
      default:
        return "#F59E0B"
    }
  }

  return (
    <View style={[styles.statusContainer, { backgroundColor: getStatusColor() + "20" }]}>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
    </View>
  )
}

export default function AlarmAnalytics() {
  const [alarmData, setAlarmData] = useState<AlarmRecord[]>([])
  const [stats, setStats] = useState<AlarmStats>({
    total: 0,
    open: 0,
    closed: 0,
    byPriority: { high: 0, medium: 0, low: 0, normal: 0 },
    recentActivity: [],
    hourlyData: [],
  })
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    connectWebSocket()
  }, [])

  const connectWebSocket = () => {
    const socket = new WebSocket("wss://ws2relayserver.loca.lt")

    socket.onopen = () => {
      setConnectionStatus("Connected")
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "alarm-records" && message.records) {
          setAlarmData(message.records)
          processAlarmStats(message.records)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    socket.onerror = () => {
      setConnectionStatus("Connection Error")
    }

    socket.onclose = () => {
      setConnectionStatus("Disconnected")
    }

    return () => {
      socket.close()
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    connectWebSocket()
    setTimeout(() => setRefreshing(false), 2000)
  }, [])

  const processAlarmStats = (records: AlarmRecord[]) => {
    const total = records.length
    const open = records.filter((r) => r.isOpen).length
    const closed = total - open

    const byPriority = {
      high: records.filter((r) => r.priority === 1).length,
      medium: records.filter((r) => r.priority === 2).length,
      low: records.filter((r) => r.priority === 3).length,
      normal: records.filter((r) => r.priority === 0 || r.priority > 3).length,
    }

    // Generate hourly data for the last 12 hours
    const now = new Date()
    const hourlyData = []
    for (let i = 11; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hourStart = hour.getTime()
      const hourEnd = hourStart + 60 * 60 * 1000

      const count = records.filter((r) => r.timestamp >= hourStart && r.timestamp < hourEnd).length

      hourlyData.push({
        hour: hour.getHours().toString().padStart(2, "0"),
        count,
      })
    }

    // Recent activity (last 7 days)
    const recentActivity = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(day).setHours(0, 0, 0, 0)
      const dayEnd = new Date(day).setHours(23, 59, 59, 999)

      const count = records.filter((r) => r.timestamp >= dayStart && r.timestamp <= dayEnd).length

      recentActivity.push(count)
    }

    setStats({
      total,
      open,
      closed,
      byPriority,
      recentActivity,
      hourlyData,
    })
  }

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#f8fafc",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#3B82F6",
    },
  }

  const priorityPieData = [
    {
      name: "High",
      population: stats.byPriority.high,
      color: "#EF4444",
      legendFontColor: "#374151",
      legendFontSize: 12,
    },
    {
      name: "Medium",
      population: stats.byPriority.medium,
      color: "#F59E0B",
      legendFontColor: "#374151",
      legendFontSize: 12,
    },
    {
      name: "Low",
      population: stats.byPriority.low,
      color: "#10B981",
      legendFontColor: "#374151",
      legendFontSize: 12,
    },
    {
      name: "Normal",
      population: stats.byPriority.normal,
      color: "#6B7280",
      legendFontColor: "#374151",
      legendFontSize: 12,
    },
  ].filter((item) => item.population > 0)

  const activityLineData = {
    labels: ["6d", "5d", "4d", "3d", "2d", "1d", "Today"],
    datasets: [
      {
        data: stats.recentActivity.length > 0 ? stats.recentActivity : [0],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  }

  const hourlyBarData = {
    labels: stats.hourlyData.map((d) => d.hour + "h"),
    datasets: [
      {
        data: stats.hourlyData.map((d) => d.count),
      },
    ],
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Alarm Analytics</Text>
          <Text style={styles.headerSubtitle}>Real-time monitoring dashboard</Text>
          <ConnectionStatus status={connectionStatus} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Alarms"
              value={stats.total.toLocaleString()}
              subtitle="All records"
              gradientColors={["#3B82F6", "#1D4ED8"]}
            />
            <StatCard
              title="Active"
              value={stats.open.toLocaleString()}
              subtitle="Currently open"
              gradientColors={["#EF4444", "#DC2626"]}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Resolved"
              value={stats.closed.toLocaleString()}
              subtitle="Successfully closed"
              gradientColors={["#10B981", "#059669"]}
            />
            <StatCard
              title="High Priority"
              value={stats.byPriority.high.toLocaleString()}
              subtitle="Needs attention"
              gradientColors={["#F59E0B", "#D97706"]}
            />
          </View>
        </View>

        {/* Priority Distribution Chart */}
        <View style={styles.chartSection}>
          <SectionHeader title="Priority Distribution" subtitle="Breakdown by alarm priority levels" />
          <View style={styles.chartContainer}>
            {priorityPieData.length > 0 ? (
              <PieChart
                data={priorityPieData}
                width={SCREEN_WIDTH - 40}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 10]}
                absolute
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No alarm data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.chartSection}>
          <SectionHeader title="Weekly Activity Trend" subtitle="Alarm activity over the last 7 days" />
          <View style={styles.chartContainer}>
            {stats.recentActivity.some((val) => val > 0) ? (
              <LineChart
                data={activityLineData}
                width={SCREEN_WIDTH - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots={true}
                withShadow={false}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No recent activity</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hourly Distribution Chart */}
        <View style={styles.chartSection}>
          <SectionHeader title="Hourly Distribution" subtitle="Alarm frequency over the last 12 hours" />
          <View style={styles.chartContainer}>
            {stats.hourlyData.some((d) => d.count > 0) ? (
              <BarChart
                data={hourlyBarData}
                width={SCREEN_WIDTH - 40}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                showValuesOnTopOfBars={true}
                fromZero={true}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No hourly data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summarySection}>
          <SectionHeader title="Summary Report" subtitle="Key insights and metrics" />
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0}%
                </Text>
                <Text style={styles.summaryLabel}>Active Rate</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
                </Text>
                <Text style={styles.summaryLabel}>Resolution Rate</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {stats.recentActivity.length > 0
                    ? Math.round(stats.recentActivity.reduce((a, b) => a + b, 0) / stats.recentActivity.length)
                    : 0}
                </Text>
                <Text style={styles.summaryLabel}>Daily Average</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {stats.total > 0 ? Math.round((stats.byPriority.high / stats.total) * 100) : 0}%
                </Text>
                <Text style={styles.summaryLabel}>High Priority</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  summarySection: {
    marginBottom: 40,
  },
  summaryContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
})
