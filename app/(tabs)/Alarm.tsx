import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type AlarmRecord = {
  id: number;
  timestamp: number;
  uuid: string;
  isOpen: boolean;
  priority: number;
  userAccount?: string;
};

type SortOption = 'timestamp' | 'priority' | 'id' | 'status';
type FilterOption = 'all' | 'open' | 'closed' | 'high' | 'medium' | 'low' | 'normal';

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1: return '#FF4444';
    case 2: return '#FF8800';
    case 3: return '#FFBB00';
    default: return '#00AA44';
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

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    relative: getRelativeTime(timestamp)
  };
};

const getRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const AlarmCard = ({ 
  alarm, 
  onPress, 
  onToggleStatus 
}: { 
  alarm: AlarmRecord; 
  onPress: () => void;
  onToggleStatus: () => void;
}) => {
  const dateInfo = formatDate(alarm.timestamp);
  
  return (
    <TouchableOpacity style={styles.alarmCard} onPress={onPress} activeOpacity={0.7}>
      {/* Priority Bar */}
      <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(alarm.priority) }]} />
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.leftHeaderSection}>
            <View style={styles.alarmIconContainer}>
              <Icon 
                name="warning" 
                size={24} 
                color={getPriorityColor(alarm.priority)} 
              />
            </View>
            <View style={styles.alarmHeaderInfo}>
              <Text style={styles.alarmId}>Alarm #{alarm.id}</Text>
              <Text style={styles.alarmTime}>{dateInfo.relative}</Text>
            </View>
          </View>
          
          <View style={styles.rightHeaderSection}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(alarm.priority) }]}>
              <Text style={styles.priorityText}>{getPriorityLabel(alarm.priority)}</Text>
            </View>
          </View>
        </View>

        {/* Status Button */}
        <View style={styles.statusContainer}>
          <TouchableOpacity 
            style={[styles.statusButton, { 
              backgroundColor: alarm.isOpen ? '#FFEBEE' : '#E8F5E8',
            }]}
            onPress={onToggleStatus}
            activeOpacity={0.8}
          >
            <Icon 
              name={alarm.isOpen ? 'lock-open' : 'lock'} 
              size={16} 
              color={alarm.isOpen ? '#D32F2F' : '#2E7D32'} 
            />
            <Text style={[styles.statusButtonText, { 
              color: alarm.isOpen ? '#D32F2F' : '#2E7D32' 
            }]}>
              {alarm.isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrapper}>
              <Icon name="access-time" size={16} color="#666" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>{dateInfo.date} • {dateInfo.time}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrapper}>
              <Icon name="fingerprint" size={16} color="#666" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>UUID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{alarm.uuid}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrapper}>
              <Icon name="person" size={16} color="#666" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>User Account</Text>
              <Text style={styles.detailValue}>{alarm.userAccount || 'Unknown User'}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Alarm() {
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('timestamp');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket('wss://ws2relayserver.loca.lt');

      socket.onopen = () => {
        setConnectionStatus('Connected');
        setLoading(false);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'alarm-records' && message.records) {
            setAlarms(message.records);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = () => {
        setConnectionStatus('Connection Error');
        setLoading(false);
      };

      socket.onclose = () => {
        setConnectionStatus('Disconnected');
        setLoading(false);
      };

      return socket;
    };

    const socket = connectWebSocket();
    return () => socket.close();
  }, []);

  // Filter and search logic
  const processedAlarms = useMemo(() => {
    let result = [...alarms];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(alarm => 
        alarm.id.toString().includes(query) ||
        alarm.uuid.toLowerCase().includes(query) ||
        (alarm.userAccount && alarm.userAccount.toLowerCase().includes(query)) ||
        getPriorityLabel(alarm.priority).toLowerCase().includes(query)
      );
    }

    // Apply status/priority filter
    switch (filterBy) {
      case 'open':
        result = result.filter(alarm => alarm.isOpen);
        break;
      case 'closed':
        result = result.filter(alarm => !alarm.isOpen);
        break;
      case 'high':
        result = result.filter(alarm => alarm.priority === 1);
        break;
      case 'medium':
        result = result.filter(alarm => alarm.priority === 2);
        break;
      case 'low':
        result = result.filter(alarm => alarm.priority === 3);
        break;
      case 'normal':
        result = result.filter(alarm => alarm.priority === 0 || alarm.priority > 3);
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'id':
          comparison = a.id - b.id;
          break;
        case 'status':
          comparison = (a.isOpen ? 1 : 0) - (b.isOpen ? 1 : 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [alarms, searchQuery, filterBy, sortBy, sortOrder]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleToggleStatus = (alarm: AlarmRecord) => {
    Alert.alert(
      'Toggle Alarm Status',
      `Are you sure you want to ${alarm.isOpen ? 'close' : 'open'} this alarm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            const updatedAlarms = alarms.map(a => 
              a.id === alarm.id ? { ...a, isOpen: !a.isOpen } : a
            );
            setAlarms(updatedAlarms);
          }
        }
      ]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterBy('all');
    setSortBy('timestamp');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Connecting to alarm system...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Alarm Management</Text>
            <View style={[styles.connectionBadge, { 
              backgroundColor: connectionStatus === 'Connected' ? '#E8F5E8' : '#FFEBEE' 
            }]}>
              <Icon 
                name={connectionStatus === 'Connected' ? 'wifi' : 'wifi-off'} 
                size={16} 
                color={connectionStatus === 'Connected' ? '#2E7D32' : '#D32F2F'} 
              />
              <Text style={[styles.connectionText, { 
                color: connectionStatus === 'Connected' ? '#2E7D32' : '#D32F2F' 
              }]}>
                {connectionStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Monitor and manage system alarms</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, UUID, user, or priority..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {/* Filter Row */}
          <View style={styles.filterRow}>
            {/* <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filterBy}
                  onValueChange={setFilterBy}
                  style={styles.picker}
                >
                  <Picker.Item label="All Alarms" value="all" />
                  <Picker.Item label="Open Only" value="open" />
                  <Picker.Item label="Closed Only" value="closed" />
                  <Picker.Item label="High Priority" value="high" />
                  <Picker.Item label="Medium Priority" value="medium" />
                  <Picker.Item label="Low Priority" value="low" />
                  <Picker.Item label="Normal Priority" value="normal" />
                </Picker>
              </View>
            </View> */}
            
            {/* <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sortBy}
                  onValueChange={setSortBy}
                  style={styles.picker}
                >
                  <Picker.Item label="Time" value="timestamp" />
                  <Picker.Item label="Priority" value="priority" />
                  <Picker.Item label="ID" value="id" />
                  <Picker.Item label="Status" value="status" />
                </Picker>
              </View>
            </View> */}
            
            {/* <View style={styles.sortButtonColumn}>
              <Text style={styles.filterLabel}> </Text>
              <TouchableOpacity 
                style={styles.sortOrderButton}
                onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <Icon 
                  name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                  size={20} 
                  color="#1976D2" 
                />
              </TouchableOpacity>
            </View> */}
          </View>
          
          {/* Bottom Row */}
          <View style={styles.bottomRow}>
            {/* <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Icon name="clear-all" size={16} color="#666" />
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity> */}
            
            <View style={styles.statsSection}>
              {/* <Text style={styles.statsMainText}>
                {processedAlarms.length} of {alarms.length} alarms
              </Text> */}
              {/* <View style={styles.statusStatsRow}>
                <Text style={styles.openStat}>
                  Open: {processedAlarms.filter(a => a.isOpen).length}
                </Text>
                <Text style={styles.closedStat}>
                  Closed: {processedAlarms.filter(a => !a.isOpen).length}
                </Text>
              </View> */}
            </View>
          </View>
        </View>
      </View>

      {/* Alarms List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {processedAlarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={64} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>No Alarms Found</Text>
            <Text style={styles.emptySubtitle}>
              {alarms.length === 0 
                ? 'No alarm data received yet' 
                : 'Try adjusting your search or filters'
              }
            </Text>
          </View>
        ) : (
          processedAlarms.map((alarm, index) => (
            <AlarmCard
              key={`${alarm.id}-${alarm.timestamp}-${index}`}
              alarm={alarm}
              onPress={() => {}}
              onToggleStatus={() => handleToggleStatus(alarm)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  
  // Controls Styles
  controlsSection: {
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  filterColumn: {
    flex: 1,
  },
  sortButtonColumn: {
    width: 44,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 40,
  },
  picker: {
    height: 40,
  },
  sortOrderButton: {
    backgroundColor: '#E3F2FD',
    height: 40,
    width: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statsSection: {
    alignItems: 'flex-end',
  },
  statsMainText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  statusStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  openStat: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '600',
  },
  closedStat: {
    fontSize: 11,
    color: '#00AA44',
    fontWeight: '600',
  },
  
  // Scroll View Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  // Alarm Card Styles
  alarmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  priorityBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alarmIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alarmHeaderInfo: {
    flex: 1,
  },
  alarmId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  alarmTime: {
    fontSize: 12,
    color: '#666',
  },
  rightHeaderSection: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconWrapper: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
  },
  
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});