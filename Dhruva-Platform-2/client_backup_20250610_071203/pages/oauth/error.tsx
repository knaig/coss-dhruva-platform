import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Box,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Image,
  Code,
} from "@chakra-ui/react";

export default function OAuthError() {
  const router = useRouter();
  const [errorType, setErrorType] = useState<string>('unknown');
  const [errorDescription, setErrorDescription] = useState<string>('An unknown error occurred during authentication');

  useEffect(() => {
    // Get error information from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setErrorType(error);
      
      // Set user-friendly error descriptions
      switch (error) {
        case 'access_denied':
          setErrorDescription('You denied access to your Google account. Please try again and grant the necessary permissions.');
          break;
        case 'invalid_state':
          setErrorDescription('Security validation failed. This might be due to an expired session or tampering. Please try logging in again.');
          break;
        case 'server_error':
          setErrorDescription('A server error occurred during authentication. Please try again later.');
          break;
        case 'verification_required':
          setErrorDescription('Email verification is required. Please check your email and verify your account before proceeding.');
          break;
        case 'auth_failed':
          setErrorDescription('Authentication failed. Please check your Google account and try again.');
          break;
        case 'init_failed':
          setErrorDescription('Failed to initialize OAuth flow. Please try again.');
          break;
        default:
          setErrorDescription(`Authentication error: ${error}. Please try again.`);
      }
    }
  }, []);

  const handleRetry = () => {
    router.push('/');
  };

  const handleContactSupport = () => {
    // You can customize this to your support system
    window.open('mailto:support@dhruva.ai4bharat.org?subject=OAuth Authentication Issue', '_blank');
  };

  return (
    <>
      <Head>
        <title>Authentication Error - Dhruva Platform</title>
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
          
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                {errorDescription}
              </AlertDescription>
            </Box>
          </Alert>

          {errorType !== 'unknown' && (
            <Box w="full">
              <Text fontSize="sm" color="gray.500" mb={2}>
                Error Code:
              </Text>
              <Code colorScheme="red" p={2} borderRadius="md" w="full" display="block">
                {errorType}
              </Code>
            </Box>
          )}

          <VStack spacing={3} w="full">
            <Button
              onClick={handleRetry}
              colorScheme="blue"
              size="lg"
              w="full"
            >
              Try Again
            </Button>
            
            <Button
              onClick={handleContactSupport}
              variant="outline"
              size="md"
              w="full"
            >
              Contact Support
            </Button>
          </VStack>

          <Box textAlign="center">
            <Text fontSize="sm" color="gray.500">
              If you continue to experience issues, please contact our support team.
            </Text>
          </Box>
        </VStack>
      </Box>
    </>
  );
}
