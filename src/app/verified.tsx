import { router } from 'expo-router';
import { SafeAreaView, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function VerifiedEmailScreen() {
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.content}>
      <View style={styles.icon}><Text style={styles.check}>✓</Text></View>
      <Text style={styles.title}>Email verified</Text>
      <Text style={styles.message}>Your HeadQuarters account is confirmed. Return to the app and log in to reserve a workspace or choose a membership plan.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.replace('/login')}>
        <Text style={styles.buttonText}>Log in to HeadQuarters</Text>
      </Pressable>
      <Text style={styles.note}>If this screen opened from Gmail, you can safely close the browser after logging in.</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#2E9B66', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  check: { color: '#FFFFFF', fontSize: 42, fontWeight: '800' },
  title: { color: '#1E1B2E', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  message: { color: '#706C7B', fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
  button: { marginTop: 10, width: '100%', minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#5B3FD6' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  note: { color: '#8A8794', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
