import React from "react";
import BaseImage from "../components/Common/BaseImage";
import { Box, Flex,  VStack } from "@chakra-ui/react";
import Head from "next/head";
function ErrorPage() {
  return (
    <>
    <Head>
      <title>Oops!</title>
    </Head>
    <Box minH={"100vh"}>
      <Flex justify="center" align="center" h="90vh">
        <VStack>
          <BaseImage alt="403 Error" src="/403.svg" width={400} height={400} />
        </VStack>
      </Flex>
    </Box>
    </>
  );
}

export default ErrorPage;
