import { useState } from 'react';
import { Link } from 'react-scroll';
import { Github, Linkedin } from 'lucide-react';

export default function NavBar() {
    const [activeSection, setActiveSection] = useState('about');
    const isHome = activeSection === 'about';

    const getNavLinks = (current) => {
        const sections = [
            { name: 'About', target: 'about' },
            { name: 'UI Tool', target: 'ui-tool' },
            { name: 'Soccer Sim', target: 'soccer-sim' },
            { name: 'Contact', target: 'contact' },
        ];
        // Filters out the current section so you always have exactly 3 links
        return sections.filter(s => s.target !== current);
    };

    const currentLinks = getNavLinks(activeSection);

    return (
        <nav className="fixed top-0 left-0 w-full z-50 h-16 px-6 flex items-center">

            {/* 1. LEFT SIDE: Persistent Social Icons (Always Visible) */}
            <div className="flex items-center space-x-5 z-50">
                <a href="https://github.com/yourusername" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <Github size={20} />
                </a>
                <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <Linkedin size={20} />
                </a>
            </div>

            {/* 2. CENTER: The Sliding Text Links */}
            {/* We use 'absolute inset-0' to let the flex container center the links independently of the icons */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out border-b border-slate-700 backdrop-blur-md bg-slate-900/70 ${isHome ? '-top-20 opacity-0 pointer-events-none' : 'top-0 opacity-100'
                }`}>
                <div className="flex space-x-10">
                    {currentLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.target}
                            smooth={true}
                            duration={500}
                            containerId="main-scroll-container"
                            spy={true}
                            onSetActive={() => setActiveSection(link.target)}
                            className="text-xs uppercase tracking-[0.2em] text-gray-500 hover:text-white cursor-pointer transition-colors"
                            activeClass="text-blue-400"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* 3. RIGHT SIDE: Invisible Spacer */}
            {/* This keeps the flex layout balanced if you decide to add a button later */}
            <div className="ml-auto hidden md:block w-[72px]"></div>
        </nav>
    );
}