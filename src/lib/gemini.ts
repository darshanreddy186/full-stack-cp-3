interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
  }[]
}

export class GeminiAI {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      return 'Please add your Gemini API key to the .env file to enable AI responses.'
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Gemini API Error:', response.status, errorText)
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data: GeminiResponse = await response.json()
      return data.candidates[0]?.content?.parts[0]?.text || 'Sorry, I could not generate a response.'
    } catch (error) {
      console.error('Gemini AI Error:', error)
      if (error instanceof Error && error.message.includes('API error')) {
        return 'I\'m having trouble connecting to the AI service. Please check your API key and try again.'
      }
      return 'I apologize, but I\'m having trouble connecting right now. Please try again later.'
    }
  }

  async analyzeDiaryEntries(entries: string[], userQuery: string): Promise<string> {
    const context = entries.slice(-10).join('\n\n---\n\n') // Last 10 entries for context
    
    const prompt = `You are a compassionate mental health support AI for young people. Based on the following diary entries from a user, please provide a personalized, supportive response to their query.

Previous diary entries:
${context}

User's current query: ${userQuery}

Please provide:
1. A warm, empathetic response acknowledging their feelings
2. Insights based on patterns you notice in their diary entries
3. Gentle, actionable suggestions for their wellbeing
4. Encouragement and hope

Keep your response supportive, non-judgmental, and age-appropriate for youth (13-24). If you detect serious mental health concerns, encourage them to speak with a trusted adult or mental health professional.`

    return this.generateResponse(prompt)
  }

  async generateDiarySummary(entries: string[]): Promise<string> {
    const context = entries.join('\n\n---\n\n')
    
    const prompt = `As a supportive mental health AI, please analyze these diary entries from a young person and provide a caring summary.

Diary entries:
${context}

Please provide:
1. A compassionate overview of their emotional journey
2. Positive patterns and growth you notice
3. Areas that might need attention or support
4. Encouraging words about their self-reflection practice

Keep the tone warm, hopeful, and age-appropriate for youth.`

    return this.generateResponse(prompt)
  }

  async generateRecommendations(userProfile: any, recentEntries: string[]): Promise<string[]> {
    const context = recentEntries.slice(-5).join('\n\n---\n\n')
    
    const prompt = `Based on this user's recent diary entries and profile, suggest 3-5 personalized wellness activities:

Recent entries: ${context}
Age range: ${userProfile.age_range || 'Not specified'}
Preferred activities: ${userProfile.preferred_activities?.join(', ') || 'None specified'}
Wellness goals: ${userProfile.wellness_goals?.join(', ') || 'None specified'}

Provide brief, actionable recommendations suitable for youth, formatted as a simple list.`

    const response = await this.generateResponse(prompt)
    return response.split('\n').filter(line => line.trim().length > 0).slice(0, 5)
  }
}

export const geminiAI = new GeminiAI(import.meta.env.VITE_GEMINI_API_KEY2 || '')