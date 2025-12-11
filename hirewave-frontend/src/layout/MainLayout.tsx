import { useState } from "react";
import Navbar from "../components/Navbar";
import DrawerMenu from "../components/DrawerMenu";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="pt-20 pb-8 max-w-5xl mx-auto px-4">
        <Outlet />
      </main>
    </div>
  );
}