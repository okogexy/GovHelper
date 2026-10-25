import {
  Minus,
  Square,
  X,
  Shield,
  Star,
  Scale,
  ChevronDown,
  Copy,
  Pin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { isFavorite } from "../lib/search";

function HighlightText({ children, terms = [] }) {
  const text = String(children ?? "");
  const useful = [...new Set(terms)]
    .filter((term) => term && term.length > 1)
    .sort((left, right) => right.length - left.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("е", "[её]"));
  if (!useful.length) return text;
  const matcher = new RegExp(`(${useful.join("|")})`, "giu");
  return text.split(matcher).map((part, index) =>
    index % 2 ? <mark className="search-highlight" key={`${part}-${index}`}>{part}</mark> : part,
  );
}

export function TitleBar({ server, count, mousePassthrough, onMousePassthrough, toggleShortcut }) {
  return (
    <header className="titlebar">
      <div className="brand">
        <span className="brand-mark">
          <Shield size={16} />
        </span>
        <b>Veyron <i>•</i> GovHelper</b>
        <em>2</em>
      </div>
      <div className="titlebar-status">
        <span className="live-dot" />
        {server || "Загрузка"}
        <span>{count ? `${count.toLocaleString("ru-RU")} статей` : ""}</span>
      </div>
      <div className="window-actions no-drag">
        <button
          className={mousePassthrough ? "active" : ""}
          onClick={onMousePassthrough}
          aria-pressed={mousePassthrough}
          title={mousePassthrough ? `Курсор проходит сквозь окно · ${toggleShortcut || "горячая клавиша"} вернёт управление` : "Пропускать курсор через окно"}
        >
          <Pin size={15} fill={mousePassthrough ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => window.gosHelper.minimizeWindow()}
          title="Свернуть"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => window.gosHelper.toggleMaximize()}
          title="Развернуть"
        >
          <Square size={13} />
        </button>
        <button
          className="close"
          onClick={() => window.gosHelper.closeWindow()}
          title="Закрыть"
        >
          <X size={17} />
        </button>
      </div>
    </header>
  );
}

export function ArticleCard({
  article,
  favorites,
  onFavorite,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const favorite = isFavorite(article, favorites);
  const highlight = article._searchMatches || [];
  const cleanCopy = (value) => String(value || "")
    .trim()
    .replace(/^[★☆*]+\s*/u, "")
    .trim();
  const title = cleanCopy(article.title) || "Без названия";
  const rawDescription = cleanCopy(article.description);
  const description = title && rawDescription.toLocaleLowerCase("ru").startsWith(title.toLocaleLowerCase("ru"))
    ? rawDescription.slice(title.length).replace(/^[\s:—–.\-]+/u, "").trim()
    : rawDescription;
  const punishment = String(article.punishment || "")
    .trim()
    .replace(/^(?:наказание\s*:\s*)+/iu, "Наказание: ");
  return (
    <article className={`article-card ${expanded ? "expanded" : ""}`}>
      <button
        className="article-main"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <div className="article-heading">
          <span className="article-id"><HighlightText terms={highlight}>{article.id}</HighlightText></span>
          <span className="article-code">
            {article.codeIcon} <HighlightText terms={highlight}>{article.code}</HighlightText>
          </span>
          {article.stars && (
            <span className="article-stars">{article.stars}</span>
          )}
        </div>
        <h3><HighlightText terms={highlight}>{title}</HighlightText></h3>
        {!compact && !expanded && description && <p className="article-preview"><HighlightText terms={highlight}>{description}</HighlightText></p>}
        <ChevronDown className="article-chevron" size={18} />
      </button>
      <button
        className={`favorite-button ${favorite ? "active" : ""}`}
        onClick={() => onFavorite(article)}
        aria-label="Избранное"
      >
        <Star size={18} fill={favorite ? "currentColor" : "none"} />
      </button>
      {punishment && (
        <div className="punishment">
          <Scale size={17} />
          <span><HighlightText terms={highlight}>{punishment}</HighlightText></span>
        </div>
      )}
      {expanded && description && (
        <div className="article-description"><HighlightText terms={highlight}>{description}</HighlightText></div>
      )}
    </article>
  );
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Accordion({ title, children, defaultOpen = false, onCopy }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <article className={`accordion ${open ? "open" : ""}`}>
      <button
        className="accordion-title"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="accordion-body">
          <div>{children}</div>
          {onCopy && (
            <button className="copy-button" onClick={onCopy}>
              <Copy size={14} />
              Копировать
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button onClick={onClose} title="Закрыть" aria-label="Закрыть">
            <X size={19} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
        {actions && <footer>{actions}</footer>}
      </section>
    </div>
  );
}
