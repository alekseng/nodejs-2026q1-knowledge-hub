import { Injectable } from '@nestjs/common';
import { Article } from './article.interface';

@Injectable()
export class ArticleService {
  private articles: Article[] = [];
}
