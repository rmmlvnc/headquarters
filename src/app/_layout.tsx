import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../features/auth-context';
function Navigation() {
  const { session, loading, error, retry } = useAuth();
  if (loading) return <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator color="#5137A3"/><Text>Restoring your sessionâ€¦</Text></View>;
  return <>
    {!!error && <View style={{padding:16,backgroundColor:'#FFF0DC'}}><Text accessibilityLiveRegion="polite">{error}</Text><Pressable accessibilityRole="button" onPress={retry}><Text style={{paddingVertical:12,color:'#5137A3'}}>Retry connection</Text></Pressable></View>}
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="scan-access" />
      </Stack.Protected>
      <Stack.Screen name="verified" />
      <Stack.Screen name="paypal-return" />
      <Stack.Screen name="explore" />
    </Stack>
  </>;
}
export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><StatusBar style="dark"/><Navigation/></AuthProvider></SafeAreaProvider>;
}

