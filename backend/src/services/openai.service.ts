import OpenAI from 'openai';
import config from '../config/index.js';
import { HTTPException } from 'hono/http-exception';

export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
}

export interface ActionItem {
  task: string;
  owner?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TranscriptAnalysis {
  summary: MeetingSummary;
  speakerInsights: SpeakerInsight[];
  meetingEffectiveness: number; // 1-10 score
  recommendations: string[];
}

export interface SpeakerInsight {
  name: string;
  talkTime: number; // percentage
  keyContributions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class OpenAIService {
  private static instance: OpenAIService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Generate meeting summary from transcript
   */
  async generateMeetingSummary(transcript: string, meetingTopic?: string): Promise<MeetingSummary> {
    try {
      const prompt = `
Analyze the following meeting transcript and provide a comprehensive summary in JSON format.

Meeting Topic: ${meetingTopic || 'Not specified'}

Transcript:
${transcript}

Please provide the response in the following JSON structure:
{
  "summary": "A concise 2-3 paragraph summary of the meeting",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "actionItems": [
    {
      "task": "Description of the action item",
      "owner": "Person responsible (if mentioned)",
      "deadline": "Deadline if mentioned (YYYY-MM-DD format)",
      "priority": "low|medium|high|urgent"
    }
  ],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", "topic3"]
}

Focus on:
- Main decisions made
- Action items with clear ownership
- Important deadlines
- Key discussion points
- Overall sentiment and outcomes
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert meeting analyst. Provide accurate, concise summaries and extract actionable items from meeting transcripts. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        return JSON.parse(content) as MeetingSummary;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }
    } catch (error: any) {
      console.error('OpenAI meeting summary error:', error);
      throw new HTTPException(500, { message: `Failed to generate meeting summary: ${error.message}` });
    }
  }

  /**
   * Analyze transcript for speaker insights
   */
  async analyzeSpeakerInsights(transcript: string, speakers?: any[]): Promise<SpeakerInsight[]> {
    try {
      const speakerInfo = speakers ? JSON.stringify(speakers, null, 2) : 'No speaker information provided';
      
      const prompt = `
Analyze the meeting transcript for speaker insights and participation patterns.

Speaker Information:
${speakerInfo}

Transcript:
${transcript}

Please provide speaker analysis in JSON format:
{
  "speakers": [
    {
      "name": "Speaker name",
      "talkTime": 25.5,
      "keyContributions": ["Main contribution 1", "Main contribution 2"],
      "sentiment": "positive|neutral|negative"
    }
  ]
}

Calculate:
- Talk time as percentage of total meeting
- Key contributions or insights from each speaker
- Overall sentiment of each speaker's contributions
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in meeting analysis and speaker behavior. Analyze speaker participation patterns and contributions accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);
      return result.speakers || [];
    } catch (error: any) {
      console.error('OpenAI speaker analysis error:', error);
      throw new HTTPException(500, { message: `Failed to analyze speaker insights: ${error.message}` });
    }
  }

  /**
   * Generate meeting effectiveness score and recommendations
   */
  async analyzeMeetingEffectiveness(transcript: string, duration: number): Promise<{
    score: number;
    recommendations: string[];
  }> {
    try {
      const prompt = `
Analyze this meeting transcript for effectiveness and provide recommendations.

Meeting Duration: ${duration} minutes
Transcript:
${transcript}

Evaluate the meeting on:
1. Clear agenda and objectives
2. Active participation from attendees
3. Decision-making efficiency
4. Action item clarity
5. Time management
6. Overall productivity

Provide response in JSON format:
{
  "score": 8,
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3"
  ]
}

Score should be 1-10 where:
- 1-3: Poor meeting with major issues
- 4-6: Average meeting with room for improvement
- 7-8: Good meeting with minor improvements needed
- 9-10: Excellent, highly effective meeting
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a meeting effectiveness expert. Analyze meetings objectively and provide actionable recommendations for improvement.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error('OpenAI effectiveness analysis error:', error);
      throw new HTTPException(500, { message: `Failed to analyze meeting effectiveness: ${error.message}` });
    }
  }

  /**
   * Complete transcript analysis
   */
  async analyzeTranscript(
    transcript: string,
    meetingTopic?: string,
    speakers?: any[],
    duration?: number
  ): Promise<TranscriptAnalysis> {
    try {
      // Run all analyses in parallel for better performance
      const [summary, speakerInsights, effectiveness] = await Promise.all([
        this.generateMeetingSummary(transcript, meetingTopic),
        speakers && speakers.length > 0 
          ? this.analyzeSpeakerInsights(transcript, speakers)
          : Promise.resolve([]),
        duration 
          ? this.analyzeMeetingEffectiveness(transcript, duration)
          : Promise.resolve({ score: 0, recommendations: [] }),
      ]);

      return {
        summary,
        speakerInsights,
        meetingEffectiveness: effectiveness.score,
        recommendations: effectiveness.recommendations,
      };
    } catch (error: any) {
      console.error('Complete transcript analysis error:', error);
      throw new HTTPException(500, { message: `Failed to analyze transcript: ${error.message}` });
    }
  }

  /**
   * Generate personalized meeting notes
   */
  async generatePersonalizedNotes(
    transcript: string,
    userRole: string,
    userInterests: string[]
  ): Promise<string> {
    try {
      const prompt = `
Generate personalized meeting notes for a ${userRole} based on their interests.

User Interests: ${userInterests.join(', ')}

Meeting Transcript:
${transcript}

Create focused notes highlighting:
1. Information relevant to their role and interests
2. Action items they're responsible for or should be aware of
3. Decisions that impact their area of responsibility
4. Follow-up opportunities
5. Key insights for their specific role

Format as clear, organized notes with bullet points and sections.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert meeting note-taker who creates personalized, relevant summaries based on the user\'s role and interests.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.4,
      });

      return response.choices[0]?.message?.content || 'Failed to generate personalized notes';
    } catch (error: any) {
      console.error('OpenAI personalized notes error:', error);
      throw new HTTPException(500, { message: `Failed to generate personalized notes: ${error.message}` });
    }
  }

  /**
   * Extract specific information from transcript
   */
  async extractInformation(transcript: string, query: string): Promise<string> {
    try {
      const prompt = `
Based on the following meeting transcript, answer this specific query: "${query}"

Transcript:
${transcript}

Provide a clear, concise answer based on the information in the transcript. If the information is not available in the transcript, clearly state that.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts specific information from meeting transcripts accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || 'Unable to extract the requested information';
    } catch (error: any) {
      console.error('OpenAI information extraction error:', error);
      throw new HTTPException(500, { message: `Failed to extract information: ${error.message}` });
    }
  }
}