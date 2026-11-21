"use client";

import { apiFetch } from "@/shared/lib/api-client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, UploadCloud, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { API_URL } from "@/api";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";

interface TodoFormProps {
  onTodoCreated?: () => void; // Коллбэк для обновления списка задач на странице
}

export function CreateTodoForm({ onTodoCreated }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentLocale = useLocale();
  const t = useTranslations();

  // Хэндлер выбора картинки
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // Создаем временное локальное превью
    }
  };

  // Удаление выбранной картинки перед отправкой
  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    // 🔑 Самое важное: упаковываем всё в FormData
    const formData = new FormData();
    formData.append("title", title.trim());

    if (file) {
      formData.append("file", file); // Ключ 'file' должен совпадать с перехватчиком на бэкенде
    }

    try {
      const response = await apiFetch(API_URL.todos.create(), {
        method: "POST",
        credentials: "include",
        headers: {
          // Важно: 'Content-Type' указывать НЕ НАДО! Браузер сам выставит multipart/form-data с правильным boundary
          "Accept-Language": currentLocale,
        },
        body: formData,
      });

      if (!response.ok) {
        const code = await getApiErrorCode(response);
        toast.error(t("todo_create_failed"), {
          description: t(apiErrorKey(code)),
        });
        return;
      }

      toast.success(t("todo_create_success"));

      // Сбрасываем форму при успешном создании
      setTitle("");
      handleRemoveFile();

      if (onTodoCreated) {
        onTodoCreated(); // Триггерим обновление списка задач
      }
    } catch (error) {
      console.error(error);
      toast.error(t("todo_create_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-md p-5 border rounded-xl bg-card shadow-sm"
    >
      <div className="space-y-1.5">
        <label htmlFor="todo-title" className="text-sm font-medium">
          {t("todo_title_label")}
        </label>
        <Input
          id="todo-title"
          type="text"
          placeholder={t("todo_title_placeholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="todo-file"
          className="text-sm font-medium text-muted-foreground flex items-center gap-2"
        >
          <UploadCloud className="h-4 w-4" />
          <span>{t("todo_file_label")}</span>
        </label>

        <Input
          id="todo-file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isSubmitting}
          className="cursor-pointer"
        />
      </div>

      {/* Блок локального превью изображения */}
      {previewUrl && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted group">
          {/* blob: URL локального превью, next/image его не оптимизирует */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={t("todo_preview_alt")}
            className="object-cover w-full h-full"
          />
          <button
            type="button"
            onClick={handleRemoveFile}
            aria-label={t("todo_file_remove")}
            className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-90 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <Button
        type="submit"
        disabled={!title.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("todo_creating")}
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            {t("todo_create_button")}
          </>
        )}
      </Button>
    </form>
  );
}
