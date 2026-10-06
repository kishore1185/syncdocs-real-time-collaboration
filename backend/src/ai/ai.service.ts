import { Injectable, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiRequestDto, Role } from './dto/ai-request.dto';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async chat(dto: AiRequestDto) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const model = this.configService.get<string>('GROQ_MODEL', 'openai/gpt-oss-120b');

    if (!apiKey) {
      throw new InternalServerErrorException('AI assistance is not properly configured on the server.');
    }

    try {
      const messages = [...dto.messages];
      
      // If there's context, inject it into the system message or as a new system message
      if (dto.context) {
        const systemMessageIndex = messages.findIndex(m => m.role === Role.SYSTEM);
        const contextStr = `\n\nDocument Context:\n${dto.context}`;
        
        if (systemMessageIndex !== -1) {
          messages[systemMessageIndex].content += contextStr;
        } else {
          messages.unshift({ role: Role.SYSTEM, content: `You are a helpful AI assistant inside a real-time collaborative document editor (SyncDocs).${contextStr}` });
        }
      } else {
        const systemMessageIndex = messages.findIndex(m => m.role === Role.SYSTEM);
        if (systemMessageIndex === -1) {
          messages.unshift({ role: Role.SYSTEM, content: 'You are a helpful AI assistant inside a real-time collaborative document editor (SyncDocs).' });
        }
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Groq API Error:', response.status, errorData);
        if (response.status === 429) {
          throw new HttpException('AI service rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
        }
        throw new InternalServerErrorException('Failed to communicate with AI service.');
      }

      const data = await response.json() as any;
      const assistantMessage = data.choices?.[0]?.message?.content;

      if (!assistantMessage) {
        throw new InternalServerErrorException('Invalid response from AI service.');
      }

      return { result: assistantMessage };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('AI Service Error:', error);
      throw new InternalServerErrorException('An unexpected error occurred while communicating with the AI service.');
    }
  }
}
