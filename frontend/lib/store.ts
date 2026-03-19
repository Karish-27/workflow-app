import { create } from 'zustand';
import { authApi } from '../lib/api';
import { User, AuthState, RegisterData } from '../types';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    localStorage.setItem('wf_token', token);
    localStorage.setItem('wf_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  register: async (data: RegisterData) => {
    await authApi.register(data);
  },

  logout: () => {
    localStorage.removeItem('wf_token');
    localStorage.removeItem('wf_user');
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('wf_token');
      if (!token) { set({ isLoading: false }); return; }
      const res = await authApi.me();
      set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('wf_token');
      localStorage.removeItem('wf_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
