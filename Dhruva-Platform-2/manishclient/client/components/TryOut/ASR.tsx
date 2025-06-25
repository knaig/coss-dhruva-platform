import {
  Stack,
  Text,
  Select,
  Button,
  Textarea,
  Grid,
  GridItem,
  Progress,
  Input,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Box,
  HStack,
  VStack,
  Spacer,
  useToast,
} from "@chakra-ui/react";
import { FaMicrophone } from "react-icons/fa";
import { useState, useEffect } from "react";
import { dhruvaAPI, apiInstance } from "../../api/apiConfig";
import { lang2label } from "../../config/config";
import { getWordCount } from "../../utils/utils";
import {
  StreamingClient,
  SocketStatus,
} from "@project-sunbird/open-speech-streaming-client";
import { CloseIcon } from "@chakra-ui/icons";
import React from "react";
import { FeedbackModal } from "../Feedback/Feedback";
import {
  PipelineInput,
  PipelineOutput,
  ULCATaskType,
} from "../Feedback/FeedbackTypes";
import { useAudioRecording, useAudioFileUpload, useAudioPlayback } from "../../hooks/useAudioRecording";

interface LanguageConfig {
  sourceLanguage: string;
  targetLanguage: string;
}

interface Props {
  languages: LanguageConfig[];
  serviceId: string;
}

