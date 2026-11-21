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
  TodoUploadImageResponseDto,
} from './dto';
import { IMAGE_UPLOAD_OPTIONS, toImageUpload } from './image-upload';
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
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @Serialize(TodoItemDto)
  async createTodo(
    @GetUser('id') userId: string,
    @Body() body: TodoCreateBodyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.storageService.upload(
        await toImageUpload(file, 'todos'),
      );
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
    description: 'Файл не передан или это не jpg/png/webp (по сигнатуре).',
  })
  @ApiResponse({ status: 413, description: 'Файл больше 5 МБ.' })
  @ApiResponse({ status: 401, description: 'Неавторизован.' })
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS)) // Перехватываем ключ 'file' из FormData
  @Serialize(TodoUploadImageResponseDto)
  async uploadTodoImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: TodoUploadImageBodyDto,
    @GetUser('id') userId: string,
  ) {
    // Владелец проверяется до загрузки, чтобы в S3 не оставались чужие файлы
    const image = await toImageUpload(file, 'todos');
    await this.service.assertTodoOwner(userId, body.todoId);
    const imageUrl = await this.storageService.upload(image);

    await this.service.updateTodoImage(userId, imageUrl, body);

    return {
      success: true,
      imageUrl,
    };
  }
}
