import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { Grip, Pin } from 'lucide-react';
import ProductWindow from './ProductWindow';

const notes = [
    { title: 'Порядок задержания', text: 'Представиться · основание · права' },
    { title: 'Частые статьи', text: '12.8 · 7.2 · 3.4' },
    { title: 'Розыск', text: 'Основание · статья · доказательства' },
    { title: 'Права задержанного', text: 'Причина · защита · разъяснение' },
    { title: 'Шпаргалка GOV', text: 'Короткие подсказки рядом с игрой' },
];
const positions = [[-330, 80], [-170, 210], [40, 230], [230, 110], [330, -40]];

function FloatingNote({ note, index, progress }) {
    const reduced = useReducedMotion(); const [endX, endY] = positions[index];
    const opacity = useTransform(progress, [index * 0.09, 0.32 + index * 0.08], [0, 1]);
    const rawX = useTransform(progress, [0, 1], [0, reduced ? 0 : endX]);
    const rawY = useTransform(progress, [0, 1], [120, reduced ? 0 : endY]);
    const x = useSpring(rawX, { stiffness: 90, damping: 22 }); const y = useSpring(rawY, { stiffness: 90, damping: 22 });
    return <motion.article className="floating-note" style={{ opacity, x, y }}><div><Grip /><Pin /></div><h3>{note.title}</h3><p>{note.text}</p></motion.article>;
}

export default function NotesSection() {
    const section = useRef(null); const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    return <section ref={section} id="notes" className="story story-notes"><div className="story-sticky"><header className="scene-heading"><span>05 / ЗАМЕТКИ</span><h2>Важное всегда перед глазами</h2><p>Создавай шпаргалки и размещай их в удобной части экрана.</p></header><div className="notes-product"><ProductWindow mode="notes" notes={notes} /></div>{notes.map((note, index) => <FloatingNote key={note.title} note={note} index={index} progress={scrollYProgress} />)}</div></section>;
}
