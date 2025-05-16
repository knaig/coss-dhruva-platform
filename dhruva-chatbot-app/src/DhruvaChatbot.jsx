import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Settings, X, Globe2, Mic, Upload } from 'lucide-react';

// API configurations for different LLM providers
const LLM_PROVIDERS = {
  OPENAI: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    preparePayload: (message, conversationHistory) => ({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory || [{ role: 'user', content: message }],
      temperature: 0.7
    }),
    extractResponse: (data) => data.choices[0].message.content
  },
  GEMINI: {
    name: 'Google Gemini',
    endpoint: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    preparePayload: (message, conversationHistory) => ({
      contents: conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      generationConfig: { temperature: 0.7 }
    }),
    extractResponse: (data) => data.candidates[0].content.parts[0].text
  },
  CUSTOM: {
    name: 'Custom LLM',
    endpoint: '', // This will be set from user input
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    }),
    preparePayload: (message) => ({
      message: message
    }),
    extractResponse: (data) => data.response || data.message || data.content || JSON.stringify(data)
  }
};

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'or', name: 'Odia' },
];

// Language to script code mapping for dropdown languages
const LANGUAGE_SCRIPT_MAP = {
  en: 'Latn',
  hi: 'Deva',
  ta: 'Taml',
  te: 'Telu',
  kn: 'Knda',
  ml: 'Mlym',
  bn: 'Beng',
  mr: 'Deva',
  gu: 'Gujr',
  pa: 'Guru',
  or: 'Orya',
};

// Translation API utility
async function translateText({ text, sourceLang, targetLang }) {
  if (sourceLang === targetLang) return text;
  const API_KEY = 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09';
  const endpoint = 'http://13.203.149.17:8000/services/inference/translation';
  const payload = {
    controlConfig: { dataTracking: true },
    config: {
      serviceId: 'ai4bharat/indictrans--gpu-t4',
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
    'accept': 'application/json',
    'x-auth-source': 'API_KEY',
    'Authorization': API_KEY,
    'Content-Type': 'application/json',
  };
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    // Try to extract translated text from response
    if (data && data.output && data.output[0] && data.output[0].target) {
      return data.output[0].target;
    } else if (data && data.output && data.output[0]) {
      // fallback if structure is different
      return data.output[0];
    } else {
      throw new Error('Translation failed');
    }
  } catch (err) {
    console.error('Translation error:', err);
    return text + ' [Translation failed]';
  }
}

// Add ASR API utility
async function transcribeAudio({ file, sourceLang }) {
  const endpoint = '/api/asr';
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('config', JSON.stringify({
    controlConfig: { dataTracking: true },
    config: {
      audioFormat: 'mp3',
      language: {
        sourceLanguage: sourceLang,
        sourceScriptCode: LANGUAGE_SCRIPT_MAP[sourceLang] || '',
      },
      encoding: 'LINEAR16',
      samplingRate: 16000,
      serviceId: 'ai4bharat/indictasr',
      preProcessors: [],
      postProcessors: [],
      transcriptionFormat: { value: 'transcript' },
      bestTokenCount: 0,
    }
  }));
  formData.append('sampleRate', 16000);
  formData.append('channels', 1);
  formData.append('format', 'mp3');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log('ASR response:', data);
    if (data && data.output && data.output[0]) {
      if (data.output[0].transcript) {
        return data.output[0].transcript;
      } else if (data.output[0].source) {
        return data.output[0].source;
      } else {
        throw new Error('ASR failed');
      }
    } else {
      throw new Error('ASR failed');
    }
  } catch (err) {
    console.error('ASR error:', err);
    throw err;
  }
}

// TTS API utility
async function fetchTTS({ text, lang }) {
  const API_KEY = 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09';
  const endpoint = 'http://13.203.149.17:8000/services/inference/tts';
  const payload = {
    controlConfig: { dataTracking: true },
    config: {
      serviceId: 'ai4bharat/indictts--gpu-t4',
      gender: 'male',
      samplingRate: 0,
      audioFormat: 'wav',
      language: {
        sourceLanguage: lang,
        sourceScriptCode: LANGUAGE_SCRIPT_MAP[lang] || '',
      }
    },
    input: [
      {
        source: text,
        audioDuration: 0
      }
    ]
  };
  const headers = {
    'accept': 'application/json',
    'x-auth-source': 'API_KEY',
    'Authorization': API_KEY,
    'Content-Type': 'application/json',
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data && data.audio && data.audio[0] && data.audio[0].audioContent) {
    return data.audio[0].audioContent;
  }
  throw new Error('TTS failed');
}

function playBase64Wav(base64) {
  const audio = new Audio('data:audio/wav;base64,' + base64);
  audio.play();
}

