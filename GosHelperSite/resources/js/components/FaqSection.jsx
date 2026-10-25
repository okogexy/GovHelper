import React, { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Plus } from 'lucide-react';

const questions = [
    ['Что делать, если подозреваемый убегает?', 'Зафиксируйте неподчинение, предупредите о последствиях и действуйте соразмерно угрозе.'],
    ['Когда разрешено применять оружие?', 'Только при наличии законных оснований и после предупреждения, когда это возможно.'],
    ['Какие основания нужны для задержания?', 'Ориентировка, факт нарушения или иные основания процессуального кодекса.'],
    ['Как проводится обыск?', 'После разъяснения оснований и прав, с фиксацией найденных предметов.'],
    ['Какие права есть у задержанного?', 'Знать причину, пользоваться защитой и получить разъяснение прав.'],
    ['Как правильно оформить розыск?', 'Укажите основание, статью, доказательства и идентификационные данные.'],
];

export default function FaqSection() {
    const section = useRef(null); const prefix = useId();
    const [scrollActive, setScrollActive] = useState(0); const [userActive, setUserActive] = useState(null); const [manual, setManual] = useState(false);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (value) => { if (manual) return; const next = Math.min(5, Math.floor(value * 6)); setScrollActive((current) => current === next ? current : next); });
    const active = manual ? userActive : scrollActive;
    const choose = (index) => { setManual(true); setUserActive(index); };
    return <section ref={section} id="faq" className="story story-faq"><div className="story-sticky"><header className="scene-heading"><span>06 / FAQ</span><h2>Помощник подскажет следующий шаг</h2><p>Краткие ответы помогают ориентироваться в процессуальных ситуациях.</p></header><div className="faq-list">{questions.map(([question, answer], index) => { const panel = `${prefix}-panel-${index}`; return <article key={question} className={active === index ? 'active' : ''}><h3><button onClick={() => choose(index)} aria-expanded={active === index} aria-controls={panel}>{question}<Plus /></button></h3><AnimatePresence initial={false}>{active === index && <motion.div id={panel} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{answer}</p></motion.div>}</AnimatePresence></article>; })}</div></div></section>;
}
