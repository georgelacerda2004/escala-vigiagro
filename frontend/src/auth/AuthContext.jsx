import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchMe = () =>
      api
        .get('/auth/me')
        .then((r) => setUser(r.data.user))
        .catch(() => localStorage.removeItem('token'));

    fetchMe().finally(() => setLoading(false));

    // Reverifica a role/perfil quando a aba volta ao foco — assim, se o admin
    // tiver promovido o usuario nesse meio tempo, a UI atualiza sem reload.
    const onFocus = () => {
      if (localStorage.getItem('token')) fetchMe();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  const can = (minRole) => {
    const rank = { OPERATOR: 1, SUPERVISOR: 2, ADMIN: 3 };
    return user && (rank[user.role] || 0) >= (rank[minRole] || 99);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, can }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
