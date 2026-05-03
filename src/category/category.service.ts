import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Category } from './category.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Category> | Category[]> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      order = 'ASC',
    } = pagination || {};

    const total = await this.prisma.category.count();

    if (pagination?.page || pagination?.limit) {
      const categories = await this.prisma.category.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order.toLowerCase() as 'asc' | 'desc',
        },
      });

      return {
        total,
        page,
        limit,
        data: categories as Category[],
      };
    }

    const categories = await this.prisma.category.findMany();
    return categories as Category[];
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundError(`Category with id ${id} not found`);
    }
    return category as Category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const newCategory = await this.prisma.category.create({
      data: createCategoryDto,
    });
    return newCategory as Category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
      return updatedCategory as Category;
    } catch (error) {
      throw new NotFoundError(`Category with id ${id} not found`);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError(`Category with id ${id} not found`);
    }
  }
}
