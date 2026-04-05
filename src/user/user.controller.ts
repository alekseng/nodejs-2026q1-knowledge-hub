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
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'All user records' })
  findAll(@Query() pagination?: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single user by id' })
  @ApiResponse({ status: 200, description: 'The record found' })
  @ApiBadRequestResponse({ description: 'UserId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.userService.findOneResponse(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'Newly created record' })
  @ApiBadRequestResponse({
    description: 'Request body does not contain required fields',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Update user's password" })
  @ApiResponse({ status: 200, description: 'Updated record' })
  @ApiBadRequestResponse({ description: 'UserId is invalid (not uuid)' })
  @ApiForbiddenResponse({ description: 'Old password is wrong' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  updatePassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(id, updatePasswordDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiNoContentResponse({ description: 'The record is found and deleted' })
  @ApiBadRequestResponse({ description: 'UserId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.userService.remove(id);
  }
}
