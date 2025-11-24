# Техническое задание: Сервис учёта подписок

## 1. Цель и область проекта
- [R1] Предоставить пользователю сервис для учёта платных подписок: название, цена, валюта, дата завершения.
- [R2] [x] Каналы взаимодействия: веб-интерфейс и Telegram-бот.
- [R3] [x] Уведомления: в Telegram и на email, начиная за 7 дней до окончания и повторяясь каждый день, пока подписка не продлена или не отменена/архивирована.

## 2. Архитектура и стек
- [R4] **Backend**: Python 3.12, FastAPI (async), SQLAlchemy 2.x (async), Pydantic v2, Alembic.
- [R5] [x] **Фон**: Celery 5 + Redis 7 (broker/beat) для планировщика и рассылок.
- [R6] **БД**: PostgreSQL 15+ (используем supabase на старте)
- [R7] [x] **Интеграции**: Telegram-бот (python-telegram-bot), Email (SMTP - стандартная библиотека smtplib).
- [R8] **Auth**: OAuth2/OpenID Connect (Google/GitHub/Auth0/Okta — выбрать на внедрении).
- [R9] **Frontend**: React 18 + Vite + TypeScript, React Router, Zustand, react-hook-form + zod, i18n.
- [R10] **Управление зависимостями Python**: Poetry.
- [R11] **Развёртывание**: локально Docker/Compose; прод — Vercel (frontend) и Render (backend + Redis + Postgres).
- [R12] **Структура репозитория (моно)**:
  ```
  /subscriptions
    /backend   # FastAPI, Celery, Alembic, Poetry
    /frontend  # React, Vite, TypeScript
    Dockerfile.backend
    Dockerfile.frontend
    docker-compose.yml
    render.yaml
    .github/workflows/
    .env.example
  ```

## 3. Функциональные требования

### 3.1 Регистрация и авторизация
- [R13] Вход через OAuth2/OIDC. Если email не подтверждён провайдером — отправить письмо верификации
- [R14] Сессии: JWT (access/refresh)
- [R15] [x] Привязка Telegram через deep-link `/start <one-time token>`
- [R16] Всегда используем МСК TZ для корректных расчётов уведомлений

### 3.2 Управление подписками
- [R17] CRUD + архивирование.
- [R18] Поля: `name`, `price`, `currency` (ISO 4217), `end_at` (timestamptz), `notes?`, `category?`, `vendor?`.
- [R19] Статусы: `active`, `canceled`, `expired`, `archived`.
- [R20] Системные поля: `next_reminder_at`, `last_notified_at`.

### 3.3 Просмотр и аналитика
- [R21] Список с фильтрами (статус, ближайшие к окончанию, категория) и поиском.
- [R22] Карточка подписки с историей уведомлений.
- [R23] Дашборд: агрегаты расходов по периодам, топ-категории.

### 3.4 Уведомления
- [R24] Старт: за 7 дней до `end_at` с учётом TZ пользователя.
- [R25] Повтор: каждый день до переноса `end_at`/отмены/архивации.
- [R26] Каналы: Telegram + email (если привязаны/включены). Антидубль: не более одного сообщения в канал на подписку за 24 часа.
- [R27] Snooze: «Напомнить через 1 день» без изменения `end_at`.
- [R28] Типовые тексты: «Подписка <name> заканчивается <date>. Стоимость: <price> <currency>. Продлить / Отменить / Snooze». В день истечения и после — соответствующие формулировки.

### 3.5 Telegram-бот
- [R29] [x] Команды: `/start` (привязка), `/add`, `/list`, `/help`.
- [R30] [x] Уведомления с inline-кнопками: «Продлить (+1м/+1г/Custom)», «Snooze 1 день», «Отменить», «Открыть в веб-UI».
- [R31] [x] Вебхук на бэкенде с валидацией.

### 3.6 Email
- [R32] HTML + текстовые шаблоны, i18n RU/EN.
- [R33] DKIM/SPF/DMARC; обработка bounce/complaint с временным/постоянным отключением канала.

### 3.7 Настройки пользователя
- [R34] TZ (всегда по московскому времени), язык интерфейса (пока только русский).
- [R35] Вкл/выкл для Telegram и email отдельно.

## 4. Бизнес-логика напоминаний
- [R36] При создании/обновлении:
  - [R37] Если `now() < end_at - 7d` → `next_reminder_at = end_at - 7d (в TZ пользователя)`.
  - [R38] Если `end_at - 7d ≤ now() < end_at` → `next_reminder_at = now()` (попадёт в ближайший тикер).
  - [R39] Если `now() ≥ end_at` → включить пост-expiry цикл: `next_reminder_at` кратно +7 дней от `end_at` или `last_notified_at`, пока не пройдём текущий момент.
- [R40] После успешной отправки: `last_notified_at = now()`, `next_reminder_at = last_notified_at + 1d`.
- [R41] Остановка цикла: статусы `canceled`/`archived`; при изменении `end_at` — полный пересчёт.
- [R42] Антидубль: не более одного уведомления на канал в сутки на подписку.
- [R43] Snooze: `next_reminder_at = now() + 1d`.

