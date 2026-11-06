import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authError } from '../lib/auth-api';
import { isStaff } from '../lib/admin-api';
import { requireSupabase } from '../lib/supabase';

export default function ScanAccess() {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('Point the camera at a HeadQuarters member QR pass.');
  const [action, setAction] = useState<'check-in' | 'check-out'>('check-in');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const locked = useRef(false);
  async function verifyStaff() {
    try { setAllowed(await isStaff()); } catch (error) { setMessage(authError(error)); setAllowed(false); }
  }
  if (allowed === null) { void verifyStaff(); return <SafeAreaView style={s.center}><ActivityIndicator color="#5419D9" /><Text style={s.text}>Checking staff access…</Text></SafeAreaView>; }
  if (!allowed) return <SafeAreaView style={s.center}><Text style={s.title}>Staff access required</Text><Text style={s.text}>{message}</Text><Pressable style={s.button} onPress={() => router.back()}><Text style={s.buttonText}>Back</Text></Pressable></SafeAreaView>;
  async function scanned(value: string) {
    if (locked.current) return;
    const token = value.startsWith('HQ1:') ? value.slice(4) : '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(token)) { setMessage('This is not a valid HeadQuarters QR access pass.'); return; }
    locked.current = true;
    try {
      const { data, error } = await requireSupabase().rpc('hq_validate_access_pass', { p_token: token, p_action: action });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result) throw new Error(error?.message || 'Access could not be validated.');
      setMessage(`${result.resource_name}: ${result.status.replace('-', ' ')} successfully.`);
    } catch (error) { setMessage(authError(error)); }
    finally { setTimeout(() => { locked.current = false; }, 1800); }
  }
  if (!permission) return <SafeAreaView style={s.center} />;
  if (!permission.granted) return <SafeAreaView style={s.center}><Text style={s.title}>Camera permission needed</Text><Text style={s.text}>The staff scanner needs camera access to read QR passes.</Text><Pressable style={s.button} onPress={requestPermission}><Text style={s.buttonText}>Allow camera</Text></Pressable></SafeAreaView>;
  return <SafeAreaView style={s.safe}><View style={s.header}><Pressable onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></Pressable><Text style={s.title}>Staff QR scanner</Text></View><View style={s.tabs}><Pressable style={[s.tab, action === 'check-in' && s.tabActive]} onPress={() => setAction('check-in')}><Text style={s.tabText}>Check in</Text></Pressable><Pressable style={[s.tab, action === 'check-out' && s.tabActive]} onPress={() => setAction('check-out')}><Text style={s.tabText}>Check out</Text></Pressable></View><CameraView style={s.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => void scanned(data)} /><View style={s.message}><Text style={s.text}>{message}</Text></View></SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#17122A'},center:{flex:1,justifyContent:'center',alignItems:'center',padding:24,gap:14,backgroundColor:'#17122A'},header:{padding:18,gap:10},back:{color:'#D9CEFF',fontWeight:'700'},title:{color:'white',fontSize:22,fontWeight:'800'},text:{color:'#E4DDF4',fontSize:15,lineHeight:22,textAlign:'center'},tabs:{flexDirection:'row',gap:10,paddingHorizontal:18,paddingBottom:16},tab:{flex:1,alignItems:'center',padding:13,borderRadius:10,backgroundColor:'#332657'},tabActive:{backgroundColor:'#6D35E6'},tabText:{color:'white',fontWeight:'800'},camera:{flex:1,marginHorizontal:18,borderRadius:20,overflow:'hidden'},message:{padding:22,minHeight:94,justifyContent:'center'},button:{backgroundColor:'#6D35E6',borderRadius:10,paddingHorizontal:22,paddingVertical:13},buttonText:{color:'white',fontWeight:'800'} });
