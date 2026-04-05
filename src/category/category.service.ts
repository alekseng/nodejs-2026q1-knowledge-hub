import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Category } from './category.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ArticleService } from '../article/article.service';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}
  private categories: Category[] = [];

  findAll() {
    return this.categories;
  }

  findOne(id: string) {
    const category = this.categories.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  create(createCategoryDto: CreateCategoryDto) {
    const newCategory: Category = {
      id: randomUUID(),
      ...createCategoryDto,
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = this.findOne(id);
    if (updateCategoryDto.name) category.name = updateCategoryDto.name;
    if (updateCategoryDto.description)
      category.description = updateCategoryDto.description;
    return category;
  }

  remove(id: string) {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    this.categories.splice(index, 1);
    this.articleService.clearCategoryId(id);
  }
}
