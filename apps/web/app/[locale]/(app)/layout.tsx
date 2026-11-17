import { SidebarWrapper } from "@/widgets/sidebar/sidebar-wrapper";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SidebarWrapper>{children}</SidebarWrapper>;
}
