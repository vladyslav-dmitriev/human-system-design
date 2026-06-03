import { Badge } from "@/components/ui/badge";

import { cn } from "@/shared/lib/utils";
import { TypographyP } from "@/shared/ui/Typography";
import type { Todo } from "@/shared/types/todo";

type TodosHeadProps = {
  title: string;
  todos: Todo[];
};

export const TodosHead = ({ title, todos }: TodosHeadProps) => {
  const isEveryItemChecked = todos.every((todo) => Boolean(todo.checked));

  return (
    <div className="pb-2">
      <div className="flex gap-2 mb-1">
        <TypographyP className="text-gray-600 font-bold">{title}</TypographyP>

        <Badge
          variant="secondary"
          className={cn(
            "text-white",
            { "bg-blue-500": !isEveryItemChecked },
            { "bg-green-500": isEveryItemChecked },
          )}
        >
          {isEveryItemChecked ? "Done" : "Progress"}
        </Badge>
      </div>
    </div>
  );
};
