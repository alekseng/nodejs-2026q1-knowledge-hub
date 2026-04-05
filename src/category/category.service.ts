import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { ArticleService } from '../article/article.service';
import { Category } from './category.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}
  private categories: Category[] = [];

  findAll(pagination?: PaginationDto): PaginatedResult<Category> | Category[] {
    const result = [...this.categories];

    if (pagination?.page || pagination?.limit) {
      const {
        page = 1,
        limit = 10,
        sortBy = 'name',
        order = 'ASC',
      } = pagination;

      if (sortBy) {
        result.sort((a, b) => {
          const valA = a[sortBy as keyof Category];
          const valB = b[sortBy as keyof Category];
          if (valA < valB) return order === 'ASC' ? -1 : 1;
          if (valA > valB) return order === 'ASC' ? 1 : -1;
          return 0;
        });
      }

      const total = result.length;
      const startIndex = (page - 1) * limit;
      const data = result.slice(startIndex, startIndex + limit);

      return {
        total,
        page,
        limit,
        data,
      };
    }

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
