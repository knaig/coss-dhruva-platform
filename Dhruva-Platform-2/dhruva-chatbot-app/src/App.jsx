import { useState } from 'react';
import AdvancedChatbot from './DhruvaChatbot';
import './App.css'

const TABS = [
  { key: 'chatbot', label: 'Chatbot' },
  { key: 'translation', label: 'Translation Workbench' },
  { key: 'usecases', label: 'Use Case Gallery' },
];

export default function App() {
  const [tab, setTab] = useState('chatbot');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      <header className="bg-gradient-to-r from-blue-700 to-emerald-600 shadow-lg py-4 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="inline-block bg-white rounded-full p-2 shadow">
            {/* Placeholder for logo */}
            <span className="font-bold text-blue-700 text-xl">Dhruva</span>
          </span>
          <span className="text-white text-2xl font-bold tracking-wide drop-shadow">AI Demo Suite</span>
        </div>
        <span className="text-white/80 text-sm font-medium">Powered by Dhruva APIs</span>
      </header>
      <nav className="flex justify-center mt-4 space-x-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-t-lg font-semibold transition-colors duration-150 ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 hover:bg-blue-100'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="max-w-4xl mx-auto mt-8 bg-white rounded-2xl shadow-xl p-6 min-h-[60vh]">
        {tab === 'chatbot' && (
          <section>
            <h2 className="text-2xl font-bold mb-2 text-blue-700">Multilingual Chatbot</h2>
            <p className="mb-4 text-gray-600">Chat with the AI Assistant using text or voice. The assistant can reply in multiple languages and speak responses aloud. Powered by Dhruva ASR, Translation, TTS, and LLM APIs.</p>
            <AdvancedChatbot />
          </section>
        )}
        {tab === 'translation' && (
          <section>
            <h2 className="text-2xl font-bold mb-2 text-emerald-700">Translation Workbench</h2>
            <p className="mb-4 text-gray-600">Translate text or speech between Indian languages. Try uploading or recording audio, or enter text to see instant translation. (Coming soon: document translation!)</p>
            <div className="py-12 text-center text-gray-400">[Translation Workbench UI coming soon]</div>
          </section>
        )}
        {tab === 'usecases' && (
          <section>
            <h2 className="text-2xl font-bold mb-2 text-orange-700">Use Case Gallery</h2>
            <p className="mb-4 text-gray-600">Explore real-world scenarios powered by Dhruva APIs, such as voice-to-voice translation, assistive reading, and more.</p>
            <div className="py-12 text-center text-gray-400">[Use Case Gallery coming soon]</div>
          </section>
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-4 mt-8">
        &copy; {new Date().getFullYear()} Dhruva AI Demo Suite. <a href="https://bhashini.gov.in/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Learn more about Dhruva</a>
      </footer>
    </div>
  );
}
