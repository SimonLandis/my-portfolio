import NavBar from "./components/Navbar";
import { Link } from "react-scroll";
export default function App() {
  return (
    /* 1. THE REEL: This container must be the height of the screen and handle the snapping */
    <main id="main-scroll-container" className="h-screen overflow-y-scroll snap-y snap-mandatory bg-sky-950 scroll-smooth">

      {/* Navbar stays fixed at the top because of 'sticky' inside the component */}
      <NavBar />

      {/* 2. HERO / ABOUT SECTION */}
      <section
        id="about"
        className="h-screen w-full snap-start snap-always flex flex-col items-center justify-center text-white space-y-6"
      >
        <p className="text-sm uppercase text-gray-500 pb-2 tracking-[.9375rem]">
          Web Developer
        </p>
        <h1 className="text-4xl lg:text-5xl font-semibold px-10 text-center">
          Hello, my name is Simon.
        </h1>
        <p className="text-l lg:text-xl  px-8 text-center text-teal-300/90">
          Welcome to my website, you can find some projects below.
        </p>
        <div className="mt-10 flex space-x-12">
          <Link to="ui-tool" containerId="main-scroll-container" smooth={true} className="text-sm uppercase tracking-widest text-gray-500 hover:text-white cursor-pointer transition">
            UI Tool
          </Link>
          <Link to="soccer-sim" containerId="main-scroll-container" smooth={true} className="text-sm uppercase tracking-widest text-gray-500 hover:text-white cursor-pointer transition">
            Soccer Sim
          </Link>
          <Link to="contact" containerId="main-scroll-container" smooth={true} className="text-sm uppercase tracking-widest text-gray-500 hover:text-white cursor-pointer transition">
            Contact
          </Link>
        </div>
      </section>

      {/* 3. UI TOOL SECTION */}
      <section
        id="ui-tool"
        className="h-screen w-full snap-start snap-always flex items-center justify-center bg-slate-900/50"
      >
        <h2 className="text-4xl text-white font-bold">UI Tool Case Study</h2>
      </section>

      {/* 4. SOCCER SIM SECTION */}
      <section
        id="soccer-sim"
        className="h-screen w-full snap-start snap-always flex items-center justify-center bg-sky-900/50"
      >
        <h2 className="text-4xl text-white font-bold">Soccer Sim Project</h2>
      </section>

      {/* 5. CONTACT SECTION */}
      <section
        id="contact"
        className="h-screen w-full snap-start snap-always flex items-center justify-center"
      >
        <h2 className="text-4xl text-white font-bold">Get In Touch</h2>
      </section>

    </main>
  );
}