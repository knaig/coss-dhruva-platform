import React from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import { customTheme } from "../themes/index";
import Navbar from "../components/Navigation/Navbar";
import NavbarMobile from "../components/Navigation/NavbarMobile";
import useMediaQuery from "../hooks/useMediaQuery";
import "../styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/router";
import Script from "next/script";

const queryClient = new QueryClient();

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const smallscreen = useMediaQuery("(max-width: 1080px)");
  const router = useRouter();

  // Don't show navigation on the login page (index page)
  const isLoginPage = router.pathname === '/';

  return (
    <>
      {!isLoginPage && (smallscreen ? <NavbarMobile /> : <Navbar />)}
      <Box px={!isLoginPage ? [2, 4, 8] : 0} py={!isLoginPage ? [2, 4] : 0}>
        {children}
      </Box>
    </>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={customTheme}>
        <Layout>
          <Script
            type="text/javascript"
            src="https://ai4bharat.github.io/Recorderjs/lib/recorder.js"
            strategy="beforeInteractive"
          />
          <Component {...pageProps} />
        </Layout>
      </ChakraProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default MyApp;