## 5. Модель данных (PostgreSQL, ключевые сущности)
- [R44] `users`: `id (uuid)`, `email`, `email_verified`, `tz`, `locale`, `created_at`.
- [R45] `identities`: `id`, `user_id`, `provider`, `provider_user_id`, `created_at` (уникальность `(provider, provider_user_id)`).
- [R46] `telegram_accounts`: `id`, `user_id`, `telegram_chat_id`, `linked_at`, `is_active`.
- [R47] `subscriptions`: `id`, `user_id`, `name`, `price_numeric numeric(12,2)`, `currency char(3)`, `end_at timestamptz`, `status enum`, `category`, `vendor`, `notes`, `next_reminder_at timestamptz`, `last_notified_at timestamptz`, `created_at`, `updated_at`.
- [R48] `notifications`: `id`, `subscription_id`, `channel enum(email|telegram)`, `status enum(sent|failed)`, `sent_at`, `error`.
- [R49] `audit_log`: `id`, `user_id`, `action`, `entity`, `entity_id`, `ts`, `meta jsonb`.
- [R50] **Индексы**: `(user_id, status, end_at)`, `(next_reminder_at)`, `(last_notified_at)`, `(telegram_chat_id)`.

## 6. API v1 (основные эндпойнты)
- [R51] `GET /api/v1/users/me`
- [R52] `GET /api/v1/subscriptions` (фильтры: `status`, `q`, `soon`)
- [R53] `POST /api/v1/subscriptions`
- [R54] `GET|PUT|PATCH|DELETE /api/v1/subscriptions/{id}`
- [R55] `POST /api/v1/subscriptions/{id}/snooze`
- [R56] `PATCH /api/v1/subscriptions/{id}/status` → `active|canceled|archived`
- [R57] `POST /api/v1/notifications/test`
- [R58] OAuth/OIDC: `GET /api/v1/auth/login`, `GET /api/v1/auth/callback`
- [R59] Telegram link: `POST /api/v1/telegram/link-token`, `POST /api/v1/telegram/link`
- [R60] Health: `GET /healthz`

## 7. Frontend (React, UX-потоки)
- [R61] Страницы: Login/Callback; Dashboard; Subscriptions (лист/карточка/форма); Settings; Telegram-link.
- [R62] Валидация: react-hook-form + zod (обязательные `name`, `price ≥ 0`, `currency`, `end_at`).
- [R63] Локализация RU/EN; явные даты в локали пользователя; быстрые действия (Snooze/Отменить/Изменить дату).
- [R64] API-клиент: fetch с интерцепторами, обработка 401/403, ре-логин.

## 8. Безопасность и конфиденциальность
- [R65] TLS везде; CSP; XSS/CSRF защита (для cookie-сессий).
- [R66] Rate limiting на публичных эндпойнтах и вебхуке Telegram.
- [R67] Минимизация PII; секреты — в секрет-менеджерах (Vercel/Render/GitHub).
- [R68] Экспорт/удаление аккаунта — backlog (v2).
- [R69] Редакция PII в логах (masking email/telegram_chat_id при необходимости).

## 9. Нефункциональные требования
- [R70] Производительность: SLA доставки уведомлений ≤ 5 минут от `next_reminder_at` (батчи Celery).
- [R71] Надёжность: ретраи с экспоненциальной задержкой; идемпотентность сообщений.
- [R72] Масштабирование: горизонтальное по воркерам; индексация БД; пул коннекций.
- [R73] Наблюдаемость: структурированные логи; метрики Prometheus-friendly; алёрты.

## 10. Тестирование и качество
- [R74] Unit-тесты: бизнес-логика дат/напоминаний.
- [R75] Интеграционные: БД, Telegram-бот, email.
- [R76] e2e: критические пользовательские потоки (добавление → напоминание → snooze/продление).
- [R77] Линт/типы: ruff + mypy; покрытие тестами ≥ 70% на MVP.
- [R78] Property-based тесты для расчётов `next_reminder_at`.

## 11. Деплой и CI/CD

### 11.1 Ветки и окружения
- [R79] `develop` → staging/preview (Vercel Preview + Render Staging).
- [R80] `main` → production (Vercel Prod + Render Prod).
- [R81] Любой push/merge в ветку запускает автосборку и выкладку.

### 11.2 Frontend → Vercel (автодеплой из GitHub)
- [R82] Подключение репозитория GitHub; Root Directory: `frontend/`.
- [R83] Build: `npm run build`; Output: `dist` (Vite).
- [R84] Переменные окружения: `VITE_API_BASE_URL`, `VITE_OAUTH_CLIENT_ID`, `VITE_TELEGRAM_BOT_NAME` (опц.).
- [R85] Preview deployments для PR; прод — из `main`.
- [R86] Кастомный домен через CNAME.

