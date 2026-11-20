"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckIcon, SquareCheckIcon, TrashIcon } from "lucide-react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  imageUrl?: string | null; // Ссылка из базы данных Neon (AWS S3)
}

interface TodoItemProps {
  todo: Todo;
  onEdit: (completed: boolean) => void;
  onRemove: () => void;
}

export function TodoItem({ todo, onEdit, onRemove }: TodoItemProps) {
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
        <div className="flex justify-between align-center space-y-1 flex-1 min-w-0 p-4">
          <div className="flex justify-between align-center space-x-2">
            {todo.completed ? (
              <CheckIcon size="18" className="text-gray-500" />
            ) : (
              <SquareCheckIcon
                size="18"
                className="text-gray-500 hover:text-gray-700"
                onClick={onEdit}
              />
            )}

            <label
              htmlFor={`todo-${todo.id}`}
              className={`text-sm font-medium leading-none break-words block ${
                todo.completed
                  ? "line-through text-muted-foreground opacity-70"
                  : "text-foreground"
              }`}
            >
              {todo.title}
            </label>
          </div>

          <TrashIcon
            onClick={onRemove}
            size="16"
            className="text-gray-500 hover:text-gray-700"
          />
        </div>
      </CardContent>
    </Card>
  );
}
