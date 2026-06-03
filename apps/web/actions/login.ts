"use server";

import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../shared/lib/prisma";

// Схема валидации для логина (имя здесь не требуется)
const loginSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(1, "Пароль не может быть пустым"),
});

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Валидация входных данных
  const validatedFields = loginSchema.safeParse({ email, password });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    // 2. Ищем пользователя в Neon по email
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Если пользователь не найден, возвращаем общую ошибку 
    // (лучше не уточнять, чего именно нет — email или пароля, из соображений безопасности)
    if (!user) {
      return { error: "Неверный email или пароль" };
    }

    // 3. Проверяем, совпадает ли введенный пароль с хэшем из базы данных
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return { error: "Неверный email или пароль" };
    }

    // Лог для отладки в терминале
    console.log(`Пользователь ${email} успешно авторизовался!`);

    // 4. Если всё ок, возвращаем статус и базовые данные (БЕЗ пароля)
    return { 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      } 
    };

  } catch (err) {
    console.log("Ошибка при логине:", err);
    return { error: "Что-то пошло не так при попытке входа" };
  }
}