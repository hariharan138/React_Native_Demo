import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';


import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

type AlarmRecord = {
  id: number;
  timestamp: number;
  uuid: string;
  isOpen: boolean;
  priority: number;
  userAccount?: string;
};

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1: return '#FF4444'; // High - Red
    case 2: return '#FF8800'; // Medium - Orange  
    case 3: return '#FFBB00'; // Low - Yellow
    default: return '#00AA44'; // Normal - Green
  }
};

const getPriorityLabel = (priority: number) => {
  switch (priority) {
    case 1: return 'HIGH';
    case 2: return 'MEDIUM';
    case 3: return 'LOW';
    default: return 'NORMAL';
  }
};

const ConnectionStatus = ({ status }: { status: string }) => {
  const isConnected = status.includes('Connected');
  const isConnecting = status.includes('Connecting');
  
  return (
    <View style={[styles.statusContainer, { 
      backgroundColor: isConnected ? '#E8F5E8' : isConnecting ? '#FFF3E0' : '#FFEBEE' 
    }]}>
      <Icon 
        name={isConnected ? 'wifi' : isConnecting ? 'wifi-off' : 'error'} 
        size={20} 
        color={isConnected ? '#2E7D32' : isConnecting ? '#F57C00' : '#D32F2F'} 
      />
      <Text style={[styles.statusText, { 
        color: isConnected ? '#2E7D32' : isConnecting ? '#F57C00' : '#D32F2F' 
      }]}>
        {status}
      </Text>
    </View>
  );
};

export default function AlarmDashboard() {
  const [status, setStatus] = useState('🔄 Connecting...');
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const connectWebSocket = () => {
    const socket = new WebSocket('wss://ws2relayserver.loca.lt');

    socket.onopen = () => {
      setStatus('✅ Connected to WS2');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'alarm-records') {
        const latestFive = message.records.slice(0, 5);
        setAlarms(latestFive);
      }
    };

    socket.onerror = () => {
      setStatus('❌ Failed to connect to WS2');
    };

    return socket;
  };

  useEffect(() => {
    const socket = connectWebSocket();
    return () => socket.close();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setStatus('🔄 Reconnecting...');
    const socket = connectWebSocket();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
    return () => socket.close();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="security" size={28} color="#1976D2" />
          <Text style={styles.headerTitle}>Alarm Dashboard</Text>
        </View>
        <ConnectionStatus status={status} />
      </View>

      {/* Alarms List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.alarmsHeader}>
          <Text style={styles.sectionTitle}>Recent Alarms</Text>
          <Text style={styles.alarmCount}>{alarms.length} active</Text>
        </View>

        {alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={48} color="#BDBDBD" />
            <Text style={styles.emptyText}>No alarms to display</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        ) : (
          alarms.map((rec: AlarmRecord, index: number) => (
            // ✅ Fixed: Use combination of id, timestamp, and index for unique keys
            <View key={`${rec.id}-${rec.timestamp}-${index}`} style={styles.alarmCard}>
              {/* Priority Badge - Fixed positioning */}
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                <Text style={styles.priorityText}>{getPriorityLabel(rec.priority)}</Text>
              </View>

              {/* Card Header - Fixed layout to prevent overlapping */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Icon name="warning" size={24} color={getPriorityColor(rec.priority)} />
                  <Text style={styles.alarmId}>Alarm #{rec.id}</Text>
                </View>
                {/* ✅ Fixed: Better positioning and sizing for status badge */}
                <View style={[styles.statusBadge, { 
                  backgroundColor: rec.isOpen ? '#FFEBEE' : '#E8F5E8' 
                }]}>
                  <Icon 
                    name={rec.isOpen ? 'lock-open' : 'lock'} 
                    size={14} 
                    color={rec.isOpen ? '#D32F2F' : '#2E7D32'} 
                  />
                  <Text style={[styles.statusBadgeText, { 
                    color: rec.isOpen ? '#D32F2F' : '#2E7D32' 
                  }]}>
                    {rec.isOpen ? 'OPEN' : 'CLOSED'}
                  </Text>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Icon name="access-time" size={16} color="#666" />
                  <Text style={styles.infoLabel}>Time:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(rec.timestamp).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="fingerprint" size={16} color="#666" />
                  <Text style={styles.infoLabel}>UUID:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {rec.uuid}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Icon name="person" size={16} color="#666" />
                  <Text style={styles.infoLabel}>User:</Text>
                  <Text style={styles.infoValue}>
                    {rec.userAccount || 'Not assigned'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    marginLeft: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  alarmsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  alarmCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  alarmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    position: 'relative', // ✅ Added for proper badge positioning
  },
  priorityBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    zIndex: 1, // ✅ Added to ensure it stays on top
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    paddingRight: 80, // ✅ Added padding to prevent overlap with priority badge
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // ✅ Added to take available space
  },
  alarmId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1, // ✅ Added to prevent overflow
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70, // ✅ Added minimum width for consistency
    justifyContent: 'center', // ✅ Center content
  },
  // ✅ New style specifically for status badge text
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap', // ✅ Added to handle long content
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    minWidth: 60, // ✅ Reduced from 80 to save space
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
});