import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email, permissions, ... }
  const [loading, setLoading] = useState(true); // boot splash

  async function refreshMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loginWithToken(token) {
    localStorage.setItem('token', token);
    await refreshMe();
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  useEffect(() => {
    if (localStorage.getItem('token')) refreshMe();
    else setLoading(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, loginWithToken, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
