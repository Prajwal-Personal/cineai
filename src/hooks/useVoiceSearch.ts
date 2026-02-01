import { useState, useCallback, useRef } from 'react';

interface UseVoiceSearchProps {
    onResult: (transcript: string, isFinal: boolean) => void;
}

export const useVoiceSearch = ({ onResult }: UseVoiceSearchProps) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Speech recognition not supported');
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        setError(null);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
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
            setError(event.error === 'network' ? 'Network error: Cannot reach speech servers.' : event.error);
            setIsListening(false);
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error("Failed to start recognition", e);
            setError("Failed to start microphone.");
            setIsListening(false);
        }
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
        error,
        startListening,
        stopListening,
        toggleListening
    };
};