### 11.3 Backend → Render (free, автодеплой из GitHub)
- [R87] Render подключается к репозиторию; автодеплой на пуш в выбранные ветки.
- [R88] Файл `render.yaml` (в корне) описывает сервисы: web (API), redis, postgres; опционально workers/beat.
- [R89] Пример минимальной декларации:
  ```yaml
  services:
    - type: web
      name: subscriptions-api
      env: python
      region: frankfurt
      buildCommand: |
        cd backend
        pip install poetry==1.8.3
        poetry install --no-interaction --no-ansi --only main
      startCommand: |
        cd backend
        poetry run uvicorn app.main:app --host 0.0.0.0 --port 10000
      autoDeploy: true
      branch: main
      plan: free
      envVars:
        - key: DATABASE_URL
          fromDatabase:
            name: subscriptions-db
            property: connectionString
        - key: REDIS_URL
          value: redis://redissvc:6379/0
        - key: SECRET_KEY
          generateValue: true
        - key: BASE_URL
          value: https://subscriptions-api.onrender.com
        - key: FRONTEND_URL
          value: https://your-frontend.vercel.app
        - key: TELEGRAM_BOT_TOKEN
          sync: false
    - type: redis
      name: redissvc
      plan: free
    - type: postgres
      name: subscriptions-db
      plan: free
  ```
- [R90] Воркеры Celery:
  - [R91] Worker: `poetry run celery -A app.workers.celery_app worker -l info`
  - [R92] Beat: `poetry run celery -A app.workers.celery_app beat -l info`
  - [R93] Можно оформить как отдельные `type: worker` сервисы в `render.yaml`.

### 11.4 Миграции БД (GitHub Actions)
- [R94] Workflow `migrate-db` запускается по push в `main` и вручную:
  ```yaml
  name: migrate-db
  on:
    workflow_dispatch:
    push:
      branches: [ "main" ]
      paths: [ "backend/**", "db/**" ]
  jobs:
    migrate:
      runs-on: ubuntu-24.04
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with: { python-version: "3.12" }
        - run: pip install "poetry==1.8.3"
        - working-directory: backend
          run: poetry install --no-interaction --only main
        - name: Alembic upgrade
          env:
            DATABASE_URL: ${{ secrets.RENDER_DATABASE_URL }}
          working-directory: backend
          run: poetry run alembic upgrade head
  ```
- [R95] `RENDER_DATABASE_URL` хранить в GitHub Secrets.

### 11.5 Локальная разработка
- [R96] `docker compose up -d --build` для старта всех сервисов.
- [R97] Миграции: `poetry run alembic upgrade head`.
- [R98] Команды `make` (опц.): `up`, `down`, `migrate`, `fmt`, `test`.

### 11.6 Переменные окружения (минимум)
- [R99] **Backend**: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `BASE_URL`, `FRONTEND_URL`, `TELEGRAM_BOT_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `OAUTH_PROVIDER`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`.
- [R100] **Frontend (Vercel)**: `VITE_API_BASE_URL`, `VITE_OAUTH_CLIENT_ID`, `VITE_TELEGRAM_BOT_NAME` (опц.).

## 12. Наблюдаемость и эксплуатация
- [R101] Логи: структурированные, с `request_id`/`user_id` (где уместно).
- [R102] Метрики: `subscriptions_total`, `notifications_sent_total{channel}`, `notification_failures_total`, `reminder_due_gauge`, `queue_latency_seconds`.
- [R103] Алерты: отказов отправки > 2% за 15 минут; лаг очереди > 2 минут; неуспешный деплой.

    ## 13. Валидация и обработка ошибок
- [R104] Цена ≥ 0; до 2 знаков после запятой.
- [R105] `end_at` при создании не должен быть в прошлом; если так — статус `expired` и включение post-expiry-цикла.
- [R106] Все даты храним в UTC, вычисления ведём с учётом TZ пользователя.
- [R107] Идемпотентность вебхуков и inline-кнопок (idempotency-key).
- [R108] Антиспам/Rate limiting на публичных эндпойнтах и бот-вебхуке.

## 14. Критерии приёмки (выборка)
- [R109] Созданная подписка с `end_at` в будущем получает `next_reminder_at = end_at - 7d` (в TZ пользователя).
- [R110] Когда `next_reminder_at ≤ now()`, отправляются уведомления в доступные каналы без дублей в сутки.
- [R111] После отправки `next_reminder_at` сдвигается ровно на 7 дней.
- [R112] Snooze переносит `next_reminder_at` на `now() + 7d`.
- [R113] Изменение `end_at` пересчитывает цикл по правилам.
- [R114] Привязка Telegram через `/start <token>` однократная и сохраняет `telegram_chat_id`.
- [R115] Email-шаблоны рендерятся верно; письма проходят SPF/DKIM/DMARC.
- [R116] Автодеплой: push в `develop` создаёт Vercel Preview и Render Staging; push в `main` — прод-выкатка обоих. Миграции выполняются успешно.

## 15. План MVP
1. [R117] **Каркас**: OAuth (один провайдер), CRUD подписок (UI+API), PostgreSQL, миграции, базовый деплой (Vercel + Render).
2. [R118] **Ценность**: Celery beat + worker (напоминания), Telegram/email, Snooze, изменение даты из уведомления.
3. [R119] **Полировка**: настройки (TZ/язык/каналы), дашборд, наблюдаемость, алёрты, e2e-тесты, бэкапы БД.

_Конец ТЗ._
