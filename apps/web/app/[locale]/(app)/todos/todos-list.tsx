import { TodoItem } from "./todo-item";
import { Todo } from "./types";

interface TodosListPageProps {
  todos: Todo[];
  makeHandleEditTodo(id: string): (completed: boolean) => void;
  makeHandleRemoveTodo: (id: string) => () => void;
}

export function TodosList({
  todos,
  makeHandleEditTodo,
  makeHandleRemoveTodo,
}: TodosListPageProps) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl">
        Задач пока нет. Создайте первую!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onEdit={makeHandleEditTodo(todo.id)}
          onRemove={makeHandleRemoveTodo(todo.id)}
        />
      ))}
    </div>
  );
}
