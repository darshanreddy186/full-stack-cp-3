import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Sparkles, Brain, Heart, TrendingUp, RefreshCw } from 'lucide-react';

// This is your Google Gemini API key.
// IMPORTANT: This key will be exposed to the public in your final website code.
import { GoogleGenerativeAI } from "@google/generative-ai";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY1; 


export function PersonalizedRecommendations() {
  // CORRECT: Call hooks at the top level of the component function.
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // This effect runs once on component load to get the user's saved recommendations.
  useEffect(() => {
    const fetchInitialRecommendations = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_ai_summaries')
        .select('recommendations')
        .eq('user_id', user.id)
        .single();
      
      if (data?.recommendations && (data.recommendations as string[]).length > 0) {
        setRecommendations(data.recommendations as string[]);
      } else {
        // Provide generic default recommendations for new users or those without data.
        setRecommendations([
          "**Get Started**: Write in your diary or chat with the AI to receive your first personalized recommendations!",
          "**Mindful Moment**: Take five deep breaths, focusing only on the sensation of breathing.",
          "**Quick Stretch**: Stand up and reach for the sky to energize your body."
        ]);
      }
      
      setIsLoading(false);
    };

    fetchInitialRecommendations();
  }, [user]);

  // This is the main function that handles the entire refresh logic.
  const handleRefresh = async () => {
    // The 'user' object is now correctly accessed from the component's state.
    if (!user || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // 1. Fetch the latest summaries for the user from the database.
      const { data: summaryData, error: summaryError } = await supabase
        .from('user_ai_summaries')
        .select('diary_summary, aichat_summary')
        .eq('user_id', user.id)
        .single();

      if (summaryError || !summaryData) {
        throw new Error(summaryError?.message || "Could not fetch summaries to generate new recommendations.");
      }

      // 2. Initialize Gemini AI client and construct the prompt.
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Based on the user's latest diary and chat summaries, generate exactly 3 short, actionable wellness recommendations.

        Diary Summary: "${summaryData.diary_summary || 'No recent diary summary.'}"
        Chat Summary: "${summaryData.aichat_summary || 'No recent chat summary.'}"

        Instructions:
        - Each recommendation MUST follow the format: **Title**: Description.
        - The title MUST be bolded with double asterisks.
        - The description should be a single, encouraging sentence.
        - Dont use the existing recommendations.
        - Focus on mental wellness, emotional health, or personal growth.
        - Avoid generic advice; make it specific and actionable.
        - Ensure the tone is positive, supportive, and empowering.
      `;

      // 3. Call the Gemini API to get new recommendations.
      const result = await model.generateContent(prompt);
      const recsText = await result.response.text();
      
      // 4. Parse the response from the AI.
      // This splits the text by new lines and filters out any empty lines.
      const newRecommendations = recsText.split('\n').filter(rec => rec.trim().length > 5);

      if (newRecommendations.length === 0) {
        throw new Error("The AI did not return any recommendations.");
      }

      // 5. Update the database with the new recommendations.
      const { error: updateError } = await supabase
        .from('user_ai_summaries')
        .update({ 
          recommendations: newRecommendations,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }

      // 6. Update the component's state to show the new recommendations on the screen.
      setRecommendations(newRecommendations);

    } catch (error) {
      console.error("An unexpected error occurred during refresh:", error);
      alert("An error occurred while getting new recommendations. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderText = (text: string) => {
    if (!text) return '';
    return text.split('**').map((part, index) =>
      index % 2 === 0 ? part : <strong key={index} className="font-bold text-gray-900">{part}</strong>
    );
  };

  const getRecommendationDetails = (rec: string) => {
    const lowerRec = rec.toLowerCase();
    if (lowerRec.includes("mindful") || lowerRec.includes("meditation") || lowerRec.includes("breath")) {
        return { icon: <Brain className="w-6 h-6" />, category: "Mental Wellness", color: "from-purple-500 to-pink-500" };
    }
    if (lowerRec.includes("gratitude") || lowerRec.includes("connect") || lowerRec.includes("friend")) {
        return { icon: <Heart className="w-6 h-6" />, category: "Emotional Health", color: "from-rose-500 to-orange-500" };
    }
    return { icon: <TrendingUp className="w-6 h-6" />, category: "Growth", color: "from-green-500 to-teal-500" };
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-500" />Personalized for You</h2>
            {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl shadow-lg animate-pulse">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-500" />Personalized for You</h2>
        <div className="flex items-center gap-4">
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 rounded-full hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors" title="Get new recommendations">
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm rounded-full font-medium">AI Powered</span>
        </div>
      </div>
      <div className="grid gap-4">
        {recommendations.map((rec, index) => {
            const { icon, category, color } = getRecommendationDetails(rec);
            const titleMatch = rec.match(/\*\*(.*?)\*\:/);
            const title = titleMatch ? `**${titleMatch[1]}**` : ``;
            const description = titleMatch ? rec.substring(titleMatch[0].length).trim() : rec;

            return (
              <div key={index} className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${color}`}></div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white shadow-lg`}>{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{renderText(title)}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{category}</span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{renderText(description)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}