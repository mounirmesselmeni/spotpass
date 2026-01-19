import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { getCurrentStaffUserApiStaffAuthMeGet } from '@/api/generated/authentication/authentication';

/**
 * Hook to fetch and cache the current user's information
 * Uses the /me endpoint to get fresh user data
 */
export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => getCurrentStaffUserApiStaffAuthMeGet(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
