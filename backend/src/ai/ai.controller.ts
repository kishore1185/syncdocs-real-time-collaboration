import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiRequestDto } from './dto/ai-request.dto';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(200)
  chat(@CurrentUser() user: AuthUser, @Body() dto: AiRequestDto) {
    return this.aiService.chat(dto);
  }
}
