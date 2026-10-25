import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Sparkles,
  Send,
  Mic,
  Plus,
  Pin,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
  MessageCircle,
  WifiOff,
} from "lucide-react";
import { Accordion, ArticleCard, EmptyState, Modal } from "../components/ui";
import {
  FILTERS,
  buildAssistantAnswer,
  isFavorite,
  searchArticles,
} from "../lib/search";
import { REFERENCE_SECTIONS } from "../lib/reference";

export function SearchPage({
  database,
  favorites,
  onFavorite,
  initialQuery = "",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("all");
  const inputRef = useRef(null);
  const [settledQuery, setSettledQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(settledQuery);
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("smart-search-recent") || "[]");
    } catch {
      return [];
    }
  });
  const results = useMemo(
    () => searchArticles(database?.articles || [], deferredQuery, filter),
    [database, deferredQuery, filter],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query), 90);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) setQuery("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const rememberQuery = () => {
    const value = query.trim();
    if (!value) return;
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem("smart-search-recent", JSON.stringify(next)); } catch {}
  };
  return (
    <section className="page search-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">База законодательства</span>
          <h1>Быстрый поиск</h1>
          <p>Номер статьи, название, наказание или ключевое слово.</p>
        </div>
      </div>
      <label className="search-field">
        <Search size={20} />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          maxLength={300}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && rememberQuery()}
          placeholder="Например: 12.8 оружие"
        />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="smart-search-tools">
        <span><Sparkles size={14} /> Умный поиск</span>
        <small>понимает опечатки и раскладку</small>
        <code>"точная фраза"</code>
        <code>-исключить</code>
      </div>
      {!query && recent.length > 0 && (
        <div className="recent-searches">
          <span>Недавние:</span>
          {recent.map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}
        </div>
      )}
      {query.trim().length > 1 && results.length > 0 && (
        <div className="search-suggestions">
          {results.slice(0, 4).map((article) => (
            <button key={article.uid} onClick={() => setQuery(article.id)}>
              <b>{article.id}</b><span>{article.title}</span>
            </button>
          ))}
        </div>
      )}
      <div className="filter-row">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            className={filter === item.id ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="article-list">
        {results.map((article) => (
          <ArticleCard
            key={article.uid}
            article={article}
            favorites={favorites}
            onFavorite={onFavorite}
          />
        ))}
        {!results.length && (
          <EmptyState
            icon="⌕"
            title="Ничего не найдено"
            text="Сократите запрос или выберите другой раздел законодательства."
          />
        )}
      </div>
    </section>
  );
}

