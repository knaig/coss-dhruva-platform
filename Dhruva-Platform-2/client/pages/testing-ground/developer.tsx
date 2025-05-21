import { useState, useRef } from "react";
import { Box, Button, Flex, Heading, VStack, HStack, Select, Input, Textarea, Text, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import ContentLayout from "../../components/Layouts/ContentLayout";
import Head from "next/head";
import dynamic from 'next/dynamic';

// Dynamically import the main pages
const ServicesPage = dynamic(() => import('../services'), { ssr: false });
const ModelsPage = dynamic(() => import('../models'), { ssr: false });
const PipelinePage = dynamic(() => import('../pipeline'), { ssr: false });
const MonitoringPage = dynamic(() => import('../monitoring'), { ssr: false });
const AdminPage = dynamic(() => import('../admin'), { ssr: false });

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

function FeatureButton({ label, selected, onClick }) {
  return (
    <Button
      colorScheme={selected ? "orange" : "gray"}
      variant={selected ? "solid" : "outline"}
      size="lg"
      onClick={onClick}
      w="180px"
      h="60px"
      fontWeight="bold"
      fontSize="xl"
      boxShadow={selected ? "md" : undefined}
    >
      {label}
    </Button>
  );
}

export default function DevTestingGround() {
  const [selectedTab, setSelectedTab] = useState("api-testing");
  const [feature, setFeature] = useState(null);

  // Language settings
  const [inputLang, setInputLang] = useState("en");
  const [outputLang, setOutputLang] = useState("hi");
  const [audioInputLang, setAudioInputLang] = useState("hi");
  const [audioOutputLang, setAudioOutputLang] = useState("hi");

  // Feature states
  const [textInput, setTextInput] = useState("");
  const [textOutput, setTextOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const fileInputRef = useRef(null);
  const [ttsGender, setTtsGender] = useState("male");
  const [ttsAudioFormat, setTtsAudioFormat] = useState("wav");
  const [asrSamplingRate, setAsrSamplingRate] = useState(16000);
  const [pipelineTranscript, setPipelineTranscript] = useState('');
  const [pipelineTranslation, setPipelineTranslation] = useState('');
  const [pipelineAudio, setPipelineAudio] = useState('');
  const pipelineAudioFileRef = useRef(null);

  // Translation API
  async function handleTranslate() {
    setIsLoading(true);
    setTextOutput("");
    const endpoint = "http://13.203.149.17:8000/services/inference/translation";
    const payload = {
      controlConfig: { dataTracking: true },
      config: {
        serviceId: "ai4bharat/indictrans--gpu-t4",
        language: {
          sourceLanguage: inputLang,
          sourceScriptCode: LANGUAGE_SCRIPT_MAP[inputLang] || '',
          targetLanguage: outputLang,
          targetScriptCode: LANGUAGE_SCRIPT_MAP[outputLang] || '',
        },
      },
      input: [{ source: textInput }],
    };
    const headers = {
      accept: "application/json",
      "x-auth-source": "AUTH_TOKEN",
      authorization: `Bearer ${localStorage.getItem("access_token")}`,
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
        setTextOutput(data.output[0].target);
      } else if (data && data.output && data.output[0]) {
        setTextOutput(data.output[0]);
      } else {
        setTextOutput("[Translation failed]");
      }
    } catch (err) {
      setTextOutput("[Translation failed]");
    }
      setIsLoading(false);
  }

  // ASR API
  async function handleASR() {
    setIsLoading(true);
    setTextOutput("");
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setTextOutput("[No audio file selected]");
      setIsLoading(false);
      return;
    }
    // Read file as base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const result = reader.result;
        resolve((result as string).split(",")[1]);
      };
      reader.onerror = reject;
    });
    const endpoint = "http://13.203.149.17:8000/services/inference/asr?serviceId=ai4bharat/indictasr";
    const payload = {
      audio: [
        { audioContent: base64Data },
      ],
      config: {
        language: { sourceLanguage: audioInputLang },
        serviceId: "ai4bharat/indictasr",
        audioFormat: "wav",
        encoding: "base64",
        samplingRate: asrSamplingRate,
      },
      controlConfig: { dataTracking: true },
    };
    const headers = {
      accept: "application/json",
      authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "x-auth-source": "AUTH_TOKEN",
      "Content-Type": "application/json",
    };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.output && data.output[0]) {
        if (data.output[0].transcript) {
          setTextOutput(data.output[0].transcript);
        } else if (data.output[0].source) {
          setTextOutput(data.output[0].source);
        } else {
          setTextOutput("[ASR failed]");
        }
      } else {
        setTextOutput("[ASR failed]");
      }
    } catch (err) {
      setTextOutput("[ASR failed]");
    }
    setIsLoading(false);
  }

  // TTS API
  async function handleTTS() {
    setIsLoading(true);
    setTextOutput("");
    setAudioUrl("");
    const endpoint = "http://13.203.149.17:8000/services/inference/tts?serviceId=ai4bharat/indictts--gpu-t4";
    const payload = {
      input: [ { source: textInput } ],
      config: {
        serviceId: "ai4bharat/indictts--gpu-t4",
        gender: ttsGender,
        samplingRate: 22050,
        audioFormat: ttsAudioFormat,
        language: {
          sourceLanguage: audioOutputLang,
          sourceScriptCode: LANGUAGE_SCRIPT_MAP[audioOutputLang] || '',
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
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.audio && data.audio[0] && data.audio[0].audioContent) {
        setTextOutput("[Audio generated]");
        setAudioUrl(`data:audio/wav;base64,${data.audio[0].audioContent}`);
      } else {
        setTextOutput("[TTS failed]");
        setAudioUrl("");
      }
    } catch (err) {
      setTextOutput("[TTS failed]");
      setAudioUrl("");
    }
    setIsLoading(false);
  }

  // Pipeline API (audio only)
  async function handlePipeline() {
    setIsLoading(true);
    setPipelineTranscript("");
    setPipelineTranslation("");
    setPipelineAudio("");
    setTextOutput("");
    try {
      // 1. ASR
      const file = pipelineAudioFileRef.current?.files?.[0];
      if (!file) {
        setTextOutput("[No audio file selected]");
        setIsLoading(false);
        return;
      }
      // Read file as base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          const result = reader.result;
          resolve((result as string).split(",")[1]);
        };
        reader.onerror = reject;
      });
      const asrEndpoint = "http://13.203.149.17:8000/services/inference/asr?serviceId=ai4bharat/indictasr";
      const asrPayload = {
        audio: [ { audioContent: base64Data } ],
        config: {
          language: { sourceLanguage: inputLang },
          serviceId: "ai4bharat/indictasr",
          audioFormat: "wav",
          encoding: "base64",
          samplingRate: asrSamplingRate,
        },
        controlConfig: { dataTracking: true },
      };
      const asrHeaders = {
        accept: "application/json",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "x-auth-source": "AUTH_TOKEN",
        "Content-Type": "application/json",
      };
      const asrRes = await fetch(asrEndpoint, {
        method: "POST",
        headers: asrHeaders,
        body: JSON.stringify(asrPayload),
      });
      const asrData = await asrRes.json();
      let transcript = '';
      if (asrData && asrData.output && asrData.output[0]) {
        transcript = asrData.output[0].transcript || asrData.output[0].source || '';
        setPipelineTranscript(transcript);
      } else {
        setTextOutput("[ASR failed]");
        setIsLoading(false);
        return;
      }
      // 2. Translation
      const translationEndpoint = "http://13.203.149.17:8000/services/inference/translation";
      const translationPayload = {
        controlConfig: { dataTracking: true },
        config: {
          serviceId: "ai4bharat/indictrans--gpu-t4",
          language: {
            sourceLanguage: inputLang,
            sourceScriptCode: LANGUAGE_SCRIPT_MAP[inputLang] || '',
            targetLanguage: outputLang,
            targetScriptCode: LANGUAGE_SCRIPT_MAP[outputLang] || '',
          },
        },
        input: [{ source: transcript }],
      };
      const translationHeaders = {
        accept: "application/json",
        "x-auth-source": "AUTH_TOKEN",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      };
      const translationRes = await fetch(translationEndpoint, {
        method: "POST",
        headers: translationHeaders,
        body: JSON.stringify(translationPayload),
      });
      const translationData = await translationRes.json();
      let translation = '';
      if (translationData && translationData.output && translationData.output[0] && translationData.output[0].target) {
        translation = translationData.output[0].target;
      } else if (translationData && translationData.output && translationData.output[0]) {
        translation = translationData.output[0];
      } else {
        setTextOutput("[Translation failed]");
        setIsLoading(false);
        return;
      }
      setPipelineTranslation(translation);
      // 3. TTS
      const ttsEndpoint = "http://13.203.149.17:8000/services/inference/tts?serviceId=ai4bharat/indictts--gpu-t4";
      const ttsPayload = {
        input: [ { source: translation } ],
        config: {
          serviceId: "ai4bharat/indictts--gpu-t4",
          gender: ttsGender,
          samplingRate: 22050,
          audioFormat: ttsAudioFormat,
          language: {
            sourceLanguage: outputLang,
            sourceScriptCode: LANGUAGE_SCRIPT_MAP[outputLang] || '',
          }
        },
        controlConfig: { dataTracking: true }
      };
      const ttsHeaders = {
        accept: "application/json",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "x-auth-source": "AUTH_TOKEN",
        "Content-Type": "application/json",
      };
      const ttsRes = await fetch(ttsEndpoint, {
        method: "POST",
        headers: ttsHeaders,
        body: JSON.stringify(ttsPayload),
      });
      const ttsData = await ttsRes.json();
      if (ttsData && ttsData.audio && ttsData.audio[0] && ttsData.audio[0].audioContent) {
        setPipelineAudio(ttsData.audio[0].audioContent);
      } else {
        setTextOutput("[TTS failed]");
        setIsLoading(false);
        return;
      }
      setTextOutput("Pipeline completed successfully.");
    } catch (err) {
      setTextOutput("[Pipeline failed]");
    }
      setIsLoading(false);
  }

  const renderAPITesting = () => (
    <Box>
        <HStack spacing={8} mb={8}>
          <FeatureButton label="Translation" selected={feature === "translation"} onClick={() => setFeature("translation")}/>
          <FeatureButton label="ASR" selected={feature === "asr"} onClick={() => setFeature("asr")}/>
          <FeatureButton label="TTS" selected={feature === "tts"} onClick={() => setFeature("tts")}/>
        <FeatureButton label="Pipeline" selected={feature === "pipeline"} onClick={() => setFeature("pipeline")}/>
        </HStack>
      {/* Feature UIs */}
      {feature === "translation" && (
        <Box>
          <Heading size="md" mb={4}>Translation</Heading>
          <HStack spacing={8} mb={4}>
          <Box>
            <Text fontWeight="bold" color="orange.500">Text Input Language</Text>
            <Select value={inputLang} onChange={e => setInputLang(e.target.value)} maxW="150px">
              {INDIAN_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </Select>
          </Box>
          <Box>
            <Text fontWeight="bold" color="orange.500">Text Output Language</Text>
            <Select value={outputLang} onChange={e => setOutputLang(e.target.value)} maxW="150px">
              {INDIAN_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </Select>
          </Box>
        </HStack>
            <Textarea
              placeholder="Enter text to translate..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              mb={4}
              rows={4}
            />
            <Button colorScheme="orange" onClick={handleTranslate} isLoading={isLoading} mb={4}>Translate</Button>
            <Textarea
              placeholder="Translation output..."
              value={textOutput}
              isReadOnly
              rows={4}
            />
          </Box>
        )}
        {feature === "asr" && (
          <Box>
            <Heading size="md" mb={4}>ASR (Speech to Text)</Heading>
          <HStack spacing={8} mb={4}>
            <Box>
              <Text fontWeight="bold" color="orange.500">Audio Input Language</Text>
              <Select value={audioInputLang} onChange={e => setAudioInputLang(e.target.value)} maxW="150px">
                {INDIAN_LANGUAGES.filter(l => l.code !== 'en').map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">Sampling Rate</Text>
              <Select value={asrSamplingRate} onChange={e => setAsrSamplingRate(Number(e.target.value))} maxW="150px">
                <option value={8000}>8000 Hz</option>
                <option value={16000}>16000 Hz</option>
                <option value={48000}>48000 Hz</option>
              </Select>
            </Box>
          </HStack>
          <Input type="file" accept="audio/*" mb={4} ref={fileInputRef} />
            <Button colorScheme="orange" onClick={handleASR} isLoading={isLoading} mb={4}>Transcribe</Button>
            <Textarea
              placeholder="ASR transcript output..."
              value={textOutput}
              isReadOnly
              rows={4}
            />
          </Box>
        )}
        {feature === "tts" && (
          <Box>
            <Heading size="md" mb={4}>TTS (Text to Speech)</Heading>
          <HStack spacing={8} mb={4}>
            <Box>
              <Text fontWeight="bold" color="orange.500">Audio Output Language</Text>
              <Select value={audioOutputLang} onChange={e => setAudioOutputLang(e.target.value)} maxW="150px">
                {INDIAN_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">Gender</Text>
              <Select value={ttsGender} onChange={e => setTtsGender(e.target.value)} maxW="150px">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">Audio Format</Text>
              <Select value={ttsAudioFormat} onChange={e => setTtsAudioFormat(e.target.value)} maxW="150px">
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
                <option value="flac">FLAC</option>
              </Select>
            </Box>
          </HStack>
            <Textarea
              placeholder="Enter text for TTS..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              mb={4}
              rows={4}
            />
            <Button colorScheme="orange" onClick={handleTTS} isLoading={isLoading} mb={4}>Synthesize</Button>
            <Textarea
              placeholder="TTS output (audio URL or base64)..."
              value={textOutput}
              isReadOnly
              rows={2}
            />
          {audioUrl && (
            <Box mt={4}>
              <audio controls src={audioUrl} />
            </Box>
          )}
        </Box>
      )}
      {feature === "pipeline" && (
        <Box>
          <Heading size="md" mb={4}>Pipeline (Speech2Speech)</Heading>
          <HStack spacing={8} mb={4}>
            <Box>
              <Text fontWeight="bold" color="orange.500">Input Language</Text>
              <Select value={inputLang} onChange={e => setInputLang(e.target.value)} maxW="150px">
                {INDIAN_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">Output Language</Text>
              <Select value={outputLang} onChange={e => setOutputLang(e.target.value)} maxW="150px">
                {INDIAN_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">TTS Gender</Text>
              <Select value={ttsGender} onChange={e => setTtsGender(e.target.value)} maxW="120px">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </Box>
            <Box>
              <Text fontWeight="bold" color="orange.500">TTS Audio Format</Text>
              <Select value={ttsAudioFormat} onChange={e => setTtsAudioFormat(e.target.value)} maxW="120px">
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
                <option value="flac">FLAC</option>
              </Select>
            </Box>
          </HStack>
          <Input type="file" accept="audio/*" mb={4} ref={pipelineAudioFileRef} />
          <Button colorScheme="orange" onClick={handlePipeline} isLoading={isLoading} mb={4}>Run Pipeline</Button>
          <Box mt={4}>
            {pipelineTranscript && (
              <Box mb={2}>
                <Text fontWeight="bold" color="orange.500">Transcript (ASR Output):</Text>
                <Textarea value={pipelineTranscript} isReadOnly rows={2} mb={2} />
              </Box>
            )}
            {pipelineTranslation && (
              <Box mb={2}>
                <Text fontWeight="bold" color="orange.500">Translation Output:</Text>
                <Textarea value={pipelineTranslation} isReadOnly rows={2} mb={2} />
              </Box>
            )}
            {pipelineAudio && (
              <Box mb={2}>
                <Text fontWeight="bold" color="orange.500">TTS Output (Audio):</Text>
                <audio controls src={`data:audio/wav;base64,${pipelineAudio}`} />
              </Box>
            )}
            {textOutput && (
              <Text color="red.500" fontWeight="bold">{textOutput}</Text>
            )}
          </Box>
          </Box>
        )}
    </Box>
  );

  return (
    <>
      <Head>
        <title>Dhruva Developer Sandbox</title>
      </Head>
      <ContentLayout>
        <Box p={8}>
          <Heading mb={8} color="orange.500">Dhruva Developer Sandbox</Heading>
          <Tabs variant="enclosed" colorScheme="orange" size="lg">
            <TabList>
              <Tab onClick={() => setSelectedTab("api-testing")}>API Testing</Tab>
              <Tab onClick={() => setSelectedTab("services")}>Services</Tab>
              <Tab onClick={() => setSelectedTab("models")}>Models</Tab>
              <Tab onClick={() => setSelectedTab("pipeline")}>Pipeline</Tab>
              <Tab onClick={() => setSelectedTab("monitoring")}>Monitoring</Tab>
              <Tab onClick={() => setSelectedTab("admin")}>Admin</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>{renderAPITesting()}</TabPanel>
              <TabPanel><ServicesPage /></TabPanel>
              <TabPanel><ModelsPage /></TabPanel>
              <TabPanel><PipelinePage /></TabPanel>
              <TabPanel><MonitoringPage /></TabPanel>
              <TabPanel><AdminPage /></TabPanel>
            </TabPanels>
          </Tabs>
      </Box>
    </ContentLayout>
    </>
  );
} 