import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type HormoneCardPropos = {
    name: string;
    description: string;
    increasesWith: string;
    decreasesWith: string;
}

export const HormoneCard = ({ name, description,increasesWith, decreasesWith  }): HormoneCardPropos => {
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
    <p>{increasesWith}</p>
  </CardContent>

  <CardFooter>
    <p>{decreasesWith}</p>
  </CardFooter>
</Card>
    )
}
