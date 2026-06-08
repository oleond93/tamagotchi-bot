// events.js — випадкові міні-події з вибором, СВОЇ для кожної стадії розвитку.
// Ефекти впливають лише на характеристики, активні на цій стадії.

const STAGE_EVENTS = [
  // ── 0: 🥚 Яйце (лише 🔥 тепло) ──────────────────────────────────────────
  [
    { id: "e0_draft", text: "🌬️ Звідкись потягнуло холодом...", options: [
      { text: "🛡️ Прикрити яйце", effects: { warmth: 15 }, result: "Затишно! 😌" },
      { text: "🤷 Та нічого", effects: { warmth: -15 }, result: "Бр-р-р... 🥶" } ] },
    { id: "e0_sun", text: "🌞 На підлогу впав теплий сонячний промінь.", options: [
      { text: "☀️ Підкотити до сонця", effects: { warmth: 20 }, result: "Кайф... 🫠" },
      { text: "🛋️ Лишити в тіні", effects: { warmth: -5 }, result: "Прохолодно." } ] },
    { id: "e0_lullaby", text: "🌙 Воно ніяк не вгамується.", options: [
      { text: "🎵 Заспівати колискову", effects: { warmth: 10 }, result: "Тихо засопіло 😴" },
      { text: "📺 Увімкнути телек", effects: { warmth: -3 }, result: "Дивиться рекламу. Підозріло уважно." } ] },
    { id: "e0_cat", text: "🐈 Кіт прийшов «познайомитись» з яйцем.", options: [
      { text: "😼 Дозволити обнюхати", effects: { warmth: 8 }, result: "Кіт ліг поруч і гріє. Несподівано мило." },
      { text: "🚫 Прогнати кота", effects: { warmth: -2 }, result: "Кіт ображено пішов. Яйце теж засумувало." } ] },
    { id: "e0_blanket", text: "🧶 Знайшовся маленький плед.", options: [
      { text: "🛏️ Загорнути", effects: { warmth: 18 }, result: "Бурріто 🌯" },
      { text: "🧦 Та нащо", effects: { warmth: -8 }, result: "Мерзне." } ] },
    { id: "e0_knock", text: "👂 Зсередини почувся стукіт. Воно ніби кличе.", options: [
      { text: "🤲 Притулити долоню", effects: { warmth: 12 }, result: "Стук-стук у відповідь 💓" },
      { text: "🙉 Удати, що не чув", effects: { warmth: -6 }, result: "Стукіт стих. Сумно." } ] },
    { id: "e0_storm", text: "⛈️ За вікном гроза, стало зимно.", options: [
      { text: "🔥 Ближче до батареї", effects: { warmth: 22 }, result: "Тепло і безпечно." },
      { text: "😴 Лягти спати", effects: { warmth: -18 }, result: "Вранці яйце ледь тепле..." } ] },
    { id: "e0_glow", text: "✨ Яйце ледь-ледь засвітилось у темряві.", options: [
      { text: "😍 Помилуватись", effects: { warmth: 5 }, result: "Засвітилось яскравіше — йому приємно." },
      { text: "📸 Сфоткати для сторіз", effects: { warmth: 0 }, result: "Лайків багато. Яйцю байдуже." } ] },
    { id: "e0_tea", text: "☕ Поруч стоїть гаряча чашка чаю.", options: [
      { text: "🍵 Поставити поряд (обережно)", effects: { warmth: 14 }, result: "Грітися чужим чаєм — мистецтво." },
      { text: "🙅 Небезпечно", effects: { warmth: -2 }, result: "Розумно, але прохолодно." } ] },
    { id: "e0_roll", text: "🥚 Яйце тихенько покотилось зі столу!", options: [
      { text: "🤸 Спіймати!", effects: { warmth: 6 }, result: "Врятовано! Серце калатає (у обох)." },
      { text: "😱 Завмерти", effects: { warmth: -12 }, result: "Гуп. Усе ціле, але злякалось." } ] },
  ],
  // ── 1: 🫠 Слизька Грудка (🔥🍗🛁) ─────────────────────────────────────────
  [
    { id: "e1_food", text: "🥄 Перша в житті ложка пюрешки!", options: [
      { text: "😋 Годувати", effects: { hunger: 20, hygiene: -8 }, result: "Більше на щоках, ніж у роті 😆" },
      { text: "🧼 Спершу серветку", effects: { hunger: 10, hygiene: 5 }, result: "Акуратний малюк!" } ] },
    { id: "e1_mud", text: "🟤 Малюк знайшов багнюку і дуже зацікавився.", options: [
      { text: "📸 Хай бавиться", effects: { hygiene: -15 }, result: "Щасливе. Брудне. Щасливе." },
      { text: "🛁 Прибрати", effects: { hygiene: 15 }, result: "Чистенько ✨" } ] },
    { id: "e1_spit", text: "🤢 Ой... зригнув на себе.", options: [
      { text: "🛁 Помити", effects: { hygiene: 20 }, result: "Як новенький!" },
      { text: "🙈 Потім", effects: { hygiene: -10 }, result: "Пахне... специфічно." } ] },
    { id: "e1_night", text: "🌙 Прокинувся вночі голодний і пхинькає.", options: [
      { text: "🍼 Нічна годівля", effects: { hunger: 18, warmth: 5 }, result: "Наївся, засопів 😴" },
      { text: "😴 Хай поспить", effects: { hunger: -12 }, result: "Не вгамовується..." } ] },
    { id: "e1_word", text: "👶 Воно сказало щось схоже на слово!", options: [
      { text: "🥹 Повторити за ним", effects: { warmth: 12 }, result: "Радіє і булькоче ще!" },
      { text: "📚 Виправити вимову", effects: { warmth: -5 }, result: "Образилось, бубонить." } ] },
    { id: "e1_cold", text: "🥶 Скинуло ковдру уві сні.", options: [
      { text: "🛏️ Вкрити", effects: { warmth: 15 }, result: "Знову тепленько." },
      { text: "🤷 Само", effects: { warmth: -12 }, result: "Тремтить уві сні." } ] },
    { id: "e1_face", text: "🍓 Усе личко в пюре.", options: [
      { text: "🧽 Витерти", effects: { hygiene: 18 }, result: "Чисте личко 😊" },
      { text: "📷 Спершу фото", effects: { hygiene: -3 }, result: "Шедевр для сімейного альбому." } ] },
    { id: "e1_toy", text: "🧸 Тягне до рота іграшку.", options: [
      { text: "🧼 Помити, тоді дати", effects: { hygiene: 8, hunger: 3 }, result: "Жує задоволено." },
      { text: "🙃 Та нехай", effects: { hygiene: -10 }, result: "Іграшка вже не та..." } ] },
    { id: "e1_bath", text: "🛁 Час першого купання!", options: [
      { text: "💦 Купати з пінкою", effects: { hygiene: 25, warmth: -5 }, result: "Бульбашки! Виск! Радість!" },
      { text: "🚿 Швиденько", effects: { hygiene: 12 }, result: "Чисто, по-діловому." } ] },
    { id: "e1_banana", text: "🍌 Простягає рученята до банана.", options: [
      { text: "🍌 Дати", effects: { hunger: 15, hygiene: -5 }, result: "Мням! І в волоссі трохи." },
      { text: "🥦 Дати броколі", effects: { hunger: 8 }, result: "Скривилось, але з'їло." } ] },
  ],
  // ── 2: 👾 Дивне Створіння (🍗🛁⚡🎉) ──────────────────────────────────────
  [
    { id: "e2_puddle", text: "🌧️ Калюжа! Така спокуслива і брудна...", options: [
      { text: "💦 Стрибнути", effects: { mood: 25, hygiene: -25 }, result: "НАЙКРАЩИЙ СПЛЕСК! 🤩" },
      { text: "🧐 Обійти", effects: { hygiene: 5, mood: -5 }, result: "Дорослий вибір. Нудний." } ] },
    { id: "e2_box", text: "📦 З'явилась загадкова коробка.", options: [
      { text: "🔓 Відкрити", effects: { mood: 20, energy: -5 }, result: "Усередині... ще коробка! 🎁" },
      { text: "😼 Сісти зверху", effects: { mood: 15, energy: -5 }, result: "Це МОЯ коробка тепер." } ] },
    { id: "e2_cartoon", text: "📺 По телеку — улюблений мультик!", options: [
      { text: "🍿 Дивитись", effects: { mood: 20, energy: -10 }, result: "Очі-блюдця, не моргає." },
      { text: "🏃 Гратись надворі", effects: { mood: 15, energy: -15, hunger: -5 }, result: "Втомилось, але щасливе!" } ] },
    { id: "e2_candy", text: "🍬 Знайшло цукерку під диваном.", options: [
      { text: "🍭 Дозволити", effects: { hunger: 15, mood: 10, hygiene: -5 }, result: "Цукровий буст! ⚡" },
      { text: "🚮 Викинути", effects: { mood: -8, hygiene: 5 }, result: "Драма століття." } ] },
    { id: "e2_nap", text: "🥱 Перегралось і капризує.", options: [
      { text: "😴 Покласти спати", effects: { energy: 30, mood: 5 }, result: "Відрубилось на півслові." },
      { text: "☕ Ще трохи", effects: { energy: -10, mood: -5 }, result: "Сльози, сопельки, хаос." } ] },
    { id: "e2_friend", text: "👻 Завело уявного друга.", options: [
      { text: "🫶 Підіграти", effects: { mood: 18, energy: -5 }, result: "Тепер вас троє. Привіт, Боб!" },
      { text: "🤨 «Його ж нема»", effects: { mood: -12 }, result: "«Боб образився.»" } ] },
    { id: "e2_veggie", text: "🥦 Час їсти овочі.", options: [
      { text: "🍟 Піддатись на чіпси", effects: { hunger: 15, mood: 10, hygiene: -3 }, result: "Хрум-хрум зрада." },
      { text: "🥦 Наполягти", effects: { hunger: 18, mood: -5 }, result: "З'їло з виглядом мученика." } ] },
    { id: "e2_dirty", text: "🧥 Вимазалось із ніг до голови.", options: [
      { text: "🛁 Купати", effects: { hygiene: 25, mood: -5 }, result: "Чисте і трохи ображене." },
      { text: "🤷 Хай ще побігає", effects: { hygiene: -10, mood: 10 }, result: "Свобода = бруд = щастя." } ] },
    { id: "e2_dance", text: "🎶 Заграла музика — воно затанцювало!", options: [
      { text: "💃 Танцювати разом", effects: { mood: 25, energy: -15 }, result: "Дискотека на кухні! 🪩" },
      { text: "🎥 Знімати", effects: { mood: 8 }, result: "Вірусне відео гарантовано." } ] },
    { id: "e2_snail", text: "🐌 Знайшло равлика і хоче лишити «назавжди».", options: [
      { text: "🏡 Дозволити подружитись", effects: { mood: 20, energy: -5 }, result: "Равлик Сергій тепер удома." },
      { text: "🌿 Відпустити в траву", effects: { mood: -8 }, result: "«Прощавай, Сергію...» 😢" } ] },
  ],
  // ── 3: 😈 Хаотичний Монстр (🍗🛁⚡🎉🤪) ───────────────────────────────────
  [
    { id: "e3_meme", text: "📱 Залипло в мемах о 3 ночі.", options: [
      { text: "😏 Хай гортає", effects: { mood: 15, energy: -15, sanity: -5 }, result: "«Ще одненький...» (брехня)" },
      { text: "😴 Забрати телефон", effects: { energy: 10, mood: -10, sanity: 5 }, result: "Трагедія. Але виспалось." } ] },
    { id: "e3_rebel", text: "😤 «Я НЕ МИТИМУСЬ І ТИ МЕНЕ НЕ ЗМУСИШ».", options: [
      { text: "🛁 Наполягти", effects: { hygiene: 25, mood: -10 }, result: "Помилось. Ображено блищить." },
      { text: "🤝 Домовитись", effects: { hygiene: 12, mood: 8, sanity: 5 }, result: "Дипломатія перемогла!" } ] },
    { id: "e3_prank", text: "🃏 Підлаштувало тобі пранк.", options: [
      { text: "😂 Посміятись", effects: { mood: 20, sanity: 5 }, result: "Воно в захваті від себе." },
      { text: "😠 Насварити", effects: { mood: -15, sanity: -5 }, result: "«Ти не розумієш мистецтва.»" } ] },
    { id: "e3_energy", text: "⚡ Десь дістало енергетик.", options: [
      { text: "🥤 Ковток дозволено", effects: { energy: 25, mood: 10, sanity: -10 }, result: "ВІБРУЄ крізь стіни." },
      { text: "🚫 Забрати", effects: { energy: -5, mood: -8, sanity: 5 }, result: "Бурчить, але дякуватиме потім." } ] },
    { id: "e3_exist", text: "🌀 «А нащо все це?» — раптом філософствує.", options: [
      { text: "🫂 Поговорити", effects: { sanity: 20, mood: 10 }, result: "Полегшало обом." },
      { text: "🤷 «Не парся»", effects: { sanity: -10 }, result: "Пішло страждати під ковдру." } ] },
    { id: "e3_pizza", text: "🍕 Замовило піцу о 2 ночі (як?!).", options: [
      { text: "🍕 Хай їсть", effects: { hunger: 25, mood: 10, hygiene: -5 }, result: "Нічний бенкет переможців." },
      { text: "🥗 Запропонувати салат", effects: { hunger: 8, mood: -5 }, result: "Подивилось так, що салат зів'яв." } ] },
    { id: "e3_room", text: "🧦 Кімната — суцільний хаос.", options: [
      { text: "🧹 Прибрати разом", effects: { hygiene: 20, energy: -10, mood: 5 }, result: "Знайшли три зниклі шкарпетки і пульт." },
      { text: "🙈 Зачинити двері", effects: { hygiene: -10, sanity: -5 }, result: "З очей геть... поки що." } ] },
    { id: "e3_crush", text: "💌 Здається, воно закохалось у тостер.", options: [
      { text: "🫶 Підтримати", effects: { mood: 20, sanity: -5 }, result: "«Кохання не питає логіки.»" },
      { text: "🍞 Пояснити, що тостер неживий", effects: { sanity: 10, mood: -15 }, result: "Розбите серце №1." } ] },
    { id: "e3_game", text: "🎮 Грає всю ніч без зупину.", options: [
      { text: "🎮 Ще раунд", effects: { mood: 20, energy: -25 }, result: "GG, але очі квадратні." },
      { text: "😴 Спати", effects: { energy: 30, mood: -10 }, result: "«Ще ж рейтинг падає!»" } ] },
    { id: "e3_tattoo", text: "🖊️ Намалювало собі «тату» маркером.", options: [
      { text: "😎 Похвалити", effects: { mood: 18, sanity: 5 }, result: "Гордо демонструє «дракона» (це краб)." },
      { text: "🧼 Відмити", effects: { hygiene: 10, mood: -12 }, result: "«Ти знищив шедевр.»" } ] },
  ],
  // ── 4: 🐉 Стародавнє Зло (🍗🛁⚡🎉🤪🫂) ────────────────────────────────────
  [
    { id: "e4_cult", text: "🕯️ Зібрало невеликий культ із твоїх шкарпеток.", options: [
      { text: "🙏 Приєднатись", effects: { social: 20, mood: 15, sanity: -10 }, result: "Шкарпетки схвально мовчать." },
      { text: "🧺 Розпустити (попрати)", effects: { hygiene: 15, sanity: 10, mood: -8 }, result: "Культ розчинився у пральній машині." } ] },
    { id: "e4_prophecy", text: "🔮 Виголосило пророцтво про кінець світу в четвер.", options: [
      { text: "😱 Повірити", effects: { sanity: -15, social: 10 }, result: "Готуєте бункер разом." },
      { text: "😌 «Це просто вівторок»", effects: { sanity: 12, mood: -5 }, result: "«...ну добре, перенесу на п'ятницю.»" } ] },
    { id: "e4_lonely", text: "😔 «Стільки епох... і ні з ким поговорити».", options: [
      { text: "🫂 Поговорити", effects: { social: 25, mood: 15 }, result: "Тисячолітня самотність трохи відступила 💛" },
      { text: "📵 «Потім»", effects: { social: -15, mood: -10 }, result: "Зітхнуло так, що завмерли годинники." } ] },
    { id: "e4_ritual", text: "🌑 Хоче провести ритуал опівночі.", options: [
      { text: "🕯️ Допомогти", effects: { social: 15, energy: -15, mood: 10 }, result: "Нічого не сталось. Але було атмосферно." },
      { text: "😴 «Завтра»", effects: { mood: -10, social: -5 }, result: "«Зорі так не стоятимуть ще 400 років...»" } ] },
    { id: "e4_feast", text: "🍖 «Жадаю бенкету, гідного володаря пітьми».", options: [
      { text: "🍗 Влаштувати бенкет", effects: { hunger: 25, mood: 15, hygiene: -8 }, result: "Стіл тріщить, зло сите й добре." },
      { text: "🥪 Дати бутерброд", effects: { hunger: 10, mood: -8 }, result: "«...і це все?»" } ] },
    { id: "e4_throne", text: "👑 Спорудило трон зі сміття й вимагає поклоніння.", options: [
      { text: "🙇 Вклонитись", effects: { mood: 20, social: 10, sanity: -5 }, result: "«Нарешті хтось розуміє.»" },
      { text: "🗑️ «Це ж сміття»", effects: { mood: -15, sanity: 8 }, result: "Образа рівня апокаліпсису." } ] },
    { id: "e4_memories", text: "🌫️ «Я пам'ятаю те, чого не було...».", options: [
      { text: "🫂 Вислухати", effects: { sanity: 18, social: 12 }, result: "Розповіло легенду про себе. Гарну." },
      { text: "🙄 Закотити очі", effects: { social: -12, sanity: -5 }, result: "Замкнулось у мовчанні століть." } ] },
    { id: "e4_storm", text: "⚡ Намагається керувати грозою силою думки.", options: [
      { text: "🌩️ Підбадьорити", effects: { mood: 15, sanity: -8, energy: -10 }, result: "Спалахнуло світло. Випадково? Хтозна." },
      { text: "☂️ Дати парасолю", effects: { sanity: 10, mood: -5 }, result: "Практично. Нудно. Але сухо." } ] },
    { id: "e4_spa", text: "🧖 «Навіть стародавнє зло має доглядати себе».", options: [
      { text: "🛁 Влаштувати спа-день", effects: { hygiene: 25, mood: 15, energy: -5 }, result: "Зло сяє. Буквально." },
      { text: "⏳ «Ніколи»", effects: { hygiene: -12, mood: -5 }, result: "Тисячолітній пил лишається." } ] },
    { id: "e4_followers", text: "📜 Хоче більше «послідовників».", options: [
      { text: "🫂 Познайомити з іншими", effects: { social: 22, mood: 12 }, result: "Завело трьох друзів і одного фаната." },
      { text: "🤫 «Ти й так особливе»", effects: { social: -8, mood: 8, sanity: 5 }, result: "Лестощі діють навіть на зло." } ] },
  ],
  // ── 5: 🌌 Космічна Сутність (🍗⚡🎉🤪🫂🌌) ─────────────────────────────────
  [
    { id: "e5_void", text: "🌌 Вдивляється в порожнечу. Порожнеча вдивляється у відповідь.", options: [
      { text: "🧘 Медитувати разом", effects: { purpose: 20, sanity: 10 }, result: "Ви обоє трохи просвітліли." },
      { text: "📺 «Глянь краще мем»", effects: { purpose: -10, mood: 12 }, result: "Космос почекає. Мем смішний." } ] },
    { id: "e5_stars", text: "✨ Хоче переставити кілька зірок «для естетики».", options: [
      { text: "🌟 Дозволити", effects: { purpose: 18, mood: 15, energy: -15 }, result: "Тепер сузір'я схоже на котика 🐈" },
      { text: "🚧 «Не чіпай космос»", effects: { purpose: -8, sanity: 5 }, result: "«Зануда.» — прошепотів всесвіт." } ] },
    { id: "e5_meaning", text: "❔ «Я збагнуло сенс життя». І мовчить.", options: [
      { text: "🙏 Спитати який", effects: { sanity: -10, purpose: 20 }, result: "Відповідь тебе... спантеличила." },
      { text: "😌 «Лиши собі»", effects: { purpose: 8, mood: 5 }, result: "Деякі речі краще не знати." } ] },
    { id: "e5_hunger", text: "🍽️ «Спожив би галактику-другу».", options: [
      { text: "🌠 Дати «зоряного пилу»", effects: { hunger: 25, purpose: 10 }, result: "Смакує вічністю." },
      { text: "🍜 Дати локшину", effects: { hunger: 15, mood: 8 }, result: "Несподівано, але теж непогано." } ] },
    { id: "e5_time", text: "⏳ Загубилось у часі — не знає, який зараз рік.", options: [
      { text: "🫂 Повернути в момент", effects: { social: 18, sanity: 15 }, result: "«Дякую, що тримаєш мене тут.» 💫" },
      { text: "🌀 Хай блукає", effects: { sanity: -12, purpose: 8 }, result: "Десь у 1387-му. Чи в 3050-му." } ] },
    { id: "e5_lonely", text: "🌑 «Безмежжя таке... самотнє».", options: [
      { text: "🫂 Побути поруч", effects: { social: 25, mood: 15 }, result: "Навіть сутності потрібен друг 💛" },
      { text: "🔭 Дати телескоп", effects: { purpose: 12, social: -8 }, result: "Дивиться вдаль. Думає глибоко." } ] },
    { id: "e5_ascend", text: "🆙 Хоче трансцендувати, але трохи боїться.", options: [
      { text: "🤝 Підтримати", effects: { purpose: 22, mood: 10 }, result: "«З тобою я готове до будь-чого.»" },
      { text: "🛋️ «Лишись ще»", effects: { social: 15, purpose: -10 }, result: "Лишилось. Заради тебе." } ] },
    { id: "e5_dream", text: "💤 Спить і бачить сон про паралельні всесвіти.", options: [
      { text: "😴 Не будити", effects: { energy: 30, purpose: 10 }, result: "Прокинулось із новою теорією всього." },
      { text: "⏰ Розбудити поговорити", effects: { social: 15, energy: -15 }, result: "Сонне, але вдячне за компанію." } ] },
    { id: "e5_joke", text: "🤡 Розповіло космічний жарт. Ти не зрозумів.", options: [
      { text: "😂 Сміятись із ввічливості", effects: { mood: 18, social: 10 }, result: "Воно щасливе, що ти «зрозумів»." },
      { text: "🤔 Попросити пояснити", effects: { sanity: -8, purpose: 12 }, result: "Пояснення тривало три виміри." } ] },
    { id: "e5_gift", text: "🎁 Матеріалізувало тобі подарунок із чистої енергії.", options: [
      { text: "🥹 Прийняти", effects: { mood: 20, social: 15 }, result: "Гріє душу (і трохи руки)." },
      { text: "🙏 «Залиш собі сили»", effects: { purpose: 15, mood: 5 }, result: "«Турбота про мене — і є подарунок.»" } ] },
  ],
];

// Випадкова подія для конкретної стадії.
export function randomEvent(stageIndex = 0) {
  const list = STAGE_EVENTS[stageIndex] || STAGE_EVENTS[0];
  return list[Math.floor(Math.random() * list.length)];
}

const ALL_EVENTS = STAGE_EVENTS.flat();
export function findEvent(id) {
  return ALL_EVENTS.find((e) => e.id === id) || null;
}
