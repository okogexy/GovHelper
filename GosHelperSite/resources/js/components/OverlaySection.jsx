import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Layers, Maximize2, Moon, Palette, Pin, Sun } from 'lucide-react';
import ProductWindow from './ProductWindow';

const labels = ['Полное окно', 'Уменьшение', 'Справа', 'Всегда сверху', 'Прозрачность 84%', 'Масштаб 72%', 'Компактный режим', 'Aurora', 'Midnight', 'Светлая тема'];

export default function OverlaySection() {
    const section = useRef(null); const reduced = useReducedMotion(); const [stage, setStage] = useState(0);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (value) => { const next = Math.min(9, Math.floor(value * 10)); setStage((current) => current === next ? current : next); });
    const scale = useTransform(scrollYProgress, [0, 0.25, 1], reduced ? [1, 1, 1] : [1, 0.78, 0.72]);
    const x = useTransform(scrollYProgress, [0, 0.35, 1], reduced ? ['0%', '0%', '0%'] : ['0%', '0%', '28%']);
    const theme = stage >= 9 ? 'light' : stage >= 8 ? 'midnight' : stage >= 7 ? 'aurora' : 'base';
    const themeLabel = theme === 'light' ? 'Светлая' : theme === 'midnight' ? 'Midnight' : theme === 'aurora' ? 'Aurora' : 'Базовая';
    const settings = { alwaysOnTop: stage >= 3, opacity: stage >= 4 ? 0.84 : 1, scale: stage >= 5 ? 0.72 : 1, compact: stage >= 6, theme: themeLabel };
    return <section ref={section} id="overlay" className="story story-overlay"><div className="story-sticky gameplay"><header className="scene-heading"><span>04 / ПОВЕРХ ИГРЫ</span><h2>Не выходи из игрового процесса</h2><p>Программа остаётся рядом и не перекрывает важные события.</p></header><div className="game-city" aria-hidden="true" /><motion.div className="overlay-product" style={{ scale, x }}><ProductWindow mode="settings" overlaySettings={settings} compact={settings.compact} theme={theme} /></motion.div><div className="overlay-controls">{labels.map((label, index) => <button key={label} className={index <= stage ? 'active' : ''} onClick={() => setStage(index)}>{index === 3 ? <Pin /> : index === 6 ? <Layers /> : index === 7 ? <Palette /> : index === 8 ? <Moon /> : index === 9 ? <Sun /> : <Maximize2 />}{label}</button>)}</div></div></section>;
}