const SAMPLE_RATES = [8000, 16000, 48000];
const CHANNELS = [1, 2];
const FORMATS = ['wav', 'mp3', 'flac'];

export default function AdvancedChatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [error, setError] = useState('');
  const [inputLang, setInputLang] = useState('en');
  const [outputLang, setOutputLang] = useState('en');
  const multilingualMode = inputLang !== 'en' || outputLang !== 'en';
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [testText, setTestText] = useState('');
  const [testSourceLang, setTestSourceLang] = useState('hi');
  const [testTargetLang, setTestTargetLang] = useState('en');
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioInputLang, setAudioInputLang] = useState('hi');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const langMenuRef = useRef(null);
  const langButtonRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (!showLangMenu) return;
    function handleClickOutside(event) {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target) &&
        langButtonRef.current &&
        !langButtonRef.current.contains(event.target)
      ) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);
  
  const sendMessageToLLM = async (msg) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.content, provider: 'GEMINI' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      return '';
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage, inputLang, outputLang }]);
    
    let llmInput = userMessage;
    let llmInputLang = 'en';
    let llmOutputLang = 'en';
    let doTranslateIn = false;
    let doTranslateOut = false;
    if (multilingualMode) {
      if (inputLang !== 'en') {
        llmInput = await translateText({ text: userMessage, sourceLang: inputLang, targetLang: 'en' });
        doTranslateIn = true;
      }
      llmInputLang = 'en';
      llmOutputLang = 'en';
      doTranslateOut = (outputLang !== 'en');
    }
    // If not multilingual, ignore selected input/output languages and use English only
    const response = await sendMessageToLLM({ role: 'user', content: llmInput, inputLang: llmInputLang, outputLang: llmOutputLang });
    let finalResponse = response;
    if (multilingualMode && doTranslateOut) {
      finalResponse = await translateText({ text: response, sourceLang: 'en', targetLang: outputLang });
    }
    
    // Add assistant message to chat
    setMessages(prev => [...prev, { role: 'assistant', content: finalResponse, inputLang, outputLang }]);
    setLlmIO(prev => [...prev, { input: llmInput, output: response }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you today?' }]);
  };
  
  // Temporary translation test handler
  const handleTestTranslation = async () => {
    setTestLoading(true);
    setTestResult('');
    const result = await translateText({ text: testText, sourceLang: testSourceLang, targetLang: testTargetLang });
    setTestResult(result);
    setTestLoading(false);
  };
  
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
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioLoading(true);
        try {
          const transcript = await transcribeAudio({
            file,
            sourceLang: audioInputLang,
          });
          setInput(transcript);
        } catch (err) {
          setInput('[ASR failed]');
        }
        setAudioLoading(false);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Release the mic
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState(null);
  const [audioSampleRate, setAudioSampleRate] = useState(16000);
  const [audioChannels, setAudioChannels] = useState(1);
  const [audioFormat, setAudioFormat] = useState('mp3');
  
  // Feedback state
  const [feedback, setFeedback] = useState({}); // { [msgIdx]: 'up' | 'down' }
  // Track LLM input/output for each message
  const [llmIO, setLlmIO] = useState([]); // [{input: string, output: string}]
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-blue-600 to-indigo-600 shadow-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-emerald-300 drop-shadow" />
              <h1 className="ml-3 text-2xl font-bold text-white tracking-wide drop-shadow">Dhruva AI Assistant</h1>
            </div>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-4 py-2 border border-white/20 shadow text-base font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
              >
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm"
                >
                  <option value="GEMINI">Gemini</option>
                  <option value="OPENAI">OpenAI</option>
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-center bg-white">
        <div className="w-full max-w-5xl flex-1 flex flex-col justify-end px-2 sm:px-12 py-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}> 
                <div className={`relative group max-w-[80%] ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}> 
                  <div className={`rounded-3xl shadow-lg px-6 py-4 text-lg break-words transition-all duration-200 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-400 text-white rounded-br-3xl rounded-tr-md'
                      : 'bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-bl-3xl rounded-tl-md'
                  }`}>
                    <div className="flex items-center mb-1">
                      {message.role === 'assistant' ? (
                        <Bot size={18} className="mr-2 text-emerald-200" />
                      ) : (
                        <User size={18} className="mr-2 text-gray-200" />
                      )}
                      <span className="font-bold text-base">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      {/* Speaker icon for TTS */}
                      {message.role === 'assistant' && (
                        <button
                          className="ml-2 p-1 rounded-full hover:bg-blue-100"
                          title="Speak"
                          onClick={async () => {
                            try {
                              setTtsLoadingIdx(index);
                              const audioBase64 = await fetchTTS({
                                text: message.content,
                                lang: message.inputLang || audioInputLang // fallback to audioInputLang
                              });
                              playBase64Wav(audioBase64);
                            } catch (err) {
                              alert('TTS failed');
                            } finally {
                              setTtsLoadingIdx(null);
                            }
                          }}
                          disabled={ttsLoadingIdx === index}
                        >
                          {ttsLoadingIdx === index ? (
                            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-blue-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12c0-2.21-1.79-4-4-4m4 4c0 2.21-1.79 4-4 4" />
                            </svg>
                          )}
                        </button>
                      )}
                      {/* Feedback buttons for assistant messages */}
                      {message.role === 'assistant' && (
                        <span className="ml-2 flex items-center space-x-1">
                          <button
                            className={`p-1 rounded-full ${feedback[index] === 'up' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            title="Thumbs Up"
                            onClick={() => setFeedback(f => ({ ...f, [index]: f[index] === 'up' ? undefined : 'up' }))}
                          >
                            <span role="img" aria-label="Thumbs Up">👍</span>
                          </button>
                          <button
                            className={`p-1 rounded-full ${feedback[index] === 'down' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            title="Thumbs Down"
                            onClick={() => setFeedback(f => ({ ...f, [index]: f[index] === 'down' ? undefined : 'down' }))}
                          >
                            <span role="img" aria-label="Thumbs Down">👎</span>
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-lg leading-relaxed font-medium drop-shadow-sm">{message.content}</p>
                  </div>
                  {/* LLM input/output display for user and assistant messages */}
                  {llmIO[index] && (
                    <div className="bg-gray-100 text-gray-700 text-xs rounded-b-xl px-4 py-2 mt-0.5">
                      {message.role === 'user' && llmIO[index].input && (
                        <div><span className="font-semibold">LLM Input (English):</span> {llmIO[index].input}</div>
                      )}
                      {message.role === 'assistant' && llmIO[index].output && (
                        <div><span className="font-semibold">LLM Output (English):</span> {llmIO[index].output}</div>
                      )}
                    </div>
                  )}
                  {/* Bubble tail */}
                  <span className={`absolute bottom-0 ${message.role === 'user' ? 'right-0' : 'left-0'} w-4 h-4 bg-inherit rounded-full z-0 translate-y-2 ${message.role === 'user' ? 'translate-x-2' : '-translate-x-2'}`}></span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isLoading && (
              <div className="flex justify-center items-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="border-t border-blue-100 bg-white backdrop-blur-md shadow-xl sticky bottom-0 z-10">
        <div className="max-w-5xl mx-auto px-2 sm:px-12 py-3">
          <div className="flex items-center space-x-2">
            {/* Language Icon */}
            <div className="relative">
              <button
                ref={langButtonRef}
                onClick={() => setShowLangMenu(v => !v)}
                className="p-2 rounded-full bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                title="Select Language"
              >
                <Globe2 className="h-6 w-6 text-blue-500" />
              </button>
              {showLangMenu && (
                <div ref={langMenuRef} className="absolute left-0 bottom-12 w-72 bg-white rounded-xl shadow-2xl p-4 z-50 border border-blue-100 animate-fade-in">
                  <div className="mb-2 text-sm font-semibold text-gray-700">Language Settings</div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Text Input Language</label>
                      <select
                        value={inputLang}
                        onChange={e => {
                          setInputLang(e.target.value);
                          if (outputLang === inputLang) setOutputLang(e.target.value);
                        }}
                        className="w-full px-2 py-1 rounded-md border border-gray-300 text-gray-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none"
                      >
                        {INDIAN_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Text Output Language</label>
                      <select
                        value={outputLang}
                        onChange={e => setOutputLang(e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-gray-300 text-gray-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none"
                      >
                        {INDIAN_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Audio Input Language</label>
                      <select
                        value={audioInputLang}
                        onChange={e => setAudioInputLang(e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-gray-300 text-gray-800 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none"
                      >
                        {INDIAN_LANGUAGES.filter(l => l.code !== 'en').map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 w-full bg-gray-50 rounded-xl px-3 py-2 shadow-sm">
              {/* Upload Button */}
              <label htmlFor="audio-upload" className="p-2 rounded-full bg-white hover:bg-blue-50 cursor-pointer" title="Upload Audio (WAV/MP3)">
                <Upload className="h-5 w-5 text-blue-500" />
              </label>
              {/* Mic Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-full ${isRecording ? 'bg-red-100' : 'bg-white'} hover:bg-blue-50`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                disabled={audioLoading}
              >
                {isRecording ? (
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <Mic className="h-5 w-5 text-blue-500" />
                )}
              </button>
              {/* Text Input and Send */}
              <input
                type="text"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-grow w-full p-3 border border-gray-300 rounded-3xl shadow focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-white text-gray-900 placeholder-gray-400 font-medium transition-all duration-200 mx-2"
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="inline-flex items-center px-4 py-2 rounded-2xl shadow text-base font-semibold text-blue-500 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}