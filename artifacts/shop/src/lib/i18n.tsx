import React, { createContext, useContext, useState, useEffect } from "react";

export type Lang = "uz" | "ru";

const translations = {
  uz: {
    catalog: "Katalog",
    cart: "Savatcha",
    orders: "Buyurtmalar",
    liked: "Sevimlilar",
    profile: "Profil",
    search: "Qidirish...",
    addToCart: "Savatga qo'shish",
    buy: "Sotib olish",
    orderNow: "Buyurtma berish",
    back: "Ortga",
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    edit: "Tahrirlash",
    close: "Yopish",
    yes: "Ha",
    no: "Yo'q",
    loading: "Yuklanmoqda...",
    empty: "Bo'sh",
    total: "Jami",
    price: "Narx",
    quantity: "Miqdor",
    status: "Holat",
    address: "Manzil",
    phone: "Telefon",
    name: "Ism",
    new: "Yangi",
    preparing: "Tayyorlanmoqda",
    delivered: "Yetkazildi",
    cancelled: "Bekor qilindi",
    delivery: "Yetkazib berish",
    pickup: "O'zi olib ketish",
    cash: "Naqd",
    card: "Karta",
    online: "Online",
    courier: "Kuryer",
    noCourier: "Kuryer belgilanmagan",
    courierLocation: "Kuryer joylashuvi",
    viewOnMap: "Xaritada ko'rish",
    clearChat: "Chatni tozalash",
    clearChatConfirm: "Barcha xabarlarni o'chirishni xohlaysizmi?",
    support: "Texnik yordam",
    logout: "Chiqish",
    theme: "Mavzu",
    darkMode: "Qorong'u rejim",
    lightMode: "Yorug' rejim",
    language: "Til",
    settings: "Sozlamalar",
    welcome: "Xush kelibsiz",
    loginTitle: "Tizimga kirish",
    continueBtn: "Davom etish",
    phoneNumber: "Telefon raqam",
    sendOtp: "Kodni yuborish",
    enterOtp: "Kodni kiriting",
    verify: "Tasdiqlash",
    orderDetails: "Buyurtma tafsilotlari",
    myOrders: "Mening buyurtmalarim",
    noOrders: "Hali buyurtmalar yo'q",
    checkout: "Rasmiylashtirish",
    deliveryAddress: "Yetkazib berish manzili",
    note: "Izoh",
    placeOrder: "Buyurtma berish",
    products: "Mahsulotlar",
    categories: "Kategoriyalar",
    banners: "Bannerlar",
    customers: "Mijozlar",
    dashboard: "Boshqaruv paneli",
    notifications: "Bildirishnomalar",
    adminOrders: "Buyurtmalar",
    chat: "Chat",
    couriers: "Kuryerlar",
    addCourier: "Kuryer qo'shish",
    username: "Foydalanuvchi nomi",
    password: "Parol",
    login: "Kirish",
    courierDashboard: "Kuryer paneli",
    myDeliveries: "Mening yetkazishlarim",
    shareLocation: "Joylashuvni ulashish",
    stopSharing: "Ulashishni to'xtatish",
    locationActive: "Joylashuv faol",
    locationInactive: "Joylashuv o'chiq",
    assignCourier: "Kuryer belgilash",
    unassignCourier: "Kuryerni olib tashlash",
    courierLogin: "Kuryer kirishi",
    viewCourierMap: "Kuryerni kuzatish",
  },
  ru: {
    catalog: "Каталог",
    cart: "Корзина",
    orders: "Заказы",
    liked: "Избранное",
    profile: "Профиль",
    search: "Поиск...",
    addToCart: "В корзину",
    buy: "Купить",
    orderNow: "Заказать",
    back: "Назад",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    close: "Закрыть",
    yes: "Да",
    no: "Нет",
    loading: "Загрузка...",
    empty: "Пусто",
    total: "Итого",
    price: "Цена",
    quantity: "Количество",
    status: "Статус",
    address: "Адрес",
    phone: "Телефон",
    name: "Имя",
    new: "Новый",
    preparing: "Готовится",
    delivered: "Доставлен",
    cancelled: "Отменён",
    delivery: "Доставка",
    pickup: "Самовывоз",
    cash: "Наличные",
    card: "Карта",
    online: "Онлайн",
    courier: "Курьер",
    noCourier: "Курьер не назначен",
    courierLocation: "Местоположение курьера",
    viewOnMap: "Открыть на карте",
    clearChat: "Очистить чат",
    clearChatConfirm: "Удалить все сообщения?",
    support: "Техподдержка",
    logout: "Выйти",
    theme: "Тема",
    darkMode: "Тёмная тема",
    lightMode: "Светлая тема",
    language: "Язык",
    settings: "Настройки",
    welcome: "Добро пожаловать",
    loginTitle: "Вход в систему",
    continueBtn: "Продолжить",
    phoneNumber: "Номер телефона",
    sendOtp: "Отправить код",
    enterOtp: "Введите код",
    verify: "Подтвердить",
    orderDetails: "Детали заказа",
    myOrders: "Мои заказы",
    noOrders: "Заказов пока нет",
    checkout: "Оформить",
    deliveryAddress: "Адрес доставки",
    note: "Примечание",
    placeOrder: "Оформить заказ",
    products: "Товары",
    categories: "Категории",
    banners: "Баннеры",
    customers: "Клиенты",
    dashboard: "Панель управления",
    notifications: "Уведомления",
    adminOrders: "Заказы",
    chat: "Чат",
    couriers: "Курьеры",
    addCourier: "Добавить курьера",
    username: "Имя пользователя",
    password: "Пароль",
    login: "Войти",
    courierDashboard: "Панель курьера",
    myDeliveries: "Мои доставки",
    shareLocation: "Включить геолокацию",
    stopSharing: "Отключить геолокацию",
    locationActive: "Геолокация активна",
    locationInactive: "Геолокация отключена",
    assignCourier: "Назначить курьера",
    unassignCourier: "Снять курьера",
    courierLogin: "Вход для курьера",
    viewCourierMap: "Отследить курьера",
  },
};

type TranslationKey = keyof typeof translations.uz;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "uz",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) || "uz";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations.uz[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
