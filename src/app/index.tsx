import { router } from 'expo-router';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return <View style={styles.page}>
    <StatusBar barStyle="light-content" />
    <View pointerEvents="none" style={styles.topGlow} />
    <View pointerEvents="none" style={styles.bottomGlow} />
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.logoMark} accessibilityLabel="HeadQuarters logo">
          <Text style={styles.logoLetters}>HQ</Text><View style={styles.logoRule} />
        </View>
        <Text style={styles.brandName}>HeadQuarters</Text>
        <Text style={styles.brandLocation}>ILIGAN COWORKING</Text>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>FLEXIBLE WORKSPACE, ONE APP</Text>
          <Text style={styles.title}>Your space to work,{'\n'}meet, and create.</Text>
          <Text style={styles.description}>Reserve desks and meeting rooms, manage your membership, and access your workspace in one place.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Log in to HeadQuarters" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => router.push('/login')}><Text style={styles.primaryButtonText}>Log in</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Create a HeadQuarters account" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => router.push('/register')}><Text style={styles.secondaryButtonText}>Create an account</Text></Pressable>
        <Text style={styles.footer}>Your workspace. Your community.</Text>
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#160A36', overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18 },
  topGlow: { position: 'absolute', width: 310, height: 310, borderRadius: 155, backgroundColor: '#42217D', opacity: 0.45, top: -150, right: -95 },
  bottomGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#2D1760', opacity: 0.65, bottom: -180, left: -125 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  logoMark: { width: 92, height: 92, borderRadius: 27, backgroundColor: '#24104E', borderWidth: 2, borderColor: '#F8F5FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, elevation: 7 },
  logoLetters: { color: '#F4D43F', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  logoRule: { width: 29, height: 2, borderRadius: 1, marginTop: 3, backgroundColor: '#F4D43F' },
  brandName: { marginTop: 18, color: '#FFF', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  brandLocation: { marginTop: 4, color: '#DCCFFF', fontSize: 10, fontWeight: '800', letterSpacing: 2.25 },
  intro: { alignItems: 'center', marginTop: 47, maxWidth: 345 },
  eyebrow: { color: '#CBB9F5', fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 13 },
  title: { color: '#FFF', fontSize: 28, lineHeight: 35, fontWeight: '800', textAlign: 'center', letterSpacing: -0.45 },
  description: { color: '#E8E1F8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 15 },
  actions: { gap: 11 },
  primaryButton: { minHeight: 56, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#3E208D', fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 56, borderRadius: 16, borderWidth: 1.5, borderColor: '#CDBDFA', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.76 },
  footer: { marginTop: 7, color: '#CBBFF0', fontSize: 11, textAlign: 'center' },
});
