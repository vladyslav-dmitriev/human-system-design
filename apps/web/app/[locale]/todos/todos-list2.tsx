import { SquareCheckIcon, CheckIcon, TrashIcon } from "lucide-react";

import { editTodo, deleteTodo } from "@/actions/todo";
import type { Todo } from "./types";
import { cn } from "@/shared/lib/utils";

type TodosListProps = {
  todos: Todo[];
  fetchTodos: () => Promise<void>;
};

export const TodosList = ({ todos, fetchTodos }: TodosListProps) => {
  const makeHandleEditTodo = (id: string) => async () => {
    await editTodo(id, true);
    fetchTodos();
  };

  const makeHandleRemoveTodo = (id: string) => async () => {
    await deleteTodo(id);
    fetchTodos();
  };

  if (!todos.length) {
    return <div>Todos list is empty</div>;
  }

  return (
    <div className="px-2">
      {todos.map((todo) => (
        <div key={todo.id} className="flex justify-start items-center w-70">
          <div className="flex flex-1 items-center">
            {todo.completed ? (
              <CheckIcon size="18" className="text-gray-500" />
            ) : (
              <SquareCheckIcon
                size="18"
                className="text-gray-500 hover:text-gray-700"
                onClick={makeHandleEditTodo(todo.id)}
              />
            )}

            <div
              className={cn(
                "flex-1 ml-1 mr-2",
                todo.completed && "line-through text-muted-foreground",
              )}
            >
              {todo.title}
            </div>
          </div>

          <TrashIcon
            onClick={makeHandleRemoveTodo(todo.id)}
            size="16"
            className="text-gray-500 hover:text-gray-700"
          />
        </div>
      ))}
    </div>
  );
};
