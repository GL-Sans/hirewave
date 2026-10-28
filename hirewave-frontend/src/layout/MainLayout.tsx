// import { useState, useEffect } from "react";
import { Suspense } from "react";
import Navbar from "../components/Navbar";
import TutorChat from "../components/TutorChat";
// import DrawerMenu from "../components/DrawerMenu";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  // const [menuOpen, setMenuOpen] = useState(false);
  // const toggleMenu = () => {
  //   setMenuOpen(prev => !prev);
  // };

  // useEffect(() => {
  //   if (menuOpen) {
  //     document.body.style.overflow = "hidden";
  //   } else {
  //     document.body.style.overflow = "";
  //   }

  //   return () => {
  //     document.body.style.overflow = "";
  //   };
  // }, [menuOpen]);
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* <DrawerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      /> */}

      <main className="pt-20 pb-24 md:pb-8 max-w-5xl mx-auto px-4 overflow-hidden">
        {/* La navbar resta visibile mentre si scarica la pagina */}
        <Suspense fallback={<div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      {/* <Footer /> */}
       <Navbar /* onMenuClick={toggleMenu} */ />
      <TutorChat />
    </div>
  );
}
