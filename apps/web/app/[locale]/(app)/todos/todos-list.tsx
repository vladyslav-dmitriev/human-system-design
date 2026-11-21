"use client";

import { useTranslations } from "next-intl";

import { TodoItem } from "./todo-item";
import { Todo } from "./types";

interface TodosListPageProps {
  todos: Todo[];
  canDelete: boolean;
  makeHandleEditTodo(id: string): () => void;
  makeHandleRemoveTodo: (id: string) => () => void;
}

export function TodosList({
  todos,
  canDelete,
  makeHandleEditTodo,
  makeHandleRemoveTodo,
}: TodosListPageProps) {
  const t = useTranslations();

  if (todos.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl">
        {t("todos_empty")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          canDelete={canDelete}
          onEdit={makeHandleEditTodo(todo.id)}
          onRemove={makeHandleRemoveTodo(todo.id)}
        />
      ))}
    </div>
  );
}
