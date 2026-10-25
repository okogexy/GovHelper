<div class="evidence-board evidence-board-{{ $variant }}" aria-hidden="true">
    <svg class="evidence-strings" viewBox="0 0 500 350" preserveAspectRatio="none">
        <path d="M78 78 L245 48 L406 105 L350 278 L165 254 Z" />
        <path d="M78 78 L350 278 M245 48 L165 254 M406 105 L165 254" />
        <circle cx="78" cy="78" r="5"/><circle cx="245" cy="48" r="5"/><circle cx="406" cy="105" r="5"/><circle cx="350" cy="278" r="5"/><circle cx="165" cy="254" r="5"/>
    </svg>
    <article class="evidence-card evidence-suspect"><div class="suspect-photo"><i></i></div><span>SUBJECT 01</span><small>LS № 0281</small></article>
    <article class="evidence-card evidence-map"><div><i></i><i></i><i></i></div><span>LOCATION / DOWNTOWN</span></article>
    <article class="evidence-card evidence-print"><div class="fingerprint"></div><span>PRINT 7-A</span></article>
    <article class="evidence-card evidence-report"><b>CASE REPORT</b><i></i><i></i><i></i><em>CLASSIFIED</em></article>
    <article class="evidence-card evidence-photo"><div></div><span>CAM 04 · 02:19</span></article>
    <small class="evidence-note note-one">CHECK<br>ALIBI!</small>
    <small class="evidence-note note-two">@if($variant === 'recovery')ACCESS<br>CODE?@elseif($variant === 'register')NEW<br>CONTACT@else FOLLOW<br>THE MONEY @endif</small>
    <span class="board-label">VEYRON INVESTIGATION UNIT · {{ strtoupper($variant) }}</span>
</div>
