import React from "react";
import { ChakraProvider, Box, Flex, Spacer } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import { customTheme } from "../themes/index";
import Navbar from "../components/Navigation/Navbar";
import NavbarMobile from "../components/Navigation/NavbarMobile";
import useMediaQuery from "../hooks/useMediaQuery";
import "../styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const smallscreen = useMediaQuery("(max-width: 1080px)");
  return (
    <>
      {smallscreen ? <NavbarMobile /> : <Navbar />}
      <Box px={[2, 4, 8]} py={[2, 4]}>{children}</Box>
    </>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={customTheme}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ChakraProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default MyApp;
