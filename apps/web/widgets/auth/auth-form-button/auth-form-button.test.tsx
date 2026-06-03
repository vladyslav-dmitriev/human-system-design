import { render, screen } from "@testing-library/react";
import { AuthFormButton } from "./auth-form-button"; // Скорректируйте путь, если нужно

describe("AuthFormButton Component", () => {
  it("должен корректно отображать переданный текст кнопки", () => {
    // 1. Рендерим компонент
    render(<AuthFormButton buttonText="Войти в аккаунт" />);

    // 2. Ищем элемент на странице по тексту
    const buttonElement = screen.getByRole("button", {
      name: /войти в аккаунт/i,
    });

    // 3. Проверяем, что он находится в DOM-дереве
    expect(buttonElement).toBeInTheDocument();
  });

  it("должен иметь атрибут type='submit' для отправки формы", () => {
    render(<AuthFormButton buttonText="Отправить" />);

    const buttonElement = screen.getByRole("button");

    // Проверяем HTML-атрибут кнопки
    expect(buttonElement).toHaveAttribute("type", "submit");
  });
});
