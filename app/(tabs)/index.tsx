import * as React from "react";
import { View, Text, Alert, Button, ScrollView, StyleSheet } from "react-native";

export default function App() {
  const onPressButton = () => {
    Alert.alert("Button Pressed");
  };

  const [items] = React.useState([
    { item: "Burger", price: "10", id: 1 },
    { item: "Pizza", price: "20", id: 2 },
    { item: "Pasta", price: "30", id: 3 },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Hariharan's First Project in React Native
      </Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.itemText}>
              {item.item} <Text style={styles.price}>${item.price}</Text>
            </Text>
            <Button
              title="Order"
              color="#FFC107"
              onPress={() => Alert.alert(`Ordered ${item.item}`)}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footerButton}>
        <Button onPress={onPressButton} title="Press Me" color="green" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "pink",
    paddingTop: 50,
  },
  header: {
    textAlign: "center",
    color: "black",
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "bold",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    elevation: 2,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 8,
  },
  price: {
    fontWeight: "bold",
    color: "#333",
  },
  footerButton: {
    margin: 20,
  },
});
