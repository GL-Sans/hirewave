// import { useState, useEffect } from "react";
// import Navbar from "../components/Navbar";
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
    <div className="min-h-dvh bg-slate-50">
      {/*<Navbar  onMenuClick={toggleMenu}  />*/}

      {/* <DrawerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      /> */}

      <main className="max-w-5xl mx-auto px-4">
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
