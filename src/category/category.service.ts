import { Injectable } from '@nestjs/common';
import { Category } from './category.interface';

@Injectable()
export class CategoryService {
  private categories: Category[] = [];
}
