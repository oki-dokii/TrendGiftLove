import { useQuery } from "@tanstack/react-query";

// DON'T DELETE THIS COMMENT
// Blueprint reference: javascript_log_in_with_replit

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
