import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import { AiCacheService } from './services/ai-cache.service';
import { AiUsageService } from './services/ai-usage.service';
import { GeminiService } from './services/gemini.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { ConversationService } from './services/conversation.service';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { GenerateDto } from './dto/generate.dto';
import { buildSummarizePrompt } from './prompts/summarize.prompt';
import { buildTranslatePrompt } from './prompts/translate.prompt';
import { buildAnalyzePrompt } from './prompts/analyze.prompt';
import {
  validateAnalyzeResponse,
  validateTranslateResponse,
} from './utils/validate-ai-response';

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

@Controller('ai')
@UseGuards(AiRateLimitGuard)
export class AiController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly geminiService: GeminiService,
    private readonly cacheService: AiCacheService,
    private readonly usageService: AiUsageService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('articles/:articleId/summarize')
  @HttpCode(200)
  async summarize(
    @Param('articleId') articleId: string,
    @Body() dto: SummarizeArticleDto,
  ) {
    const article = await this.articleService.findOne(articleId);
    const maxLength = dto.maxLength ?? 'medium';

    const cacheKey = this.cacheService.buildKey(
      'summarize',
      articleId,
      maxLength,
      String(article.updatedAt),
    );

    const cached = this.cacheService.get<{
      articleId: string;
      summary: string;
      originalLength: number;
      summaryLength: number;
    }>(cacheKey);

    if (cached) {
      this.usageService.trackCache(true);
      return cached;
    }
    this.usageService.trackCache(false);

    const prompt = buildSummarizePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const t0 = Date.now();
    const { text, totalTokens } = await this.geminiService.generate(prompt);
    this.usageService.trackLatency('summarize', Date.now() - t0);
    this.usageService.track('summarize', totalTokens);

    const summary = text.trim();
    const result = {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };

    this.cacheService.set(cacheKey, result);
    return result;
  }

  @Post('articles/:articleId/translate')
  @HttpCode(200)
  async translate(
    @Param('articleId') articleId: string,
    @Body() dto: TranslateArticleDto,
  ) {
    const article = await this.articleService.findOne(articleId);

    const cacheKey = this.cacheService.buildKey(
      'translate',
      articleId,
      dto.targetLanguage,
      dto.sourceLanguage ?? 'auto',
      String(article.updatedAt),
    );

    const cached = this.cacheService.get<{
      articleId: string;
      translatedText: string;
      detectedLanguage: string;
    }>(cacheKey);

    if (cached) {
      this.usageService.trackCache(true);
      return cached;
    }
    this.usageService.trackCache(false);

    const prompt = buildTranslatePrompt(
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const t0 = Date.now();
    const { text, totalTokens } = await this.geminiService.generate(prompt);
    this.usageService.trackLatency('translate', Date.now() - t0);
    this.usageService.track('translate', totalTokens);

    let translatedText = text.trim();
    let detectedLanguage = dto.sourceLanguage ?? 'unknown';

    try {
      const validated = validateTranslateResponse(
        JSON.parse(extractJson(text)),
      );
      if (validated) {
        translatedText = validated.translatedText;
        detectedLanguage = validated.detectedLanguage;
      }
    } catch {
      // Gemini returned plain text instead of JSON
    }

    const result = { articleId, translatedText, detectedLanguage };
    this.cacheService.set(cacheKey, result);
    return result;
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(200)
  async analyze(
    @Param('articleId') articleId: string,
    @Body() dto: AnalyzeArticleDto,
  ) {
    const article = await this.articleService.findOne(articleId);
    const task = dto.task ?? 'review';

    const prompt = buildAnalyzePrompt(article.title, article.content, task);
    const t0 = Date.now();
    const { text, totalTokens } = await this.geminiService.generate(prompt);
    this.usageService.trackLatency('analyze', Date.now() - t0);
    this.usageService.track('analyze', totalTokens);

    let analysis = text.trim();
    let suggestions: string[] = [];
    let severity: 'info' | 'warning' | 'error' = 'info';

    try {
      const validated = validateAnalyzeResponse(JSON.parse(extractJson(text)));
      if (validated) {
        analysis = validated.analysis;
        suggestions = validated.suggestions;
        severity = validated.severity;
      }
    } catch {
      // Gemini returned plain text instead of JSON
    }

    return { articleId, analysis, suggestions, severity };
  }

  @Post('generate')
  @HttpCode(200)
  async generate(@Body() dto: GenerateDto) {
    const sessionId =
      dto.sessionId ?? this.conversationService.createSessionId();
    const history = this.conversationService.getHistory(sessionId);

    const t0 = Date.now();
    const { text, totalTokens } = await this.geminiService.generateWithHistory(
      history,
      dto.prompt,
    );
    this.usageService.trackLatency('generate', Date.now() - t0);
    this.usageService.track('generate', totalTokens);

    const reply = text.trim();
    this.conversationService.addMessages(sessionId, dto.prompt, reply);

    return { sessionId, text: reply };
  }

  @Get('usage')
  getUsage() {
    return this.usageService.getStats();
  }
}
