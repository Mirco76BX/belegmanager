import { Outlet, Link } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-[52px] pb-[68px] md:pt-0 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
        <footer className="hidden md:block border-t py-2 text-center">
          <Link to="/impressum" state={{ from: "/" }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Impressum
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
