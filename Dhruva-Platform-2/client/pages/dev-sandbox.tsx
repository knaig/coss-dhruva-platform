import { useState } from "react";
import { Box, Button, Flex, Heading, HStack, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import ContentLayout from "../components/Layouts/ContentLayout";
import Head from "next/head";
import DeveloperTestingGround from "../components/DevSandbox/DeveloperTestingGround";
import DhruvaChatbot from "../components/DevSandbox/DhruvaChatbot";

export default function DevSandbox() {
  return (
    <>
      <Head>
        <title>Dhruva Dev Sandbox</title>
      </Head>
      <ContentLayout>
        <Box p={8}>
          <Heading mb={8} color="orange.500">Dhruva Dev Sandbox</Heading>
          <Tabs variant="enclosed" colorScheme="orange">
            <TabList>
              <Tab>Developer Testing Ground</Tab>
              <Tab>Chatbot Testing Ground</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <DeveloperTestingGround />
              </TabPanel>
              <TabPanel>
                <DhruvaChatbot />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </ContentLayout>
    </>
  );
} 