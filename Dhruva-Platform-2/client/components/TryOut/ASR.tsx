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
  const [micError, setMicError] = useState<string>("");

  // Remove restrictive file size limits - let the server handle validation
  const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB - more reasonable limit

  // Use the audio recording hook with enhanced error handling
  const audioRecording = useAudioRecording({
    sampleRate,
    maxDuration: 300, // Increase to 5 minutes like asr-test-app
    maxFileSize: MAX_AUDIO_SIZE,
    preferredFormat: 'wav',
    autoStop: true,
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    enableAutoGainControl: true,
    onRecordingComplete: async (result) => {
      console.log('[ASR] Recording completed:', result);
      setMicError(""); // Clear any previous errors
      await handleRecordingComplete(result);
    },
    onError: (error) => {
      console.error('[ASR] Recording error:', error);
      setMicError(error.userMessage || error.message || 'Recording failed');
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

  // Enhanced recording completion handler with comprehensive error handling
  const handleRecordingComplete = async (result: any) => {
    try {
      console.log('[ASR] Processing recorded audio:', result);
      console.log('[ASR] Recording details:', {
        duration: result.duration,
        size: result.size,
        format: result.format,
        base64Length: result.base64?.length
      });

      // Validate recording result
      if (!result.audioFile) {
        throw new Error('No audio file in recording result');
      }

      if (result.size < 1000) {
        throw new Error('Recording is too short - please record for at least 1 second');
      }

      // Use the base64 data directly from the recording result
      try {
        const micSizeMB = (result.base64?.length * 0.75 / (1024 * 1024)).toFixed(2);
        console.log('[ASR] 🎤 MICROPHONE - Base64 length:', result.base64?.length, 'Audio size:', micSizeMB + 'MB');

        if (!result.base64 || result.base64.length < 100) {
          throw new Error('Invalid audio data - base64 conversion failed');
        }

        await getASROutput(result.base64);
      } catch (asrError) {
        console.error('[ASR] ASR processing failed:', asrError);
        setMicError('ASR processing failed: ' + asrError.message);
        setFetching(false);
        setFetched(false);
      }

    } catch (error) {
      console.error('[ASR] Error processing recording:', error);
      setMicError(error.message || 'Failed to process recording');
      setFetching(false);
      setFetched(false);
    }
  };





  // Enhanced ASR function with correct API format based on official documentation
  const getASROutput = async (asrInput: string, retryCount = 0, maxRetries = 3) => {
    try {
      console.log(`[ASR] Starting transcription attempt ${retryCount + 1}/${maxRetries + 1}`);
      console.log(`[ASR] Base64 audio length: ${asrInput.length} characters`);

      // Use the exact endpoint and serviceId from working developer ground
      const workingServiceId = "ai4bharat/indictasr";
      const endpoint = `${dhruvaAPI.asrInference}?serviceId=${workingServiceId}`;

      console.log(`[ASR] Using serviceId: ${workingServiceId} (original: ${props.serviceId})`);

      // Use the exact payload structure from working asr-test-app implementation
      const payload = {
        controlConfig: {
          dataTracking: true,
        },
        config: {
          audioFormat: "wav",
          language: {
            sourceLanguage: language,
            sourceScriptCode: getLanguageScriptCode(language) || 'Latn',
          },
          serviceId: workingServiceId,
          encoding: "base64",
          samplingRate: sampleRate,
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

      // Calculate payload size for debugging HTTPS vs HTTP differences
      const payloadSize = JSON.stringify(payload).length;
      const audioSizeMB = (payload.audio[0].audioContent.length * 0.75 / (1024 * 1024)).toFixed(2); // Base64 to bytes conversion
      console.log(`[ASR] 🔍 DEBUGGING - Payload size: ${payloadSize} bytes, Audio size: ${audioSizeMB}MB`);

      // Use the exact fetch approach from working developer ground implementation
      const headers = {
        accept: "application/json",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "x-auth-source": "AUTH_TOKEN",
        "Content-Type": "application/json",
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      console.log(`[ASR] Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`ASR API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ASR] Response data:', data);

      // Handle response like working asr-test-app implementation
      console.log('[ASR] Response data:', data);

      if (!data || !data.output || !Array.isArray(data.output)) {
        throw new Error('Invalid response format from ASR API');
      }

      let output = '';
      if (data.output[0]) {
        if (data.output[0].source) {
          output = data.output[0].source;
        } else if (data.output[0].transcript) {
          output = data.output[0].transcript;
        } else {
          throw new Error('No transcription found in response');
        }
      } else {
        throw new Error('Empty output array in response');
      }

      if (output) {

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

      // Extract status code from fetch error
      const status = error.message.includes('ASR API error:') ?
        parseInt(error.message.match(/\d{3}/)?.[0] || '0') : 0;
      const isNetworkError = error.message.includes('fetch') || error.message.includes('network');

      // Determine if error is retryable
      const isRetryable = (
        status >= 500 || // Server errors
        status === 429 || // Rate limiting
        isNetworkError || // Network issues
        error.name === 'AbortError' // Timeout
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
      if (status === 401) {
        errorMessage = 'Authentication failed. Please check API key.';
      } else if (status === 429) {
        errorMessage = 'Too many requests. Please wait and try again.';
      } else if (status >= 500) {
        errorMessage = 'ASR service is experiencing issues. Please try again later.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try a shorter recording.';
      } else if (isNetworkError) {
        errorMessage = 'Network connection issue. Please check your internet.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }

      setMicError(errorMessage);
      setAudioText('[ASR Failed]');
      setFetching(false);
      setFetched(false);
    }
  };

  // Enhanced recording handlers with better error handling and user feedback
  const handleStartRecording = async () => {
    try {
      console.log('[ASR] Starting recording...');
      setFetching(true);
      setFetched(false);
      setMicError(""); // Clear any previous errors
      setAudioText(""); // Clear previous transcription
      setPlaceHolder("Recording Audio....");

      await audioRecording.startRecording();
      console.log('[ASR] Recording started successfully');
    } catch (error) {
      console.error('[ASR] Failed to start recording:', error);
      setMicError(error.message || 'Failed to start recording');
      setFetching(false);
      setPlaceHolder("Start Recording for ASR Inference...");
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log('[ASR] Stopping recording...');
      setPlaceHolder("Processing Audio...");
      await audioRecording.stopRecording();
      console.log('[ASR] Recording stopped successfully');
    } catch (error) {
      console.error('[ASR] Failed to stop recording:', error);
      setMicError(error.message || 'Failed to stop recording');
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

  // Enhanced file upload handler with comprehensive error handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedAudioFile = e.target.files?.[0];
    if (!selectedAudioFile) return;

    console.log('[ASR] File upload started:', selectedAudioFile.name, selectedAudioFile.type, selectedAudioFile.size);

    // Validate file size
    if (selectedAudioFile.size > MAX_AUDIO_SIZE) {
      const sizeMB = (selectedAudioFile.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_AUDIO_SIZE / (1024 * 1024)).toFixed(2);
      toast({
        title: "Audio file too large",
        description: `File size: ${sizeMB}MB. Maximum allowed: ${maxSizeMB}MB.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate file type
    if (!selectedAudioFile.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file (WAV, MP3, OGG, etc.).",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setFetched(false);
      setFetching(true);
      setMicError(""); // Clear any previous errors
      setAudioText(""); // Clear previous transcription

      console.log('[ASR] Processing uploaded file...');

      // Process the uploaded file with enhanced error handling
      const processedFile = await audioFileUpload.processFile(selectedAudioFile, 'wav');
      if (!processedFile) {
        throw new Error('Failed to process uploaded file - conversion returned null');
      }

      console.log('[ASR] File processed successfully:', processedFile.name, processedFile.size);

      // Play audio for user feedback (optional)
      try {
        audioPlayback.play(processedFile);
      } catch (playbackError) {
        console.warn('[ASR] Audio playback failed:', playbackError);
        // Don't fail the whole process if playback fails
      }

      // Convert to base64 for ASR API
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const fileSizeMB = (base64Data.length * 0.75 / (1024 * 1024)).toFixed(2);
          console.log('[ASR] 📁 FILE UPLOAD - Base64 length:', base64Data.length, 'Audio size:', fileSizeMB + 'MB');
          await getASROutput(base64Data);
        } catch (asrError) {
          console.error('[ASR] ASR processing failed:', asrError);
          setMicError('ASR processing failed: ' + asrError.message);
          setFetching(false);
          setFetched(false);
        }
      };
      reader.onerror = () => {
        console.error('[ASR] File reading failed');
        setMicError('Failed to read uploaded file');
        setFetching(false);
        setFetched(false);
      };
      reader.readAsDataURL(processedFile);

    } catch (error) {
      console.error('[ASR] File upload error:', error);
      setMicError(error.message || 'File upload failed');
      setFetching(false);
      setFetched(false);

      toast({
        title: "File upload failed",
        description: error.message || "Please try a different audio file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }

    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
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
              {/* Enhanced error display with comprehensive error handling */}
              {(audioRecording.error || audioFileUpload.error || micError) && (
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
                        {audioRecording.error?.userMessage || audioFileUpload.error || micError}
                      </Text>
                      <CloseIcon
                        onClick={() => {
                          audioRecording.clearError();
                          audioFileUpload.clearError();
                          setMicError("");
                        }}
                        color={"red.600"}
                        fontSize={"xs"}
                        cursor="pointer"
                      />
                    </HStack>
                    {/* Show recovery steps if available */}
                    {audioRecording.error?.recoverySteps && audioRecording.error.recoverySteps.length > 0 && (
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="red.500" fontWeight="bold">Recovery steps:</Text>
                        {audioRecording.error.recoverySteps.map((step, index) => (
                          <Text key={index} fontSize="xs" color="red.500">• {step}</Text>
                        ))}
                      </VStack>
                    )}
                    {/* Retry button for retryable errors */}
                    {(audioRecording.error?.retryable || micError) && !audioRecording.isRecording && (
                      <HStack spacing={2}>
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="outline"
                          onClick={() => {
                            audioRecording.clearError();
                            setMicError("");
                            handleStartRecording();
                          }}
                        >
                          Retry Recording
                        </Button>
                        {!audioRecording.hasPermission && (
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="outline"
                            onClick={async () => {
                              const permission = await audioRecording.checkPermission();
                              if (permission === 'granted') {
                                audioRecording.clearError();
                                setMicError("");
                              }
                            }}
                          >
                            Check Permission
                          </Button>
                        )}
                      </HStack>
                    )}
                  </VStack>
                </Box>
              )}
              <Stack direction={"row"} gap={5} align="center">
                {/* Permission check button (only show if not supported or no permission) */}
                {(!audioRecording.isSupported || !audioRecording.hasPermission) && !audioRecording.isRecording && (
                  <Button
                    onClick={async () => {
                      if (!audioRecording.isSupported) {
                        setMicError('Audio recording is not supported in this browser. Please use Chrome, Firefox, or Safari.');
                        return;
                      }
                      const permission = await audioRecording.checkPermission();
                      if (permission === 'granted') {
                        setMicError('');
                        toast({
                          title: "Permission granted",
                          description: "Microphone access is now available.",
                          status: "success",
                          duration: 3000,
                          isClosable: true,
                        });
                      } else {
                        setMicError('Microphone permission is required for recording. Please allow access and try again.');
                      }
                    }}
                    colorScheme="blue"
                    variant="outline"
                    size="lg"
                    leftIcon={<FaMicrophone />}
                  >
                    {!audioRecording.isSupported ? "Not Supported" : "Check Permission"}
                  </Button>
                )}

                {/* Recording button */}
                {audioRecording.isRecording ? (
                  <Button
                    onClick={handleStopRecording}
                    colorScheme="red"
                    isLoading={audioRecording.isProcessing}
                    loadingText="Processing..."
                    size="lg"
                    leftIcon={<FaMicrophone />}
                  >
                    {audioRecording.isProcessing ? "Processing Audio..." : "Stop Recording"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartRecording}
                    colorScheme="orange"
                    isDisabled={!audioRecording.isSupported || audioRecording.isProcessing || audioFileUpload.isProcessing}
                    isLoading={audioRecording.isProcessing}
                    size="lg"
                    leftIcon={<FaMicrophone />}
                    title={!audioRecording.isSupported ?
                      "Audio recording not supported in this browser" :
                      audioRecording.hasPermission ? "Start Recording" : "Microphone permission required"}
                  >
                    {!audioRecording.isSupported ? "Not Supported" :
                     audioRecording.isProcessing ? "Processing..." :
                     audioRecording.hasPermission ? "Start Recording" : "Grant Permission & Record"}
                  </Button>
                )}

                {/* File upload */}
                <Input
                  variant={"unstyled"}
                  onChange={handleFileUpload}
                  type={"file"}
                  accept="audio/*,.wav,.mp3,.ogg,.webm,.m4a"
                  disabled={audioRecording.isRecording || audioRecording.isProcessing || audioFileUpload.isProcessing}
                  title="Upload audio file (WAV, MP3, OGG, WebM, M4A)"
                />

                {/* File upload loading indicator */}
                {audioFileUpload.isProcessing && (
                  <Text fontSize="sm" color="orange.500">
                    Processing file...
                  </Text>
                )}
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
