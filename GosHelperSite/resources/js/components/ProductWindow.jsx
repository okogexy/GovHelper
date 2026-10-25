import React, { useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { ProductNotes, ProductResults, ProductSearch, ProductSettings, ProductSidebar, ProductTitlebar } from './ProductWindowParts';

export default function ProductWindow({
    mode = 'default',
    searchStage = {},
    activeCode = 'УК',
    activeServer = 'Denver',
    articleCount = 1770,
    overlaySettings = {},
    notes = [],
    compact = false,
    theme = 'base',
}) {
    const reduced = useReducedMotion();
    const [section, setSection] = useState('Поиск');
    const [code, setCode] = useState(activeCode);
    const [favorite, setFavorite] = useState(searchStage.favoriteActive ?? false);
    const px = useSpring(useMotionValue(0), { stiffness: 150, damping: 24 });
    const py = useSpring(useMotionValue(0), { stiffness: 150, damping: 24 });
    const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 24 });
    const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 24 });

    const move = (event) => {
        if (reduced || window.innerWidth < 768) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX / rect.width - rect.left / rect.width - 0.5;
        const y = event.clientY / rect.height - rect.top / rect.height - 0.5;
        px.set(x * 12); py.set(y * 12); rx.set(-y * 4); ry.set(x * 4);
    };
    const reset = () => { px.set(0); py.set(0); rx.set(0); ry.set(0); };
    const isCompact = compact || overlaySettings.compact;
    const activeSection = mode === 'settings' ? 'Настройки' : mode === 'notes' ? 'Заметки' : section;

    return (
        <motion.div className={`product-window theme-${theme} ${isCompact ? 'is-compact' : ''}`} data-mode={mode} onMouseMove={move} onMouseLeave={reset} style={reduced ? undefined : { x: px, y: py, rotateX: rx, rotateY: ry }} initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }} animate={{ opacity: overlaySettings.opacity ?? 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <ProductTitlebar server={activeServer} articleCount={articleCount} alwaysOnTop={overlaySettings.alwaysOnTop} />
            <div className="product-body">
                <ProductSidebar active={activeSection} onChange={setSection} compact={isCompact} server={activeServer} />
                <main className="product-main">
                    {mode === 'settings' ? <ProductSettings settings={overlaySettings} /> : mode === 'notes' ? <ProductNotes notes={notes} /> : <><ProductSearch query={searchStage.typedQuery ?? ''} code={code} onCode={setCode} /><ProductResults phase={searchStage.resultPhase} selected={searchStage.selectedResult} onSelect={() => setFavorite(false)} detailsVisible={searchStage.detailsVisible ?? mode !== 'search'} favorite={searchStage.favoriteActive ?? favorite} onFavorite={() => setFavorite((value) => !value)} /></>}
                </main>
            </div>
        </motion.div>
    );
}
