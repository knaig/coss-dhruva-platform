import { Box, Grid, GridItem, Heading, Stack, Button, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { VscCode, VscAccount } from "react-icons/vsc";

export default function TestingGround() {
  const router = useRouter();
  const cardBg = useColorModeValue("white", "gray.700");
  return (
    <Box p={10}>
      <Heading mb={8}>Testing Ground</Heading>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={10}>
        <GridItem>
          <Box
            bg={cardBg}
            borderRadius="xl"
            boxShadow="xl"
            p={10}
            textAlign="center"
            cursor="pointer"
            _hover={{ boxShadow: "2xl", transform: "scale(1.03)" }}
            onClick={() => router.push("/testing-ground/developer")}
          >
            <Stack align="center" spacing={6}>
              <VscCode size={64} color="#ED8936" />
              <Heading size="lg">Dhruva Developer Sandbox</Heading>
              <Button colorScheme="orange" size="lg">Enter</Button>
            </Stack>
          </Box>
        </GridItem>
        <GridItem>
          <Box
            bg={cardBg}
            borderRadius="xl"
            boxShadow="xl"
            p={10}
            textAlign="center"
            cursor="pointer"
            _hover={{ boxShadow: "2xl", transform: "scale(1.03)" }}
            onClick={() => router.push("/testing-ground/user")}
          >
            <Stack align="center" spacing={6}>
              <VscAccount size={64} color="#ED8936" />
              <Heading size="lg">Chatbot - End User</Heading>
              <Button colorScheme="orange" size="lg">Enter</Button>
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
} 