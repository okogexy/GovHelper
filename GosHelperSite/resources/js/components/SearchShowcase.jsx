import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import ProductWindow from './ProductWindow';

export function useSearchStory(progress) {
    const [value, setValue] = useState(0);
    useMotionValueEvent(progress, 'change', setValue);
    const query = '12.8 оружие';
    const typedLength = value < 0.25 ? 0 : Math.round(Math.min(1, (value - 0.25) / 0.17) * query.length);
    return {
        typedQuery: query.slice(0, typedLength),
        resultPhase: value < 0.42 ? 'old' : value < 0.56 ? 'leaving' : 'new',
        selectedResult: value >= 0.68 ? 0 : null,
        detailsVisible: value >= 0.78,
        highlightedStat: value >= 0.97 ? 'term' : value >= 0.94 ? 'fine' : value >= 0.88 ? 'severity' : null,
        favoriteActive: value >= 0.97,
    };
}

export default function SearchShowcase() {
    const section = useRef(null);
    const reduced = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    const story = useSearchStory(scrollYProgress);
    const scale = useTransform(scrollYProgress, [0, 0.18, 0.32, 1], reduced ? [1, 1, 1, 1] : [0.94, 0.94, 1, 1]);
    const shade = useTransform(scrollYProgress, [0.12, 0.25], [0, 0.42]);

    return <section ref={section} id="search" className="story story-search"><div className="story-sticky"><header className="scene-heading"><span>01 / ПОИСК</span><h2>Нужная статья за несколько секунд</h2><p>Поиск работает по номеру, названию, описанию нарушения и тексту наказания.</p></header><motion.div className="story-product" style={{ scale }}><ProductWindow mode="search" searchStage={story} /><motion.i className="ui-shade" style={{ opacity: shade }} /></motion.div></div></section>;
}
