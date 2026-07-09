"use client";

import React, { createContext, useContext, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/widgets/sidebar/sidebar";
import { Header } from "../header";

const SidebarContext = createContext({
  isOpen: true,
  toggle: () => {},
});

export const useMySidebar = () => useContext(SidebarContext);

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const { data: session, status } = useSession();

  const toggle = () => setIsOpen(!isOpen);

  const isLoading = status === "loading";
  const hasNoSession = !session && !isLoading;

  console.log('hasNoSession', hasNoSession, session, status);

  // Если пользователь точно НЕ авторизован (и загрузка завершена),
  // рендерим чистую страницу без сайдбара (например, для страниц Login/Register)
  if (hasNoSession) {
    return (
      <>
        <Header isOpenSidebar={isOpen} onToggleSidebar={toggle} />
        {children}
      </>
    );
  }

  // Для состояний "loading" и "authenticated" рендерим ИДЕНТИЧНУЮ структуру отступов.
  // Это полностью убирает прыжки UI при гидратации.
  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className="flex min-h-screen w-full bg-background text-foreground overflow-x-hidden antialiased">
        {/* Сайдбар рендерится только когда сессия готова, но место под него зарезервировано */}
        {!isLoading && session && <AppSidebar isOpen={isOpen} />}

        <div
          className={`flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${
            isOpen ? "pl-40" : "pl-13"
          } w-full`}
        >
          <Header isOpenSidebar={isOpen} onToggleSidebar={toggle} />

          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
