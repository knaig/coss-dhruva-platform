from dotenv import load_dotenv
load_dotenv()

from locust import HttpUser, task, between
import random
import base64
import os

TRANSLATION_TESTS = [
    {"input": "नमस्ते, मैं एक कृत्रिम बुद्धिमत्ता सहायक हूं", "expected": "Hello, I am an artificial intelligence assistant"},
    {"input": "मैं आपकी कैसे मदद कर सकता हूं?", "expected": "How can I help you?"},
    {"input": "क्या आप मुझे कुछ जानकारी दे सकते हैं?", "expected": "Can you give me some information?"},
    {"input": "मुझे आपकी बात समझ में आ रही है", "expected": "I understand what you are saying"},
    {"input": "क्या आप इसे दोबारा समझा सकते हैं?", "expected": "Can you explain this again?"},
    {"input": "मैं आपकी बात सुन रहा हूं", "expected": "I am listening to you"},
    {"input": "कृपया थोड़ा धीरे बोलें", "expected": "Please speak a little slower"},
    {"input": "मैं आपकी मदद करने के लिए तैयार हूं", "expected": "I am ready to help you"},
    {"input": "क्या आप इस विषय पर और जानकारी दे सकते हैं?", "expected": "Can you provide more information on this topic?"},
    {"input": "मुझे आपकी बात समझने में कुछ समय लगेगा", "expected": "It will take me some time to understand what you are saying"},
    {"input": "क्या आप इसे एक उदाहरण के साथ समझा सकते हैं?", "expected": "Can you explain this with an example?"},
    {"input": "मैं आपकी सहायता के लिए हमेशा उपलब्ध हूं", "expected": "I am always available to assist you"},
    {"input": "क्या आप इस समस्या का समाधान बता सकते हैं?", "expected": "Can you provide a solution to this problem?"},
    {"input": "मुझे आपकी प्रतिक्रिया का इंतज़ार है", "expected": "I am waiting for your feedback"},
    {"input": "क्या आप इस विषय पर अपना विचार साझा कर सकते हैं?", "expected": "Can you share your thoughts on this topic?"}
]

TTS_TESTS = [{"input": tc["input"], "expected": "audio"} for tc in TRANSLATION_TESTS]

ASR_TESTS = [
    {"audioFile": f"sample-hindi-{i+1}.wav", "expected": tc["input"]}
    for i, tc in enumerate(TRANSLATION_TESTS)
]

TRANSLATE_URL = "/services/inference/translation"
TTS_URL = "/services/inference/tts"
ASR_URL = "/services/inference/asr"

API_KEY = os.environ.get("API_KEY")
headers = {
    "accept": "application/json",
    "x-auth-source": "API_KEY",
    "Authorization": API_KEY,
    "Content-Type": "application/json"
}

class AIServiceUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def translate(self):
        test_case = random.choice(TRANSLATION_TESTS)
        payload = {
            "controlConfig": {"dataTracking": True},
            "config": {
                "serviceId": "ai4bharat/indictrans--gpu-t4",
                "language": {
                    "sourceLanguage": "hi",
                    "sourceScriptCode": "Deva",
                    "targetLanguage": "en",
                    "targetScriptCode": "Latn"
                }
            },
            "input": [{"source": test_case["input"]}]
        }
        self.client.post(TRANSLATE_URL, json=payload, headers=headers)

    @task
    def tts(self):
        test_case = random.choice(TTS_TESTS)
        payload = {
            "input": [{"source": test_case["input"]}],
            "config": {
                "serviceId": "ai4bharat/indictts--gpu-t4",
                "gender": "male",
                "samplingRate": 22050,
                "audioFormat": "wav",
                "language": {"sourceLanguage": "hi"}
            },
            "controlConfig": {"dataTracking": True}
        }
        self.client.post(TTS_URL, json=payload, headers=headers)

    @task
    def asr(self):
        test_case = random.choice(ASR_TESTS)
        audio_path = f"./{test_case['audioFile']}"
        if os.path.exists(audio_path):
            with open(audio_path, "rb") as f:
                audio_data = base64.b64encode(f.read()).decode("utf-8")
                payload = {
                    "audio": [{"audioContent": audio_data}],
                    "config": {
                        "language": {"sourceLanguage": "hi"},
                        "serviceId": "ai4bharat/indictasr",
                        "audioFormat": "wav",
                        "encoding": "base64",
                        "samplingRate": 16000
                    },
                    "controlConfig": {"dataTracking": True}
                }
                self.client.post(ASR_URL, json=payload, headers=headers)
        else:
            print(f"Missing audio: {audio_path}")
