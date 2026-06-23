import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { TodoCreateBodyDto } from './dto/request/body/todo-create.body.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiCookieAuth,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TodoGetListQueryDto } from './dto/request/query/todo-get-list.query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage';
import {
  TodoDeleteParamsDto,
  TodoUpdateBodyDto,
  TodoUpdateParamsDto,
  TodoUploadImageBodyDto,
  TodoGetListResponseDto,
  TodoItemDto,
} from './dto';
import { Serialize } from 'interceptors';

@ApiTags('Todos')
@ApiCookieAuth()
@Controller('todos')
@UseGuards(AuthGuard, RolesGuard)
export class TodosController {
  constructor(
    @Inject(TodoService) private readonly service: TodoService,
    @Inject(StorageService) private readonly storageService: StorageService,
  ) {}

  @Get()
  @Serialize(TodoGetListResponseDto)
  getUserTodos(
    @GetUser('id') userId: string,
    @Query() query: TodoGetListQueryDto,
  ) {
    return this.service.getUserTodos(userId, query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @Serialize(TodoItemDto)
  async createTodo(
    @GetUser('id') userId: string,
    @Body() body: TodoCreateBodyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        throw new BadRequestException(
          'Разрешены только изображения (jpg, png, webp)',
        );
      }

      // @ts-ignore
      imageUrl = await this.storageService.upload({
        // @ts-ignore
        file,
        folder: 'todos',
      });
    }

    return this.service.createTodo(userId, body, imageUrl);
  }

  @Patch(':todoId')
  @Serialize(TodoItemDto)
  updateTodo(
    @GetUser('id') userId: string,
    @Param() params: TodoUpdateParamsDto,
    @Body() body: TodoUpdateBodyDto,
  ) {
    return this.service.updateTodo(userId, params, body);
  }

  @Delete(':todoId')
  @Roles('ADMIN')
  @Serialize(TodoItemDto)
  deleteTodo(
    @GetUser('id') userId: string,
    @Param() params: TodoDeleteParamsDto,
  ) {
    return this.service.deleteTodo(userId, params);
  }

  @ApiConsumes('multipart/form-data') // Указываем Swagger, что принимаем файлы
  @ApiBody({
    description: 'Файл изображения и ID задачи',
    schema: {
      type: 'object',
      properties: {
        todoId: { type: 'string', description: 'ID задачи (uuid/cuid)' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл изображения (png, jpg, webp)',
        },
      },
      required: ['todoId', 'file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Изображение успешно загружено и привязано.',
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный формат файла или превышен размер.',
  })
  @ApiResponse({ status: 401, description: 'Неавторизован.' })
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file')) // Перехватываем ключ 'file' из FormData
  async uploadTodoImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: TodoUploadImageBodyDto,
    @GetUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не был передан');
    }

    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      throw new BadRequestException(
        'Разрешены только изображения формата jpg, png и webp',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Файл слишком большой. Максимальный размер — 5 МБ',
      );
    }

    const imageUrl = await this.storageService.upload({
      file,
      folder: 'todos',
    });

    await this.service.updateTodoImage(userId, imageUrl, body);

    return {
      success: true,
      imageUrl,
    };
  }
}
