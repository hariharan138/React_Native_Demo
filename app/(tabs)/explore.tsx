import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

const screenWidth = Dimensions.get('window').width;

type AlarmRecord = {
  id: number;
  timestamp: number;
  uuid: string;
  isOpen: boolean;
  priority: number;
  userAccount?: string;
};

type AlarmStats = {
  total: number;
  open: number;
  closed: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
    normal: number;
  };
  recentActivity: number[];
  hourlyData: { hour: string; count: number }[];
};

const StatCard = ({ title, value, subtitle, color = '#1976D2' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) => (
  <ThemedView style={[styles.statCard, { borderLeftColor: color }]}>
    <ThemedText style={styles.statTitle}>{title}</ThemedText>
    <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
    {subtitle && <ThemedText style={styles.statSubtitle}>{subtitle}</ThemedText>}
  </ThemedView>
);

export default function TabTwoScreen() {
  const [alarmData, setAlarmData] = useState<AlarmRecord[]>([]);
  const [stats, setStats] = useState<AlarmStats>({
    total: 0,
    open: 0,
    closed: 0,
    byPriority: { high: 0, medium: 0, low: 0, normal: 0 },
    recentActivity: [],
    hourlyData: []
  });
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    const socket = new WebSocket('wss://ws2relayserver.loca.lt');

    socket.onopen = () => {
      setConnectionStatus('Connected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'alarm-records' && message.records) {
          setAlarmData(message.records);
          processAlarmStats(message.records);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = () => {
      setConnectionStatus('Connection Error');
    };

    socket.onclose = () => {
      setConnectionStatus('Disconnected');
    };

    return () => {
      socket.close();
    };
  }, []);

  const processAlarmStats = (records: AlarmRecord[]) => {
    const total = records.length;
    const open = records.filter(r => r.isOpen).length;
    const closed = total - open;

    const byPriority = {
      high: records.filter(r => r.priority === 1).length,
      medium: records.filter(r => r.priority === 2).length,
      low: records.filter(r => r.priority === 3).length,
      normal: records.filter(r => r.priority === 0 || r.priority > 3).length,
    };

    // Generate hourly data for the last 24 hours
    const now = new Date();
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = hour.getTime();
      const hourEnd = hourStart + 60 * 60 * 1000;
      
      const count = records.filter(r => 
        r.timestamp >= hourStart && r.timestamp < hourEnd
      ).length;
      
      hourlyData.push({
        hour: hour.getHours().toString().padStart(2, '0'),
        count
      });
    }

    // Recent activity (last 7 days)
    const recentActivity = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = day.setHours(0, 0, 0, 0);
      const dayEnd = day.setHours(23, 59, 59, 999);
      
      const count = records.filter(r => 
        r.timestamp >= dayStart && r.timestamp <= dayEnd
      ).length;
      
      recentActivity.push(count);
    }

    setStats({
      total,
      open,
      closed,
      byPriority,
      recentActivity,
      hourlyData
    });
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#1976D2',
    },
  };

  const priorityPieData = [
    {
      name: 'High',
      population: stats.byPriority.high,
      color: '#FF4444',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Medium',
      population: stats.byPriority.medium,
      color: '#FF8800',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Low',
      population: stats.byPriority.low,
      color: '#FFBB00',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Normal',
      population: stats.byPriority.normal,
      color: '#00AA44',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
  ].filter(item => item.population > 0);

  const activityLineData = {
    labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'],
    datasets: [
      {
        data: stats.recentActivity.length > 0 ? stats.recentActivity : [0],
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const hourlyBarData = {
    labels: stats.hourlyData.slice(-12).map(d => d.hour),
    datasets: [
      {
        data: stats.hourlyData.slice(-12).map(d => d.count),
      },
    ],
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chart.bar.fill"
          style={styles.headerImage}
        />
      }>
      
      <ThemedView style={styles.titleContainer}>
        <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color="#1976D2" />
        <ThemedText type="title">Alarm Analytics</ThemedText>
      </ThemedView>

      {/* Connection Status */}
      <ThemedView style={styles.statusContainer}>
        <ThemedText style={[styles.statusText, { 
          color: connectionStatus === 'Connected' ? '#00AA44' : '#FF4444' 
        }]}>
          Status: {connectionStatus}
        </ThemedText>
      </ThemedView>

      {/* Stats Cards */}
      <ThemedView style={styles.statsGrid}>
        <StatCard 
          title="Total Alarms" 
          value={stats.total} 
          subtitle="All time"
          color="#1976D2"
        />
        <StatCard 
          title="Open Alarms" 
          value={stats.open} 
          subtitle="Currently active"
          color="#FF4444"
        />
        <StatCard 
          title="Closed Alarms" 
          value={stats.closed} 
          subtitle="Resolved"
          color="#00AA44"
        />
        <StatCard 
          title="High Priority" 
          value={stats.byPriority.high} 
          subtitle="Needs attention"
          color="#FF4444"
        />
      </ThemedView>

      {/* Charts Section */}
      <Collapsible title="📊 Priority Distribution">
        <ThemedView style={styles.chartContainer}>
          {priorityPieData.length > 0 ? (
            <PieChart
              data={priorityPieData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 10]}
              absolute
            />
          ) : (
            <ThemedText style={styles.noDataText}>No alarm data available</ThemedText>
          )}
        </ThemedView>
      </Collapsible>

      <Collapsible title="📈 Recent Activity (7 Days)">
        <ThemedView style={styles.chartContainer}>
          {stats.recentActivity.some(val => val > 0) ? (
            <LineChart
              data={activityLineData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <ThemedText style={styles.noDataText}>No recent activity</ThemedText>
          )}
        </ThemedView>
      </Collapsible>

      <Collapsible title="⏰ Hourly Distribution (Last 12 Hours)">
        <ThemedView style={styles.chartContainer}>
          {stats.hourlyData.some(d => d.count > 0) ? (
            <BarChart
              data={hourlyBarData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              showValuesOnTopOfBars
            />
          ) : (
            <ThemedText style={styles.noDataText}>No hourly data available</ThemedText>
          )}
        </ThemedView>
      </Collapsible>

      {/* Summary Section */}
      <Collapsible title="📋 Summary">
        <ThemedView style={styles.summaryContainer}>
          <ThemedText style={styles.summaryText}>
            • Total alarms processed: {stats.total}
          </ThemedText>
          <ThemedText style={styles.summaryText}>
            • Active alarms: {stats.open} ({stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0}%)
          </ThemedText>
          <ThemedText style={styles.summaryText}>
            • High priority alarms: {stats.byPriority.high}
          </ThemedText>
          <ThemedText style={styles.summaryText}>
            • Average daily activity: {stats.recentActivity.length > 0 ? Math.round(stats.recentActivity.reduce((a, b) => a + b, 0) / stats.recentActivity.length) : 0} alarms
          </ThemedText>
        </ThemedView>
      </Collapsible>

      <ExternalLink href="https://docs.expo.dev/router/introduction">
        <ThemedText type="link">Learn more about alarm monitoring</ThemedText>
      </ExternalLink>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusContainer: {
    padding: 12,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 40,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
});