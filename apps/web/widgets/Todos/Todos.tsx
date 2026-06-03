"use client";

import { useLayoutEffect, useState } from "react";

import { TypographyH3 } from "@/shared/ui/Typography";
import { DayCarousel } from "@/shared/ui/DayCarousel";
import { TodosSet } from "@/shared/ui/TodosSet";

const MOCK_TODOS_SETS = [
  {
    title: "Morning Set",
    key: "morning set",
    todos: [
      { id: 11, title: "Wake up", checked: false },
      { id: 12, title: "Take a shower", checked: false },
      { id: 13, title: "Morning tea", checked: false },
    ],
  },
  {
    title: "Work Set",
    key: "work set",
    todos: [
      { id: 21, title: "Wake up", checked: false },
      { id: 22, title: "Take a shower", checked: false },
      { id: 23, title: "Morning tea", checked: false },
    ],
  },
  {
    title: "Sport Set",
    key: "sport set",
    todos: [
      { id: 31, title: "Wake up", checked: false },
      { id: 32, title: "Take a shower", checked: false },
      { id: 33, title: "Morning tea", checked: false },
    ],
  },
  {
    title: "English Set",
    key: "english set",
    todos: [
      { id: 31, title: "Wake up", checked: false },
      { id: 32, title: "Take a shower", checked: false },
      { id: 33, title: "Morning tea", checked: false },
    ],
  },
  {
    title: "Yoga Set",
    key: "yoga set",
    todos: [
      { id: 31, title: "Wake up", checked: false },
      { id: 32, title: "Take a shower", checked: false },
      { id: 33, title: "Morning tea", checked: false },
    ],
  },
  {
    title: "Evening Set",
    key: "evening set",
    todos: [
      { id: 31, title: "Wake up", checked: false },
      { id: 32, title: "Take a shower", checked: false },
      { id: 33, title: "Morning tea", checked: false },
    ],
  },
];

export const Todos = () => {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="p-4">
      <TypographyH3>27 Aug, Wed</TypographyH3>

      <div className="mt-4 grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_TODOS_SETS.map((todoSet) => (
          <TodosSet
            key={todoSet.key}
            todoKey={todoSet.key}
            title={todoSet.title}
            defaultTodos={todoSet.todos}
          />
        ))}
      </div>
    </div>
  );
};