export function CodesPage({ database, favorites, onFavorite }) {
  const [codeId, setCodeId] = useState(database?.codes?.[0]?.id);
  const [chapterId, setChapterId] = useState(null);
  const code =
    database?.codes?.find((item) => item.id === codeId) || database?.codes?.[0];
  const chapters = code?.chapters || [];
  const articleIds = chapterId
    ? chapters.find((item) => item.id === chapterId)?.articleIds || []
    : chapters.flatMap((item) => item.articleIds);
  const byId = useMemo(
    () =>
      new Map(
        (database?.articles || []).map((article) => [article.uid, article]),
      ),
    [database],
  );
  return (
    <section className="page codes-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Навигатор</span>
          <h1>Кодексы и законы</h1>
          <p>{database?.codes?.length || 0} документов в базе сервера.</p>
        </div>
      </div>
      <div className="codes-layout">
        <aside className="code-list">
          {database?.codes?.map((item) => (
            <button
              key={item.id}
              className={item.id === code?.id ? "active" : ""}
              onClick={() => {
                setCodeId(item.id);
                setChapterId(null);
              }}
            >
              <span>{item.icon}</span>
              <b>{item.name}</b>
              <small>
                {item.chapters.reduce(
                  (sum, chapter) => sum + chapter.articleIds.length,
                  0,
                )}
              </small>
            </button>
          ))}
        </aside>
        <div className="code-content">
          <div className="chapter-row">
            <button
              className={!chapterId ? "active" : ""}
              onClick={() => setChapterId(null)}
            >
              Все статьи
            </button>
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                className={chapterId === chapter.id ? "active" : ""}
                onClick={() => setChapterId(chapter.id)}
              >
                {chapter.name}
              </button>
            ))}
          </div>
          <div className="article-list">
            {articleIds
              .map((uid) => byId.get(uid))
              .filter(Boolean)
              .map((article) => (
                <ArticleCard
                  key={article.uid}
                  article={article}
                  favorites={favorites}
                  onFavorite={onFavorite}
                  compact
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FavoritesPage({ database, favorites, onFavorite }) {
  const articles = (database?.articles || []).filter((article) =>
    isFavorite(article, favorites),
  );
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Личная подборка</span>
          <h1>Избранное</h1>
          <p>Сохранённые статьи текущего сервера.</p>
        </div>
        <span className="result-count">{articles.length}</span>
      </div>
      <div className="article-list">
        {articles.map((article) => (
          <ArticleCard
            key={article.uid}
            article={article}
            favorites={favorites}
            onFavorite={onFavorite}
          />
        ))}
        {!articles.length && (
          <EmptyState
            icon="☆"
            title="Избранное пусто"
            text="Нажмите звезду на карточке статьи, чтобы быстро вернуться к ней."
          />
        )}
      </div>
    </section>
  );
}

export function NotesPage({ notes, onChange, serverId, createSignal = 0, onCreateSignalHandled }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const orderedNotes = useMemo(
    () => [...notes].sort((left, right) => Number(right.pinned) - Number(left.pinned) || String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt))),
    [notes],
  );
  const save = () => {
    if (!editing?.body?.trim() && !editing?.title?.trim()) return;
    const normalized = {
      ...editing,
      title: editing.title.trim().slice(0, 120) || "Без названия",
      body: editing.body.slice(0, 20000),
      updatedAt: new Date().toISOString(),
    };
    const next = notes.some((item) => item.id === normalized.id)
      ? notes.map((item) => (item.id === normalized.id ? normalized : item))
      : [normalized, ...notes].slice(0, 200);
    onChange(next);
    window.gosHelper.syncNoteWindow({ ...normalized, serverId }).catch(() => {});
    setEditing(null);
  };
  const togglePinned = (note) => {
    const updated = { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() };
    onChange(notes.map((item) => item.id === note.id ? updated : item));
    window.gosHelper.syncNoteWindow({ ...updated, serverId }).catch(() => {});
  };
  const remove = (note) => {
    onChange(notes.filter((item) => item.id !== note.id));
    window.gosHelper.closeNoteWindow({ id: note.id, serverId }).catch(() => {});
    setDeleting(null);
  };
  const create = () =>
    setEditing({
      id: crypto.randomUUID(),
      title: "Новая заметка",
      body: "",
      pinned: false,
      createdAt: new Date().toISOString(),
    });
  useEffect(() => {
    if (!createSignal) return;
    create();
    onCreateSignalHandled?.(0);
  }, [createSignal, onCreateSignalHandled]);
  return (
    <section className="page notes-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Шпаргалки</span>
          <h1>Заметки</h1>
          <p>Личные записи хранятся только на этом компьютере.</p>
        </div>
        <button className="primary-button" onClick={create}>
          <Plus size={17} />
          Добавить
        </button>
      </div>
      <div className="notes-stage">
        <div className="notes-grid">
          {orderedNotes.map((note) => (
            <article className={`note-card ${note.pinned ? "is-pinned" : ""}`} key={note.id}>
              <i className={`note-pin ${note.pinned ? "active" : ""}`} />
              <header>
                <span>{note.pinned ? "Закреплена" : "Заметка"}</span>
                <div className="note-card-actions">
                  <button className={note.pinned ? "active" : ""} title={note.pinned ? "Открепить заметку" : "Закрепить заметку"} aria-label={note.pinned ? "Открепить заметку" : "Закрепить заметку"} onClick={() => togglePinned(note)}><Pin size={14} fill={note.pinned ? "currentColor" : "none"} /></button>
                  <button title="Удалить заметку" aria-label="Удалить заметку" onClick={() => setDeleting(note)}><Trash2 size={15} /></button>
                </div>
              </header>
              <button
                className="note-content"
                onClick={() => setEditing({ ...note })}
              >
                <h3>{note.title}</h3>
                <p>{note.body}</p>
              </button>
              <footer>
                <button onClick={() => window.gosHelper.createNoteWindow({ ...note, serverId })}>
                  <ExternalLink size={14} />
                  Открыть поверх игры
                </button>
              </footer>
            </article>
          ))}
          {!notes.length && (
            <EmptyState
              icon="✎"
              title="Заметок пока нет"
              text="Создайте шпаргалку или импортируйте записи из старого клиента."
              action={
                <button className="primary-button" onClick={create}>
                  <Plus size={16} />
                  Новая заметка
                </button>
              }
            />
          )}
        </div>
      </div>
      {editing && (
        <Modal
          title={
            notes.some((item) => item.id === editing.id)
              ? "Редактирование заметки"
              : "Новая заметка"
          }
          onClose={() => setEditing(null)}
          actions={
            <>
              <button onClick={() => setEditing(null)}>Отмена</button>
              <button className="primary-button" onClick={save}>
                Сохранить
              </button>
            </>
          }
        >
          <label className="form-field">
            <span>Название</span>
            <input
              value={editing.title}
              maxLength={120}
              onChange={(event) =>
                setEditing({ ...editing, title: event.target.value })
              }
            />
          </label>
          <label className="form-field">
            <span>Текст</span>
            <textarea
              rows="9"
              autoFocus
              value={editing.body}
              maxLength={20000}
              onChange={(event) =>
                setEditing({ ...editing, body: event.target.value })
              }
            />
          </label>
          <label className="switch-row">
            <span>
              <b>Закреплять поверх игры</b>
              <small>Окно пропускает мышь и не мешает управлению</small>
            </span>
            <input
              type="checkbox"
              checked={editing.pinned}
              onChange={(event) =>
                setEditing({ ...editing, pinned: event.target.checked })
              }
            />
          </label>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Удалить заметку?"
          onClose={() => setDeleting(null)}
          actions={
            <>
              <button onClick={() => setDeleting(null)}>Отмена</button>
              <button className="danger-button" onClick={() => remove(deleting)}>Удалить</button>
            </>
          }
        >
          <p className="delete-note-warning">«{deleting.title}» будет удалена с этого компьютера, а открытое окно заметки закроется.</p>
        </Modal>
      )}
    </section>
  );
}

