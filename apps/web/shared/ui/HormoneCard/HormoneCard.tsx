import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HormoneCardProps = {
  name: string;
  description: string;
  increasesWith: string[];
  decreasesWith: string[];
};

export const HormoneCard = ({
  name,
  description,
  increasesWith,
  decreasesWith,
}: HormoneCardProps) => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{name}</CardTitle>

        <CardDescription>{description}</CardDescription>

        <CardAction>
          <Badge variant="default">Badge</Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p>{increasesWith.join(", ")}</p>
      </CardContent>

      <CardFooter>
        <p>{decreasesWith.join(", ")}</p>
      </CardFooter>
    </Card>
  );
};
