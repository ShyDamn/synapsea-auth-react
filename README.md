# @synapsea/auth-react

React SDK для Synapsea Auth — Auth-as-a-Service платформа.

## Установка

```bash
npm install @synapsea/auth-react
```

## Быстрый старт

```tsx
import { SynapseaAuthProvider, useSynapseaAuth, LoginButton } from '@synapsea/auth-react';

// 1. Оберните приложение в провайдер
function App() {
    return (
        <SynapseaAuthProvider config={{
            apiKey: 'sa_live_xxxxxxx',
            callbackURL: 'https://yoursite.com/auth/callback',
        }}>
            <MyApp />
        </SynapseaAuthProvider>
    );
}

// 2. Используйте хук в компонентах
function MyApp() {
    const { user, loading, signIn, signOut } = useSynapseaAuth();

    if (loading) return <div>Загрузка...</div>;

    if (!user) return (
        <div>
            <LoginButton provider="google">Войти через Google</LoginButton>
            <LoginButton provider="vk">Войти через VK</LoginButton>
            <LoginButton provider="telegram" method="oidc">Войти через Telegram</LoginButton>
            <button onClick={() => signIn('github')}>Войти через GitHub</button>
        </div>
    );

    return (
        <div>
            <img src={user.avatarUrl} alt={user.name} />
            <h1>Привет, {user.name}!</h1>
            <p>{user.email}</p>
            <button onClick={signOut}>Выйти</button>
        </div>
    );
}
```

## API

### `SynapseaAuthProvider`

| Prop | Тип | Описание |
|------|-----|----------|
| `config.apiKey` | `string` | API-ключ проекта (sa_live_xxx) |
| `config.baseURL` | `string?` | URL API (по умолчанию https://auth.synapsea.agency) |
| `config.callbackURL` | `string?` | URL возврата после OAuth |
| `config.onSignIn` | `(user) => void` | Callback при входе |
| `config.onSignOut` | `() => void` | Callback при выходе |

### `useSynapseaAuth()`

| Поле | Тип | Описание |
|------|-----|----------|
| `user` | `SynapseaUser | null` | Текущий пользователь |
| `session` | `SynapseaSession | null` | Текущая сессия |
| `loading` | `boolean` | Загрузка сессии |
| `error` | `string | null` | Ошибка |
| `signIn(provider, options?)` | `Promise<void>` | Начать OAuth |
| `signOut()` | `Promise<void>` | Завершить сессию |
| `client` | `SynapseaAuthClient` | Низкоуровневый клиент |

### `LoginButton`

| Prop | Тип | Описание |
|------|-----|----------|
| `provider` | `string` | ID провайдера (google, vk, etc) |
| `method` | `string?` | Метод авторизации |
| `children` | `ReactNode?` | Содержимое кнопки |
| `className` | `string?` | CSS класс |

## Лицензия

Проприетарное ПО. Использование **только** для интеграции с сервисом **Synapsea Auth** на условиях файла [`LICENSE`](./LICENSE) в корне пакета. Это не свободная/open-source лицензия.
