import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import ProductWindow from './ProductWindow';

const laws = [
    { code: 'УК', number: '12.8', title: 'Незаконное хранение оружия', text: 'Хранение, передача или ношение оружия без законных оснований.', fine: '$15 000', severity: '★★★☆☆' },
    { code: 'ПК', number: '3.4', title: 'Порядок задержания', text: 'Основания, последовательность действий и права задержанного.', fine: 'Процедура', severity: '★★☆☆☆' },
    { code: 'АК', number: '7.2', title: 'Общественный порядок', text: 'Ответственность за нарушение порядка в общественном месте.', fine: '$6 000', severity: '★★☆☆☆' },
    { code: 'ДК', number: '2.1', title: 'Дисциплинарная ответственность', text: 'Нарушение служебного регламента государственным сотрудником.', fine: 'Взыскание', severity: '★★☆☆☆' },
    { code: 'Госслужба', number: '4.6', title: 'Полномочия служащего', text: 'Пределы полномочий и стандарты поведения на государственной службе.', fine: 'Регламент', severity: '★☆☆☆☆' },
    { code: 'Об оружии', number: '9.1', title: 'Применение специальных средств', text: 'Условия и ограничения применения специальных средств.', fine: 'До 4 лет', severity: '★★★★☆' },
];

export default function LawDatabaseSection() {
    const section = useRef(null);
    const reduced = useReducedMotion();
    const [active, setActive] = useState(0);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (value) => { const next = Math.min(laws.length - 1, Math.floor(value * laws.length)); setActive((current) => current === next ? current : next); });
    const law = laws[active];

    return <section ref={section} id="laws" className="story story-laws"><div className="story-sticky"><header className="scene-heading"><span>02 / КОДЕКСЫ</span><h2>Вся законодательная база в одном интерфейсе</h2><p>Без переключений между браузером, форумом, Discord и игрой.</p></header><div className="law-scene"><nav aria-label="Кодексы">{laws.map((item, index) => <button key={item.code} className={index === active ? 'active' : ''} onClick={() => setActive(index)}>{item.code}</button>)}</nav><AnimatePresence mode="wait"><motion.article key={law.code} initial={{ opacity: 0, x: reduced ? 0 : 60, rotateY: reduced ? 0 : 4 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -50 }}><small>{law.code} · СТАТЬЯ {law.number}</small><h3>{law.title}</h3><p>{law.text}</p><dl><div><dt>Тяжесть</dt><dd>{law.severity}</dd></div><div><dt>Санкция</dt><dd>{law.fine}</dd></div></dl></motion.article></AnimatePresence><ProductWindow mode="default" activeCode={law.code.length > 2 ? 'УК' : law.code} searchStage={{ typedQuery: law.number, resultPhase: 'new', selectedResult: 0, detailsVisible: true }} /></div></div></section>;
}
