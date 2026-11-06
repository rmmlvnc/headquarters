import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Expo WebBrowser returns the URL to the checkout caller, which captures the
// order. This route prevents an unhelpful not-found page during that handoff.
export default function PayPalReturnScreen() {
  return <View style={styles.page}>
    <StatusBar style="dark" />
    <ActivityIndicator size="large" color="#5B3FD6" />
    <Text style={styles.title}>Finalizing your PayPal payment…</Text>
    <Text style={styles.body}>Please wait while HeadQuarters confirms your PayPal order.</Text>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: '#F7F6FB' },
  title: { color: '#1E1B2E', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  body: { color: '#706C7B', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
