// events.js — випадкові міні-події з вибором (кнопками), що впливають на стан.

export const EVENTS = [
  {
    id: "sock",
    text: "👀 Улюбленець знайшов твій загублений носок. З'їсти його?",
    options: [
      { text: "🧦 З'їсти", effects: { hunger: 15, hygiene: -10, sanity: -5 },
        result: "😋 На смак як пригода! (і трохи як ноги)" },
      { text: "🚫 Не давати", effects: { mood: -5, sanity: 5 },
        result: "😔 Ну й ладно, я ж просто пожартував..." },
    ],
  },
  {
    id: "box",
    text: "📦 З'явилась загадкова коробка. Що робимо?",
    options: [
      { text: "🔓 Відкрити", effects: { mood: 20, sanity: -10 },
        result: "🎉 Усередині... ще одна коробка. І ще. Нескінченність коробок!" },
      { text: "😼 Сісти зверху", effects: { mood: 15, energy: -5 },
        result: "😌 Це МОЯ коробка тепер. Закон джунглів." },
    ],
  },
  {
    id: "puddle",
    text: "🌧️ Калюжа! Така спокуслива і брудна...",
    options: [
      { text: "💦 Стрибнути", effects: { mood: 25, hygiene: -25 },
        result: "🤩 НАЙКРАЩИЙ СПЛЕСК У ЖИТТІ! (ти тепер бруднуля)" },
      { text: "🧐 Обійти", effects: { hygiene: 5, mood: -5 },
        result: "😤 Дорослий вибір. Нудний, але дорослий." },
    ],
  },
  {
    id: "mirror",
    text: "🪞 Улюбленець уперше побачив себе в дзеркалі.",
    options: [
      { text: "😍 Замилуватися", effects: { mood: 15, sanity: 5 },
        result: "💅 Яке гарне створіння! (це я)" },
      { text: "😱 Злякатися", effects: { sanity: -15, energy: -5 },
        result: "🫨 ХТО ЦЕ?! ЧОМУ ВОНО ПОВТОРЮЄ ЗА МНОЮ?!" },
    ],
  },
  {
    id: "star",
    text: "🌠 Падає зірка. Можна загадати бажання!",
    options: [
      { text: "🍕 Хочу їжі", effects: { hunger: 25, mood: 10 },
        result: "🍕 З неба впала піца. Не питай як. Просто їж." },
      { text: "🧠 Хочу мудрості", effects: { sanity: 20, mood: -5 },
        result: "🧘 Тепер ти знаєш сенс життя. Він тобі не сподобався." },
    ],
  },
];

// Псевдовипадковий вибір події (Math.random доступний у Workers).
export function randomEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

export function findEvent(id) {
  return EVENTS.find((e) => e.id === id) || null;
}
