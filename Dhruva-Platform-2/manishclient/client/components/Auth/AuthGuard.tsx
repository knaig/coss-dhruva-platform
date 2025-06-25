import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Box, Spinner, Center, Text } from "@chakra-ui/react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  fallbackPath?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  fallbackPath = "/",
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const userRole = localStorage.getItem("user_role");

      // If authentication is not required, allow access
      if (!requireAuth) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Check if user is authenticated
      const isAuthenticated = !!(accessToken && refreshToken);

      if (!isAuthenticated) {
        // Store current page for redirect after login
        localStorage.setItem("current_page", window.location.href);
        router.push(fallbackPath);
        return;
      }

      // Check role-based access if required
      if (requiredRole && userRole !== requiredRole) {
        router.push("/403"); // Forbidden page
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, requireAuth, requiredRole, fallbackPath]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="orange.500" />
          <Text mt={4} fontSize="lg" color="gray.600">
            Loading...
          </Text>
        </Box>
      </Center>
    );
  }

  if (!isAuthorized) {
    return null; // Router will handle redirect
  }

  return <>{children}</>;
};

export default AuthGuard;
