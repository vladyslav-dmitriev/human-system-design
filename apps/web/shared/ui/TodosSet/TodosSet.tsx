import { useLayoutEffect, useState } from "react";

import { ls } from "@/shared/lib/ls";
import type { Todo } from "@/shared/types/todo";

import { TodosList } from "@/shared/ui/TodosList";
import { TodosHead } from "@/shared/ui/TodosHead";

type TodosSetProps = {
  title: string;
  todoKey: string;
  defaultTodos: Todo[];
};

export const TodosSet = ({ title, todoKey, defaultTodos }: TodosSetProps) => {
  const storagedTodos = ls.get(todoKey);

  const [todos, setTodos] = useState<Todo[]>(storagedTodos ?? defaultTodos);

  useLayoutEffect(() => {
    ls.set(todoKey, JSON.stringify(todos));
  }, [todos]);

  return (
    <div className="p-4 rounded-lg border border-lightgray-600 inline-block min-w-3xs">
      <TodosHead title={title} todos={todos} />
      <TodosList todos={todos} setTodos={setTodos} />
    </div>
  );
};
