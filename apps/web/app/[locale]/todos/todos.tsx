"use client";

import { useEffect, useState } from "react";
import { TodosList } from "./todos-list";
import type { Todo } from "./types";
import { TodoSort } from "./todo-sort";
import { CreateTodoForm } from "./create-todo-form";
import { API_URL } from "@/api";

export const Todos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sort, setSort] = useState({
    sortBy: "createdAt",
    sortOrder: "desc",
  } as const);

  const fetchTodos = async () => {
    try {
      const response = await fetch(
        API_URL.todos.list(sort.sortBy, sort.sortOrder),
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      setTodos(data.items);
    } catch (error) {
      console.error(error);
    }
  };

  const makeHandleEditTodo = (todoId: string) => async () => {
    try {
      await fetch(API_URL.todos.edit(todoId), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ todoId, completed: true }),
      });

      await fetchTodos();
    } catch (error) {
      console.error(error);
    }
  };

  const makeHandleRemoveTodo = (todoId: string) => async () => {
    try {
      await fetch(API_URL.todos.delete(todoId), {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      await fetchTodos();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort.sortBy, sort.sortOrder]);

  return (
    <div className="px-4">
      {/* <CreateTodo fetchTodos={fetchTodos} /> */}

      <CreateTodoForm />

      <div className="pt-4 pb-2">
        <TodoSort value={sort} onChange={setSort} />
      </div>

      <TodosList
        todos={todos}
        makeHandleEditTodo={makeHandleEditTodo}
        makeHandleRemoveTodo={makeHandleRemoveTodo}
      />
    </div>
  );
};
