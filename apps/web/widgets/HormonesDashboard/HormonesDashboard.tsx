import { HormoneCard } from "@/shared/ui/HormoneCard";

import hormonesList from "@/shared/mock/hormones-uk.json";

export const HormonesDashboard = () => {
  return (
    <div>
      <div>Hormones</div>

      <div>
        {hormonesList.map((h) => (
          <HormoneCard
            key={h.name}
            name={h.name}
            description={h.description}
            increasesWith={h.increasesWith}
            decreasesWith={h.decreasesWith}
          />
        ))}
      </div>
    </div>
  );
};
