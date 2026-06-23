import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTE } from "@/constants";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center p-6 m-auto w-[100%] max-w[500]">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <h1 className="text-7xl font-bold tracking-tight">404</h1>

          <p className="text-muted-foreground text-base">Page not found</p>

          <p className="text-sm text-muted-foreground max-w-[300]">
            The page you are looking for doesn’t exist or has been moved.
          </p>

          <div className="flex gap-3 mt-4">
            <Button>
              <Link href={ROUTE.HOME}>Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
