import { GoalTable } from "@/widgets/GoalTable";
import { GoalChart } from "@/widgets/GoalChart";

export default function Goal() {
  const data = [
    { date: "2025-08-18", expect: 30, actual: 30 },
    { date: "2024-08-19", expect: 20, actual: 20 },
    { date: "2024-08-20", expect: 20, actual: 20 },
    { date: "2024-08-21", expect: 20, actual: 20 },
    { date: "2024-08-22", expect: 20, actual: 20 },
    { date: "2024-08-23", expect: 20, actual: 14 },
    {
      date: "2024-08-24",
      expect: 20,
      actual: 20,
      comment: "увеличение из-за встречи с друзьями в честь дня рождения",
    },

    { date: "2024-08-25", expect: 15, actual: 14 },
    { date: "2024-08-26", expect: 15, actual: 14 },
    {
      date: "2024-08-27",
      expect: 15,
      actual: 15,
      comment: "увеличение из-за небольшого стресса про мысли по работе",
    },
    {
      date: "2024-08-28",
      expect: 15,
      actual: 19,
      comment: "увеличение из-за небольшого стресса с ожиданиями по работе",
    },
    { date: "2024-08-29", expect: 15, actual: 0 },
    { date: "2024-08-30", expect: 15, actual: 0 },
    { date: "2024-08-31", expect: 15, actual: 0 },

    { date: "2024-09-01", expect: 13, actual: 0 },
  ];

  return (
    <div className="p-4">
      <GoalChart data={data} />

      <div className="py-8">
        <GoalTable data={data} />
      </div>
    </div>
  );
}
