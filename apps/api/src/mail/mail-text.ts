import type { Lang } from '../spa/spa-text.js'

/** Email kinds. Code emails carry a 6-digit code + magic link; notice emails are informational with an optional button. */
export const CODE_MAIL_KINDS = ['signIn', 'setEmail', 'reauth'] as const
export const NOTICE_MAIL_KINDS = ['emailChanged', 'newSignIn', 'deletionScheduled'] as const
/** The monthly "what's new" mail; not a sign-in / security kind, so it has its own text table (`DIGEST_TEXT`). */
export const DIGEST_MAIL_KIND = 'digest'
export type CodeMailKind = (typeof CODE_MAIL_KINDS)[number]
export type NoticeMailKind = (typeof NOTICE_MAIL_KINDS)[number]
export type MailKind = CodeMailKind | NoticeMailKind

export type CodeMailText = {
  subject: (code: string) => string
  heading: string
  intro: string
  button: string
  expires: (minutes: number) => string
  ignore: string
  requestedFrom: (device: string) => string
}

export type NoticeMailText = {
  subject: string
  heading: string
  /** `{device}`, `{time}`, `{days}` and `{email}` are substituted. */
  body: string
  button: string | null
  ignore: string
}

export type MailChrome = { footer: string; codeLabel: string; linkFallback: string }

export const CHROME_TEXT: Record<Lang, MailChrome> = {
  ua: {
    footer: 'carsua.app - пошук авто за номером і VIN. Це автоматичний лист, відповідати на нього не потрібно.',
    codeLabel: 'Ваш код',
    linkFallback: 'Якщо кнопка не працює, скопіюйте це посилання в браузер:'
  },
  ru: {
    footer: 'carsua.app - поиск авто по номеру и VIN. Это автоматическое письмо, отвечать на него не нужно.',
    codeLabel: 'Ваш код',
    linkFallback: 'Если кнопка не работает, скопируйте эту ссылку в браузер:'
  },
  en: {
    footer: 'carsua.app - vehicle lookup by plate and VIN. This is an automated message; no reply is needed.',
    codeLabel: 'Your code',
    linkFallback: 'If the button does not work, copy this link into your browser:'
  }
}

const SIGN_IN_TEXT: Record<Lang, CodeMailText> = {
  ua: {
    subject: code => `${code} - код для входу на carsua.app`,
    heading: 'Вхід на carsua.app',
    intro: 'Введіть цей код на сайті або натисніть кнопку, щоб увійти.',
    button: 'Увійти',
    expires: m => `Дійсний ${m} хвилин і спрацює лише один раз.`,
    ignore: 'Якщо ви не запитували вхід, просто проігноруйте цей лист - акаунт у безпеці.',
    requestedFrom: d => `Запит надійшов з: ${d}.`
  },
  ru: {
    subject: code => `${code} - код для входа на carsua.app`,
    heading: 'Вход на carsua.app',
    intro: 'Введите этот код на сайте или нажмите кнопку, чтобы войти.',
    button: 'Войти',
    expires: m => `Действителен ${m} минут и сработает только один раз.`,
    ignore: 'Если вы не запрашивали вход, просто проигнорируйте это письмо - аккаунт в безопасности.',
    requestedFrom: d => `Запрос пришёл с: ${d}.`
  },
  en: {
    subject: code => `${code} is your carsua.app sign-in code`,
    heading: 'Sign in to carsua.app',
    intro: 'Enter this code on the site, or press the button, to sign in.',
    button: 'Sign in',
    expires: m => `Valid for ${m} minutes and works only once.`,
    ignore: 'If you did not request this, just ignore this email - your account is safe.',
    requestedFrom: d => `Requested from: ${d}.`
  }
}

