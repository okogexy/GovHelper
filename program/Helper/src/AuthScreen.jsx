import { useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, Minus, ShieldCheck, UserRound, X } from "lucide-react";

export default function AuthScreen({ initialError = "", onSuccess }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = mode === "register"
        ? await window.gosHelper.register(name, email, password, passwordConfirmation, terms)
        : await window.gosHelper.login(email, password);
      onSuccess(result);
    }
    catch (reason) { setError(reason.message || "Не удалось связаться с сайтом."); }
    finally { setLoading(false); }
  };
  return (
    <main className="desktop-auth">
      <div className="desktop-auth-titlebar"><b>VEYRON <span>· GOVHELPER</span></b><div><button type="button" onClick={() => window.gosHelper.minimizeWindow()}><Minus size={15} /></button><button type="button" onClick={() => window.gosHelper.closeWindow()}><X size={15} /></button></div></div>
      <section className="desktop-auth-board" aria-hidden="true">
        <div className="auth-board-lines"><i /><i /><i /><i /></div>
        <article className="board-photo board-person"><div /><span>SUBJECT 019</span></article>
        <article className="board-photo board-map"><div /><span>LOS SANTOS · 02:19</span></article>
        <article className="board-file"><b>CASE REPORT</b><i /><i /><i /><em>ACTIVE</em></article>
        <small className="board-sticky">VERIFY<br />IDENTITY</small>
        <header><span>VEYRON INVESTIGATION BUREAU</span><h1>Доступ к<br /><em>материалам дела.</em></h1><p>Единый аккаунт сайта и программы GOVHelper.</p></header>
      </section>
      <form className={`desktop-auth-panel ${mode === "register" ? "is-register" : ""}`} onSubmit={submit}>
        <div className="auth-clearance"><ShieldCheck size={15} /><span>SECURE CONNECTION</span><b>01</b></div>
        <div className="desktop-auth-tabs" role="tablist" aria-label="Аккаунт">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Войти</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Регистрация</button>
        </div>
        <header><span>{mode === "register" ? "НОВОЕ ЛИЧНОЕ ДЕЛО" : "АВТОРИЗАЦИЯ СОТРУДНИКА"}</span><h2>{mode === "register" ? <>Создать<br />доступ</> : <>Вернуться<br />к делу</>}</h2><p>Аккаунт будет общим для сайта и программы.</p></header>
        {mode === "register" && <label><span><UserRound size={13} /> Имя</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя сотрудника" autoComplete="name" minLength={2} maxLength={100} required autoFocus /></label>}
        <label><span><Mail size={13} /> Служебная почта</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="detective@agency.com" autoComplete="email" required autoFocus={mode === "login"} /></label>
        <label><span><LockKeyhole size={13} /> Код доступа</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "12+ символов, цифры и знак" : "••••••••••"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} required /></label>
        {mode === "register" && <>
          <label><span><LockKeyhole size={13} /> Повторите код</span><input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="Повторите пароль" autoComplete="new-password" minLength={12} required /></label>
          <label className="desktop-auth-consent"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required /><span>Принимаю условия использования</span></label>
        </>}
        {error && <div className="desktop-auth-error">{error}</div>}
        <button className="desktop-auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <><span>{mode === "register" ? "Создать аккаунт" : "Открыть архив"}</span><b>→</b></>}</button>
        <div className="desktop-auth-links"><button type="button" onClick={() => window.gosHelper.openAuthWebsite("/forgot-password")}>Забыли пароль?</button><button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Создать аккаунт" : "Уже есть аккаунт"}</button></div>
        <footer><i /> Авторизация проходит через GOVHelper Site</footer>
      </form>
    </main>
  );
}
