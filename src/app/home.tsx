import Workspace from '../features/workspace';
import { useAuth } from '../features/auth-context';
export default function Home() {
  const { session } = useAuth();
  return session ? <Workspace key={session.user.id} /> : null;
}