const SET_EMAIL_TEXT: Record<Lang, CodeMailText> = {
  ua: {
    ...SIGN_IN_TEXT.ua,
    subject: code => `${code} - підтвердження пошти на carsua.app`,
    heading: 'Підтвердіть електронну пошту',
    intro: 'Введіть цей код на сторінці профілю, щоб прив’язати цю пошту до акаунта.',
    button: 'Підтвердити'
  },
  ru: {
    ...SIGN_IN_TEXT.ru,
    subject: code => `${code} - подтверждение почты на carsua.app`,
    heading: 'Подтвердите электронную почту',
    intro: 'Введите этот код на странице профиля, чтобы привязать эту почту к аккаунту.',
    button: 'Подтвердить'
  },
  en: {
    ...SIGN_IN_TEXT.en,
    subject: code => `${code} confirms your email on carsua.app`,
    heading: 'Confirm your email',
    intro: 'Enter this code on your profile page to attach this email to your account.',
    button: 'Confirm'
  }
}

const REAUTH_TEXT: Record<Lang, CodeMailText> = {
  ua: {
    ...SIGN_IN_TEXT.ua,
    subject: code => `${code} - підтвердження дії на carsua.app`,
    heading: 'Підтвердіть, що це ви',
    intro: 'Для захищеної дії в профілі потрібне повторне підтвердження. Введіть цей код.',
    button: 'Підтвердити'
  },
  ru: {
    ...SIGN_IN_TEXT.ru,
    subject: code => `${code} - подтверждение действия на carsua.app`,
    heading: 'Подтвердите, что это вы',
    intro: 'Для защищённого действия в профиле нужно повторное подтверждение. Введите этот код.',
    button: 'Подтвердить'
  },
  en: {
    ...SIGN_IN_TEXT.en,
    subject: code => `${code} confirms it is you on carsua.app`,
    heading: 'Confirm it is you',
    intro: 'A sensitive profile action needs a fresh confirmation. Enter this code.',
    button: 'Confirm'
  }
}

export const CODE_TEXT: Record<CodeMailKind, Record<Lang, CodeMailText>> = {
  signIn: SIGN_IN_TEXT,
  setEmail: SET_EMAIL_TEXT,
  reauth: REAUTH_TEXT
}

export const NOTICE_TEXT: Record<NoticeMailKind, Record<Lang, NoticeMailText>> = {
  emailChanged: {
    ua: {
      subject: 'Пошту акаунта carsua.app змінено',
      heading: 'Пошту акаунта змінено',
      body: 'Електронну пошту вашого акаунта змінено на {email}. Ця адреса більше не використовується для входу.',
      button: null,
      ignore: 'Якщо це були не ви - увійдіть через Google або Telegram і завершіть усі сеанси в профілі.'
    },
    ru: {
      subject: 'Почта аккаунта carsua.app изменена',
      heading: 'Почта аккаунта изменена',
      body: 'Электронная почта вашего аккаунта изменена на {email}. Этот адрес больше не используется для входа.',
      button: null,
      ignore: 'Если это были не вы - войдите через Google или Telegram и завершите все сеансы в профиле.'
    },
    en: {
      subject: 'Your carsua.app account email was changed',
      heading: 'Account email changed',
      body: 'Your account email was changed to {email}. This address can no longer be used to sign in.',
      button: null,
      ignore: 'If this was not you, sign in with Google or Telegram and end all sessions in your profile.'
    }
  },
  newSignIn: {
    ua: {
      subject: 'Новий вхід в акаунт carsua.app',
      heading: 'Новий вхід в акаунт',
      body: 'Ми помітили вхід з нового пристрою: {device}, {time}.',
      button: 'Це не я - завершити всі сеанси',
      ignore: 'Якщо це були ви, нічого робити не потрібно.'
    },
    ru: {
      subject: 'Новый вход в аккаунт carsua.app',
      heading: 'Новый вход в аккаунт',
      body: 'Мы заметили вход с нового устройства: {device}, {time}.',
      button: 'Это не я - завершить все сеансы',
      ignore: 'Если это были вы, ничего делать не нужно.'
    },
    en: {
      subject: 'New sign-in to your carsua.app account',
      heading: 'New sign-in to your account',
      body: 'We noticed a sign-in from a new device: {device}, {time}.',
      button: 'Not me - end all sessions',
      ignore: 'If this was you, no action is needed.'
    }
  },
  deletionScheduled: {
    ua: {
      subject: 'Видалення акаунта carsua.app заплановано',
      heading: 'Акаунт буде видалено',
      body: 'Ваш акаунт і всі дані буде остаточно видалено через {days} дн. Щоб скасувати видалення, просто увійдіть у акаунт до цього строку.',
      button: 'Відновити акаунт',
      ignore: 'Якщо ви хочете видалити акаунт - нічого робити не потрібно.'
    },
    ru: {
      subject: 'Удаление аккаунта carsua.app запланировано',
      heading: 'Аккаунт будет удалён',
      body: 'Ваш аккаунт и все данные будут окончательно удалены через {days} дн. Чтобы отменить удаление, просто войдите в аккаунт до этого срока.',
      button: 'Восстановить аккаунт',
      ignore: 'Если вы хотите удалить аккаунт - ничего делать не нужно.'
    },
    en: {
      subject: 'Your carsua.app account is scheduled for deletion',
      heading: 'Account scheduled for deletion',
      body: 'Your account and all its data will be permanently deleted in {days} days. To cancel, just sign in before then.',
      button: 'Restore account',
      ignore: 'If you want the account deleted, no action is needed.'
    }
  }
}

