import { useState, useRef, useEffect } from "react";
import { Box, Flex, Input, Button, Spinner, Heading, Text, VStack, HStack, IconButton, useColorModeValue, Select, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea } from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";
import ContentLayout from "../../components/Layouts/ContentLayout";
import { FaMicrophone, FaUpload, FaVolumeUp, FaUserCircle, FaRobot } from "react-icons/fa";
import AuthGuard from "../../components/Auth/AuthGuard";
import { useAudioRecording, useAudioFileUpload } from "../../hooks/useAudioRecording";

const BACKEND_CHAT_ENDPOINT = "http://localhost:3002/api/chat";

const INDIAN_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "bn", name: "Bengali" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "or", name: "Odia" },
];

const LANGUAGE_SCRIPT_MAP = {
  en: "Latn",
  hi: "Deva",
  ta: "Taml",
  te: "Telu",
  kn: "Knda",
  ml: "Mlym",
  bn: "Beng",
  mr: "Deva",
  gu: "Gujr",
  pa: "Guru",
  or: "Orya",
};

async function translateText({ text, sourceLang, targetLang }) {
  if (sourceLang === targetLang) return text;
  console.log(`[Translation] Starting translation from ${sourceLang} to ${targetLang}`);
  
  const endpoint = "https://13.203.149.17/services/inference/translation";
  const payload = {
    controlConfig: { dataTracking: true },
    config: {
      serviceId: "ai4bharat/indictrans--gpu-t4",
      language: {
        sourceLanguage: sourceLang,
        sourceScriptCode: LANGUAGE_SCRIPT_MAP[sourceLang] || '',
        targetLanguage: targetLang,
        targetScriptCode: LANGUAGE_SCRIPT_MAP[targetLang] || '',
      },
    },
    input: [{ source: text }],
  };
  const headers = {
    accept: "application/json",
    "x-auth-source": "API_KEY",
    Authorization: "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09",
    "Content-Type": "application/json",
  };
  
  try {
    console.log(`[Translation] Sending request to endpoint: ${endpoint}`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`[Translation] Response received:`, data);
    
    if (data && data.output && data.output[0] && data.output[0].target) {
      console.log(`[Translation] Translation successful:`, data.output[0].target);
      return data.output[0].target;
    } else if (data && data.output && data.output[0]) {
      console.log(`[Translation] Translation successful (alternative):`, data.output[0]);
      return data.output[0];
    } else {
      throw new Error("Translation failed - invalid response format");
    }
  } catch (err) {
    console.error(`[Translation] Error during translation:`, err);
    return text + " [Translation failed]";
  }
}



