"use server";

import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../shared/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "Имя слишком короткое"),
  email: z.string().email("Неверный формат email"),
  password: z.string().min(6, "Пароль должен быть длиннее 6 символов"),
});
 
export async function createAccountUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Валидация данных
  const validatedFields = registerSchema.safeParse({ name, email, password });
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    console.log('prisma', prisma, prisma.user);
    // Проверяем, существует ли уже такой email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Пользователь с таким email уже существует" };
    }

    // Хэшируем пароль (соль = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('hashedPassword', password, hashedPassword);

    // Создаем пользователя в БД
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (err) {
    console.log('err', err);
    return { error: "Что-то пошло не так при регистрации" };
  }
}