"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "현황", href: "/" },
  { label: "소재", href: "/sources" },
  { label: "라이브러리", href: "/library" },
  { label: "콘텐츠", href: "/contents" },
  { label: "발행", href: "/publishing" },
  { label: "로그", href: "/logs" },
  { label: "성과", href: "/analytics" },
  { label: "스케줄", href: "/schedule" },
  { label: "설정", href: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 border-b flex items-center px-6 shrink-0 bg-background">
        <h1 className="text-base font-semibold text-foreground">Threads Dashboard</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 bg-muted border-r p-3 shrink-0 overflow-y-auto">
          <ul className="space-y-1" style={{ listStyle: "none" }}>
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
