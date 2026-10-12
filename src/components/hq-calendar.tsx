import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, palette, ui } from './hq-ui';
export function Calendar({value,onChange}:{value:string;onChange:(date:string)=>void}){
 const [month,setMonth]=useState(()=>new Date(value.slice(0,7)+'-01T00:00:00Z'));
 const y=month.getUTCFullYear(),m=month.getUTCMonth();
 const offset=new Date(Date.UTC(y,m,1)).getUTCDay();
 const count=new Date(Date.UTC(y,m+1,0)).getUTCDate();
 const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
 return <View style={{gap:14}}><View style={ui.between}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={ui.iconButton} onPress={()=>setMonth(new Date(Date.UTC(y,m-1,1)))}><Icon name="back" size={16}/></Pressable><Text style={ui.heading}>{month.toLocaleDateString('en-PH',{month:'long',year:'numeric',timeZone:'UTC'})}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" style={ui.iconButton} onPress={()=>setMonth(new Date(Date.UTC(y,m+1,1)))}><Icon name="arrow" size={16}/></Pressable></View><View style={{flexDirection:'row'}}>{['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d=><Text key={d} style={[ui.caption,{width:'14.2857%',textAlign:'center',fontSize:8,fontWeight:'700'}]}>{d}</Text>)}</View><View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:offset+count},(_,i)=>{
 const day=i-offset+1;const text=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const chosen=text===value;const past=text<today;
 return <View key={i} style={{width:'14.2857%',padding:3}}>{day>0&&<Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{selected:chosen,disabled:past}} disabled={past} onPress={()=>onChange(text)} style={{minHeight:34,borderRadius:8,justifyContent:'center',alignItems:'center',backgroundColor:chosen?palette.purple:'transparent'}}><Text style={{fontSize:11,fontWeight:'700',color:chosen?'white':past?'#CBD0D9':palette.navy}}>{day}</Text></Pressable>}</View>;
 })}</View></View>;
}
