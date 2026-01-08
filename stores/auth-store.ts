/**
 * Auth Store - STUB for Phase 3 RBAC Frontend Components
 *
 * This is a placeholder to allow Phase 3 components to compile.
 * Will be fully implemented when Phase 3 begins.
 *
 * TODO: Phase 3 - Replace with actual auth state management
 */

import { create } from 'zustand';
import type { Role, Permission } from '@/types/rbac';

interface UserRole {
  id: string;
  role_id: string;
  hierarchy_level: number;
}

interface AuthState {
  user: { id: string; email: string } | null;
  userRole: UserRole | null;
  userPermissions: Permission[] | null;
  roles: Role[];
  isLoading: boolean;
  loading: boolean; // Alias for components using 'loading' instead of 'isLoading'
  error: string | null;

  // Actions (stubs)
  fetchUserRole: () => Promise<void>;
  fetchUserPermissions: () => Promise<void>;
  clearAuth: () => void;
}

/**
 * Stub auth store - returns null/empty for all auth state
 * Phase 3 will implement full auth state management
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: null,
  userPermissions: null,
  roles: [],
  isLoading: false,
  loading: false, // Alias
  error: null,

  fetchUserRole: async () => {
    // Phase 3: Will fetch from /api/v1/rbac/my-role
    set({ isLoading: false, userRole: null });
  },

  fetchUserPermissions: async () => {
    // Phase 3: Will fetch from /api/v1/rbac/my-permissions
    set({ isLoading: false, userPermissions: null });
  },

  clearAuth: () => {
    set({
      user: null,
      userRole: null,
      userPermissions: null,
      isLoading: false,
      error: null,
    });
  },
}));
