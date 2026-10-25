import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import ProductWindow from './ProductWindow';

const servers = [
    ['Atlanta', 2291], ['Boston', 2064], ['Chicago', 1335], ['Dallas', 1594],
    ['Denver', 1770], ['Detroit', 1955], ['Houston', 2061], ['Las Vegas', 2514],
    ['Los Angeles', 1789], ['Memphis', 1175], ['Miami', 1093], ['New York', 1516],
    ['Orlando', 1295], ['Phoenix', 2011], ['Portland', 1227], ['San Diego', 2071],
    ['San Francisco', 1856], ['Seattle', 1530], ['Washington', 1351],
];

export default function ServersSection() {
    const section = useRef(null); const track = useRef(null);
    const reduced = useReducedMotion();
    const [trackRange, setTrackRange] = useState({ start: 0, end: 0 }); const [active, setActive] = useState(0);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useLayoutEffect(() => { const measure = () => { if (!track.current) return; const first = track.current.firstElementChild; const last = track.current.lastElementChild; setTrackRange({ start: first.offsetLeft + first.offsetWidth / 2, end: last.offsetLeft + last.offsetWidth / 2 }); }; measure(); const observer = new ResizeObserver(measure); observer.observe(track.current); addEventListener('resize', measure); return () => { observer.disconnect(); removeEventListener('resize', measure); }; }, []);
    useMotionValueEvent(scrollYProgress, 'change', (value) => { const next = Math.min(servers.length - 1, Math.round(value * (servers.length - 1))); setActive((current) => current === next ? current : next); });
    const x = useTransform(scrollYProgress, (value) => reduced ? -trackRange.start : -(trackRange.start + value * (trackRange.end - trackRange.start)));
    const [server, articleCount] = servers[active];

    return <section ref={section} id="servers" className="story story-servers"><div className="story-sticky"><header className="scene-heading"><span>03 / 19 СЕРВЕРОВ</span><h2>Законы именно твоего сервера</h2><p>Переключай базы без выхода из программы.</p></header><motion.div ref={track} className="server-track" style={{ x }}>{servers.map(([city, count], index) => <button key={city} className={active === index ? 'active' : ''} onClick={() => setActive(index)}><small>{String(index + 1).padStart(2, '0')}</small><strong>{city}</strong><span>{count.toLocaleString('ru-RU')} записей</span></button>)}</motion.div><div className="server-product"><ProductWindow activeServer={server} articleCount={articleCount} searchStage={{ typedQuery: `${articleCount.toLocaleString('ru-RU')} записей`, resultPhase: 'new', detailsVisible: true }} /></div></div></section>;
}
