import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'All category records' })
  findAll(@Query() pagination?: PaginationDto) {
    return this.categoryService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single category by id' })
  @ApiResponse({ status: 200, description: 'The record found' })
  @ApiBadRequestResponse({ description: 'CategoryId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Create new category' })
  @ApiResponse({ status: 201, description: 'Newly created record' })
  @ApiBadRequestResponse({
    description: 'Request body does not contain required fields',
  })
  @ApiForbiddenResponse({ description: 'Only admins can manage categories' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Update category info' })
  @ApiResponse({ status: 200, description: 'Updated record' })
  @ApiBadRequestResponse({ description: 'CategoryId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  @ApiForbiddenResponse({ description: 'Only admins can manage categories' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiNoContentResponse({ description: 'The record is found and deleted' })
  @ApiBadRequestResponse({ description: 'CategoryId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  @ApiForbiddenResponse({ description: 'Only admins can manage categories' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoryService.remove(id);
  }
}
