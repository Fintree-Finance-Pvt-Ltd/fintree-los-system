import { useAuth } from './AuthContext';

export default function Perm({ need, mode = 'any', children }) {
  const { user } = useAuth();
  const has = (p) => user?.permissions?.includes(p);

  let show = true;
  if (Array.isArray(need) && need.length) {
    show = mode === 'all' ? need.every(has) : need.some(has);
  } else if (typeof need === 'string') {
    show = has(need);
  }
  return show ? children : null;
}
