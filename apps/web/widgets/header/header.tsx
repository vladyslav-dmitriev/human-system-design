import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/features/auth-buttons";
import { SelectLanguage } from "@/features/select-language";
import { UpgradeButton } from "@/features/upgrade-button";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { Logo } from "../logo";
import Link from "next/link";
import { ROUTE } from "@/constants";
import { usePathname } from "@/i18n/navigation";

type HeaderProps = {
  isOpenSidebar: boolean;
  onToggleSidebar(): void;
};

export const Header = ({ isOpenSidebar, onToggleSidebar }: HeaderProps) => {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="flex h-14 w-full justify-between items-center gap-4 border-b border-border pl-4 pr-2 bg-background/60 backdrop-blur-md sticky top-0 z-10">
      {session ? (
        <div className="flex justify-start align-center">
          <div className="relative group flex items-center mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors shrink-0"
              onClick={onToggleSidebar}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <span className="absolute top-1 left-10 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border border-border/60 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-30 pointer-events-none">
              {isOpenSidebar ? "Свернуть меню" : "Развернуть меню"}
            </span>
          </div>

          {pathname !== ROUTE.PRICING && <UpgradeButton />}
        </div>
      ) : (
        <Link href={ROUTE.HOME}>
          <Logo />
        </Link>
      )}

      <div className="flex items-center justify-end space-x-2 ml-auto">
        <AuthButtons />
        <SelectLanguage />
      </div>
    </header>
  );
};
