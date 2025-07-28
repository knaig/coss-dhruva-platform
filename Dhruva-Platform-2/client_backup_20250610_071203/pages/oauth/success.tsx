import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Box,
  Spinner,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Image,
} from "@chakra-ui/react";
import { handleOAuthCallback } from "../../api/authAPI";

export default function OAuthSuccess() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
          throw new Error('No authentication token received');
        }

        // Handle the OAuth callback
        await handleOAuthCallback(token);
        setSuccess(true);
        setLoading(false);

        // Redirect to services page after a short delay
        setTimeout(() => {
          const redirectPath = localStorage.getItem("current_page") || "/services";
          router.push(redirectPath).then(() => window.location.reload());
        }, 2000);

      } catch (error: any) {
        console.error('OAuth success page error:', error);
        setError(error.message || 'Authentication failed');
        setLoading(false);
      }
    };

    // Only process if we have URL parameters
    if (typeof window !== 'undefined' && window.location.search) {
      processOAuthCallback();
    } else {
      setError('No authentication data received');
      setLoading(false);
    }
  }, [router]);

  const handleRetry = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>OAuth Authentication - Dhruva Platform</title>
      </Head>
      
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
        p={4}
      >
        <VStack spacing={6} maxW="md" w="full">
          <Image src="/dhruva/a4b.svg" width={104} height={104} alt="Dhruva Platform" />
          
          {loading && (
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text fontSize="lg" color="gray.600">
                Completing authentication...
              </Text>
            </VStack>
          )}

          {success && !loading && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Authentication Successful!</AlertTitle>
                <AlertDescription>
                  You have been successfully logged in with Google. Redirecting to your dashboard...
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {error && !loading && (
            <VStack spacing={4}>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Authentication Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
              </Alert>
              
              <Button
                onClick={handleRetry}
                colorScheme="blue"
                size="lg"
              >
                Try Again
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </>
  );
}
