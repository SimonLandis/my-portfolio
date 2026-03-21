// src/pages/PortfolioMain.jsx
import React from 'react';
import { Link } from "react-scroll";
import NavBar from "../components/Navbar";

const PortfolioMain = () => {
    return (
        <main id="main-scroll-container" className="h-screen overflow-y-scroll snap-y snap-mandatory bg-sky-950 scroll-smooth">
            <NavBar />

            {/* ABOUT SECTION */}
            <section id="about" className="h-screen w-full snap-start snap-always flex flex-col items-center justify-center text-white space-y-6">
                <p className="text-sm uppercase text-gray-500 pb-2 tracking-[.9375rem]">Web Developer</p>
                <h1 className="text-4xl lg:text-5xl font-semibold px-10 text-center">Hello, my name is Simon.</h1>
                <div className="mt-10 flex space-x-12">
                    <Link to="ui-tool" containerId="main-scroll-container" smooth={true} className="cursor-pointer uppercase text-gray-500 hover:text-white transition tracking-widest text-sm">UI Tool</Link>
                    <Link to="soccer-sim-section" containerId="main-scroll-container" smooth={true} className="cursor-pointer uppercase text-gray-500 hover:text-white transition tracking-widest text-sm">Soccer Sim</Link>
                    <Link to="contact" containerId="main-scroll-container" smooth={true} className="cursor-pointer uppercase text-gray-500 hover:text-white transition tracking-widest text-sm">Contact</Link>
                </div>
            </section>

            {/* UI TOOL SECTION */}
            <section id="ui-tool" className="h-screen w-full snap-start snap-always flex items-center justify-center bg-slate-900/50">
                <h2 className="text-4xl text-white font-bold">UI Tool Case Study</h2>
            </section>

            {/* SOCCER SIM SECTION */}
            <section id="soccer-sim-section" className="h-screen w-full snap-start snap-always flex flex-col items-center justify-center bg-sky-900/50">
                <h2 className="text-4xl text-white font-bold mb-6">Soccer Sim Project</h2>
                <a
                    href="/soccer-sim"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-teal-400 text-black font-bold rounded hover:bg-teal-300 transition"
                >
                    OPEN LIVE SIMULATION
                </a>
            </section>

            {/* CONTACT SECTION */}
            <section id="contact" className="h-screen w-full snap-start snap-always flex items-center justify-center">
                <h2 className="text-4xl text-white font-bold">Get In Touch</h2>
            </section>
        </main>
    );
};

export default PortfolioMain;