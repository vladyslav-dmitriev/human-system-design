"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { API_URL } from "@/api";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";

export function TodoImageUpload({
  todoId,
  onUploaded,
}: {
  todoId: string;
  onUploaded?: (imageUrl: string) => void;
}) {
  const t = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Создаем локальную ссылку для превью картинки перед отправкой
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);

    // 🔑 Упаковываем файл в FormData
    const formData = new FormData();
    formData.append("file", file); // ключ 'file' должен совпадать с FileInterceptor('file') на бэкенде
    formData.append("todoId", todoId);

    try {
      const response = await fetch(API_URL.todos.uploadImage(), {
        // URL твоего NestJS бэкенда
        method: "POST",
        credentials: "include",
        body: formData,
        // Важно: заголовки Content-Type указывать НЕ НАДО, браузер поставит multipart/form-data автоматически
      });

      if (!response.ok) {
        const code = await getApiErrorCode(response);
        toast.error(t("todo_upload_failed"), {
          description: t(apiErrorKey(code)),
        });
        return;
      }

      // Ответ: { imageUrl }; ссылку на хранилище пользователю не показываем
      const data: { imageUrl?: string } = await response.json();
      if (data.imageUrl) {
        toast.success(t("todo_upload_success"));
        onUploaded?.(data.imageUrl);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("todo_upload_failed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className="space-y-4 max-w-sm p-4 border rounded-xl bg-card"
    >
      <div className="grid w-full items-center gap-1.5">
        <label
          htmlFor={`todo-upload-${todoId}`}
          className="text-sm font-medium text-muted-foreground flex items-center gap-2"
        >
          <UploadCloud className="h-4 w-4" />
          {t("todo_upload_label")}
        </label>
        <Input
          id={`todo-upload-${todoId}`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="cursor-pointer"
        />
      </div>

      {/* Маленькое превью выбранной картинки */}
      {previewUrl && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
          {/* blob: URL локального превью, next/image его не оптимизирует */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={t("todo_preview_alt")}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      <Button type="submit" disabled={!file || isUploading} className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("todo_uploading")}
          </>
        ) : (
          t("todo_upload_submit")
        )}
      </Button>
    </form>
  );
}
