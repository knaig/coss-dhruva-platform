import {
  Grid,
  GridItem,
  Heading,
  Stack,
  Input,
  Button,
  useMediaQuery,
  useToast,
  Text,
  Link,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { login, signup } from "../api/authAPI";
import { useMutation } from "@tanstack/react-query";
import BaseImage from "../components/Common/BaseImage";

export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignupMode, setIsSignupMode] = useState(false);

  const loginMutation = useMutation(login);
  const signupMutation = useMutation(signup);

  useEffect(() => {
    if (
      localStorage.getItem("refresh_token") &&
      localStorage.getItem("access_token")
    ) {
      const currentPage = localStorage.getItem("current_page");
      if (currentPage) {
        // If current page is stored, redirect there
        window.location.href = currentPage;
      } else {
        // Default redirect to testing ground
        router.push("/testing-ground");
      }
    }
  }, [router]);

  const validateCredentials = () => {
    loginMutation.mutate(
      { email: username, password: password },
      {
        onSuccess: () => {
          localStorage.setItem("email", username);
          const currentPage = localStorage.getItem("current_page");
          if (currentPage) {
            // Use window.location.href for full page redirect with base path
            window.location.href = currentPage;
          } else {
            router.push("/testing-ground");
          }
        },
        onError: (error: any) => {
          if (
            error?.response.status === 401 ||
            error?.response.status === 422
          ) {
            toast({
              title: "Error",
              description: "Invalid Credentials",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          } else {
            toast({
              title: "Error",
              description: "Something went wrong, please try again later",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }
        },
      }
    );
  };

  const handleSignup = () => {
    if (!name.trim() || !username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    signupMutation.mutate(
      { name: name, email: username, password: password },
      {
        onSuccess: (data) => {
          toast({
            title: "Success",
            description: `Account created successfully! Your API key: ${data.api_key}`,
            status: "success",
            duration: 10000,
            isClosable: true,
          });
          // Switch back to login mode
          setIsSignupMode(false);
          setName("");
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.message || "Failed to create account";
          toast({
            title: "Signup Error",
            description: errorMessage,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  };



  return (
    <>
      <Head>
        <title>{isSignupMode ? "Sign up for Dhruva" : "Login into Dhruva"}</title>
      </Head>
      {isMobile ? (
        <Grid templateColumns="repeat(1, 1fr)">
          <GridItem className="centered-column" w="100%" h="100vh">
            <Stack spacing={5}>
              <BaseImage src="/a4b.svg" width={104} height={104} alt="a4b" />
              <Heading>{isSignupMode ? "Sign up for Dhruva" : "Login into Dhruva"}</Heading>

              {isSignupMode && (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  size="lg"
                />
              )}

              <Input
                value={username}
                type="email"
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                placeholder="Email"
                size="lg"
              />
              <Input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                type="password"
                placeholder="Password"
                size="lg"
              />
              <Button
                onClick={() => {
                  isSignupMode ? handleSignup() : validateCredentials();
                }}
                isLoading={isSignupMode ? signupMutation.isLoading : loginMutation.isLoading}
                colorScheme="orange"
                size="lg"
              >
                {isSignupMode ? "SIGN UP" : "LOGIN"}
              </Button>

              <Text textAlign="center">
                {isSignupMode ? "Already have an account? " : "Don't have an account? "}
                <Link
                  color="orange.500"
                  fontWeight="bold"
                  onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setName("");
                    setUsername("");
                    setPassword("");
                  }}
                  cursor="pointer"
                >
                  {isSignupMode ? "Login here" : "Sign up here"}
                </Link>
              </Text>

            </Stack>
          </GridItem>
        </Grid>
      ) : (
        <Grid templateColumns="repeat(2, 1fr)">
          <GridItem
            className="centered-column"
            w="100%"
            h="100vh"
            bg="gray.100"
          >
            <BaseImage
              src="/dhruvaai.svg"
              width={500}
              height={500}
              alt="dhruvabot"
            />
          </GridItem>
          <GridItem className="centered-column" w="100%" h="100vh">
            <Stack spacing={5}>
              <BaseImage src="/a4b.svg" width={104} height={104} alt="a4b" />
              <Heading>{isSignupMode ? "Sign up for Dhruva" : "Login into Dhruva"}</Heading>

              {isSignupMode && (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  size="lg"
                />
              )}

              <Input
                value={username}
                type="email"
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                placeholder="Email"
                size="lg"
              />
              <Input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                type="password"
                placeholder="Password"
                size="lg"
              />
              <Button
                onClick={() => {
                  isSignupMode ? handleSignup() : validateCredentials();
                }}
                isLoading={isSignupMode ? signupMutation.isLoading : loginMutation.isLoading}
                colorScheme="orange"
                size="lg"
              >
                {isSignupMode ? "SIGN UP" : "LOGIN"}
              </Button>

              <Text textAlign="center">
                {isSignupMode ? "Already have an account? " : "Don't have an account? "}
                <Link
                  color="orange.500"
                  fontWeight="bold"
                  onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setName("");
                    setUsername("");
                    setPassword("");
                  }}
                  cursor="pointer"
                >
                  {isSignupMode ? "Login here" : "Sign up here"}
                </Link>
              </Text>

            </Stack>
          </GridItem>
        </Grid>
      )}
    </>
  );
}
