import React from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './components/Navbar';
import ScrollProgress from './components/ScrollProgress';
import HeroSection from './components/HeroSection';
import SearchShowcase from './components/SearchShowcase';
import LawDatabaseSection from './components/LawDatabaseSection';
import ServersSection from './components/ServersSection';
import OverlaySection from './components/OverlaySection';
import NotesSection from './components/NotesSection';
import FaqSection from './components/FaqSection';
import FinalSection from './components/FinalSection';
import '../css/app.css';

function App() {
    const root = document.getElementById('root');
    const release = JSON.parse(root?.dataset.release ?? '{"available":false}');
    const settings = JSON.parse(root?.dataset.settings ?? '{}');
    const user = JSON.parse(root?.dataset.user ?? '{"signedIn":false,"admin":false}');
    return <><a className="skip-link" href="#main">Перейти к содержимому</a><Navbar settings={settings} user={user} /><ScrollProgress /><main id="main"><HeroSection downloadAvailable={release.available} settings={settings} /><SearchShowcase /><LawDatabaseSection /><ServersSection /><OverlaySection /><NotesSection /><FaqSection /><FinalSection downloadAvailable={release.available} /></main></>;
}

createRoot(document.getElementById('root')).render(<App />);
