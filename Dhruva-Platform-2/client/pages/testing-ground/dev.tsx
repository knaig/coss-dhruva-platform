import { useState } from "react";
import { Box, Heading, Button, ButtonGroup } from "@chakra-ui/react";

export default function DevTestingGround() {
  const [selectedFeature, setSelectedFeature] = useState("translation"); // default to Translation

  const features = [
    { key: "translation", label: "Translation" },
    { key: "asr", label: "ASR" },
    { key: "tts", label: "TTS" },
    { key: "pipeline", label: "Pipeline" },
  ];

  return (
    <ContentLayout>
      <Box mb={8}>
        <Heading size="lg" color="orange.500" mb={4}>API Testing Ground</Heading>
        <ButtonGroup isAttached mb={8}>
          {features.map((feature, idx) => (
            <Button
              key={feature.key}
              onClick={() => setSelectedFeature(feature.key)}
              size="lg"
              fontWeight="bold"
              fontSize="xl"
              px={10}
              py={6}
              borderRadius={idx === 0 ? "2xl 0 0 2xl" : idx === features.length - 1 ? "0 2xl 2xl 0" : "0"}
              colorScheme="orange"
              variant={selectedFeature === feature.key ? "solid" : "outline"}
              boxShadow={selectedFeature === feature.key ? "xl" : "md"}
              zIndex={selectedFeature === feature.key ? 1 : 0}
              transition="all 0.2s"
              _active={{ bg: "orange.600" }}
            >
              {feature.label}
            </Button>
          ))}
        </ButtonGroup>
        <Box mt={6}>
          {selectedFeature === "translation" && (
            <Box>Translation panel goes here.</Box>
          )}
          {selectedFeature === "asr" && (
            <Box>ASR panel goes here.</Box>
          )}
          {selectedFeature === "tts" && (
            <Box>TTS panel goes here.</Box>
          )}
          {selectedFeature === "pipeline" && (
            <Box>Pipeline panel goes here.</Box>
          )}
        </Box>
      </Box>
    </ContentLayout>
  );
} 