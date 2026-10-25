import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    BookOpenCheck,
    ChevronDown,
    ExternalLink,
    Library,
    Minus,
    Pin,
    Search,
    Server,
    Settings,
    Shield,
    Sparkles,
    Square,
    Star,
    StickyNote,
    X,
} from 'lucide-react';

export function ProductTitlebar({ server, articleCount, alwaysOnTop }) {
    return (
        <header className="product-titlebar">
            <div className="product-brand"><span className="product-logo"><Shield /></span><b>Veyron <i>•</i> GovHelper</b><em>2</em></div>
            <div className="product-status"><i />{server}<span>{articleCount.toLocaleString('ru-RU')} статей</span></div>
            <div className="product-window-actions">{alwaysOnTop && <Pin className="active" />}<Minus /><Square /><X /></div>
        </header>
    );
}

export function ProductSidebar({ active, onChange, compact, server }) {
    const items = [
        ['Поиск', Search],
        ['AI', Sparkles],
        ['Кодексы', Library],
        ['Избранное', Star],
        ['Заметки', StickyNote],
        ['Справочник', BookOpenCheck],
        ['Настройки', Settings],
    ];
    return (
        <aside className="product-sidebar">
            <div className="product-server"><Server /><span>{server}</span><ChevronDown /></div>
            <nav aria-label="Разделы приложения">
                {items.map(([label, Icon]) => (
                    <button key={label} className={active === label ? 'active' : ''} onClick={() => onChange(label)} title={label}>
                        <Icon />{!compact && <span>{label}</span>}
                    </button>
                ))}
            </nav>
            {!compact && <small className="product-credit">Разработчик: OKOGEXY<br />DS: v0pf</small>}
        </aside>
    );
}

export function ProductSearch({ query, code, onCode }) {
    return (
        <div className="product-search">
            <header><div><small>БАЗА ЗАКОНОДАТЕЛЬСТВА</small><h3>Быстрый поиск</h3><p>Номер статьи, название, наказание или ключевое слово.</p></div><b>3</b></header>
            <label><Search /><span>{query || 'Например: 12.8 оружие'}</span><kbd>Ctrl K</kbd></label>
            <div className="product-search-tools"><span><Sparkles /> Умный поиск</span><small>понимает опечатки и раскладку</small><code>"точная фраза"</code></div>
            <div className="product-filters">{['Все', 'УК', 'ПК', 'ДК', 'АК', 'Устав', 'Законы'].map((item) => <button key={item} className={(item === 'Все' ? !code : code === item) ? 'active' : ''} onClick={() => onCode(item === 'Все' ? '' : item)}>{item}</button>)}</div>
        </div>
    );
}

export function ProductResults({ phase = 'new', selected, onSelect, detailsVisible, favorite, onFavorite }) {
    const old = [
        ['Статья 12.4', 'Нарушение порядка хранения имущества'],
        ['Статья 12.6', 'Нормативная запись законодательства'],
    ];
    const fresh = [
        ['Статья 12.8', 'Незаконное хранение или использование оружия'],
        ['Статья 12.9', 'Незаконный оборот специальных средств'],
        ['Статья 13.1', 'Неподчинение законному требованию'],
    ];
    const list = phase === 'old' || phase === 'leaving' ? old : fresh;
    return (
        <AnimatePresence mode="popLayout">
            <motion.div className="product-results" key={phase} initial={{ opacity: 0, y: phase === 'new' ? -12 : 12 }} animate={{ opacity: phase === 'leaving' ? 0 : 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                {list.map(([article, title], index) => {
                    const expanded = detailsVisible && index === (Number.isInteger(selected) ? selected : 0);
                    return (
                        <article key={article} className={`product-article ${expanded ? 'expanded' : ''}`}>
                            <button className="product-article-main" onClick={onSelect}>
                                <small><b>{article}</b><span>§ Уголовный кодекс</span>{index === 0 && '★★★☆☆'}</small>
                                <h4>{title}</h4>
                                <p>Описание нарушения, квалификация и порядок процессуальных действий.</p>
                                <ChevronDown />
                            </button>
                            {index === 0 && <button className={`product-favorite ${favorite ? 'active' : ''}`} onClick={onFavorite} aria-label="Избранное"><Star fill={favorite ? 'currentColor' : 'none'} /></button>}
                            {expanded && <><div className="product-punishment"><Shield />Штраф $15 000 или лишение свободы до 4 лет</div><div className="product-description">Запись открывается прямо в списке — так же, как в актуальной версии GovHelper.</div></>}
                        </article>
                    );
                })}
            </motion.div>
        </AnimatePresence>
    );
}

export function ProductSettings({ settings }) {
    const theme = String(settings.theme ?? 'Базовая').toLowerCase();
    return (
        <section className="product-settings">
            <header><small>ПЕРСОНАЛИЗАЦИЯ</small><h3>Настройки</h3><p>Оформление, окно и локальные данные.</p></header>
            <div className="product-settings-grid">
                <article><h4>Окно</h4><div><span>Всегда сверху</span><b>{settings.alwaysOnTop ? 'Включено' : 'Выключено'}</b></div><div><span>Прозрачность</span><b>{Math.round((settings.opacity ?? 1) * 100)}%</b></div><div><span>Масштаб</span><b>{Math.round((settings.scale ?? 1) * 100)}%</b></div><div><span>Компактный режим</span><b>{settings.compact ? 'Включено' : 'Выключено'}</b></div></article>
                <article><h4>Оформление</h4><div className="product-themes">{['Базовая', 'Aurora', 'Midnight', 'Светлая'].map((item) => <span key={item} className={theme.includes(item.toLowerCase()) ? 'active' : ''}><i className={`theme-dot theme-dot-${item.toLowerCase()}`} />{item}</span>)}</div></article>
            </div>
        </section>
    );
}

export function ProductNotes({ notes }) {
    return (
        <section className="product-notes">
            <header><div><small>ШПАРГАЛКИ</small><h3>Заметки</h3><p>Личные записи хранятся только на этом компьютере.</p></div><button>＋ Добавить</button></header>
            <div>{notes.map((note, index) => <article key={note.title} className={index % 2 ? 'dark' : ''}><i /><small>{index === 0 ? 'ЗАКРЕПЛЕНА' : 'ЗАМЕТКА'}</small><b>{note.title}</b><p>{note.text}</p><button><ExternalLink /> Открыть поверх игры</button></article>)}</div>
        </section>
    );
}
