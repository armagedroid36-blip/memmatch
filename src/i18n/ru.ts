// Все тексты интерфейса — в одном словаре (задел под i18n).
// Новый язык = новый файл с тем же набором ключей + включение в словари ниже.

const ru = {
  appName: 'Memder',
  tagline: 'Находи людей по вкусу в мемах',
  landingLead: 'Свайпай мемы. Мы сравниваем твои вкусы с другими и показываем тех, кто смеётся над тем же.',
  landingSample: 'Пример мема из ленты',
  landingCta: 'Начать',
  landingAlreadyHave: 'У меня уже есть аккаунт',

  authTitle: 'Вход в Memder',
  authSignup: 'Создать аккаунт',
  authSignin: 'Войти',
  authSwitchToSignin: 'Уже есть аккаунт — войти',
  authSwitchToSignup: 'Нет аккаунта — создать',
  authEmail: 'почта',
  authPassword: 'пароль (от 6 символов)',
  authConfirmEmail: 'Проверь почту и подтверди регистрацию.',
  authBack: 'Назад',

  profileTitle: 'Пара деталей',
  profileLead: 'Только имя — никаких чатов и фото-верификаций на этом этапе.',
  profileName: 'имя',
  profileAge: 'возраст (необязательно)',
  profileCity: 'город (необязательно)',
  profileSubmit: 'Начать свайпать',
  profileAgeError: 'Возраст — целое число от 14 до 99.',

  navFeed: 'Лента',
  navMatches: 'Мэтчи',

  feedLoading: 'Грузим мемы…',
  feedEmpty: 'Колода закончилась.',
  feedEmptyHint: 'Новые мемы приходят каждый день.',
  feedRefresh: 'Обновить',
  feedLike: 'Нравится',
  feedSkip: 'Мимо',
  feedHint: 'Свайп вправо или вверх — лайк, влево — мимо',
  feedAll: 'все',
  feedErrorRating: 'Оценка не сохранилась. Попробуй ещё раз.',
  feedErrorLoad: 'Не загрузилась лента.',

  matchesTitle: 'Мэтчи',
  matchesLoading: 'Считаем совпадения…',
  matchesEmpty: 'Пока никого.',
  matchesEmptyHint: 'Оцени больше мемов — как только совпадений наберётся достаточно, здесь появятся люди.',
  matchesShared: 'общих мемов',
  matchesRefresh: 'Обновить',
  matchesError: 'Не удалось получить мэтчи.',

  signOut: 'выйти',
  errorGeneric: 'Что-то пошло не так. Попробуй ещё раз.',
} as const

export type Dict = typeof ru
export const dict: Dict = ru

/** Простой доступ к строке словаря: t('feedLike') */
export function t<K extends keyof Dict>(key: K): Dict[K] {
  return dict[key]
}
