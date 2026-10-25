import { useEffect, useRef, useState } from "react";
import {
  Search,
  Sparkles,
  Library,
  Star,
  StickyNote,
  BookOpenCheck,
  Settings,
  Server,
  LoaderCircle,
  Pin,
  X,
  LogOut,
} from "lucide-react";
import { TitleBar } from "./components/ui";
import {
  AssistantPage,
  CodesPage,
  FavoritesPage,
  NotesPage,
  ReferencePage,
  SearchPage,
  SettingsPage,
} from "./pages/pages";
import AuthScreen from "./AuthScreen";

const NAV = [
  ["search", "Поиск", Search],
  ["assistant", "AI", Sparkles],
  ["codes", "Кодексы", Library],
  ["favorites", "Избранное", Star],
  ["notes", "Заметки", StickyNote],
  ["reference", "Справочник", BookOpenCheck],
  ["settings", "Настройки", Settings],
];

function NoteWindow() {
  const [note, setNote] = useState(null);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    document.documentElement.classList.add("note-window-root");
    const unsubscribeLock = window.gosHelper.onNoteClickThrough(setLocked);
    const applyPayload = (payload) => {
      setNote(payload);
      setLocked(Boolean(payload?.pinned));
    };
    const unsubscribePayload = window.gosHelper.onNotePayloadUpdated(applyPayload);
    window.gosHelper.notePayload().then((payload) => {
      applyPayload(payload);
    });
    return () => {
      document.documentElement.classList.remove("note-window-root");
      unsubscribeLock();
      unsubscribePayload();
    };
  }, []);
  const toggleLocked = async () => {
    const pinned = await window.gosHelper.setNotePinned(!locked);
    setLocked(pinned);
    setNote((current) => current ? { ...current, pinned } : current);
  };
  return (
    <main className={`floating-note ${locked ? "locked" : ""}`}>
      <header>
        <div className="floating-note-title"><i /><b>{note?.title || "Заметка"}</b></div>
        <div className="floating-note-actions">
          <button className={locked ? "active" : ""} onClick={toggleLocked} title={locked ? "Открепить заметку" : "Закрепить поверх игры"}>
            <Pin size={14} fill={locked ? "currentColor" : "none"} />
          </button>
          <button onClick={() => window.gosHelper.closeWindow()} title="Закрыть"><X size={16} /></button>
        </div>
      </header>
      <div className="floating-note-body">{note?.body || ""}</div>
      <footer>{locked ? "Курсор проходит сквозь заметку · F10 вернёт управление" : "Нажмите кнопку закрепления для игры"}</footer>
    </main>
  );
}