export function ReferencePage({ database, toast }) {
  const sections = useMemo(
    () => [
      {
        id: "faq",
        title: "FAQ",
        subtitle: "Практические ответы",
        items: (database?.faq || []).map(({ q, a }) => [q, a]),
      },
      {
        id: "faqPk",
        title: "FAQ ПК",
        subtitle: "Процессуальный кодекс",
        items: (database?.faqPk || []).map(({ q, a }) => [q, a]),
      },
      ...REFERENCE_SECTIONS,
    ],
    [database],
  );
  const [sectionId, setSectionId] = useState("faq");
  const section = sections.find((item) => item.id === sectionId) || sections[0];
  return (
    <section className="page reference-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Справочник</span>
          <h1>{section.title}</h1>
          <p>{section.subtitle}</p>
        </div>
      </div>
      <div className="reference-tabs">
        {sections.map((item) => (
          <button
            key={item.id}
            className={section.id === item.id ? "active" : ""}
            onClick={() => setSectionId(item.id)}
          >
            {item.title}
            <small>{item.items.length}</small>
          </button>
        ))}
      </div>
      <div className="accordion-list">
        {section.items.map(([question, answer], index) => (
          <Accordion
            key={`${question}-${index}`}
            title={question}
            onCopy={() =>
              navigator.clipboard
                .writeText(answer)
                .then(() => toast("Скопировано в буфер обмена"))
                .catch(() => toast("Не удалось скопировать"))
            }
          >
            <p className="pre-line">{answer}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}

export function AssistantPage({ database, onOpenArticle }) {
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const feedRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Я работаю по локальной базе выбранного сервера. Спросите про статью, наказание или порядок действий.",
    },
  ]);
  const askText = (value) => {
    const text = String(value || "").trim().slice(0, 2000);
    if (!text || thinking) return;
    const previous = [...messages].reverse().find((message) => message.role === "assistant" && message.articles?.length);
    setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    setThinking(true);
    window.setTimeout(() => {
      const answer = buildAssistantAnswer(database, text, { articles: previous?.articles || [] });
      setMessages((current) => {
        const next = [...current, { role: "assistant", ...answer }];
        return next.length > 101 ? [next[0], ...next.slice(-100)] : next;
      });
      setThinking(false);
    }, 260);
  };
  const ask = () => askText(question);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);
  return (
    <section className="page assistant-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Локальный режим</span>
          <h1>AI</h1>
          <p>Ответы строятся без отправки текста на внешний сервер.</p>
        </div>
        <span className="offline-badge">
          <Sparkles size={14} />
          Offline
        </span>
      </div>
      <div className="chat-feed" ref={feedRef}>
        {messages.map((message, index) => (
          <article key={index} className={`message ${message.role}`}>
            <span>
              {message.role === "assistant" ? <Sparkles size={15} /> : "Вы"}
            </span>
            <p className="pre-line">{message.text}</p>
            {message.articles?.length > 0 && (
              <div className="assistant-links">
                {message.articles.map((article) => (
                  <button
                    key={article.uid}
                    onClick={() => onOpenArticle(article)}
                  >
                    {article.id} · {article.title}
                  </button>
                ))}
              </div>
            )}
            {message.suggestions?.length > 0 && (
              <div className="assistant-suggestions">
                {message.suggestions.map((suggestion) => <button key={suggestion} onClick={() => askText(suggestion)}>{suggestion}</button>)}
              </div>
            )}
          </article>
        ))}
        {thinking && <article className="message assistant thinking"><span><Sparkles size={15} /></span><p><i /><i /><i /></p></article>}
      </div>
      <div className="composer">
        <button title="Голосовой ввод пока недоступен" disabled aria-label="Голосовой ввод пока недоступен">
          <Mic size={18} />
        </button>
        <textarea
          rows="2"
          value={question}
          maxLength={2000}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask();
            }
          }}
          placeholder="В каком случае можно…"
        />
        <button className="send" onClick={ask} disabled={thinking || !question.trim()}>
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}

