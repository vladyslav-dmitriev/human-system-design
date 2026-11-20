"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud } from "lucide-react";
import { API_URL } from "@/api";

export function TodoImageUpload({ todoId }: { todoId: string }) {
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

      if (!response.ok) throw new Error("Ошибка при загрузке");

      const data = await response.json();
      alert(`Успешно загружено! Ссылка: ${data.imageUrl}`);

      // Здесь можно вызвать функцию обновления списка тудушек
    } catch (error) {
      console.error(error);
      alert("Не удалось загрузить изображение");
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
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <UploadCloud className="h-4 w-4" />
          Прикрепить фото к задаче
        </label>
        <Input
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
          <img
            src={previewUrl}
            alt="Preview"
            className="object-cover w-full h-full"
          />
        </div>
      )}

      <Button type="submit" disabled={!file || isUploading} className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загрузка...
          </>
        ) : (
          "Сохранить изображение"
        )}
      </Button>
    </form>
  );
}