function MainApp() {
  const [bootstrap, setBootstrap] = useState(null);
  const [auth, setAuth] = useState(null);
  const [state, setState] = useState(null);
  const [database, setDatabase] = useState(null);
  const [page, setPage] = useState("search");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [searchSeed, setSearchSeed] = useState("");
  const [mousePassthrough, setMousePassthrough] = useState(false);
  const [quickNote, setQuickNote] = useState(0);
  const stateRef = useRef(null);
  stateRef.current = state;
  const hasPlus = Boolean(auth?.user?.entitlements?.plus);

  useEffect(() => {
    window.gosHelper.authStatus().then(setAuth).catch((reason) => setAuth({ authenticated: false, error: reason.message }));
  }, []);
  useEffect(() => {
    if (!auth?.authenticated) return undefined;
    const timer = window.setInterval(() => {
      window.gosHelper.authStatus().then(setAuth).catch(() => {});
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [auth?.authenticated]);
  useEffect(() => {
    if (!auth?.authenticated) return;
    window.gosHelper
      .bootstrap()
      .then((data) => {
        setBootstrap(data);
        setState(data.state);
      })
      .catch((reason) => setError(reason.message));
  }, [auth?.authenticated]);
  useEffect(() => {
    if (!state?.settings.server) return;
    let active = true;
    setLoading(true);
    setError("");
    window.gosHelper
      .loadServer(state.settings.server)
      .then((value) => active && setDatabase(value))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [state?.settings.server]);
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => {
      window.gosHelper.saveState(state).catch(() => setToast("Не удалось сохранить настройки"));
    }, 350);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => {
    const saveBeforeClose = () => {
      if (stateRef.current) window.gosHelper.saveStateSync(stateRef.current);
    };
    window.addEventListener("beforeunload", saveBeforeClose);
    return () => window.removeEventListener("beforeunload", saveBeforeClose);
  }, []);
  useEffect(
    () =>
      window.gosHelper.onShortcut((action) => {
        if (action === "new-note") {
          setPage("notes");
          setQuickNote((value) => value + 1);
        }
      }),
    [],
  );
  useEffect(
    () => window.gosHelper.onMainClickThroughChanged(setMousePassthrough),
    [],
  );
  useEffect(
    () => window.gosHelper.onNotePinnedChanged((change) => {
      if (!change?.serverId || !change?.id) return;
      setState((current) => {
        if (!current?.notes?.[change.serverId]) return current;
        const currentNotes = current.notes[change.serverId];
        const nextNotes = currentNotes.map((note) =>
          note.id === change.id ? { ...note, pinned: Boolean(change.pinned), updatedAt: new Date().toISOString() } : note,
        );
        if (nextNotes.every((note, index) => note === currentNotes[index])) return current;
        return { ...current, notes: { ...current.notes, [change.serverId]: nextNotes } };
      });
    }),
    [],
  );
  useEffect(() => {
    if (!state) return;
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.style.setProperty(
      "--ui-scale",
      state.settings.uiScale,
    );
    window.gosHelper.setAlwaysOnTop(state.settings.alwaysOnTop).catch(() => {});
    window.gosHelper.setCompactMode(state.settings.compact).catch(() => {});
    window.gosHelper.setOpacity(state.settings.opacity).catch(() => {});
    window.gosHelper.setNoteOpacity(state.settings.noteOpacity).catch(() => {});
  }, [
    state?.settings.theme,
    state?.settings.uiScale,
    state?.settings.alwaysOnTop,
    state?.settings.compact,
    state?.settings.opacity,
    state?.settings.noteOpacity,
  ]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (page === "assistant" && !hasPlus) setPage("search");
    if (state && !hasPlus && state.settings.theme !== "base") {
      setState((current) => ({ ...current, settings: { ...current.settings, theme: "base" } }));
    }
  }, [hasPlus, page, state?.settings.theme]);

  if (!auth)
    return <div className="splash"><LoaderCircle className="spin" /><b>Проверка допуска…</b></div>;
  if (!auth.authenticated) return <AuthScreen initialError={auth.error} onSuccess={setAuth} />;
  if (!state || !bootstrap)
    return (
      <div className="splash">
        <LoaderCircle className="spin" />
        <b>Veyron • GovHelper</b>
      </div>
    );

  const serverId = state.settings.server;
  const server = bootstrap.servers.find((item) => item.id === serverId);
  const favorites = state.favorites[serverId] || [];
  const notes = state.notes[serverId] || [];
  const updateStateMap = (key, value) =>
    setState((current) => ({
      ...current,
      [key]: { ...current[key], [serverId]: value },
    }));
  const toggleFavorite = (article) => {
    const active =
      favorites.includes(article.uid) || favorites.includes(article.id);
    updateStateMap(
      "favorites",
      active
        ? favorites.filter((id) => id !== article.uid && id !== article.id)
        : [...favorites, article.uid],
    );
  };
  const changeSettings = (patch) =>
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  const showToast = (message) => setToast(message);
  const content = {
    search: (
      <SearchPage
        key={searchSeed}
        database={database}
        favorites={favorites}
        onFavorite={toggleFavorite}
        initialQuery={searchSeed}
      />
    ),
    assistant: (
      <AssistantPage
        database={database}
        onOpenArticle={(article) => {
          setSearchSeed(article.id);
          setPage("search");
        }}
      />
    ),
    codes: (
      <CodesPage
        database={database}
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    ),
    favorites: (
      <FavoritesPage
        database={database}
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    ),
    notes: (
      <NotesPage
        notes={notes}
        onChange={(value) => updateStateMap("notes", value)}
        serverId={serverId}
        createSignal={quickNote}
        onCreateSignalHandled={setQuickNote}
      />
    ),
    reference: <ReferencePage database={database} toast={showToast} />,
    settings: (
      <SettingsPage
        settings={state.settings}
        onChange={changeSettings}
        hasPlus={hasPlus}
        legacyAvailable={bootstrap.legacyAvailable}
        appVersion={bootstrap.appVersion}
        onImport={async () => {
          try {
            const result = await window.gosHelper.importLegacy();
            setState(result.state);
            showToast(
              `Импортировано: ${result.favoritesCount} избранных, ${result.notesCount} заметок`,
            );
          } catch (reason) {
            showToast(reason.message);
          }
        }}
        onUpdate={async () => {
          try {
            const result = await window.gosHelper.updateDatabases();
            showToast(`Обновлено баз: ${result.updated}`);
          } catch (reason) {
            showToast(reason.message);
          }
        }}
      />
    ),
  }[page];

  return (
    <div className={`app-shell ${state.settings.compact ? "compact" : ""}`}>
      <TitleBar
        server={server?.name}
        count={database?.articles.length}
        mousePassthrough={mousePassthrough}
        toggleShortcut={state.settings.toggleShortcut}
        onMousePassthrough={async () => {
          const enabled = !mousePassthrough;
          setMousePassthrough(enabled);
          try { setMousePassthrough(await window.gosHelper.setMainClickThrough(enabled)); }
          catch { setMousePassthrough(false); }
        }}
      />
      <div className="app-body">
        <aside className="sidebar no-drag">
          <div className="server-select">
            <Server size={16} />
            <select
              value={serverId}
              onChange={(event) =>
                changeSettings({ server: event.target.value })
              }
            >
              {bootstrap.servers.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={!item.available}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <nav>
            {NAV.map(([id, label, Icon]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => setPage(id)}
                disabled={id === "assistant" && !hasPlus}
                title={id === "assistant" && !hasPlus ? "Доступно в GOVHelper Plus" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === "assistant" && !hasPlus && <em className="plus-lock">Plus</em>}
                {id === "favorites" && favorites.length > 0 && (
                  <em>{favorites.length}</em>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="account-chip">
              <div><b>{auth.user?.name}</b><small>{auth.user?.plan || "GOVHelper Standard"}</small></div>
              <button title="Выйти из аккаунта" onClick={async () => { await window.gosHelper.logout(); setBootstrap(null); setState(null); setDatabase(null); setAuth({ authenticated: false }); }}><LogOut size={15} /></button>
            </div>
            <div className="developer-credit">
              Разработчик: OKOGEXY
              <br />
              DS: v0pf · v1.0 beta
            </div>
            <div className="sidebar-footer">
              <span className="live-dot" />
              <div>
                <b>Офлайн-база</b>
                <small>{database ? "Готова к работе" : "Загрузка"}</small>
              </div>
            </div>
          </div>
        </aside>
        <main className="workspace">
          {loading ? (
            <div className="page-loader">
              <LoaderCircle className="spin" />
              Загрузка базы…
            </div>
          ) : error ? (
            <div className="page-error">
              <b>Ошибка</b>
              <p>{error}</p>
            </div>
          ) : (
            content
          )}
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  return new URLSearchParams(location.search).has("note") ? <NoteWindow /> : <MainApp />;
}
