import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { Plus, X } from 'lucide-react';

const links = [['start', 'Начало'], ['search', 'Поиск'], ['laws', 'Кодексы'], ['servers', 'Серверы'], ['overlay', 'Поверх игры'], ['notes', 'Заметки'], ['faq', 'FAQ'], ['download', 'Скачать']];

export function Logo() {
    return <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="12" width="25" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(42 20 19)" /><rect x="7" y="12" width="25" height="14" rx="7" fill="none" stroke="var(--gold)" strokeWidth="2" transform="rotate(-42 20 19)" /></svg>;
}

function ServerDots() {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="6" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="6" cy="14" r="2" /><circle cx="14" cy="14" r="2" /></svg>;
}

export default function Navbar({ settings = {}, user = {} }) {
    const [open, setOpen] = useState(false);
    const panel = useRef(null);
    const trigger = useRef(null);
    const { scrollY } = useScroll();
    const background = useTransform(scrollY, [0, 80], ['rgba(7,8,8,0)', 'rgba(7,8,8,.88)']);

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement;
        document.body.classList.add('menu-open');
        panel.current?.querySelector('a')?.focus();
        const key = (event) => { if (event.key === 'Escape') setOpen(false); };
        addEventListener('keydown', key);
        return () => {
            document.body.classList.remove('menu-open');
            removeEventListener('keydown', key);
            previous?.focus();
        };
    }, [open]);

    return <>
        <motion.nav className="navbar" style={{ background }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <a href="#start" className="brand"><Logo /><span><b>{settings.brand_name || 'VEYRON'}</b><small>{settings.product_name || 'GOVHelper'}</small></span></a>
            <button ref={trigger} className="nav-menu-button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="site-menu"><Plus />Меню</button>
            <a className="nav-pricing" href="/pricing">Прайсинг</a>
            <span className="nav-context">{settings.nav_context || 'Поиск · AI · Кодексы · Заметки'}</span>
            {user.admin && <a className="nav-login" href="/admin">Админ</a>}
            <a className="nav-login" href={user.signedIn ? '/dashboard' : '/login'}>{user.signedIn ? 'Кабинет' : 'Войти'}</a>
            <a className="nav-servers" href="#servers"><ServerDots /><span>{settings.server_count || 19} серверов</span></a>
        </motion.nav>
        <AnimatePresence>{open &&
            <motion.div className="menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div ref={panel} id="site-menu" className="site-menu" role="dialog" aria-modal="true" aria-label="Навигация" initial={{ opacity: 0, y: -24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }}>
                    <header><Logo /><b>Навигация</b><button onClick={() => setOpen(false)} aria-label="Закрыть меню"><X /></button></header>
                    <nav>{links.map(([id, label], index) => <a href={`#${id}`} key={id} onClick={() => setOpen(false)}><small>{String(index + 1).padStart(2, '0')}</small>{label}</a>)}</nav>
                </motion.div>
            </motion.div>
        }</AnimatePresence>
    </>;
}