const ASRTry: React.FC<Props> = (props) => {
  const [streamingClient, setStreamingClient] = useState(new StreamingClient());

  const [languages, setLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState("");
  const [audioText, setAudioText] = useState("");
  const [placeholder, setPlaceHolder] = useState(
    "Start Recording for ASR Inference..."
  );
  const [fetching, setFetching] = useState(false);
  const [sampleRate, setSampleRate] = useState<number>(16000);
  const [fetched, setFetched] = useState(false);
  const [responseWordCount, setResponseWordCount] = useState(0);
  const [requestTime, setRequestTime] = useState("");

  const [inferenceMode, setInferenceMode] = useState("rest");

  const toast = useToast();

  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pipelineInput, setPipelineInput] = useState<
    PipelineInput | undefined
  >();
  const [pipelineOutput, setPipelineOutput] = useState<
    PipelineOutput | undefined
  >();

  const MAX_AUDIO_SIZE = 1048576; // 1MB in bytes

  // Use the new audio recording hook
  const audioRecording = useAudioRecording({
    sampleRate,
    maxDuration: 120,
    maxFileSize: MAX_AUDIO_SIZE,
    preferredFormat: 'wav',
    autoStop: true,
    onRecordingComplete: async (result) => {
      console.log('[ASR] Recording completed:', result);
      await handleRecordingComplete(result);
    },
    onError: (error) => {
      console.error('[ASR] Recording error:', error);
      setFetching(false);
      setFetched(false);
    }
  });

  // Use audio file upload hook
  const audioFileUpload = useAudioFileUpload();

  // Use audio playback hook
  const audioPlayback = useAudioPlayback();

  // Language script mapping for ASR API
  const getLanguageScriptCode = (lang: string): string => {
    const LANGUAGE_SCRIPT_MAP: { [key: string]: string } = {
      'hi': 'Deva',
      'en': 'Latn',
      'bn': 'Beng',
      'gu': 'Gujr',
      'kn': 'Knda',
      'ml': 'Mlym',
      'mr': 'Deva',
      'or': 'Orya',
      'pa': 'Guru',
      'ta': 'Taml',
      'te': 'Telu',
      'ur': 'Arab',
      'as': 'Beng',
      'brx': 'Deva',
      'doi': 'Deva',
      'gom': 'Deva',
      'ks': 'Arab',
      'mai': 'Deva',
      'mni': 'Beng',
      'ne': 'Deva',
      'sa': 'Deva',
      'sat': 'Olck',
      'sd': 'Arab'
    };
    return LANGUAGE_SCRIPT_MAP[lang] || '';
  };

  // Handle recording completion
  const handleRecordingComplete = async (result: any) => {
    try {
      console.log('[ASR] Processing recorded audio:', result);

      // Play audio for user feedback
      audioPlayback.play(result.audioFile);

      // Convert file to base64 for ASR API
      const reader = new FileReader();
      reader.readAsDataURL(result.audioFile);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        await getASROutput(base64Data);
      };
    } catch (error) {
      console.error('[ASR] Error processing recording:', error);
      setFetching(false);
      setFetched(false);
    }
  };





  // Enhanced ASR function with correct API format based on official documentation
  const getASROutput = async (asrInput: string, retryCount = 0, maxRetries = 3) => {
    try {
      console.log(`[ASR] Starting transcription attempt ${retryCount + 1}/${maxRetries + 1}`);
      console.log(`[ASR] Base64 audio length: ${asrInput.length} characters`);

      // Use the correct API endpoint and format from documentation
      const endpoint = `http://localhost:8000/services/inference/asr?serviceId=${props.serviceId}`;

      const payload = {
        controlConfig: {
          dataTracking: true,
        },
        config: {
          audioFormat: "wav",
          language: {
            sourceLanguage: language,
            sourceScriptCode: getLanguageScriptCode(language) || '',
          },
          encoding: "base64",
          samplingRate: sampleRate,
          serviceId: props.serviceId,
          preProcessors: [],
          postProcessors: [],
          transcriptionFormat: {
            value: "transcript"
          },
          bestTokenCount: 0,
        },
        audio: [
          {
            audioContent: asrInput,
          },
        ],
      };

      console.log(`[ASR] Sending request to: ${endpoint}`);
      console.log(`[ASR] Payload structure:`, {
        controlConfig: payload.controlConfig,
        config: payload.config,
        audioLength: payload.audio[0].audioContent.length
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_API_KEY || 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[ASR] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }
        console.error(`[ASR] Server error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`ASR API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[ASR] Response data:', data);

      if (data && data.output && data.output[0] && data.output[0].source) {
        const output = data.output[0].source;

        // Success - update UI
        setPipelineInput({
          pipelineTasks: [
            {
              config: {
                language: {
                  sourceLanguage: language,
                },
                audioFormat: "wav",
                encoding: "base64",
                samplingRate: sampleRate,
              },
              taskType: ULCATaskType.ASR,
            },
          ],
          inputData: {
            audio: [
              {
                audioContent: asrInput,
              },
            ],
          },
        });

        setPipelineOutput({
          pipelineResponse: [
            {
              taskType: ULCATaskType.ASR,
              output: data.output,
            },
          ],
        });

        setAudioText(output);
        setResponseWordCount(getWordCount(output));
        setRequestTime("N/A"); // Direct API doesn't return this header
        setFetching(false);
        setFetched(true);
        setMicError(""); // Clear any previous errors

        console.log('[ASR] Transcription successful:', output);
      } else {
        console.error('[ASR] Invalid response structure:', data);
        throw new Error('Invalid ASR response format');
      }

    } catch (error) {
      console.error(`[ASR] Error on attempt ${retryCount + 1}:`, error);

      // Determine if error is retryable
      const isRetryable = (
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504') ||
        error.message.includes('network') ||
        error.message.includes('timeout')
      );

      // Retry if possible
      if (isRetryable && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[ASR] Retrying in ${delay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);

        setMicError(`ASR failed, retrying... (${retryCount + 1}/${maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return getASROutput(asrInput, retryCount + 1, maxRetries);
      }

      // Final failure - show user-friendly error
      let errorMessage = 'Speech recognition failed. ';
      if (error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please check API key.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Too many requests. Please wait and try again.';
      } else if (error.message.includes('500')) {
        errorMessage = 'ASR service is experiencing issues. Please try again later.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try a shorter recording.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection issue. Please check your internet.';
      } else {
        errorMessage += error.message;
      }

      setMicError(errorMessage);
      setAudioText('[ASR Failed]');
      setFetching(false);
      setFetched(false);
    }
  };

  // New recording handlers using the audio recording hook
  const handleStartRecording = async () => {
    try {
      setFetching(true);
      setFetched(false);
      setPlaceHolder("Recording Audio....");
      await audioRecording.startRecording();
    } catch (error) {
      console.error('[ASR] Failed to start recording:', error);
      setFetching(false);
      setPlaceHolder("Start Recording for ASR Inference...");
    }
  };

  const handleStopRecording = async () => {
    try {
      await audioRecording.stopRecording();
      setPlaceHolder("Start Recording for ASR Inference...");
    } catch (error) {
      console.error('[ASR] Failed to stop recording:', error);
      setFetching(false);
      setPlaceHolder("Start Recording for ASR Inference...");
    }
  };

  const startStreaming = () => {
    setStreamingText("");
    setStreaming(true);
    setFetching(true);
    streamingClient.connect(
      dhruvaAPI.asrStreamingInference,
      props.serviceId,
      process.env.NEXT_PUBLIC_API_KEY,
      language,
      sampleRate,
      [],
      function (action: any, id: any) {
        if (action === SocketStatus.CONNECTED) {
          console.log("Connected");
          streamingClient.startStreaming(function (transcript: string) {
            setStreamingText(transcript);
          });
        } else if (action === SocketStatus.TERMINATED) {
          console.log("Terminated");
        } else {
          console.log("Action: ", action, id);
        }
      }
    );
  };

  const stopStreaming = () => {
    console.log("Streaming Ended.");
    streamingClient.stopStreaming();
    streamingClient.disconnect();
    setStreaming(false);
    setFetching(false);
  };

  // Handle file upload with the new audio file upload hook
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedAudioFile = e.target.files?.[0];
    if (!selectedAudioFile) return;

    if (selectedAudioFile.size > MAX_AUDIO_SIZE) {
      toast({
        title: "Audio file too large",
        description: "Please upload a file smaller than 1MB.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setFetched(false);
      setFetching(true);

      // Process the uploaded file
      const processedFile = await audioFileUpload.processFile(selectedAudioFile, 'wav');
      if (!processedFile) {
        throw new Error('Failed to process uploaded file');
      }

      // Play audio for user feedback
      audioPlayback.play(processedFile);

      // Convert to base64 for ASR API
      const reader = new FileReader();
      reader.readAsDataURL(processedFile);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        await getASROutput(base64Data);
      };
    } catch (error) {
      console.error('[ASR] File upload error:', error);
      setFetching(false);
      setFetched(false);
      toast({
        title: "File upload failed",
        description: "Please try a different audio file.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };







  useEffect(() => {
    const uniqueSourceLanguages: any = Array.from(
      new Set(
        props.languages.map(
          (language: LanguageConfig) => language.sourceLanguage
        )
      )
    );
    setLanguages(uniqueSourceLanguages);
    setLanguage(uniqueSourceLanguages[0]);
  }, []);

  return (
    <>
      <Grid templateRows="repeat(3)" gap={5}>
        <GridItem>
          <Stack direction={"column"}>
            <Stack direction={"row"}>
              <Text className="dview-service-try-option-title">
                Inference Mode:
              </Text>
              <Select
                onChange={(e) => {
                  setInferenceMode(e.target.value);
                }}
              >
                <option value={"rest"}>REST</option>
                <option value={"streaming"}>Streaming</option>
              </Select>
            </Stack>
            <Stack direction={"row"}>
              <Text className="dview-service-try-option-title">
                Select Language:
              </Text>
              <Select
                onChange={(e) => {
                  setLanguage(e.target.value);
                }}
                value={language}
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {lang2label[language]}
                  </option>
                ))}
              </Select>
            </Stack>
            <Stack direction={"row"}>
              <Text className="dview-service-try-option-title">
                Sample Rate:
              </Text>
              <Select
                onChange={(e) => {
                  setSampleRate(Number(e.target.value));
                }}
              >
                <option value={48000}>48000 Hz</option>
                <option value={16000}>16000 Hz</option>
                <option value={8000}>8000 Hz</option>
              </Select>
            </Stack>
          </Stack>
        </GridItem>
        <GridItem>
          {fetching ? <Progress size="xs" isIndeterminate /> : <></>}
        </GridItem>

        {fetched ? (
          <GridItem>
            <SimpleGrid
              p="1rem"
              w="100%"
              h="auto"
              bg="orange.100"
              borderRadius={15}
              columns={2}
              spacingX="40px"
              spacingY="20px"
            >
              <Stat>
                <StatLabel>Word Count</StatLabel>
                <StatNumber>{responseWordCount}</StatNumber>
                <StatHelpText>Response</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Response Time</StatLabel>
                <StatNumber>{Number(requestTime) / 1000}</StatNumber>
                <StatHelpText>seconds</StatHelpText>
              </Stat>
            </SimpleGrid>
          </GridItem>
        ) : (
          <></>
        )}
        {inferenceMode === "rest" ? (
          <GridItem>
            <Stack>
              <Textarea
                w={"auto"}
                h={200}
                readOnly
                value={audioText}
                placeholder={placeholder}
              />
              {audioRecording.isRecording && (
                <Text color={"gray.300"}>
                  Recording Time : {audioRecording.duration} / 120 seconds
                </Text>
              )}
              {/* Error display with retry option */}
              {(audioRecording.error || audioFileUpload.error) && (
                <Box
                  mt="1rem"
                  width={"100%"}
                  minH={"3rem"}
                  border={"1px"}
                  borderColor={"red.300"}
                  background={"red.50"}
                  borderRadius="md"
                  p={3}
                >
                  <VStack align="stretch" spacing={2}>
                    <HStack>
                      <Text color={"red.600"} fontSize="sm" flex={1}>
                        {audioRecording.error?.userMessage || audioFileUpload.error}
                      </Text>
                      <CloseIcon
                        onClick={() => {
                          audioRecording.clearError();
                          audioFileUpload.clearError();
                        }}
                        color={"red.600"}
                        fontSize={"xs"}
                        cursor="pointer"
                      />
                    </HStack>
                    {audioRecording.error?.retryable && !audioRecording.isRecording && (
                      <HStack spacing={2}>
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="outline"
                          onClick={() => {
                            audioRecording.clearError();
                            handleStartRecording();
                          }}
                        >
                          Retry Recording
                        </Button>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              )}
              <Stack direction={"row"} gap={5}>
                {audioRecording.isRecording ? (
                  <Button
                    onClick={handleStopRecording}
                    colorScheme="red"
                    isLoading={audioRecording.isProcessing}
                    loadingText="Processing..."
                  >
                    <FaMicrophone /> {audioRecording.isProcessing ? "Processing" : "Stop Recording"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartRecording}
                    colorScheme="orange"
                    isDisabled={!audioRecording.isSupported || audioRecording.isProcessing || audioFileUpload.isProcessing}
                    isLoading={audioRecording.isProcessing}
                    title={!audioRecording.isSupported ? "Audio recording not supported" : "Start Recording"}
                  >
                    <FaMicrophone size={15} />
                    {!audioRecording.isSupported ? " Not Supported" :
                     audioRecording.isProcessing ? " Processing..." : " Start Recording"}
                  </Button>
                )}
                <Input
                  variant={"unstyled"}
                  onChange={handleFileUpload}
                  type={"file"}
                  accept="audio/*"
                  disabled={audioRecording.isRecording || audioRecording.isProcessing || audioFileUpload.isProcessing}
                />
              </Stack>
            </Stack>
            {pipelineOutput && (
              <FeedbackModal
                pipelineInput={pipelineInput}
                pipelineOutput={pipelineOutput}
                taskType={ULCATaskType.ASR}
              />
            )}
          </GridItem>
        ) : (
          <GridItem>
            <Stack gap={5}>
              <Textarea
                w={"auto"}
                h={200}
                readOnly
                value={streamingText}
                placeholder={placeholder}
              />
              <Stack direction={"column"}>
                {streaming ? (
                  <Button
                    onClick={() => {
                      stopStreaming();
                    }}
                  >
                    <FaMicrophone /> Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      startStreaming();
                    }}
                  >
                    <FaMicrophone size={15} />
                  </Button>
                )}
              </Stack>
            </Stack>
          </GridItem>
        )}
      </Grid>
    </>
  );
};

export default ASRTry;
