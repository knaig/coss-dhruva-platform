import { useState, useRef, useEffect } from "react";
import { Box, Flex, Input, Button, Spinner, Heading, Text, VStack, HStack, IconButton, useColorModeValue, Select, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea } from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";
import ContentLayout from "../../components/Layouts/ContentLayout";
import { FaMicrophone, FaUpload, FaVolumeUp, FaUserCircle, FaRobot } from "react-icons/fa";

const BACKEND_CHAT_ENDPOINT = "http://localhost:3001/api/chat";

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
  const endpoint = "http://13.203.149.17:8000/services/inference/translation";
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
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.output && data.output[0] && data.output[0].target) {
      return data.output[0].target;
    } else if (data && data.output && data.output[0]) {
      return data.output[0];
    } else {
      throw new Error("Translation failed");
    }
  } catch (err) {
    console.error("Translation error:", err);
    return text + " [Translation failed]";
  }
}

// Utility: Convert WebM Blob to WAV Blob using AudioContext
async function webmBlobToWavBlob(webmBlob) {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioCtx = new window.AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  // Encode to WAV (PCM 16-bit)
  function encodeWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const samples = audioBuffer.length * numChannels;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    // RIFF identifier 'RIFF'
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(view, 8, 'WAVE');
    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true); // AudioFormat
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
    view.setUint16(32, numChannels * bitDepth / 8, true);
    view.setUint16(34, bitDepth, true);
    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);
    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = audioBuffer.getChannelData(ch)[i];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  return encodeWAV(audioBuffer);
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
  const [isRecording, setIsRecording] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any[]>([]);
  const [audioInputLang, setAudioInputLang] = useState("hi");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceLLMText, setVoiceLLMText] = useState("");
  const [voiceAudio, setVoiceAudio] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const voiceAudioFileRef = useRef<HTMLInputElement | null>(null);
  const [voiceInputLang, setVoiceInputLang] = useState("en");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [textMessages, voiceMessages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setTextMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      let llmInput = userMessage;
      // Translate input to English if needed
      if (textInputLang !== "en") {
        llmInput = await translateText({ text: userMessage, sourceLang: textInputLang, targetLang: "en" });
      }
      const res = await fetch(BACKEND_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: llmInput, provider: "GEMINI" }),
      });
      const data = await res.json();
      console.log("Chatbot API response:", data);
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
        assistantReply = await translateText({ text: assistantReply, sourceLang: "en", targetLang: outputLang });
      }
      setTextMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (err) {
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

  // ASR utility
  async function transcribeAudio({ file, sourceLang }) {
    // Read file as base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
    // Send JSON POST with base64 audio
    const endpoint = "http://13.203.149.17:8000/services/inference/asr?serviceId=ai4bharat/indictasr";
    const payload = {
      audio: [
        {
          audioContent: base64Data,
        },
      ],
      config: {
        language: {
          sourceLanguage: sourceLang,
        },
        serviceId: "ai4bharat/indictasr",
        audioFormat: "wav",
        encoding: "base64",
        samplingRate: 16000,
      },
      controlConfig: { dataTracking: true },
    };
    const headers = {
      accept: "application/json",
      authorization: "Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09",
      "Content-Type": "application/json",
    };
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.output && data.output[0]) {
      if (data.output[0].transcript) {
        return data.output[0].transcript;
      } else if (data.output[0].source) {
        return data.output[0].source;
      } else {
        throw new Error("ASR failed");
      }
    } else {
      throw new Error("ASR failed");
    }
  }

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new window.MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        // Convert WebM to WAV before sending
        const wavBlob = await webmBlobToWavBlob(blob);
        const file = new File([wavBlob], "recording.wav", { type: "audio/wav" });
        setAudioLoading(true);
        try {
          const transcript = await transcribeAudio({
            file,
            sourceLang: audioInputLang,
          });
          setInput(transcript);
        } catch (err) {
          setInput("[ASR failed]");
        }
        setAudioLoading(false);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      // After stopping, process the audio
      setTimeout(async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const wavBlob = await webmBlobToWavBlob(blob);
        const file = new File([wavBlob], "recording.wav", { type: "audio/wav" });
        await handleVoiceChatPipeline(file);
        recordedChunksRef.current = [];
      }, 100);
    }
  };

  // Handle file upload for ASR
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAudioLoading(true);
    try {
      const transcript = await transcribeAudio({
        file,
        sourceLang: audioInputLang,
      });
      setInput(transcript);
    } catch (err) {
      setInput("[ASR failed]");
    }
    setAudioLoading(false);
    // Reset file input so same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchTTS = async ({ text, lang }) => {
    const endpoint = "http://13.203.149.17:8000/services/inference/tts?serviceId=ai4bharat/indictts--gpu-t4";
    const payload = {
      input: [
        { source: text }
      ],
      config: {
        serviceId: "ai4bharat/indictts--gpu-t4",
        gender: "male",
        samplingRate: 22050,
        audioFormat: "wav",
        language: {
          sourceLanguage: lang // Only sourceLanguage, no sourceScriptCode
        }
      },
      controlConfig: { dataTracking: true }
    };
    const accessToken = localStorage.getItem("access_token");
    const headers = {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "x-auth-source": "AUTH_TOKEN",
      "Content-Type": "application/json",
    };
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.audio && data.audio[0] && data.audio[0].audioContent) {
      return data.audio[0].audioContent;
    }
    throw new Error('TTS failed');
  };

  function playBase64Wav(base64) {
    const audio = new Audio('data:audio/wav;base64,' + base64);
    audio.play();
  }

  // Voice Chat pipeline
  async function handleVoiceChatPipeline(audioFile: File) {
    setVoiceLoading(true);
    try {
      // 1. ASR
      const transcript = await transcribeAudio({ file: audioFile, sourceLang: voiceInputLang });
      setVoiceMessages((prev) => [...prev, { role: "user", content: transcript }]);
      // 2. Translate to EN if needed
      let llmInput = transcript;
      if (voiceInputLang !== "en") {
        llmInput = await translateText({ text: transcript, sourceLang: voiceInputLang, targetLang: "en" });
      }
      // 3. LLM
      const res = await fetch(BACKEND_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: llmInput, provider: "GEMINI" }),
      });
      const data = await res.json();
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
        finalText = await translateText({ text: llmOutput, sourceLang: "en", targetLang: voiceInputLang });
      }
      setVoiceMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
      // 5. TTS
      const ttsAudioBase64 = await fetchTTS({ text: finalText, lang: voiceInputLang });
      playBase64Wav(ttsAudioBase64);
    } catch (err) {
      setVoiceMessages((prev) => [...prev, { role: "assistant", content: "[Pipeline failed]" }]);
    }
    setVoiceLoading(false);
  }

  return (
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
                    <div ref={messagesEndRef} />
                  </VStack>
                </Box>
                <Box as="form" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                      icon={audioLoading ? <Spinner size="sm" /> : <FaMicrophone />}
                      colorScheme={isRecording ? "red" : "orange"}
                      onClick={isRecording ? stopRecording : startRecording}
                      isLoading={audioLoading}
                      borderRadius="xl"
                      size="lg"
                      title={isRecording ? "Stop Recording" : "Start Recording"}
                    />
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
                      isLoading={audioLoading}
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
                    {(voiceLoading || isRecording) && (
                      <Flex justify="center" align="center" w="100%" minH="48px">
                        {isRecording ? (
                          <Box textAlign="center">
                            <Box mb={1}>
                              <Box w="10" h="10" bgGradient="linear(to-br, orange.400, orange.300)" borderRadius="full" mx="auto" className="animate-pulse" boxShadow="xl" />
                            </Box>
                            <Text color="orange.500" fontWeight="bold" fontSize="sm">Listening...</Text>
                          </Box>
                        ) : (
                          <Box textAlign="center">
                            <Spinner size="lg" color="orange.400" thickness="4px" speed="0.8s" mb={1} />
                            <Text color="gray.500" fontWeight="bold" fontSize="sm">Thinking...</Text>
                          </Box>
                        )}
                      </Flex>
                    )}
                  </VStack>
                </Box>
                <Box w="100%" display="flex" justifyContent="center" mt={2}>
                  <Button
                    leftIcon={<FaMicrophone />}
                    colorScheme={isRecording ? "red" : "orange"}
                    size="lg"
                    borderRadius="full"
                    px={8}
                    py={6}
                    fontSize="xl"
                    fontWeight="bold"
                    boxShadow="xl"
                    onClick={isRecording ? stopRecording : startRecording}
                    isLoading={voiceLoading}
                    disabled={voiceLoading}
                    _focus={{ boxShadow: "outline" }}
                    className={isRecording ? "animate-pulse" : ""}
                  >
                    {isRecording ? "Stop Recording" : "Tap to Speak"}
                  </Button>
                </Box>
              </VStack>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </ContentLayout>
  );
} 