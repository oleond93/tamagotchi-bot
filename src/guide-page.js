// guide-page.js — повний веб-гайд по грі (лор + усі механіки), самодостатня HTML-сторінка.
// Віддається воркером на /guide (та аліас /gide). Значення синхронні з кодом —
// при зміні механік онови ЦЕЙ файл разом із game-schema.html (див. AGENTS.md).
// Шрифти/стилі — інлайн; жодних залежностей. Усередині шаблон-літерала немає `backtick`/${...}.

export const GUIDE_HTML = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>📖 Повний гайд — Тамагочі-бот</title>
<meta name="description" content="Повний путівник по грі: лор, показники, догляд, еволюція, вдача, характери, емоції, памʼять, проактивність, події, досягнення." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800&family=Onest:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
<style>
  :root{
    --bg:#080a14; --bg2:#0d1020; --panel:#12172b; --panel2:#171d36;
    --line:#262e4d; --line2:#343d63;
    --ink:#eef0fb; --mut:#9aa3c9; --dim:#6b7299;
    --acc:#8b6cff; --acc2:#c06bff; --glow:rgba(139,108,255,.45);
    --gold:#f5c451; --good:#3ecf8e; --warn:#f5c451; --bad:#ff6b6b;
    --rad:16px; --maxw:980px; --side:300px; --top:56px;
    --shadow:0 18px 50px -22px rgba(0,0,0,.8);
    --display:'Unbounded',system-ui,sans-serif;
    --body:'Onest',system-ui,sans-serif;
    --mono:'JetBrains Mono',ui-monospace,monospace;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    margin:0; background:var(--bg); color:var(--ink);
    font-family:var(--body); line-height:1.62; font-size:16px;
    -webkit-font-smoothing:antialiased;
    background-image:
      radial-gradient(1100px 700px at 78% -8%, rgba(139,108,255,.16), transparent 60%),
      radial-gradient(900px 600px at 8% 12%, rgba(192,107,255,.10), transparent 55%),
      radial-gradient(700px 500px at 50% 108%, rgba(245,196,81,.06), transparent 60%);
    background-attachment:fixed;
  }
  /* зорі + шум */
  body::before{
    content:""; position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.5;
    background-image:
      radial-gradient(1.4px 1.4px at 20% 30%, #fff8, transparent),
      radial-gradient(1.2px 1.2px at 70% 65%, #cdbcff99, transparent),
      radial-gradient(1px 1px at 40% 80%, #fff6, transparent),
      radial-gradient(1.6px 1.6px at 85% 22%, #ffe9a688, transparent),
      radial-gradient(1px 1px at 12% 70%, #fff5, transparent),
      radial-gradient(1.3px 1.3px at 58% 12%, #fff7, transparent);
    background-repeat:no-repeat;
  }
  body::after{
    content:""; position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.035;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  /* читацький прогрес */
  #progress{position:fixed; top:0; left:0; height:3px; width:0;
    background:linear-gradient(90deg,var(--acc),var(--acc2),var(--gold)); z-index:60; box-shadow:0 0 12px var(--glow);}
  /* топбар */
  .topbar{position:fixed; top:0; left:0; right:0; height:var(--top); z-index:50;
    display:flex; align-items:center; gap:12px; padding:0 16px;
    background:rgba(8,10,20,.78); backdrop-filter:blur(12px); border-bottom:1px solid var(--line);}
  .brand{font-family:var(--display); font-weight:800; font-size:16px; letter-spacing:.3px;
    display:flex; align-items:center; gap:9px; white-space:nowrap;}
  .brand .badge{font-family:var(--mono); font-size:10px; color:var(--acc2); border:1px solid var(--line2);
    padding:2px 7px; border-radius:999px; background:var(--panel);}
  .topbar .spacer{flex:1}
  .menu-btn{display:none; background:var(--panel); color:var(--ink); border:1px solid var(--line2);
    border-radius:10px; width:40px; height:38px; font-size:18px; cursor:pointer;}
  /* розкладка */
  .shell{position:relative; z-index:1; max-width:1340px; margin:0 auto; padding-top:var(--top);
    display:grid; grid-template-columns:var(--side) minmax(0,1fr); gap:0;}
  /* сайдбар */
  .sidebar{position:sticky; top:var(--top); align-self:start; height:calc(100vh - var(--top));
    overflow-y:auto; padding:20px 14px 60px; border-right:1px solid var(--line);
    scrollbar-width:thin; scrollbar-color:var(--line2) transparent;}
  .sidebar::-webkit-scrollbar{width:8px} .sidebar::-webkit-scrollbar-thumb{background:var(--line2); border-radius:8px}
  .search{width:100%; background:var(--panel); border:1px solid var(--line2); color:var(--ink);
    border-radius:11px; padding:10px 12px; font-family:var(--body); font-size:13.5px; margin-bottom:14px;}
  .search::placeholder{color:var(--dim)}
  .search:focus{outline:none; border-color:var(--acc); box-shadow:0 0 0 3px var(--glow)}
  .nav-group{margin-bottom:16px}
  .nav-cat{font-family:var(--display); font-weight:600; font-size:10.5px; letter-spacing:1.6px;
    text-transform:uppercase; color:var(--dim); padding:0 10px 7px;}
  .nav-link{display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:10px;
    color:var(--mut); text-decoration:none; font-size:14px; line-height:1.3; transition:.16s;}
  .nav-link:hover{background:var(--panel); color:var(--ink)}
  .nav-link.active{background:linear-gradient(90deg,rgba(139,108,255,.22),transparent);
    color:#fff; box-shadow:inset 2px 0 0 var(--acc);}
  /* контент */
  main{padding:0 clamp(18px,4vw,56px) 120px; max-width:calc(var(--maxw) + 112px);}
  .hero{padding:54px 0 30px; border-bottom:1px solid var(--line); margin-bottom:10px;}
  .eyebrow{font-family:var(--mono); font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--acc2);}
  .hero h1{font-family:var(--display); font-weight:800; font-size:clamp(34px,6vw,60px);
    line-height:1.02; margin:14px 0 16px; letter-spacing:-.5px;
    background:linear-gradient(120deg,#fff 20%,#cdbcff 60%,var(--gold)); -webkit-background-clip:text;
    background-clip:text; color:transparent;}
  .hero p.lead{font-size:18px; color:var(--mut); max-width:60ch; margin:0}
  .hero .chips{display:flex; flex-wrap:wrap; gap:8px; margin-top:22px}
  .chip{font-size:12.5px; color:var(--mut); background:var(--panel); border:1px solid var(--line2);
    border-radius:999px; padding:5px 12px;}
  section{padding:46px 0 8px; scroll-margin-top:calc(var(--top) + 14px); border-top:1px solid var(--line);}
  section:first-of-type{border-top:none}
  .sec-head{display:flex; align-items:baseline; gap:14px; margin-bottom:6px;}
  .sec-num{font-family:var(--mono); font-size:13px; color:var(--acc2); border:1px solid var(--line2);
    border-radius:9px; padding:3px 9px; background:var(--panel);}
  h2{font-family:var(--display); font-weight:700; font-size:clamp(23px,3.4vw,32px); margin:0; letter-spacing:-.3px;}
  h3{font-family:var(--display); font-weight:600; font-size:17px; margin:26px 0 10px; color:#fff;}
  .sub{color:var(--mut); margin:8px 0 18px; max-width:70ch;}
  p{margin:10px 0}
  a.inline{color:var(--acc2); text-decoration:none; border-bottom:1px dotted var(--line2)}
  /* картки/панелі */
  .card{background:linear-gradient(180deg,var(--panel),var(--bg2)); border:1px solid var(--line);
    border-radius:var(--rad); padding:18px 20px; margin:14px 0; box-shadow:var(--shadow);}
  .grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px}
  .note{font-size:13.5px; color:var(--mut); border-left:3px solid var(--acc); background:rgba(139,108,255,.07);
    padding:11px 15px; border-radius:0 11px 11px 0; margin:14px 0;}
  .note.gold{border-left-color:var(--gold); background:rgba(245,196,81,.07)}
  .note.bad{border-left-color:var(--bad); background:rgba(255,107,107,.07)}
  /* таблиці */
  .tbl{width:100%; border-collapse:collapse; font-size:14px; overflow:hidden; border-radius:12px;
    border:1px solid var(--line); margin:10px 0;}
  .tbl th,.tbl td{text-align:left; padding:10px 13px; border-bottom:1px solid var(--line); vertical-align:top}
  .tbl th{font-family:var(--display); font-weight:600; font-size:11px; letter-spacing:.6px; text-transform:uppercase;
    color:var(--mut); background:var(--panel2);}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tbody tr:hover{background:rgba(139,108,255,.05)}
  .scroll-x{overflow-x:auto; -webkit-overflow-scrolling:touch}
  code,.mono{font-family:var(--mono); font-size:12.5px; background:#0009; color:#d7ddff;
    padding:2px 7px; border-radius:6px; border:1px solid var(--line);}
  .pos{color:var(--good)} .neg{color:var(--bad)} .neu{color:var(--warn)}
  .pill{display:inline-block; background:var(--panel2); border:1px solid var(--line2); color:var(--mut);
    border-radius:999px; padding:3px 11px; margin:3px 5px 3px 0; font-size:13px;}
  .kbd{font-family:var(--mono); font-size:12px; background:var(--panel2); border:1px solid var(--line2);
    border-bottom-width:2px; border-radius:7px; padding:2px 8px; color:#fff;}
  /* картки-істоти */
  .beast{display:grid; grid-template-columns:54px 1fr; gap:14px; align-items:start;}
  .beast .face{font-size:34px; line-height:1; filter:drop-shadow(0 4px 12px var(--glow))}
  .beast h4{margin:0 0 3px; font-family:var(--display); font-weight:600; font-size:16px}
  .beast .meta{font-size:12.5px; color:var(--dim)}
  .beast p{margin:6px 0 0; font-size:13.5px; color:var(--mut)}
  /* поява */
  .reveal{opacity:0; transform:translateY(16px); transition:opacity .6s ease, transform .6s ease}
  .reveal.in{opacity:1; transform:none}
  /* назад нагору */
  #toTop{position:fixed; right:20px; bottom:20px; z-index:40; width:46px; height:46px; border-radius:50%;
    background:var(--panel); border:1px solid var(--line2); color:#fff; font-size:18px; cursor:pointer;
    opacity:0; pointer-events:none; transition:.25s; box-shadow:var(--shadow);}
  #toTop.show{opacity:1; pointer-events:auto}
  #toTop:hover{border-color:var(--acc); box-shadow:0 0 0 3px var(--glow)}
  #scrim{position:fixed; inset:0; z-index:45; background:rgba(4,6,14,.6); backdrop-filter:blur(2px);
    opacity:0; pointer-events:none; transition:.2s;}
  footer{border-top:1px solid var(--line); margin-top:40px; padding:26px 0; color:var(--dim); font-size:13px}
  /* адаптив */
  @media (max-width: 900px){
    .menu-btn{display:block}
    .shell{grid-template-columns:1fr}
    .sidebar{position:fixed; top:var(--top); left:0; bottom:0; width:min(86vw,320px); z-index:48;
      background:var(--bg2); transform:translateX(-105%); transition:transform .26s ease; border-right:1px solid var(--line2);}
    body.nav-open .sidebar{transform:none}
    body.nav-open #scrim{opacity:1; pointer-events:auto}
  }
</style>
</head>
<body>
<div id="progress"></div>
<header class="topbar">
  <button class="menu-btn" id="menuBtn" aria-label="Меню">☰</button>
  <div class="brand">🐣 Тамагочі <span class="badge">ПОВНИЙ ГАЙД</span></div>
  <div class="spacer"></div>
</header>
<div id="scrim"></div>

<div class="shell">
  <!-- НАВІГАЦІЯ -->
  <aside class="sidebar" id="sidebar">
    <input class="search" id="navSearch" type="text" placeholder="🔎 Пошук по розділах…" autocomplete="off" />
    <nav>
      <div class="nav-group">
        <div class="nav-cat">Основи</div>
        <a class="nav-link" data-target="lore" href="#lore">📜 Лор і світ</a>
        <a class="nav-link" data-target="start" href="#start">🚀 Швидкий старт</a>
        <a class="nav-link" data-target="loop" href="#loop">🔁 Ігровий цикл</a>
      </div>
      <div class="nav-group">
        <div class="nav-cat">Догляд</div>
        <a class="nav-link" data-target="stats" href="#stats">📊 Показники</a>
        <a class="nav-link" data-target="decay" href="#decay">📉 Занепад і ніч</a>
        <a class="nav-link" data-target="actions" href="#actions">🔘 Дії догляду</a>
        <a class="nav-link" data-target="death" href="#death">💀 Смерть і воскресіння</a>
      </div>
      <div class="nav-group">
        <div class="nav-cat">Розвиток</div>
        <a class="nav-link" data-target="stages" href="#stages">🧬 Стадії еволюції</a>
        <a class="nav-link" data-target="forms" href="#forms">🌿 Гілчаста фінальна форма</a>
        <a class="nav-link" data-target="temperament" href="#temperament">🧬 Вдача</a>
        <a class="nav-link" data-target="persona" href="#persona">🎭 Характер</a>
        <a class="nav-link" data-target="class" href="#class">🎮 Характер як «клас»</a>
        <a class="nav-link" data-target="abilities" href="#abilities">✨ Фірмові здібності</a>
      </div>
      <div class="nav-group">
        <div class="nav-cat">Живість</div>
        <a class="nav-link" data-target="emotions" href="#emotions">💞 Емоції</a>
        <a class="nav-link" data-target="memory" href="#memory">🧠 Памʼять</a>
        <a class="nav-link" data-target="proactivity" href="#proactivity">🔔 Проактивність</a>
        <a class="nav-link" data-target="chat" href="#chat">💬 Чат і характер</a>
      </div>
      <div class="nav-group">
        <div class="nav-cat">Контент і мета</div>
        <a class="nav-link" data-target="events" href="#events">🎲 Події</a>
        <a class="nav-link" data-target="achievements" href="#achievements">🏆 Досягнення</a>
        <a class="nav-link" data-target="systems" href="#systems">⚙️ Стрік і час доби</a>
        <a class="nav-link" data-target="commands" href="#commands">⌨️ Команди й кнопки</a>
        <a class="nav-link" data-target="faq" href="#faq">❓ FAQ і поради</a>
      </div>
    </nav>
  </aside>

  <!-- КОНТЕНТ -->
  <main>
    <div class="hero reveal">
      <div class="eyebrow">Повний путівник · усі механіки до дрібниць</div>
      <h1>Як живе твій<br/>тамагочі</h1>
      <p class="lead">Таємнича істота оселилась у твоєму Телеграмі. Вона росте, має настрій, характер і памʼять — майже як жива. Цей гайд пояснює геть усе: від лору до формул занепаду й розгалуження фінальних форм.</p>
      <div class="chips">
        <span class="chip">8 показників</span>
        <span class="chip">6 стадій → 12 фінальних форм</span>
        <span class="chip">5 вдач · 7 характерів</span>
        <span class="chip">8 емоцій</span>
        <span class="chip">памʼять і проактивність</span>
        <span class="chip">23 досягнення · 60 подій</span>
      </div>
    </div>

    <!-- ЛОР -->
    <section id="lore" class="reveal">
      <div class="sec-head"><span class="sec-num">01</span><h2>📜 Лор і світ</h2></div>
      <p class="sub">Звідки воно взялося і чому твій догляд — це доля цілої істоти.</p>
      <div class="card">
        <p>Тобі дісталось <b>таємниче яйце</b> 🥚. Усередині хтось є — тихо пульсує теплом і чогось чекає. Хто саме? Поки не знає ніхто… навіть воно саме.</p>
        <p>Твоя роль проста й водночас велика: <b>дбати про нього</b>. Воно росте, змінюється, має настрій, потреби, характер і навіть памʼять. А <b>ким воно стане — вирішуєш ти</b>: те, як ти грієш яйце й доглядаєш малечу, формує його <b>вдачу</b> й <b>характер</b>, а ті, своєю чергою, визначають аж до <b>фінальної форми</b> — від світлого янгола до хаос-демона.</p>
        <p>Тон гри — <b>абсурдно-фановий</b>: істота капризує, жартує, драматизує й сама пише тобі, коли засумує. Це не змагання на швидкість, а супутник на щодень. Найкраще тут — побачити власноруч, ким воно виросте.</p>
      </div>
      <div class="note gold">🤫 Гра навмисне не розкриває фінал наперед. Але цей гайд — для тих, хто хоче знати, як працює кожна шестерня.</div>
    </section>

    <!-- СТАРТ -->
    <section id="start" class="reveal">
      <div class="sec-head"><span class="sec-num">02</span><h2>🚀 Швидкий старт</h2></div>
      <p class="sub">Перші кроки за хвилину.</p>
      <div class="card">
        <ol>
          <li>Напиши боту <span class="kbd">/start</span> — отримаєш яйце й даси йому <b>імʼя</b>.</li>
          <li>Грій яйце кнопкою <b>🔥 Гріти</b> (на цій стадії важливе лише тепло). Тепло яйця визначить майбутню <b>вдачу</b>.</li>
          <li>Через ~добу воно <b>вилупиться</b>. Далі — годуй, грайся, мий, спілкуйся: набір потреб росте зі стадіями.</li>
          <li>Просто <b>пиши</b> йому — відповідатиме у своєму характері, памʼятатиме розмову й факти про тебе.</li>
          <li>Усе найзручніше — кнопками під карткою <span class="kbd">/status</span>. Кнопки <b>«📊 Картка»</b> й <b>«📖 Гайд»</b> завжди біля поля вводу.</li>
        </ol>
      </div>
      <div class="note">💡 Бот спільний для всіх: кожен чат отримує власну істоту. Нічого встановлювати не треба.</div>
    </section>

    <!-- ЦИКЛ -->
    <section id="loop" class="reveal">
      <div class="sec-head"><span class="sec-num">03</span><h2>🔁 Ігровий цикл</h2></div>
      <p class="sub">Як усе зчеплене між собою.</p>
      <div class="card">
        <p><b>Час іде → показники спадають.</b> Ти <b>відновлюєш</b> їх діями. Дії й розмови <b>ліплять характер</b>, а догляд за яйцем — <b>вдачу</b>. <b>Вік</b> рухає <b>стадії еволюції</b>, які відкривають нові показники й дії. Емоції від розмов і події тимчасово впливають на стан. Характер + вдача + стадія + памʼять формують <b>унікальну особистість</b> — і, врешті, <b>фінальну форму</b>.</p>
        <p>Коли ти мовчиш — істота <b>сама пише першим</b> (удень), а вночі не турбує. За все це нараховуються <b>досягнення</b> й <b>денний стрік</b>.</p>
      </div>
    </section>

    <!-- ПОКАЗНИКИ -->
    <section id="stats" class="reveal">
      <div class="sec-head"><span class="sec-num">04</span><h2>📊 Показники</h2></div>
      <p class="sub">8 потреб. На кожній стадії активні лише деякі з них.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Показник</th><th>Що означає</th><th>Відновлює дія</th></tr></thead>
        <tbody>
          <tr><td>🔥 Тепло</td><td>Щоб не змерзнути (критичне для яйця)</td><td>🔥 Гріти</td></tr>
          <tr><td>🍗 Ситість</td><td>Голод — найшвидше спадає</td><td>🍗 Годувати</td></tr>
          <tr><td>🛁 Чистота</td><td>Гігієна</td><td>🛁 Мити</td></tr>
          <tr><td>⚡ Енергія</td><td>Бадьорість, не виснажитись</td><td>😴 Спати</td></tr>
          <tr><td>🎉 Настрій</td><td>Загальне щастя</td><td>🎮 Гратися</td></tr>
          <tr><td>🤪 Психіка</td><td>Зʼявляється з підліткової стадії</td><td>🧘 Заспокоїти</td></tr>
          <tr><td>🫂 Спілкування</td><td>Потреба в увазі (пізні стадії)</td><td>🫂 Спілкуватись</td></tr>
          <tr><td>🌌 Сенс буття</td><td>Екзистенція (фінальні стадії)</td><td>🌌 Медитувати</td></tr>
        </tbody>
      </table></div>
      <div class="note">Світлофор у картці: <span class="pos">🟢 ≥60%</span> · <span class="neu">🟡 30–59%</span> · <span class="neg">🔴 &lt;30%</span>. Доступні лише ті дії, чий показник активний на поточній стадії.</div>
    </section>

    <!-- ЗАНЕПАД -->
    <section id="decay" class="reveal">
      <div class="sec-head"><span class="sec-num">05</span><h2>📉 Занепад і ніч</h2></div>
      <p class="sub">Швидкості підібрані так, щоб був привід заходити частіше — але пережити сон.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Показник</th><th>За годину (день)</th><th>100%→0% удень</th><th>Уночі (×0.18)</th></tr></thead>
        <tbody>
          <tr><td>🍗 Ситість</td><td><span class="mono">66</span></td><td>~1.5 год</td><td>~8 год</td></tr>
          <tr><td>🔥 Тепло</td><td><span class="mono">60</span></td><td>~1.7 год</td><td>~9 год</td></tr>
          <tr><td>🎉 Настрій</td><td><span class="mono">55</span></td><td>~1.8 год</td><td>~10 год</td></tr>
          <tr><td>⚡ Енергія</td><td><span class="mono">50</span></td><td>~2.0 год</td><td>~11 год</td></tr>
          <tr><td>🛁 Чистота</td><td><span class="mono">45</span></td><td>~2.2 год</td><td>~12 год</td></tr>
          <tr><td>🫂 Спілкування</td><td><span class="mono">45</span></td><td>~2.2 год</td><td>~12 год</td></tr>
          <tr><td>🤪 Психіка</td><td><span class="mono">40</span></td><td>~2.5 год</td><td>~14 год</td></tr>
          <tr><td>🌌 Сенс буття</td><td><span class="mono">35</span></td><td>~2.9 год</td><td>~16 год</td></tr>
        </tbody>
      </table></div>
      <div class="note gold">🌙 <b>Нічне сповільнення:</b> з 22:00 до 08:00 (за локальним часом, типово Київ +3) занепад множиться на <span class="mono">0.18</span> — приблизно у 5.5 раза повільніше, щоб істота пережила сон.</div>
      <div class="note">⚖️ <b>Характер впливає на занепад!</b> Кожен архетип має пасиви-множники (напр., 🌞 Сонечко повільніше втрачає настрій). Деталі — у розділі «Характер як клас».</div>
    </section>

    <!-- ДІЇ -->
    <section id="actions" class="reveal">
      <div class="sec-head"><span class="sec-num">06</span><h2>🔘 Дії догляду</h2></div>
      <p class="sub">Кожна дія відновлює свій показник, але має побічні ефекти.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Кнопка</th><th>Відновлює</th><th>Ефекти</th></tr></thead>
        <tbody>
          <tr><td>🔥 Гріти</td><td>Тепло</td><td><span class="pos">warmth +45</span>, <span class="pos">mood +5</span></td></tr>
          <tr><td>🍗 Годувати</td><td>Ситість</td><td><span class="pos">hunger +40</span>, <span class="neg">hygiene −5</span>, <span class="pos">mood +3</span></td></tr>
          <tr><td>🛁 Мити</td><td>Чистота</td><td><span class="pos">hygiene +50</span>, <span class="pos">mood +5</span></td></tr>
          <tr><td>😴 Спати</td><td>Енергія</td><td><span class="pos">energy +50</span>, <span class="neg">hunger −5</span></td></tr>
          <tr><td>🎮 Гратися</td><td>Настрій</td><td><span class="pos">mood +35</span>, <span class="neg">energy −15</span>, <span class="neg">hunger −10</span></td></tr>
          <tr><td>🧘 Заспокоїти</td><td>Психіка</td><td><span class="pos">sanity +40</span>, <span class="pos">mood +10</span></td></tr>
          <tr><td>🫂 Спілкуватись</td><td>Спілкування</td><td><span class="pos">social +40</span>, <span class="pos">mood +15</span>, <span class="neg">energy −5</span></td></tr>
          <tr><td>🌌 Медитувати</td><td>Сенс буття</td><td><span class="pos">purpose +40</span>, <span class="pos">sanity +20</span>, <span class="neg">energy −10</span></td></tr>
        </tbody>
      </table></div>
      <div class="note">💖😤 <b>Синергія:</b> улюблена для характеру дія дає <b>×1.4</b> на основний показник, нелюба — <b>×0.6</b> та <span class="neg">−5 настрою</span>. Хто що любить — у розділі «Характер як клас».</div>
      <div class="note">🥚 У яйця замість дій догляду — <b>🔥 Гріти</b>, <b>👂 Послухати</b> та <b>🤲 Поколихати</b> (милі реакції для знайомства; колихання ще трохи додає тепла).</div>
    </section>

    <!-- СМЕРТЬ -->
    <section id="death" class="reveal">
      <div class="sec-head"><span class="sec-num">07</span><h2>💀 Смерть і воскресіння</h2></div>
      <div class="card">
        <p>«Смерть» можлива <b>лише з підліткової стадії</b> 😈 (коли вже є психіка 🤪) і настає, тільки коли <b>ситість = 0%</b> <b>і</b> <b>психіка = 0%</b> одночасно. Малечу й яйце гра береже — вони не помирають.</p>
        <p>Це тимчасово: команда <span class="kbd">/revive</span> (або кнопка <b>⚡ Воскресити</b>) повертає всі активні показники до <span class="mono">60%</span>. Кожна «смерть» лишає слід — досягнення <b>⚰️ Втрата</b>.</p>
      </div>
    </section>

    <!-- СТАДІЇ -->
    <section id="stages" class="reveal">
      <div class="sec-head"><span class="sec-num">08</span><h2>🧬 Стадії еволюції</h2></div>
      <p class="sub">6 стадій за віком. Кожна відкриває нові показники, дії, події та стиль мовлення.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Вік</th><th>Стадія</th><th>Активні показники</th><th>Стиль мовлення</th></tr></thead>
        <tbody>
          <tr><td>0 дн</td><td>🥚 Яйце</td><td>🔥</td><td>лише звуки й дії</td></tr>
          <tr><td>1 дн</td><td>🫠 Слизька Грудка</td><td>🔥 🍗 🛁</td><td>немовля: «агу», прості слова</td></tr>
          <tr><td>3 дн</td><td>👾 Дивне Створіння</td><td>🍗 🛁 ⚡ 🎉</td><td>дитина: цікава, багато питань</td></tr>
          <tr><td>7 дн</td><td>😈 Хаотичний Монстр</td><td>🍗 🛁 ⚡ 🎉 🤪</td><td>підліток: зухвалий, сленг</td></tr>
          <tr><td>14 дн</td><td>🐉 Стародавнє Зло</td><td>🍗 🛁 ⚡ 🎉 🤪 🫂</td><td>дорослий: красномовний, драматичний</td></tr>
          <tr><td>30 дн</td><td>🌿 Фінальна форма</td><td>🍗 ⚡ 🎉 🤪 🫂 🌌 <span class="mono">(без 🛁)</span></td><td>космічний: загадковий + абсурдний</td></tr>
        </tbody>
      </table></div>
      <div class="note">На стадії 😈 (7 дн) <b>характер остаточно застигає</b>. Кожен перехід святкується окремим повідомленням, а нові показники «відкриваються». Фінальна форма (30 дн) — <b>гілчаста</b> 👇</div>
    </section>

    <!-- ФОРМИ -->
    <section id="forms" class="reveal">
      <div class="sec-head"><span class="sec-num">09</span><h2>🌿 Гілчаста фінальна форма</h2></div>
      <p class="sub">Натхнення — Digimon: ким воно стане на 30 днів, вирішують <b>вдача × характер</b>. Той самий улюбленець може дорости до зовсім різних істот.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Характер</th><th>Світла вдача 😇/🥰</th><th>Темна вдача 😈/😼</th><th>Врівноважена 😌</th></tr></thead>
        <tbody>
          <tr><td>😈 Ґремлін</td><td>🃏 Дух-Бешкетник</td><td>👹 Хаос-Демон</td><td>🃏 Дух-Бешкетник</td></tr>
          <tr><td>😎 Бунтар</td><td>🦸 Вільний Дух</td><td>🦹 Відступник</td><td>🦸 Вільний Дух</td></tr>
          <tr><td>🌞 Сонечко</td><td>🌟 Світлий Янгол</td><td colspan="2">☀️ Сонцесяйний</td></tr>
          <tr><td>🌌 Філософ</td><td>🧘 Просвітлений</td><td colspan="2">🌌 Космічний Розум</td></tr>
          <tr><td>🎬 Король драми</td><td colspan="3">🌠 Наднова-Зірка (за будь-якої вдачі)</td></tr>
          <tr><td>🤓 Ботанік</td><td colspan="3">🛸 Розумна Машина</td></tr>
          <tr><td>😴 Сонько</td><td colspan="3">💤 Сон-Сутність</td></tr>
          <tr><td><i>без характеру</i></td><td colspan="3">🌌 Космічна Сутність (дефолт)</td></tr>
        </tbody>
      </table></div>
      <div class="grid">
        <div class="card beast"><div class="face">👹</div><div><h4>Хаос-Демон</h4><div class="meta">Ґремлін × дика вдача</div><p>Сіє безлад і регоче з нього.</p></div></div>
        <div class="card beast"><div class="face">🌟</div><div><h4>Світлий Янгол</h4><div class="meta">Сонечко × світла вдача</div><p>Випромінює тепло й спокій.</p></div></div>
        <div class="card beast"><div class="face">🧘</div><div><h4>Просвітлений</h4><div class="meta">Філософ × світла вдача</div><p>Осягнув суть буття.</p></div></div>
        <div class="card beast"><div class="face">🌠</div><div><h4>Наднова-Зірка</h4><div class="meta">Король драми</div><p>Сяє так, що не відвести очей.</p></div></div>
        <div class="card beast"><div class="face">🛸</div><div><h4>Розумна Машина</h4><div class="meta">Ботанік</div><p>Обчислила сенс усього сущого.</p></div></div>
        <div class="card beast"><div class="face">💤</div><div><h4>Сон-Сутність</h4><div class="meta">Сонько</div><p>Живе десь між сном і явою.</p></div></div>
      </div>
      <div class="note gold">До фіналу характер уже застиг (стадія 😈), а вдача фіксована при вилупленні — тож шлях стабільний. Картка <b>«🌱 Ріст»</b> заздалегідь <b>тизерить</b> майбутню форму (і вона зсувається, поки характер ще дрейфує). Фінальна еволюція святкується особливо — з поясненням, що саме її сформувало.</div>
    </section>

    <!-- ВДАЧА -->
    <section id="temperament" class="reveal">
      <div class="sec-head"><span class="sec-num">10</span><h2>🧬 Вдача</h2></div>
      <p class="sub">Фіксується <b>назавжди при вилупленні</b> за середнім теплом, яке мало яйце.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Середнє тепло яйця</th><th>Вдача</th><th>Як впливає на емоції</th></tr></thead>
        <tbody>
          <tr><td><span class="mono">≥ 85%</span></td><td>😇 Янгол</td><td>негатив ×0.6, позитив ×1.3</td></tr>
          <tr><td><span class="mono">68–85%</span></td><td>🥰 Лагідне</td><td>негатив ×0.8, позитив ×1.15</td></tr>
          <tr><td><span class="mono">50–68%</span></td><td>😌 Врівноважене</td><td>×1.0 / ×1.0</td></tr>
          <tr><td><span class="mono">32–50%</span></td><td>😼 Норовливе</td><td>негатив ×1.2, позитив ×0.9</td></tr>
          <tr><td><span class="mono">&lt; 32%</span></td><td>😈 Дике</td><td>негатив ×1.4, позитив ×0.75</td></tr>
        </tbody>
      </table></div>
      <p>Вдача задає, як істота розмовляє (від ніжної й вдячної до кусючої), наскільки сильно її «чіпляють» емоції, і — разом із характером — її <b>фінальну форму</b>. Дике спалахує від образи й важко тане від ласки; янгол — навпаки.</p>
      <div class="note">🔮 Поки це яйце, картка показує <b>«Передчуття»</b> — натяк на майбутню вдачу за поточною траєкторією тепла. Грітимеш краще/гірше — прогноз зсувається.</div>
    </section>

    <!-- ХАРАКТЕР -->
    <section id="persona" class="reveal">
      <div class="sec-head"><span class="sec-num">11</span><h2>🎭 Характер</h2></div>
      <p class="sub">7 архетипів. Дістається <b>випадково</b> при вилупленні, далі <b>формується від догляду</b> — і може стати сумішшю двох.</p>
      <div class="grid">
        <div class="card beast"><div class="face">😈</div><div><h4>Ґремлін</h4><p>Хаотичний, саркастичний; жартує, драматизує, трохи капостить.</p></div></div>
        <div class="card beast"><div class="face">🌌</div><div><h4>Філософ</h4><p>Із будь-якої дрібниці робить «велике питання буття».</p></div></div>
        <div class="card beast"><div class="face">🌞</div><div><h4>Сонечко</h4><p>Невиправний оптиміст; обсипає теплом і компліментами.</p></div></div>
        <div class="card beast"><div class="face">🎬</div><div><h4>Король драми</h4><p>Усе — або трагедія століття, або тріумф епохи.</p></div></div>
        <div class="card beast"><div class="face">😴</div><div><h4>Сонько</h4><p>Вічно сонний лінивець; мріє про подушку.</p></div></div>
        <div class="card beast"><div class="face">🤓</div><div><h4>Ботанік</h4><p>Сипле «науковими фактами», любить усе пояснювати.</p></div></div>
        <div class="card beast"><div class="face">😎</div><div><h4>Бунтар</h4><p>Зухвалий крутий тип, якому ніби «все пофіг».</p></div></div>
      </div>
      <h3>Як характер формується (дрейф)</h3>
      <p>Перші 2 стадії після вилуплення (🫠 і 👾) характер <b>дрейфує від твого догляду й розмов</b> і може стати іншим або <b>сумішшю двох</b> (X × Y, якщо другий ≥60% ваги). На стадії 😈 він <b>застигає 🔒</b>.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Що робиш</th><th>Тягне характер до</th></tr></thead>
        <tbody>
          <tr><td>🎮 Гратися</td><td>🌞 Сонечко + 😈 Ґремлін</td></tr>
          <tr><td>🍗 Годувати</td><td>🌞 Сонечко</td></tr>
          <tr><td>🛁 Мити</td><td>🤓 Ботанік</td></tr>
          <tr><td>😴 Спати</td><td>😴 Сонько</td></tr>
          <tr><td>🧘 Заспокоїти / 🌌 Медитувати</td><td>🌌 Філософ</td></tr>
          <tr><td>🫂 Спілкуватись</td><td>🌞 Сонечко + 🎬 Драма</td></tr>
          <tr><td>💬 Балакати в чаті</td><td>🎬 Драма</td></tr>
          <tr><td>🎲 Події</td><td>😈 Ґремлін</td></tr>
        </tbody>
      </table></div>
      <div class="note">Емоції теж ліплять характер: злість → 😎 Бунтар + 😈 Ґремлін, образа/сум → 🎬 Драма, любов/радість → 🌞 Сонечко, нудьга → 😴 Сонько.</div>
    </section>

    <!-- КЛАС -->
    <section id="class" class="reveal">
      <div class="sec-head"><span class="sec-num">12</span><h2>🎮 Характер як «клас»</h2></div>
      <p class="sub">Характер впливає не лише на тон, а й на <b>механіку</b> — як RPG-клас. Застосовується поточний домінантний архетип.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Архетип</th><th>Пасив занепаду</th><th>💖 Любить (×1.4)</th><th>😤 Не любить (×0.6, −5🎉)</th></tr></thead>
        <tbody>
          <tr><td>😈 Ґремлін</td><td>🛁 чистота ×1.3 (швидше)</td><td>🎮 Гратися</td><td>🛁 Мити</td></tr>
          <tr><td>🌌 Філософ</td><td>🤪 ×0.7, 🌌 ×0.7</td><td>🌌 Медитувати, 🧘 Заспокоїти</td><td>—</td></tr>
          <tr><td>🌞 Сонечко</td><td>🎉 настрій ×0.6</td><td>🎮 Гратися, 🫂 Спілкуватись</td><td>—</td></tr>
          <tr><td>🎬 Король драми</td><td>🎉 ×1.1 · <b>емоції ×1.3</b></td><td>🫂 Спілкуватись</td><td>😴 Спати</td></tr>
          <tr><td>😴 Сонько</td><td>⚡ ×0.65, 🎉 ×1.15</td><td>😴 Спати</td><td>🎮 Гратися</td></tr>
          <tr><td>🤓 Ботанік</td><td>🛁 чистота ×0.7</td><td>🛁 Мити</td><td>—</td></tr>
          <tr><td>😎 Бунтар</td><td>🔥 ×0.85, 🫂 ×0.8</td><td>—</td><td>🧘 Заспокоїти</td></tr>
        </tbody>
      </table></div>
      <div class="note">Пасив = множник швидкості занепаду (×&lt;1 легше / ×&gt;1 важче). Синергія діє на <b>основний</b> показник дії. Свої риси видно командою <span class="kbd">/personality</span>.</div>
    </section>

    <!-- ЗДІБНОСТІ -->
    <section id="abilities" class="reveal">
      <div class="sec-head"><span class="sec-num">13</span><h2>✨ Фірмові здібності</h2></div>
      <p class="sub">У кожного характеру — одна унікальна здібність на окремій кнопці. Кулдаун <b>8 годин</b>.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Характер</th><th>Здібність</th><th>Ефект</th></tr></thead>
        <tbody>
          <tr><td>😈 Ґремлін</td><td>😈 Капість</td><td>хаос: один показник вгору, інший вниз (рандом)</td></tr>
          <tr><td>🌌 Філософ</td><td>🌌 Прозріння</td><td><span class="pos">сенс +35</span>, <span class="pos">психіка +25</span></td></tr>
          <tr><td>🌞 Сонечко</td><td>🌞 Промінчик</td><td><span class="pos">настрій +40</span>, <span class="pos">спілкування +15</span></td></tr>
          <tr><td>🎬 Король драми</td><td>🎬 Сцена</td><td><span class="pos">настрій +40</span>, <span class="neg">енергія −20</span></td></tr>
          <tr><td>😴 Сонько</td><td>😴 Глибокий сон</td><td><span class="pos">енергія +60</span>, <span class="neg">настрій −10</span></td></tr>
          <tr><td>🤓 Ботанік</td><td>🤓 Вивчити</td><td><span class="pos">психіка +30</span></td></tr>
          <tr><td>😎 Бунтар</td><td>😎 Сам по собі</td><td><span class="pos">тепло +25</span>, <span class="pos">спілкування +25</span></td></tr>
        </tbody>
      </table></div>
      <div class="note">Ефекти діють лише на <b>активні</b> показники стадії. Здібності помірні (з трейд-офами), щоб не знецінити звичайний догляд.</div>
    </section>

    <!-- ЕМОЦІЇ -->
    <section id="emotions" class="reveal">
      <div class="sec-head"><span class="sec-num">14</span><h2>💞 Емоції</h2></div>
      <p class="sub">Окремий тимчасовий шар: істота «відчуває» тон того, що ти їй пишеш. Емоцію визначає її «мозок» за твоїм повідомленням.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Емоція</th><th>Знак</th><th>Ефект на показники (за сили 10)</th></tr></thead>
        <tbody>
          <tr><td>😄 Радість</td><td class="pos">+</td><td><span class="pos">настрій +6</span>, <span class="pos">енергія +3</span></td></tr>
          <tr><td>🥰 Розчулення</td><td class="pos">+</td><td><span class="pos">настрій +6</span>, <span class="pos">спілкування +5</span>, <span class="pos">психіка +3</span></td></tr>
          <tr><td>😔 Образа</td><td class="neg">−</td><td><span class="neg">настрій −6</span>, <span class="neg">спілкування −5</span></td></tr>
          <tr><td>😠 Злість</td><td class="neg">−</td><td><span class="neg">настрій −6</span>, <span class="neg">психіка −5</span></td></tr>
          <tr><td>😢 Сум</td><td class="neg">−</td><td><span class="neg">настрій −6</span>, <span class="neg">енергія −4</span></td></tr>
          <tr><td>😨 Тривога</td><td class="neg">−</td><td><span class="neg">психіка −6</span>, <span class="neg">настрій −4</span></td></tr>
          <tr><td>🥱 Нудьга</td><td class="neg">−</td><td><span class="neg">настрій −4</span></td></tr>
          <tr><td>🙂 Спокій</td><td class="neu">0</td><td>без ефекту</td></tr>
        </tbody>
      </table></div>
      <h3>Як це працює</h3>
      <ul>
        <li><b>Згасання:</b> інтенсивність халвиться приблизно щокожні <b>25 хв</b>; нижче порогу — повертається до спокою.</li>
        <li><b>Модуляція вдачею:</b> множники з розділу «Вдача» (дике болючіше переживає негатив, янгол — світліше радіє).</li>
        <li><b>Підсилення характером:</b> 🎬 Король драми роздуває емоції ще на <b>×1.3</b>.</li>
        <li><b>Кеп:</b> одне повідомлення змінює показник максимум на <b>±8</b>, лише активні показники.</li>
        <li><b>Дрейф характеру:</b> сильні емоції ще й ліплять характер (у формувальний період).</li>
        <li><b>У картці:</b> якщо емоція сильна (≥4), вона «перебиває» звичайну бульбашку-реакцію.</li>
        <li>🥚 Яйце й «мертва» істота емоцій не мають.</li>
      </ul>
    </section>

    <!-- ПАМ'ЯТЬ -->
    <section id="memory" class="reveal">
      <div class="sec-head"><span class="sec-num">15</span><h2>🧠 Памʼять</h2></div>
      <p class="sub">Натхнення — підхід Hermes Agent. Два шари памʼяті роблять звʼязок «живим».</p>
      <div class="grid">
        <div class="card">
          <h3 style="margin-top:0">💬 Короткострокова — діалог</h3>
          <p>Памʼятає <b>останні репліки</b> розмови (вікно ~12 реплік) і відповідає з урахуванням контексту — як справжня бесіда, а не окремі відповіді.</p>
        </div>
        <div class="card">
          <h3 style="margin-top:0">🗂️ Довгострокова — факти про тебе</h3>
          <p>Сама <b>запамʼятовує вартісне</b>: імʼя, уподобання, події, близьких, плани (до 30 фактів). Дублі підкріплюються, найстаріше витісняється.</p>
        </div>
      </div>
      <p>Збережені факти істота <b>доречно згадує</b> в чаті — і навіть у нагадуваннях («ну як той іспит?»). Подивитись, що вона про тебе памʼятає: <span class="kbd">/memory</span> або кнопка <b>«🧠 Памʼять»</b>.</p>
      <div class="note">Памʼять і діалог працюють лише <b>після вилуплення</b>; запамʼятовування фактів — поки істота жива.</div>
    </section>

    <!-- ПРОАКТИВНІСТЬ -->
    <section id="proactivity" class="reveal">
      <div class="sec-head"><span class="sec-num">16</span><h2>🔔 Проактивність</h2></div>
      <p class="sub">Істота <b>сама пише першим</b> — і не одноманітно. «Режисер» обирає тип виходу на звʼязок за контекстом (одне повідомлення на годину).</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Тип</th><th>Коли</th></tr></thead>
        <tbody>
          <tr><td>🌅 Ранкове привітання</td><td>раз на день уранці (якщо ти заходив за останні 48 год)</td></tr>
          <tr><td>🔥 Порятунок серії</td><td>раз на день: твоя серія під загрозою (був учора, не сьогодні)</td></tr>
          <tr><td>😤 Відлуння емоції</td><td>є привід + сильна емоція з нещодавньої розмови</td></tr>
          <tr><td>🍗 Потреба</td><td>є привід + гостра нестача якогось показника</td></tr>
          <tr><td>🧠 Згадка з памʼяті</td><td>є привід + є збережені факти про тебе</td></tr>
          <tr><td>💭 Спонтанна думка</td><td>фолбек: абсурдне «відкриття» без скарг</td></tr>
        </tbody>
      </table></div>
      <div class="note">«Привід» = гостра потреба або тиша ≥4 год. Кулдаун між нагадуваннями — 2 год. <b>Уночі (22:00–08:00) — тиша.</b> Яйце нагадує про себе частіше.</div>
    </section>

    <!-- ЧАТ -->
    <section id="chat" class="reveal">
      <div class="sec-head"><span class="sec-num">17</span><h2>💬 Чат і характер</h2></div>
      <div class="card">
        <p>Просто пиши істоті — відповідатиме «в характері». Відповідь збирається з: <b>характеру</b> (один архетип або суміш), <b>вдачі</b>, <b>стилю за стадією</b>, <b>пори доби</b>, <b>поточного стану</b>, <b>памʼяті</b> (факти + історія діалогу) та <b>поточної емоції</b>.</p>
        <p>Через це кожна істота звучить унікально: яйце лише видає звуки, немовля агукає, дитина сипле питаннями, підліток зухвалить, дорослий красномовний, а фінальна форма говорить як її вид (Хаос-Демон і Світлий Янгол звучать геть по-різному).</p>
      </div>
    </section>

    <!-- ПОДІЇ -->
    <section id="events" class="reveal">
      <div class="sec-head"><span class="sec-num">18</span><h2>🎲 Події</h2></div>
      <div class="card">
        <p><b>60 міні-подій</b> — по <b>10 на кожну стадію</b>, з вибором з 2 варіантів. Ефекти діють лише на активні показники стадії; результат і реальна зміна показуються у спливному вікні. Кнопка <b>🎲 Подія</b>, кулдаун <span class="mono">2 год</span>.</p>
        <p>Деякі вибори ставлять «прапорці» для прихованих досягнень — наприклад, приєднатися до <b>культу шкарпеток</b> 🧦 або дізнатися, що <b>тостер неживий</b> 🍞.</p>
      </div>
    </section>

    <!-- ДОСЯГНЕННЯ -->
    <section id="achievements" class="reveal">
      <div class="sec-head"><span class="sec-num">19</span><h2>🏆 Досягнення</h2></div>
      <p class="sub">23 нагороди на різні теми — від турботи до темних і смішних моментів. Відкриваються самі.</p>
      <div class="scroll-x"><table class="tbl">
        <thead><tr><th>Досягнення</th><th>Умова</th></tr></thead>
        <tbody>
          <tr><td>🐣 Перші кроки</td><td>дати імʼя улюбленцю</td></tr>
          <tr><td>💯 На максимум</td><td>підняти будь-який показник до 100%</td></tr>
          <tr><td>🌟 Ідеальний догляд</td><td>усі активні показники ≥ 90% одночасно</td></tr>
          <tr><td>🔥 Тиждень разом</td><td>прожити 7 днів</td></tr>
          <tr><td>🎂 Місяць разом</td><td>прожити 30 днів</td></tr>
          <tr><td>💖 Нерозлучні</td><td>100 взаємодій усього</td></tr>
          <tr><td>📅 Три дні поспіль</td><td>стрік 3 дні</td></tr>
          <tr><td>🗓️ Тиждень дисципліни</td><td>стрік 7 днів</td></tr>
          <tr><td>🏅 Місяць відданості</td><td>стрік 30 днів</td></tr>
          <tr><td>🌙 Нічна сова</td><td>зайти вночі</td></tr>
          <tr><td>🌅 Рання пташка</td><td>зайти зранку</td></tr>
          <tr><td>🥀 На межі</td><td>довести показник до 0%</td></tr>
          <tr><td>🧊 Дитя холоду</td><td>дати яйцю замерзнути</td></tr>
          <tr><td>⚰️ Втрата</td><td>допустити «смерть»</td></tr>
          <tr><td>👻 Блудний улюбленець</td><td>повернутись після 3+ днів</td></tr>
          <tr><td>🧦 Шкарпетковий культист</td><td>приєднатись до культу (подія)</td></tr>
          <tr><td>🍞 Розбите серце</td><td>дізнатись, що тостер неживий (подія)</td></tr>
          <tr><td>🤡 Душа компанії</td><td>50 повідомлень у чаті</td></tr>
          <tr><td>🎲 Шукач пригод</td><td>пережити 10 подій</td></tr>
          <tr><td>😈 Народжений у холоді</td><td>вилупитись Диким</td></tr>
          <tr><td>😇 Благословенне</td><td>вилупитись Янголом</td></tr>
          <tr><td>🧘 Внутрішній спокій</td><td>10× заспокоїти/медитувати</td></tr>
          <tr><td>🏆 Майстер турботи</td><td>відкрити 15 інших досягнень</td></tr>
        </tbody>
      </table></div>
      <div class="note">Усі (здобуті ✅ і ще закриті 🔒) — на кнопці <b>«🏆 Досягнення»</b>.</div>
    </section>

    <!-- СИСТЕМИ -->
    <section id="systems" class="reveal">
      <div class="sec-head"><span class="sec-num">20</span><h2>⚙️ Стрік і час доби</h2></div>
      <div class="grid">
        <div class="card">
          <h3 style="margin-top:0">📅 Денний стрік</h3>
          <p>Рахує дні поспіль із активністю: +1 за новий день, скидання при пропуску, «повернення» при розриві ≥3 дн. Показується в картці як <b>🔥 N дн.</b> Є й рекорд.</p>
        </div>
        <div class="card">
          <h3 style="margin-top:0">🌗 Пора доби</h3>
          <p>Впливає на занепад (ніч ×0.18), тон відповідей (уночі сонний, уранці бадьорий), бульбашку-реакцію й вимикає нічні нагадування. Типовий часовий пояс — Київ (+3).</p>
        </div>
      </div>
    </section>

    <!-- КОМАНДИ -->
    <section id="commands" class="reveal">
      <div class="sec-head"><span class="sec-num">21</span><h2>⌨️ Команди й кнопки</h2></div>
      <h3>Команди</h3>
      <p>
        <span class="kbd">/start</span> <span class="kbd">/status</span> <span class="kbd">/guide</span>
        <span class="kbd">/personality</span> <span class="kbd">/memory</span> <span class="kbd">/name &lt;імʼя&gt;</span>
        <span class="kbd">/revive</span> <span class="kbd">/help</span>
      </p>
      <p>Дії також доступні слешем: <span class="kbd">/feed</span> <span class="kbd">/play</span> <span class="kbd">/sleep</span> <span class="kbd">/clean</span> <span class="kbd">/warm</span> <span class="kbd">/calm</span> <span class="kbd">/talk</span> <span class="kbd">/meditate</span> (залежно від стадії).</p>
      <h3>Кнопки картки</h3>
      <p>
        <span class="pill">дії догляду (за стадією)</span><span class="pill">✨ фірмова здібність</span>
        <span class="pill">🎲 Подія</span><span class="pill">🌱 Ріст</span>
        <span class="pill">🏆 Досягнення</span><span class="pill">📖 Гайд</span>
        <span class="pill">🧠 Памʼять</span><span class="pill">🔄 Оновити</span>
        <span class="pill">⚡ Воскресити</span>
      </p>
      <div class="note">Кнопки <b>«📊 Картка»</b> та <b>«📖 Гайд»</b> завжди біля поля вводу — повертають картку одним тапом, навіть коли вона поїхала вгору під час чату.</div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="reveal">
      <div class="sec-head"><span class="sec-num">22</span><h2>❓ FAQ і поради</h2></div>
      <div class="card"><h3 style="margin-top:0">Скільки треба заходити?</h3><p>Показники спадають за ~1.5–3 год удень, але вночі майже стоять. Кілька разів на день — комфортно; пропустити ніч безпечно.</p></div>
      <div class="card"><h3 style="margin-top:0">Як вплинути на майбутню форму?</h3><p>Вдачу задає тепло яйця (грій більше — світліша), характер — твій догляд і розмови. Разом вони визначають фінальну форму. Дивись «Ріст» — там тизер.</p></div>
      <div class="card"><h3 style="margin-top:0">Воно може померти назавжди?</h3><p>Ні. «Смерть» можлива лише з підліткової стадії й вона тимчасова — <span class="kbd">/revive</span> повертає до життя.</p></div>
      <div class="card"><h3 style="margin-top:0">Чому відповіді іноді дивні?</h3><p>«Мозок» працює на безкоштовній AI-моделі — інколи фантазує. Це частина абсурдного шарму 🫠.</p></div>
      <div class="card"><h3 style="margin-top:0">Воно справді мене памʼятає?</h3><p>Так: памʼятає останні репліки розмови й сам зберігає факти про тебе. Перевір <span class="kbd">/memory</span>.</p></div>
    </section>

    <footer>
      🐣 Тамагочі-бот · повний гайд · згенеровано зі стану гри. Усі числа — прості константи у коді (їх легко підкрутити).
    </footer>
  </main>
</div>

<button id="toTop" aria-label="Нагору">↑</button>

<script>
(function(){
  var root = document.documentElement;
  var prog = document.getElementById('progress');
  var toTop = document.getElementById('toTop');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var sections = links.map(function(l){ return document.getElementById(l.getAttribute('data-target')); }).filter(Boolean);

  function onScroll(){
    var max = root.scrollHeight - root.clientHeight;
    var p = max > 0 ? (root.scrollTop / max) * 100 : 0;
    if(prog){ prog.style.width = p + '%'; }
    if(toTop){ toTop.classList.toggle('show', root.scrollTop > 600); }
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);
  onScroll();

  if('IntersectionObserver' in window){
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          var id = e.target.id;
          links.forEach(function(l){ l.classList.toggle('active', l.getAttribute('data-target') === id); });
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    sections.forEach(function(s){ spy.observe(s); });

    var rev = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); rev.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.02});
    Array.prototype.slice.call(document.querySelectorAll('.reveal')).forEach(function(el){ rev.observe(el); });
  } else {
    Array.prototype.slice.call(document.querySelectorAll('.reveal')).forEach(function(el){ el.classList.add('in'); });
  }

  var menuBtn = document.getElementById('menuBtn');
  var scrim = document.getElementById('scrim');
  function closeNav(){ document.body.classList.remove('nav-open'); }
  if(menuBtn){ menuBtn.addEventListener('click', function(){ document.body.classList.toggle('nav-open'); }); }
  if(scrim){ scrim.addEventListener('click', closeNav); }
  links.forEach(function(l){ l.addEventListener('click', closeNav); });
  if(toTop){ toTop.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); }); }

  var search = document.getElementById('navSearch');
  if(search){
    search.addEventListener('input', function(){
      var q = search.value.trim().toLowerCase();
      links.forEach(function(l){
        var hit = l.textContent.toLowerCase().indexOf(q) !== -1;
        l.style.display = (q === '' || hit) ? '' : 'none';
      });
      Array.prototype.slice.call(document.querySelectorAll('.nav-group')).forEach(function(g){
        var any = Array.prototype.slice.call(g.querySelectorAll('.nav-link')).some(function(l){ return l.style.display !== 'none'; });
        g.style.display = any ? '' : 'none';
      });
    });
  }
})();
</script>
</body>
</html>`;