export type DigestMailText = {
  subject: (month: string) => string
  heading: (month: string) => string
  intro: string
  /** Counts of the items that are only summarised; zero counts are left out and an all-zero month yields `null`. */
  more: (counts: { improved: number; data: number; fix: number }) => string | null
  button: string
  reason: string
  unsubscribe: string
}

const joinParts = (prefix: string, parts: string[]): string | null =>
  parts.length ? `${prefix} ${parts.join(', ')}.` : null

export const DIGEST_TEXT: Record<Lang, DigestMailText> = {
  ua: {
    subject: month => `Що нового на carsua.app: ${month}`,
    heading: month => `Що нового: ${month}`,
    intro: 'Нові можливості, які зʼявилися на carsua.app минулого місяця:',
    more: c =>
      joinParts(
        'Також за місяць -',
        [
          c.improved ? `покращень: ${String(c.improved)}` : '',
          c.data ? `оновлень даних: ${String(c.data)}` : '',
          c.fix ? `виправлень: ${String(c.fix)}` : ''
        ].filter(Boolean)
      ),
    button: 'Усі зміни',
    reason: 'Ви отримали цей лист, бо ввімкнули щомісячні новини у профілі.',
    unsubscribe: 'Відписатися'
  },
  ru: {
    subject: month => `Что нового на carsua.app: ${month}`,
    heading: month => `Что нового: ${month}`,
    intro: 'Новые возможности, появившиеся на carsua.app в прошлом месяце:',
    more: c =>
      joinParts(
        'Также за месяц -',
        [
          c.improved ? `улучшений: ${String(c.improved)}` : '',
          c.data ? `обновлений данных: ${String(c.data)}` : '',
          c.fix ? `исправлений: ${String(c.fix)}` : ''
        ].filter(Boolean)
      ),
    button: 'Все изменения',
    reason: 'Вы получили это письмо, потому что включили ежемесячные новости в профиле.',
    unsubscribe: 'Отписаться'
  },
  en: {
    subject: month => `What's new on carsua.app: ${month}`,
    heading: month => `What's new: ${month}`,
    intro: 'The new features that arrived on carsua.app last month:',
    more: c =>
      joinParts(
        'Also this month -',
        [
          c.improved ? `improvements: ${String(c.improved)}` : '',
          c.data ? `data updates: ${String(c.data)}` : '',
          c.fix ? `fixes: ${String(c.fix)}` : ''
        ].filter(Boolean)
      ),
    button: 'See all changes',
    reason: 'You are receiving this because you turned on monthly news in your profile.',
    unsubscribe: 'Unsubscribe'
  }
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