export function ChatPage({ server, messages, onChange }) {
  const [text, setText] = useState("");
  const feedRef = useRef(null);
  const send = () => {
    if (!text.trim()) return;
    onChange([
      ...messages,
      {
        id: crypto.randomUUID(),
        author: "Вы",
        text: text.trim(),
        createdAt: new Date().toISOString(),
      },
    ].slice(-500));
    setText("");
  };
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);
  return (
    <section className="page chat-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Локальный канал · {server}</span>
          <h1>Чат экипажа</h1>
          <p>
            Черновой офлайн-канал. Внешний чат можно подключить в настройках.
          </p>
        </div>
        <span className="offline-badge">
          <WifiOff size={14} />
          Локально
        </span>
      </div>
      <div className="chat-feed" ref={feedRef}>
        {messages.map((message) => (
          <article key={message.id} className="message assistant">
            <span>
              <MessageCircle size={14} />
              {message.author}
            </span>
            <p>{message.text}</p>
            <time>
              {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </article>
        ))}
        {!messages.length && (
          <EmptyState
            icon="◌"
            title="Сообщений нет"
            text="Запишите короткое сообщение для текущей сессии или настройте сетевой API."
          />
        )}
      </div>
      <div className="composer">
        <textarea
          rows="2"
          value={text}
          maxLength={4000}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Сообщение…"
        />
        <button className="send" onClick={send}>
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}

export function SettingsPage({
  settings,
  onChange,
  hasPlus,
  legacyAvailable,
  onImport,
  onUpdate,
  appVersion,
}) {
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [shortcutError, setShortcutError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [importing, setImporting] = useState(false);
  const shortcutCapture = useRef({ active: false, original: settings.toggleShortcut || "" });
  const runUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try { await onUpdate(); } finally { setUpdating(false); }
  };
  const runImport = async () => {
    if (importing || !legacyAvailable) return;
    setImporting(true);
    try { await onImport(); } finally { setImporting(false); }
  };
  useEffect(() => () => {
    if (shortcutCapture.current.active) {
      window.gosHelper.setToggleShortcut(shortcutCapture.current.original).catch(() => {});
    }
  }, []);
  const beginShortcutRecording = async (event) => {
    shortcutCapture.current = { active: true, original: settings.toggleShortcut || "" };
    try {
      await window.gosHelper.setToggleShortcut("");
      setShortcutError("");
      setRecordingShortcut(true);
      event.currentTarget.focus();
    } catch (reason) {
      shortcutCapture.current.active = false;
      setShortcutError(reason?.message || "Не удалось изменить сочетание");
    }
  };
  const restoreShortcut = async () => {
    if (!shortcutCapture.current.active) return;
    try { await window.gosHelper.setToggleShortcut(shortcutCapture.current.original); }
    catch (reason) { setShortcutError(reason?.message || "Не удалось восстановить сочетание"); }
    shortcutCapture.current.active = false;
    setRecordingShortcut(false);
  };
  const recordShortcut = async (event) => {
    if (!recordingShortcut || event.repeat) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") return restoreShortcut();
    if (event.key === "Backspace" || event.key === "Delete") {
      onChange({ toggleShortcut: "" });
      shortcutCapture.current.active = false;
      setRecordingShortcut(false);
      return;
    }
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
    let key = event.key;
    if (/^f(?:[1-9]|1\d|2[0-4])$/i.test(key)) key = key.toUpperCase();
    else if (event.code === "Backslash" || key === "\\" || key === "|") key = "\\";
    else if (event.code === "Slash" || key === "/") key = "/";
    else if (/^[a-z0-9]$/i.test(key)) key = key.toUpperCase();
    else if (key === " ") key = "Space";
    else if (key !== "Tab") {
      setShortcutError("Эта клавиша не поддерживается");
      return;
    }
    const modifiers = [];
    if (event.ctrlKey) modifiers.push("CommandOrControl");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");
    if (event.metaKey && !event.ctrlKey) modifiers.push("Command");
    if (!modifiers.length && !key.startsWith("F") && key !== "\\" && key !== "/") {
      setShortcutError("Для букв и цифр используйте Ctrl, Alt или Shift");
      return;
    }
    const accelerator = [...modifiers, key].join("+");
    let result;
    try { result = await window.gosHelper.setToggleShortcut(accelerator); }
    catch (reason) {
      setShortcutError(reason?.message || "Не удалось назначить сочетание");
      return;
    }
    if (!result.ok) {
      setShortcutError(result.error);
      return;
    }
    onChange({ toggleShortcut: accelerator });
    shortcutCapture.current.active = false;
    setShortcutError("");
    setRecordingShortcut(false);
  };
  return (
    <section className="page settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Veyron • GovHelper · v1.0 beta</span>
          <h1>Настройки</h1>
          <p>Интерфейс, оверлей и локальные данные.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>Поверх игры</h2>
          <label className="switch-row">
            <span>
              <b>Всегда поверх игры</b>
              <small>Окно не скрывается за GTA V</small>
            </span>
            <input
              type="checkbox"
              checked={settings.alwaysOnTop}
              onChange={(event) =>
                onChange({ alwaysOnTop: event.target.checked })
              }
            />
          </label>
          <p className="settings-note">Работает отдельно от Pin. Pin пропускает курсор сквозь программу; {settings.toggleShortcut || "горячая клавиша показа"} возвращает управление.</p>
        </section>
        <section className="settings-card">
          <h2>Окно и масштаб</h2>
          <label className="switch-row">
            <span>
              <b>Компактный режим</b>
              <small>Узкая компоновка для игры</small>
            </span>
            <input
              type="checkbox"
              checked={settings.compact}
              onChange={(event) => onChange({ compact: event.target.checked })}
            />
          </label>
          <label className="range-row">
            <span>
              <b>Прозрачность</b>
              <output>{Math.round(settings.opacity * 100)}%</output>
            </span>
            <input
              type="range"
              min="45"
              max="100"
              value={Math.round(settings.opacity * 100)}
              onChange={(event) =>
                onChange({ opacity: Number(event.target.value) / 100 })
              }
            />
          </label>
          <label className="range-row">
            <span>
              <b>Прозрачность заметок</b>
              <output>{Math.round((settings.noteOpacity ?? 0.94) * 100)}%</output>
            </span>
            <input
              type="range"
              min="35"
              max="100"
              value={Math.round((settings.noteOpacity ?? 0.94) * 100)}
              onChange={(event) =>
                onChange({ noteOpacity: Number(event.target.value) / 100 })
              }
            />
          </label>
          <label className="range-row">
            <span>
              <b>Масштаб</b>
              <output>{Math.round(settings.uiScale * 100)}%</output>
            </span>
            <input
              type="range"
              min="75"
              max="135"
              value={Math.round(settings.uiScale * 100)}
              onChange={(event) =>
                onChange({ uiScale: Number(event.target.value) / 100 })
              }
            />
          </label>
        </section>
        <section className="settings-card">
          <h2>Оформление <span className="plus-feature-badge">Plus</span></h2>
          {!hasPlus && <p className="plus-feature-note">Темы доступны после покупки GOVHelper Plus.</p>}
          <div className="theme-picker">
            {["base", "aurora", "midnight", "light"].map((theme) => (
              <button
                key={theme}
                className={settings.theme === theme ? "active" : ""}
                onClick={() => onChange({ theme })}
                disabled={!hasPlus}
                title={!hasPlus ? "Доступно в GOVHelper Plus" : undefined}
              >
                <i className={`theme-${theme}`} />
                {theme === "base"
                  ? "Базовая"
                  : theme === "aurora"
                    ? "Aurora"
                  : theme === "midnight"
                    ? "Midnight"
                    : "Светлая"}
              </button>
            ))}
          </div>
          <div className="shortcut-editor">
            <div>
              <b>Показать / скрыть главное окно</b>
              <small>Работает глобально · поддерживает \, / и |</small>
            </div>
            <button
              className={recordingShortcut ? "recording" : ""}
              onClick={beginShortcutRecording}
              onKeyDown={recordShortcut}
              onBlur={restoreShortcut}
            >
              {recordingShortcut ? "Нажмите клавишу…" : settings.toggleShortcut || "Не назначено"}
            </button>
            <button
              className="shortcut-clear"
              onMouseDown={(event) => event.preventDefault()}
              onClick={async () => {
                await window.gosHelper.setToggleShortcut("");
                onChange({ toggleShortcut: "" });
                shortcutCapture.current.active = false;
                setRecordingShortcut(false);
                setShortcutError("");
              }}
            >
              Сбросить
            </button>
            {shortcutError && <em>{shortcutError}</em>}
          </div>
        </section>
        <section className="settings-card wide">
          <h2>Базы и перенос данных</h2>
          <div className="settings-actions">
            <button onClick={runUpdate} disabled={updating}>
              <RefreshCw size={17} />
              {updating ? "Обновление…" : "Проверить обновления"}
            </button>
            <button onClick={runImport} disabled={!legacyAvailable || importing}>
              <Download size={17} />
              {importing ? "Импорт…" : "Импорт из старого клиента"}
            </button>
          </div>
          <label className="form-field">
            <span>HTTPS-манифест баз</span>
            <input
              value={settings.databaseManifestUrl}
              onChange={(event) =>
                onChange({ databaseManifestUrl: event.target.value })
              }
            />
          </label>
          <p className="settings-note">
            Офлайн-базы уже включены. Обновление не удаляет избранное и заметки.
            Лицензионные ключи старого клиента не импортируются.
          </p>
        </section>
      </div>
    </section>
  );
}
