import { useState, useCallback, useRef } from 'react';

interface UseVoiceSearchProps {
    onResult: (transcript: string, isFinal: boolean) => void;
}

export const useVoiceSearch = ({ onResult }: UseVoiceSearchProps) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            console.log("Speech Recognition Started");
        };

        recognition.onresult = (event: any) => {
            let fullTranscript = '';
            let isFinalResult = false;

            for (let i = 0; i < event.results.length; ++i) {
                fullTranscript += event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    isFinalResult = true;
                }
            }

            console.log(`Speech Transcription: ${fullTranscript} (final: ${isFinalResult})`);
            onResult(fullTranscript.trim(), isFinalResult);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, [onResult]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        startListening,
        stopListening,
        toggleListening
    };
};
