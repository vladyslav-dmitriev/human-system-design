import { Module } from '@nestjs/common';
import { TodoService } from './todo.service';
import { TodosController } from './todos.controller';
import { StorageModule } from '../storage';
import { TodoRepository } from './todo.repository';

@Module({
  imports: [StorageModule],
  providers: [TodoRepository, TodoService],
  controllers: [TodosController],
})
export class TodoModule {}
