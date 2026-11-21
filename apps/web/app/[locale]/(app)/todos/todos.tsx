"use client";

import { apiFetch } from "@/shared/lib/api-client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { API_URL } from "@/api";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { TodosList } from "./todos-list";
import type { Todo } from "./types";
import { TodoSort, type SortOption } from "./todo-sort";
import { CreateTodoForm } from "./create-todo-form";

export const Todos = () => {
  const t = useTranslations();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [todos, setTodos] = useState<Todo[]>([]);
  const [sort, setSort] = useState<SortOption>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const notifyError = useCallback(
    async (response: Response, fallbackKey: string) => {
      const code = await getApiErrorCode(response);
      toast.error(t(fallbackKey), { description: t(apiErrorKey(code)) });
    },
    [t],
  );

  const fetchTodos = useCallback(async () => {
    try {
      const response = await apiFetch(
        API_URL.todos.list(sort.sortBy, sort.sortOrder),
        { method: "GET", credentials: "include" },
      );

      if (!response.ok) {
        setIsLoadFailed(true);
        return;
      }

      const data = await response.json();

      setTodos(Array.isArray(data.items) ? data.items : []);
      setIsLoadFailed(false);
    } catch (error) {
      console.error(error);
      setIsLoadFailed(true);
    }
  }, [sort.sortBy, sort.sortOrder]);

  const makeHandleEditTodo = (todoId: string) => async () => {
    try {
      const response = await apiFetch(API_URL.todos.edit(todoId), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        await notifyError(response, "todo_update_failed");
        return;
      }

      await fetchTodos();
    } catch (error) {
      console.error(error);
      toast.error(t("todo_update_failed"));
    }
  };

  const makeHandleRemoveTodo = (todoId: string) => () => {
    setPendingDeleteId(todoId);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    setIsDeleting(true);

    try {
      const response = await apiFetch(API_URL.todos.delete(pendingDeleteId), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        await notifyError(response, "todo_delete_failed");
        return;
      }

      toast.success(t("todo_deleted"));
      await fetchTodos();
    } catch (error) {
      console.error(error);
      toast.error(t("todo_delete_failed"));
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- загрузка данных при монтировании и смене сортировки
    void fetchTodos();
  }, [fetchTodos]);

  return (
    <div className="px-4">
      <CreateTodoForm onTodoCreated={fetchTodos} />

      <div className="pt-4 pb-2">
        <TodoSort value={sort} onChange={setSort} />
      </div>

      {isLoadFailed && (
        <p role="alert" className="py-2 text-sm text-destructive">
          {t("todo_load_failed")}
        </p>
      )}

      <TodosList
        todos={todos}
        canDelete={isAdmin}
        makeHandleEditTodo={makeHandleEditTodo}
        makeHandleRemoveTodo={makeHandleRemoveTodo}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDeleteId(null);
        }}
        title={t("todo_delete_confirm_title")}
        description={t("todo_delete_confirm_description")}
        confirmLabel={t("todo_delete_confirm_button")}
        destructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
