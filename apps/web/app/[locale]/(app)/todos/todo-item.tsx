"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckIcon, SquareCheckIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  imageUrl?: string | null; // Ссылка из базы данных Neon (AWS S3)
}

interface TodoItemProps {
  todo: Todo;
  canDelete: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

export function TodoItem({
  todo,
  canDelete,
  onEdit,
  onRemove,
}: TodoItemProps) {
  const t = useTranslations();
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md bg-card border-muted-foreground/10">
      <CardContent className="p-0">
        {/* БЛОК ИЗОБРАЖЕНИЯ (Отображается, только если imageUrl существует) */}
        {todo.imageUrl && (
          <div className="relative w-full aspect-video bg-muted border-b overflow-hidden group">
            {/* Скелетон пока картинка грузится из S3 */}
            {imageLoading && (
              <Skeleton className="absolute inset-0 w-full h-full animate-pulse" />
            )}

            {/* Картинка из S3: для next/image нужен remotePatterns на бакет */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={todo.imageUrl}
              alt={todo.title}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)} // Убираем скелетон, если картинка упала
            />
          </div>
        )}

        {/* Если картинки нет, можно показать аккуратную микро-заглушку в интерфейсе (опционально) */}
        {!todo.imageUrl && (
          <div className="h-1 bg-gradient-to-r from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
        )}

        {/* ТЕКСТОВАЯ ЧАСТЬ И СТАТУС */}
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0 p-4">
          <div className="flex items-center gap-2 min-w-0">
            {todo.completed ? (
              <CheckIcon
                size="18"
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={t("todo_complete", { title: todo.title })}
                onClick={() => onEdit()}
              >
                <SquareCheckIcon size="18" aria-hidden="true" />
              </Button>
            )}

            <span
              className={`text-sm font-medium leading-snug break-words min-w-0 ${
                todo.completed
                  ? "line-through text-muted-foreground opacity-70"
                  : "text-foreground"
              }`}
            >
              {todo.title}
            </span>
          </div>

          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("todo_delete", { title: todo.title })}
              onClick={onRemove}
            >
              <TrashIcon size="16" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
