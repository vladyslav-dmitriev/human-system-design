import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { Todo } from "@/shared/types/todo";

type TodosListProps = {
  todos: Todo[];
  setTodos(): void;
};

export const TodosList = ({ todos, setTodos }: TodosListProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (index: number) => {
    const nextTodos = [...todos];

    if (draggedIndex === null) return;

    const [removed] = nextTodos.splice(draggedIndex, 1);

    if (!removed) return;

    nextTodos.splice(index, 0, removed);

    setTodos(nextTodos);
    setDraggedIndex(null);
  };

  const makeHandleCheckedChange = (todoId: number) => (isChecked: boolean) => {
    const nextTodos = todos.map((todo) => {
      return todo.id === todoId ? { ...todo, checked: isChecked } : todo;
    });

    setTodos(nextTodos);
  };

  return (
    <div>
      {todos.map((todo, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => {
            handleDragStart(index);
          }}
          onDragOver={handleDragOver}
          onDrop={() => {
            handleDrop(index);
          }}
        >
          <div className="flex items-center gap-2 py-1">
            <Checkbox
              id={todo.id}
              defaultChecked={todo.checked}
              disabled={todo.checked}
              onCheckedChange={makeHandleCheckedChange(todo.id)}
            />
            <Label htmlFor={todo.id}>{todo.title}</Label>
          </div>
        </div>
      ))}
    </div>
  );
};
