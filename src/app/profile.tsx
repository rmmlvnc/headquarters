import { Redirect } from 'expo-router';
export default function Profile(){return <Redirect href={{pathname:'/home',params:{view:'Profile'}}}/>;}
