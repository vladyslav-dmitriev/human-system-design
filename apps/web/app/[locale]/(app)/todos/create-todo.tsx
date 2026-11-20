import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/api";

type CreateTodoProps = {
  fetchTodos: () => Promise<void>;
};

export const CreateTodo = ({ fetchTodos }: CreateTodoProps) => {
  const [text, setText] = useState<string>("");

  const t = useTranslations();

  const handleChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleCreateTodo = async () => {
    if (!text) return;

    try {
      await fetch(API_URL.todos.create(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      setText("");
      fetchTodos();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex space-x-2 mb-2">
      <Input
        type="text"
        name="title"
        placeholder={t("whatToDo")}
        required
        onChange={handleChangeInput}
      />
      <Button onClick={handleCreateTodo}>{t("add")}</Button>
    </div>
  );
};