// Language script mapping (same as chatbot)
function getLanguageScriptCode(lang) {
  const LANGUAGE_SCRIPT_MAP = {
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
}

export default function UserTestingGround() {
  const [textMessages, setTextMessages] = useState([
    { role: "assistant", content: "Hello! How can I help you today?" },
  ]);
  const [voiceMessages, setVoiceMessages] = useState([
    { role: "assistant", content: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [textInputLang, setTextInputLang] = useState("en");
  const [outputLang, setOutputLang] = useState("en");
  const [audioInputLang, setAudioInputLang] = useState("hi");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const voiceAudioFileRef = useRef<HTMLInputElement | null>(null);
  const [voiceInputLang, setVoiceInputLang] = useState("en");

  // Use the enhanced audio recording hooks with optimal settings
  const textAudioRecording = useAudioRecording({
    sampleRate: 16000,
    maxDuration: 120,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    preferredFormat: 'wav',
    autoStop: true,
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    enableAutoGainControl: true,
    onRecordingComplete: async (result) => {
      console.log('[Text Recording] Recording completed:', result);
      await handleTextRecordingComplete(result);
    },
    onError: (error) => {
      console.error('[Text Recording] Recording error:', error);
      // Error is already displayed in the UI through the error state
    }
  });

  const voiceAudioRecording = useAudioRecording({
    sampleRate: 16000,
    maxDuration: 120,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    preferredFormat: 'wav',
    autoStop: true,
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    enableAutoGainControl: true,
    onRecordingComplete: async (result) => {
      console.log('[Voice Recording] Recording completed:', result);
      await handleVoiceChatPipeline(result.audioFile);
    },
    onError: (error) => {
      console.error('[Voice Recording] Recording error:', error);
      // Error is already displayed in the UI through the error state
    }
  });

  // Use audio file upload hook
  const audioFileUpload = useAudioFileUpload();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [textMessages, voiceMessages]);

  // Enhanced text recording completion handler with better validation
  const handleTextRecordingComplete = async (result: any) => {
    try {
      console.log('[Text Recording] Processing recorded audio:', result);
      console.log('[Text Recording] Recording details:', {
        duration: result.duration,
        size: result.size,
        format: result.format
      });

      // Validate recording result
      if (!result.audioFile) {
        throw new Error('No audio file in recording result');
      }

      if (result.size < 1000) {
        throw new Error('Recording is too short - please record for at least 1 second');
      }

      const transcript = await transcribeAudio({
        file: result.audioFile,
        sourceLang: audioInputLang,
      });

      if (transcript && transcript.trim() && transcript !== '[ASR failed]') {
        setInput(transcript);
        console.log('[Text Recording] ASR successful:', transcript);
      } else {
        throw new Error('Empty or invalid transcript received');
      }
    } catch (error) {
      console.error('[Text Recording] Error processing recording:', error);
      setInput('[ASR failed - ' + (error.message || 'Unknown error') + ']');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const pipelineId = Math.random().toString(36).substring(7); // Unique ID for this pipeline run
    console.log(`[Text Chat Pipeline ${pipelineId}] Starting pipeline...`);
    
    const userMessage = input.trim();
    setInput("");
    setTextMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    
    try {
      let llmInput = userMessage;
      // Translate input to English if needed
      if (textInputLang !== "en") {
        console.log(`[Text Chat Pipeline ${pipelineId}] Translating to English...`);
        llmInput = await translateText({ text: userMessage, sourceLang: textInputLang, targetLang: "en" });
        console.log(`[Text Chat Pipeline ${pipelineId}] Translation Result:`, llmInput);
      }
      
      // LLM
      console.log(`[Text Chat Pipeline ${pipelineId}] Sending to LLM...`);
      const res = await fetch(BACKEND_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: llmInput, provider: "GEMINI" }),
      });
      const data = await res.json();
      console.log(`[Text Chat Pipeline ${pipelineId}] LLM Response:`, data);
      
      let assistantReply = "[No response]";
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text
      ) {
        assistantReply = data.candidates[0].content.parts[0].text;
      } else if (data.response || data.message) {
        assistantReply = data.response || data.message;
      } else {
        assistantReply = JSON.stringify(data);
      }
      
      // Translate output if needed
      if (outputLang !== "en") {
        console.log(`[Text Chat Pipeline ${pipelineId}] Translating to ${outputLang}...`);
        assistantReply = await translateText({ text: assistantReply, sourceLang: "en", targetLang: outputLang });
        console.log(`[Text Chat Pipeline ${pipelineId}] Final Translation:`, assistantReply);
      }
      
      setTextMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
      console.log(`[Text Chat Pipeline ${pipelineId}] Pipeline completed successfully`);
    } catch (err) {
      console.error(`[Text Chat Pipeline ${pipelineId}] Error:`, err);
      console.error(`[Text Chat Pipeline ${pipelineId}] Error details:`, {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      setTextMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const userBubbleBg = useColorModeValue("orange.500", "orange.400");
  const assistantBubbleBg = useColorModeValue("gray.100", "gray.700");
  const userTextColor = "white";
  const assistantTextColor = useColorModeValue("gray.800", "white");

  // ASR utility - Updated to use correct API format based on official documentation
  async function transcribeAudio({ file, sourceLang, retryCount = 0, maxRetries = 3 }) {
    console.log(`[ASR] Starting transcription for language: ${sourceLang} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    console.log(`[ASR] File details:`, {
      name: file.name,
      type: file.type,
      size: file.size
    });

    try {
      // Use the correct API endpoint from documentation
      const endpoint = 'http://localhost:8000/services/inference/asr?serviceId=ai4bharat/indictasr';

      // Convert file to base64 as required by the API
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
      });

      console.log(`[ASR] File converted to base64, size: ${base64Data.length} characters`);

      // Use the exact API format from the official documentation
      const payload = {
        controlConfig: {
          dataTracking: true
        },
        config: {
          audioFormat: "wav",
          language: {
            sourceLanguage: sourceLang,
            sourceScriptCode: getLanguageScriptCode(sourceLang) || ''
          },
          encoding: "base64",
          samplingRate: 16000,
          serviceId: "ai4bharat/indictasr",
          preProcessors: [],
          postProcessors: [],
          transcriptionFormat: {
            value: "transcript"
          },
          bestTokenCount: 0
        },
        audio: [
          {
            audioContent: base64Data
          }
        ]
      };

      console.log(`[ASR] Sending request to: ${endpoint}`);
      console.log(`[ASR] Payload structure:`, {
        controlConfig: payload.controlConfig,
        config: payload.config,
        audioLength: payload.audio[0].audioContent.length
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09'
        },
        body: JSON.stringify(payload),
      });

      console.log(`[ASR] Response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        let errorText;
        try {
          errorText = await res.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }
        console.error(`[ASR] Server error: ${res.status} ${res.statusText}`, errorText);

        // Provide specific error messages based on status code
        let errorMessage = `ASR service error: ${res.status}`;
        if (res.status === 500) {
          errorMessage = 'ASR service internal error - audio format may be incompatible';
        } else if (res.status === 400) {
          errorMessage = 'Invalid audio format or parameters';
        } else if (res.status === 401) {
          errorMessage = 'Authentication failed - invalid API key';
        } else if (res.status === 413) {
          errorMessage = 'Audio file too large';
        } else if (res.status === 429) {
          errorMessage = 'Too many requests - please wait and try again';
        }

        throw new Error(`${errorMessage} - ${errorText}`);
      }

      const data = await res.json();
      console.log('[ASR] Response data:', data);

      if (data && data.output && data.output[0]) {
        if (data.output[0].source) {
          console.log('[ASR] Transcription successful:', data.output[0].source);
          return data.output[0].source;
        } else {
          console.error('[ASR] No transcript in response:', data.output[0]);
          throw new Error('No transcript in ASR response');
        }
      } else {
        console.error('[ASR] Invalid response structure:', data);
        throw new Error('Invalid ASR response format');
      }
    } catch (err) {
      console.error(`[ASR] Error on attempt ${retryCount + 1}:`, err);

      // Determine if error is retryable
      const isRetryable = (
        err.message.includes('500') ||
        err.message.includes('502') ||
        err.message.includes('503') ||
        err.message.includes('504') ||
        err.message.includes('network') ||
        err.message.includes('timeout')
      );

      // Retry if possible
      if (isRetryable && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[ASR] Retrying in ${delay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return transcribeAudio({ file, sourceLang, retryCount: retryCount + 1, maxRetries });
      }

      throw err;
    }
  }

  // New text recording handlers using the audio recording hook
  const startTextRecording = async () => {
    try {
      await textAudioRecording.startRecording();
    } catch (error) {
      console.error('[Text Recording] Failed to start recording:', error);
    }
  };

  const stopTextRecording = async () => {
    try {
      await textAudioRecording.stopRecording();
    } catch (error) {
      console.error('[Text Recording] Failed to stop recording:', error);
    }
  };

  const startVoiceRecording = async () => {
    try {
      await voiceAudioRecording.startRecording();
    } catch (error) {
      console.error('[Voice Recording] Failed to start recording:', error);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      await voiceAudioRecording.stopRecording();
    } catch (error) {
      console.error('[Voice Recording] Failed to stop recording:', error);
    }
  };

  // Enhanced file upload handler with comprehensive validation and error handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[File Upload] File selected:', file.name, file.type, file.size);

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setInput(`[File too large: ${sizeMB}MB. Maximum: 10MB]`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setInput('[Invalid file type. Please upload an audio file]');
      return;
    }

    try {
      console.log('[File Upload] Processing uploaded file...');

      // Process the uploaded file with enhanced error handling
      const processedFile = await audioFileUpload.processFile(file, 'wav');
      if (!processedFile) {
        throw new Error('Failed to process uploaded file - conversion returned null');
      }

      console.log('[File Upload] File processed successfully:', processedFile.name, processedFile.size);

      const transcript = await transcribeAudio({
        file: processedFile,
        sourceLang: audioInputLang,
      });

      if (transcript && transcript.trim() && transcript !== '[ASR failed]') {
        setInput(transcript);
        console.log('[File Upload] ASR successful:', transcript);
      } else {
        throw new Error('Empty or invalid transcript received');
      }
    } catch (error) {
      console.error('[File Upload] Error:', error);
      setInput('[ASR failed - ' + (error.message || 'Unknown error') + ']');
    }

    // Reset file input so same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchTTS = async ({ text, lang }) => {
    console.log(`[TTS] Starting TTS for language: ${lang}`);
    try {
      const endpoint = "https://13.203.149.17/services/inference/tts?serviceId=ai4bharat/indictts--gpu-t4";
      const payload = {
        input: [{ source: text }],
        config: {
          serviceId: "ai4bharat/indictts--gpu-t4",
          gender: "male",
          samplingRate: 22050,
          audioFormat: "wav",
          language: {
            sourceLanguage: lang
          }
        },
        controlConfig: { dataTracking: true }
      };
      console.log(`[TTS] Sending request to endpoint: ${endpoint}`);
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09",
          "x-auth-source": "AUTH_TOKEN",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      console.log(`[TTS] Response received`);
      
      if (data && data.audio && data.audio[0] && data.audio[0].audioContent) {
        console.log(`[TTS] Audio generated successfully`);
        return data.audio[0].audioContent;
      }
      throw new Error('TTS failed - no audio content in response');
    } catch (err) {
      console.error(`[TTS] Error during TTS:`, err);
      throw err;
    }
  };

  function playBase64Wav(base64) {
    const audio = new Audio('data:audio/wav;base64,' + base64);
    audio.play().catch(err => {
      console.error(`[Audio Playback] Error playing audio:`, err);
    });
  }

  // Enhanced Voice Chat pipeline with better error handling and validation
  async function handleVoiceChatPipeline(audioFile: File) {
    setVoiceLoading(true);
    const pipelineId = Math.random().toString(36).substring(7); // Unique ID for this pipeline run
    console.log(`[Voice Chat Pipeline ${pipelineId}] Starting pipeline...`);
    console.log(`[Voice Chat Pipeline ${pipelineId}] Audio file:`, {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    try {
      // Validate audio file
      if (!audioFile || audioFile.size < 1000) {
        throw new Error('Invalid or empty audio file');
      }

      // 1. ASR
      console.log(`[Voice Chat Pipeline ${pipelineId}] Starting ASR...`);
      const transcript = await transcribeAudio({ file: audioFile, sourceLang: voiceInputLang });
      console.log(`[Voice Chat Pipeline ${pipelineId}] ASR Result:`, transcript);

      if (!transcript || transcript.trim() === '' || transcript.includes('[ASR failed]')) {
        throw new Error('ASR failed to generate transcript');
      }

      setVoiceMessages((prev) => [...prev, { role: "user", content: transcript }]);

      // 2. Translate to EN if needed
      let llmInput = transcript;
      if (voiceInputLang !== "en") {
        console.log(`[Voice Chat Pipeline ${pipelineId}] Translating to English...`);
        llmInput = await translateText({ text: transcript, sourceLang: voiceInputLang, targetLang: "en" });
        console.log(`[Voice Chat Pipeline ${pipelineId}] Translation Result:`, llmInput);

        if (!llmInput || llmInput.includes('[Translation failed]')) {
          console.warn(`[Voice Chat Pipeline ${pipelineId}] Translation failed, using original transcript`);
          llmInput = transcript; // Fallback to original transcript
        }
      }
      
      // 3. LLM
      console.log(`[Voice Chat Pipeline ${pipelineId}] Sending to LLM...`);
      const res = await fetch(BACKEND_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: llmInput, provider: "GEMINI" }),
      });
      const data = await res.json();
      console.log(`[Voice Chat Pipeline ${pipelineId}] LLM Response:`, data);
      
      let llmOutput = "[No response]";
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text
      ) {
        llmOutput = data.candidates[0].content.parts[0].text;
      } else if (data.response || data.message) {
        llmOutput = data.response || data.message;
      } else {
        llmOutput = JSON.stringify(data);
      }
      
      // 4. Translate back if needed
      let finalText = llmOutput;
      if (voiceInputLang !== "en") {
        console.log(`[Voice Chat Pipeline ${pipelineId}] Translating back to ${voiceInputLang}...`);
        finalText = await translateText({ text: llmOutput, sourceLang: "en", targetLang: voiceInputLang });
        console.log(`[Voice Chat Pipeline ${pipelineId}] Final Translation:`, finalText);
      }
      
      setVoiceMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
      
      // 5. TTS
      console.log(`[Voice Chat Pipeline ${pipelineId}] Starting TTS...`);
      const ttsAudioBase64 = await fetchTTS({ text: finalText, lang: voiceInputLang });
      console.log(`[Voice Chat Pipeline ${pipelineId}] TTS generated successfully`);
      playBase64Wav(ttsAudioBase64);
      
      console.log(`[Voice Chat Pipeline ${pipelineId}] Pipeline completed successfully`);
    } catch (err) {
      console.error(`[Voice Chat Pipeline ${pipelineId}] Error:`, err);
      console.error(`[Voice Chat Pipeline ${pipelineId}] Error details:`, {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      setVoiceMessages((prev) => [...prev, { role: "assistant", content: "[Pipeline failed]" }]);
    } finally {
      setVoiceLoading(false);
    }
  }

  return (
    <AuthGuard requireAuth={true}>
      <ContentLayout>
      <Tabs variant="enclosed" colorScheme="orange" isFitted>
        <TabList>
          <Tab>Text/Audio Chat</Tab>
          <Tab>Voice Chat</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex direction={{ base: "column", md: "row" }} h="calc(100vh - 64px)" bg="white" p={{ base: 2, md: 8 }}>
              {/* Language Selection Panel */}
              <Box
                minW={{ base: "100%", md: "280px" }}
                maxW={{ base: "100%", md: "320px" }}
                bg="white"
                borderRadius="2xl"
                boxShadow="xl"
                p={6}
                mr={{ base: 0, md: 8 }}
                mb={{ base: 6, md: 0 }}
                border="1px solid #F6AD55"
                alignSelf="flex-start"
              >
                <Heading size="md" color="orange.500" mb={6}>
                  Language Settings
                </Heading>
                <Tabs variant="enclosed" colorScheme="orange">
                  <TabList>
                    <Tab>Text</Tab>
                    <Tab>Audio</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel>
                      <Box mb={4}>
                        <Text fontWeight="bold" color="orange.500" mb={1}>Text Input Language</Text>
                        <Select value={textInputLang} onChange={e => setTextInputLang(e.target.value)}>
                          {INDIAN_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                          ))}
                        </Select>
                      </Box>
                      <Box mb={4}>
                        <Text fontWeight="bold" color="orange.500" mb={1}>Text Output Language</Text>
                        <Select value={outputLang} onChange={e => setOutputLang(e.target.value)}>
                          {INDIAN_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                          ))}
                        </Select>
                      </Box>
                    </TabPanel>
                    <TabPanel>
                      <Box mb={2}>
                        <Text fontWeight="bold" color="orange.500" mb={1}>Audio Input Language</Text>
                        <Select value={audioInputLang} onChange={e => setAudioInputLang(e.target.value)}>
                          {INDIAN_LANGUAGES.filter(l => l.code !== 'en').map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                          ))}
                        </Select>
                      </Box>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Box>
              {/* Chat Area */}
              <Flex direction="column" flex="1" minW={0}>
                <Heading mb={4} color="orange.500">User Testing Ground</Heading>
                <Box flex="1" overflowY="auto" mb={4}>
                  <VStack align="stretch" spacing={4}>
                    {textMessages.map((msg, idx) => (
                      <Flex key={idx} justify={msg.role === "user" ? "flex-end" : "flex-start"}>
                        <Box
                          maxW="70%"
                          px={5}
                          py={3}
                          borderRadius="2xl"
                          bg={msg.role === "user" ? userBubbleBg : assistantBubbleBg}
                          color={msg.role === "user" ? userTextColor : assistantTextColor}
                          boxShadow="md"
                          display="flex"
                          alignItems="center"
                        >
                          <Text>{msg.content}</Text>
                          {msg.role === "assistant" && (
                            <IconButton
                              aria-label="Play TTS"
                              icon={ttsLoadingIdx === idx ? <Spinner size="sm" /> : <FaVolumeUp />}
                              size="sm"
                              ml={2}
                              variant="ghost"
                              onClick={async () => {
                                setTtsLoadingIdx(idx);
                                try {
                                  const audioBase64 = await fetchTTS({
                                    text: msg.content,
                                    lang: outputLang,
                                  });
                                  playBase64Wav(audioBase64);
                                } catch (err) {
                                  // Optionally show error
                                } finally {
                                  setTtsLoadingIdx(null);
                                }
                              }}
                              isLoading={ttsLoadingIdx === idx}
                            />
                          )}
                        </Box>
                      </Flex>
                    ))}
                    {isLoading && (
                      <Flex justify="flex-start">
                        <Box px={5} py={3} borderRadius="2xl" bg={assistantBubbleBg} color={assistantTextColor} boxShadow="md">
                          <Spinner size="sm" color="orange.500" mr={2} />
                          <Text as="span">Thinking...</Text>
                        </Box>
                      </Flex>
                    )}
                    {(textAudioRecording.error || audioFileUpload.error) && (
                      <Box bg="orange.50" border="1px" borderColor="orange.200" borderRadius="md" p={3}>
                        <HStack>
                          <Box color="orange.500">⚠️</Box>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="medium" color="orange.700">
                              Audio Issue
                            </Text>
                            <Text fontSize="sm" color="orange.600">
                              {textAudioRecording.error?.userMessage || audioFileUpload.error}
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </VStack>
                </Box>
                <Box as="form" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label={textAudioRecording.isRecording ? "Stop Recording" : "Start Recording"}
                      icon={textAudioRecording.isProcessing ? <Spinner size="sm" /> : <FaMicrophone />}
                      colorScheme={textAudioRecording.isRecording ? "red" : "orange"}
                      onClick={textAudioRecording.isRecording ? stopTextRecording : startTextRecording}
                      isLoading={textAudioRecording.isProcessing || audioFileUpload.isProcessing}
                      borderRadius="xl"
                      size="lg"
                      title={!textAudioRecording.isSupported ?
                        "Audio recording not supported in this browser" :
                        textAudioRecording.isRecording ? "Stop Recording" :
                        textAudioRecording.hasPermission ? "Start Recording" : "Microphone permission required"}
                      isDisabled={!textAudioRecording.isSupported}
                    />
                    {/* Recording duration display */}
                    {textAudioRecording.isRecording && textAudioRecording.duration > 0 && (
                      <Text fontSize="sm" color="orange.500" fontWeight="bold">
                        {textAudioRecording.duration}s / 120s
                      </Text>
                    )}
                    {/* Upload Button */}
                    <input
                      type="file"
                      accept="audio/*"
                      style={{ display: "none" }}
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <IconButton
                      aria-label="Upload Audio"
                      icon={<FaUpload />}
                      colorScheme="orange"
                      borderRadius="xl"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={audioFileUpload.isProcessing}
                      isDisabled={textAudioRecording.isRecording || textAudioRecording.isProcessing || audioFileUpload.isProcessing}
                      title="Upload Audio (WAV/MP3)"
                    />
                    <Input
                      placeholder="Type your message..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      bg="gray.50"
                      borderRadius="xl"
                      size="lg"
                      isDisabled={isLoading}
                    />
                    <IconButton
                      colorScheme="orange"
                      aria-label="Send"
                      icon={<ArrowUpIcon />}
                      onClick={sendMessage}
                      isLoading={isLoading}
                      borderRadius="xl"
                      size="lg"
                      type="submit"
                    />
                  </HStack>
                </Box>
              </Flex>
            </Flex>
          </TabPanel>
          <TabPanel>
            <Flex direction="column" align="center" justify="center" minH="70vh" bg="white">
              <VStack spacing={4} w="100%" maxW="900px">
                <Heading size="lg" color="orange.600" fontWeight="extrabold" letterSpacing="wide" mb={1}>
                  <FaRobot style={{ display: 'inline', marginRight: 8, color: '#F6AD55' }} /> Voice Chat
                </Heading>
                {/* Language Dropdown */}
                <Box w="100%" textAlign="center" mb={2}>
                  <Text fontWeight="bold" color="orange.500" mb={1}>Language</Text>
                  <Select value={voiceInputLang} onChange={e => setVoiceInputLang(e.target.value)} maxW="220px" mx="auto" borderRadius="xl" boxShadow="md" bg="white" borderColor="orange.200" fontWeight="semibold">
                    {INDIAN_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </Select>
                </Box>
                <Box w="100%" minH="650px" maxH="90vh" maxW="900px" overflowY="auto" bgGradient="linear(to-br, orange.50, white)" borderRadius="2xl" p={3} boxShadow="xl" position="relative">
                  <VStack align="stretch" spacing={3}>
                    {voiceMessages.map((msg, idx) => (
                      <Flex key={idx} justify={msg.role === "user" ? "flex-end" : "flex-start"}>
                        <Box
                          maxW="75%"
                          px={4}
                          py={2.5}
                          borderRadius={msg.role === "user" ? "2xl 2xl 2xl md" : "2xl 2xl md 2xl"}
                          bgGradient={msg.role === "user"
                            ? "linear(to-r, orange.400, orange.500, orange.400)"
                            : "linear(to-r, blue.100, blue.200, blue.100)"}
                          color={msg.role === "user" ? "white" : "gray.800"}
                          boxShadow={msg.role === "user" ? "md" : "sm"}
                          display="flex"
                          alignItems="flex-start"
                          fontWeight="medium"
                          position="relative"
                        >
                          <Flex direction="row" align="flex-start" w="100%">
                            <Box w="32px" h="32px" minW="32px" minH="32px" display="flex" alignItems="flex-start" justifyContent="center" mr={2} mt={0.5}>
                              {msg.role === "user" ? (
                                <FaUserCircle style={{ width: 28, height: 28, color: '#fff' }} />
                              ) : (
                                <FaRobot style={{ width: 28, height: 28, color: '#4299E1' }} />
                              )}
                            </Box>
                            <Box flex={1}>
                              <Text fontWeight="bold" fontSize="sm" mb={0.5}>
                                {msg.role === "user" ? "You" : "Assistant"}
                              </Text>
                              <Text whiteSpace="pre-line">{msg.content}</Text>
                            </Box>
                          </Flex>
                        </Box>
                      </Flex>
                    ))}
                    {(voiceLoading || voiceAudioRecording.isRecording || voiceAudioRecording.isProcessing) && (
                      <Flex justify="center" align="center" w="100%" minH="48px">
                        {voiceAudioRecording.isRecording ? (
                          <Box textAlign="center">
                            <Box mb={1}>
                              <Box w="10" h="10" bgGradient="linear(to-br, orange.400, orange.300)" borderRadius="full" mx="auto" className="animate-pulse" boxShadow="xl" />
                            </Box>
                            <Text color="orange.500" fontWeight="bold" fontSize="sm">
                              Listening... {voiceAudioRecording.duration}s / 120s
                            </Text>
                          </Box>
                        ) : (
                          <Box textAlign="center">
                            <Spinner size="lg" color="orange.400" thickness="4px" speed="0.8s" mb={1} />
                            <Text color="gray.500" fontWeight="bold" fontSize="sm">
                              {voiceAudioRecording.isProcessing ? "Processing..." : "Thinking..."}
                            </Text>
                          </Box>
                        )}
                      </Flex>
                    )}
                  </VStack>
                </Box>
                <Box w="100%" display="flex" justifyContent="center" mt={2}>
                  <Button
                    leftIcon={<FaMicrophone />}
                    colorScheme={voiceAudioRecording.isRecording ? "red" : "orange"}
                    size="lg"
                    borderRadius="full"
                    px={8}
                    py={6}
                    fontSize="xl"
                    fontWeight="bold"
                    boxShadow="xl"
                    onClick={voiceAudioRecording.isRecording ? stopVoiceRecording : startVoiceRecording}
                    isLoading={voiceLoading || voiceAudioRecording.isProcessing}
                    disabled={voiceLoading || voiceAudioRecording.isProcessing || !voiceAudioRecording.isSupported}
                    _focus={{ boxShadow: "outline" }}
                    className={voiceAudioRecording.isRecording ? "animate-pulse" : ""}
                    title={!voiceAudioRecording.isSupported ?
                      "Audio recording not supported in this browser" :
                      voiceAudioRecording.isRecording ? "Stop Recording" :
                      voiceAudioRecording.hasPermission ? "Tap to Speak" : "Microphone permission required"}
                  >
                    {voiceAudioRecording.isRecording ? "Stop Recording" :
                     !voiceAudioRecording.isSupported ? "Not Supported" :
                     voiceAudioRecording.hasPermission ? "Tap to Speak" : "Grant Permission"}
                  </Button>
                </Box>
              </VStack>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </ContentLayout>
    </AuthGuard>
  );
}