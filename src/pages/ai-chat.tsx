import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Loader, Mic, MicOff, Volume2 } from 'lucide-react';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { User } from '@supabase/supabase-js'; // It's good practice to import the type

// --- Initialize the Gemini Model ---
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY3);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

// Enhanced thinking indicator with gradient animation
const ThinkingIndicator = () => (
  <div className="flex justify-start">
    <div className="rounded-2xl px-6 py-4 max-w-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Loader className="w-5 h-5 animate-spin text-purple-500" />
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-purple-200 animate-ping opacity-20"></div>
        </div>
        <span className="text-purple-700 font-medium">AI is thinking...</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

// Speech-to-text hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);

  // Create notification sounds
  const playStartSound = () => {
    // Create a pleasant "ding" sound when mic starts
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playStopSound = () => {
    // Create a gentle "click" sound when mic stops
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsSupported(true);

      // Request microphone permission
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        isStartingRef.current = false;
        try {
          playStartSound();
        } catch (error) {
          console.warn('Could not play start sound:', error);
        }
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update with final transcript, or interim if no final yet
        if (finalTranscript) {
          setTranscript(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'not-allowed') {
          setHasPermission(false);
          alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, but continuing to listen...');
          return; // Don't stop listening for no-speech errors
        }

        setIsListening(false);
        isStartingRef.current = false;
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        if (!isStartingRef.current) {
          setIsListening(false);
          try {
            playStopSound();
          } catch (error) {
            console.warn('Could not play stop sound:', error);
          }
        }
      };
    }
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current || !isSupported) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (hasPermission === false) {
      alert('Microphone access is required. Please enable microphone permissions and try again.');
      return;
    }

    if (isListening || isStartingRef.current) return;

    try {
      // Request permission again if not yet determined
      if (hasPermission === null) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
      }

      setTranscript('');
      isStartingRef.current = true;
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setHasPermission(false);
      isStartingRef.current = false;
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isSupported && isListening) {
      isStartingRef.current = false;
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: isSupported && hasPermission !== false
  };
};

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching chat history:", error);
      } else if (data && data.length > 0) {
        // FIX 1: Explicitly type the mapped array as Message[] to satisfy TypeScript's strictness.
        const loadedMessages: Message[] = data.map(msg => ({
          text: msg.content,
          sender: msg.role === 'model' ? 'ai' : 'user'
        }));
        setMessages(loadedMessages.reverse());
      } else {
        setMessages([{ text: "Hello! I am your personal AI wellness assistant. How can I help you today? 🌟", sender: 'ai' }]);
      }
      setInitialLoading(false);
    };

    fetchHistory();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAwaitingResponse]);

  const getAIResponse = async (currentMessages: Message[]) => {
    // FIX 2: Add a guard clause to ensure 'user' is not null before proceeding.
    if (!user) {
      console.error("getAIResponse was called without a user. Aborting.");
      setMessages(prev => [...prev, { text: "There was an authentication error. Please sign in again.", sender: 'ai' }]);
      setIsAwaitingResponse(false);
      return;
    }

    setIsAwaitingResponse(true);
    const maxRetries = 3;
    let delay = 2000;

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id) // This is now safe to call
      .single();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const geminiFormattedMessages: Content[] = currentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

        const systemPrompt = `You are a mental health and wellness assistant. Your role is to provide supportive and helpful conversations about personal problems, mental health, and stress. Do not answer questions about other topics, such as coding or general knowledge. If the user asks about something outside of your scope, politely decline and steer the conversation back to wellness. The user's name is ${userProfile?.display_name || 'Not provided'} and here is the other information about by profile please holt it this is very quicial information and if today is users birthday then wise the user and also see if not provided tell the personal information is not provided instead of saying that i dont have access to your personal information this is the data of the user from the datbase please follow the instructions as instructed ${userProfile}.`;

        const latestMessage = geminiFormattedMessages.pop();
        if (!latestMessage) return;

        let history = geminiFormattedMessages;
        if (history.length > 0 && history[0].role !== 'user') history = [];

        const chat = model.startChat({
          history,
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        });
        const result = await chat.sendMessage(latestMessage.parts);
        const text = (await result.response.text()).trim();

        await supabase.from('chat_messages').insert({ user_id: user.id, role: 'model', content: text });

        const finalConversation = [...currentMessages, { text, sender: 'ai' as const }];
        setMessages(finalConversation);

        setIsAwaitingResponse(false);

        updateSummaryAndRecommendations(finalConversation, user);

        return;

      } catch (error: any) {
        if (error.message && error.message.includes('503')) {
          if (attempt === maxRetries - 1) {
            setMessages(prev => [...prev, { text: "The AI is currently busy. Please try sending your message again in a few moments.", sender: 'ai' }]);
            break;
          }
          console.warn(`Model overloaded. Retrying... (Attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error("Error getting AI response:", error);
          setMessages(prev => [...prev, { text: "I'm sorry, I ran into an unexpected issue. Please try again.", sender: 'ai' }]);
          break;
        }
      }
    }
    setIsAwaitingResponse(false);
  };

  const updateSummaryAndRecommendations = async (fullConversation: Message[], currentUser: User) => {
    if (fullConversation.length < 4) return;

    const { data: summaryData, error: summaryError } = await supabase
      .from('user_ai_summaries')
      .select('prompt_count, aichat_summary, diary_summary')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (summaryError) {
      console.error("Error fetching summary data:", summaryError);
      return;
    }

    const currentPromptCount = summaryData?.prompt_count || 0;

    // Increment count first
    const newPromptCount = currentPromptCount + 1;
    await supabase.from('user_ai_summaries').upsert({
      user_id: currentUser.id,
      prompt_count: newPromptCount,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // Only update recommendations every 5 prompts
    if (newPromptCount < 5) {
      return;
    }

    try {
      const conversationText = fullConversation.map(m => `${m.sender}: ${m.text}`).join('\n');

      const oldSummary = summaryData?.aichat_summary || "This is the user's first conversation.";
      const diarySummary = summaryData?.diary_summary || 'No recent diary summary.';

      const combinedPrompt = `
        You have two tasks. First, update the chat summary based on the latest conversation. Second, using that new summary and the diary summary, generate 3 wellness recommendations.

        PREVIOUS CHAT SUMMARY: "${oldSummary}"
        LATEST CONVERSATION: "${conversationText}"
        DIARY SUMMARY: "${diarySummary}"

        Respond with the updated summary, followed by a "###---###" separator, and then the personal recommendations that is acheivable small tasks in the format **Title**: Description.
      `;
      const result = await model.generateContent(combinedPrompt);
      const responseText = await result.response.text();

      const [updatedSummary, recsText] = responseText.split('###---###');

      if (!updatedSummary || !recsText) {
        console.error("Failed to parse summary and recommendations from AI response.");
        return;
      }

      const parsedRecommendations = recsText.trim().split('\n')
        .map(rec => rec.replace(/^\d+\.\s*/, '').trim())
        .filter(rec => rec.length > 5 && !rec.toLowerCase().startsWith("here are"));

      await supabase.from('user_ai_summaries').upsert({
        user_id: currentUser.id,
        aichat_summary: updatedSummary.trim(),
        recommendations: parsedRecommendations.slice(0, 3),
        prompt_count: 0, // Reset prompt count
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    } catch (error) {
      console.error("Silent background task to update AI summary failed:", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput === '' || isAwaitingResponse) return;

    if (isListening) {
      stopListening();
    }

    const newMessages: Message[] = [...messages, { text: trimmedInput, sender: 'user' }];
    setMessages(newMessages);
    setInput('');

    if (user) {
      await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content: trimmedInput });
    }

    await getAIResponse(newMessages);
  };

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <Loader className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
            <div className="absolute inset-0 w-12 h-12 rounded-full bg-purple-200 animate-ping opacity-20 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto border border-purple-100">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Welcome Back!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">Sign in to continue your wellness journey with your personal AI assistant.</p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-t-3xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">AI Wellness Assistant</h1>
            <p className="text-purple-100">Your personal health companion</p>
          </div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white overflow-y-auto p-6">
        <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
              <div className={`flex items-end space-x-3 max-w-lg ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                    : 'bg-gradient-to-r from-green-400 to-blue-500'
                  }`}>
                  <span className="text-white text-xs font-bold">
                    {msg.sender === 'user' ? 'U' : 'AI'}
                  </span>
                </div>

                <div className={`relative px-6 py-4 rounded-2xl shadow-lg max-w-full break-words ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                  }`}>
                  <p className="leading-relaxed">{msg.text}</p>

                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => speakMessage(msg.text)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-blue-600 shadow-lg"
                      title="Listen to message"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isAwaitingResponse && <ThinkingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 p-6 rounded-b-3xl shadow-lg">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            {isListening && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <span className="text-sm font-medium">Listening...</span>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                </div>
              </div>
            )}

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message or use voice input..."
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-gray-50 hover:bg-white"
              />
              {isListening && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {isSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isAwaitingResponse}
                className={`p-4 rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:shadow-md'
                  }`}
                title={isListening ? "Stop recording (click or speak)" : "Start voice input"}
              >
                {isListening ? (
                  <div className="relative">
                    <MicOff className="w-6 h-6" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>
                  </div>
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!input.trim() || isAwaitingResponse}
              className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
