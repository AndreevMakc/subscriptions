# Техническое задание: Сервис учёта подписок

## 1. Цель и область проекта
- Предоставить пользователю сервис для учёта платных подписок: название, цена, валюта, дата завершения.
- Каналы взаимодействия: веб-интерфейс и Telegram-бот.
- Уведомления: в Telegram и на email, начиная за 7 дней до окончания и повторяясь каждый день, пока подписка не продлена или не отменена/архивирована.

## 2. Архитектура и стек
- **Backend**: Python 3.12, FastAPI (async), SQLAlchemy 2.x (async), Pydantic v2, Alembic.
- **Фон**: Celery 5 + Redis 7 (broker/beat) для планировщика и рассылок.
- **БД**: PostgreSQL 15+ (используем supabase на старте)
- **Интеграции**: Telegram-бот (python-telegram-bot), Email (SMTP - стандартная библиотека smtplib).
- **Auth**: OAuth2/OpenID Connect (Google/GitHub/Auth0/Okta — выбрать на внедрении).
- **Frontend**: React 18 + Vite + TypeScript, React Router, Zustand, react-hook-form + zod, i18n.
- **Управление зависимостями Python**: Poetry.
- **Развёртывание**: локально Docker/Compose; прод — Vercel (frontend) и Render (backend + Redis + Postgres).
- **Структура репозитория (моно)**:
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
- Вход через OAuth2/OIDC. Если email не подтверждён провайдером — отправить письмо верификации
- Сессии: JWT (access/refresh)
- Привязка Telegram через deep-link `/start <one-time token>`
- Всегда используем МСК TZ для корректных расчётов уведомлений

### 3.2 Управление подписками
- CRUD + архивирование.
- Поля: `name`, `price`, `currency` (ISO 4217), `end_at` (timestamptz), `notes?`, `category?`, `vendor?`.
- Статусы: `active`, `canceled`, `expired`, `archived`.
- Системные поля: `next_reminder_at`, `last_notified_at`.

### 3.3 Просмотр и аналитика
- Список с фильтрами (статус, ближайшие к окончанию, категория) и поиском.
- Карточка подписки с историей уведомлений.
- Дашборд: агрегаты расходов по периодам, топ-категории.

### 3.4 Уведомления
- Старт: за 7 дней до `end_at` с учётом TZ пользователя.
- Повтор: каждый день до переноса `end_at`/отмены/архивации.
- Каналы: Telegram + email (если привязаны/включены). Антидубль: не более одного сообщения в канал на подписку за 24 часа.
- Snooze: «Напомнить через 1 день» без изменения `end_at`.
- Типовые тексты: «Подписка <name> заканчивается <date>. Стоимость: <price> <currency>. Продлить / Отменить / Snooze». В день истечения и после — соответствующие формулировки.

### 3.5 Telegram-бот
- Команды: `/start` (привязка), `/add`, `/list`, `/help`.
- Уведомления с inline-кнопками: «Продлить (+1м/+1г/Custom)», «Snooze 1 день», «Отменить», «Открыть в веб-UI».
- Вебхук на бэкенде с валидацией.

### 3.6 Email
- HTML + текстовые шаблоны, i18n RU/EN.
- DKIM/SPF/DMARC; обработка bounce/complaint с временным/постоянным отключением канала.

### 3.7 Настройки пользователя
- TZ (всегда по московскому времени), язык интерфейса (пока только русский).
- Вкл/выкл для Telegram и email отдельно.

## 4. Бизнес-логика напоминаний
- При создании/обновлении:
  - Если `now() < end_at - 7d` → `next_reminder_at = end_at - 7d (в TZ пользователя)`.
  - Если `end_at - 7d ≤ now() < end_at` → `next_reminder_at = now()` (попадёт в ближайший тикер).
  - Если `now() ≥ end_at` → включить пост-expiry цикл: `next_reminder_at` кратно +7 дней от `end_at` или `last_notified_at`, пока не пройдём текущий момент.
- После успешной отправки: `last_notified_at = now()`, `next_reminder_at = last_notified_at + 1d`.
- Остановка цикла: статусы `canceled`/`archived`; при изменении `end_at` — полный пересчёт.
- Антидубль: не более одного уведомления на канал в сутки на подписку.
- Snooze: `next_reminder_at = now() + 1d`.

## 5. Модель данных (PostgreSQL, ключевые сущности)
- `users`: `id (uuid)`, `email`, `email_verified`, `tz`, `locale`, `created_at`.
- `identities`: `id`, `user_id`, `provider`, `provider_user_id`, `created_at` (уникальность `(provider, provider_user_id)`).
- `telegram_accounts`: `id`, `user_id`, `telegram_chat_id`, `linked_at`, `is_active`.
- `subscriptions`: `id`, `user_id`, `name`, `price_numeric numeric(12,2)`, `currency char(3)`, `end_at timestamptz`, `status enum`, `category`, `vendor`, `notes`, `next_reminder_at timestamptz`, `last_notified_at timestamptz`, `created_at`, `updated_at`.
- `notifications`: `id`, `subscription_id`, `channel enum(email|telegram)`, `status enum(sent|failed)`, `sent_at`, `error`.
- `audit_log`: `id`, `user_id`, `action`, `entity`, `entity_id`, `ts`, `meta jsonb`.
- **Индексы**: `(user_id, status, end_at)`, `(next_reminder_at)`, `(last_notified_at)`, `(telegram_chat_id)`.

## 6. API v1 (основные эндпойнты)
- `GET /api/v1/users/me`
- `GET /api/v1/subscriptions` (фильтры: `status`, `q`, `soon`)
- `POST /api/v1/subscriptions`
- `GET|PUT|PATCH|DELETE /api/v1/subscriptions/{id}`
- `POST /api/v1/subscriptions/{id}/snooze`
- `PATCH /api/v1/subscriptions/{id}/status` → `active|canceled|archived`
- `POST /api/v1/notifications/test`
- OAuth/OIDC: `GET /api/v1/auth/login`, `GET /api/v1/auth/callback`
- Telegram link: `POST /api/v1/telegram/link-token`, `POST /api/v1/telegram/link`
- Health: `GET /healthz`

## 7. Frontend (React, UX-потоки)
- Страницы: Login/Callback; Dashboard; Subscriptions (лист/карточка/форма); Settings; Telegram-link.
- Валидация: react-hook-form + zod (обязательные `name`, `price ≥ 0`, `currency`, `end_at`).
- Локализация RU/EN; явные даты в локали пользователя; быстрые действия (Snooze/Отменить/Изменить дату).
- API-клиент: fetch с интерцепторами, обработка 401/403, ре-логин.

## 8. Безопасность и конфиденциальность
- TLS везде; CSP; XSS/CSRF защита (для cookie-сессий).
- Rate limiting на публичных эндпойнтах и вебхуке Telegram.
- Минимизация PII; секреты — в секрет-менеджерах (Vercel/Render/GitHub).
- Экспорт/удаление аккаунта — backlog (v2).
- Редакция PII в логах (masking email/telegram_chat_id при необходимости).

## 9. Нефункциональные требования
- Производительность: SLA доставки уведомлений ≤ 5 минут от `next_reminder_at` (батчи Celery).
- Надёжность: ретраи с экспоненциальной задержкой; идемпотентность сообщений.
- Масштабирование: горизонтальное по воркерам; индексация БД; пул коннекций.
- Наблюдаемость: структурированные логи; метрики Prometheus-friendly; алёрты.

## 10. Тестирование и качество
- Unit-тесты: бизнес-логика дат/напоминаний.
- Интеграционные: БД, Telegram-бот, email.
- e2e: критические пользовательские потоки (добавление → напоминание → snooze/продление).
- Линт/типы: ruff + mypy; покрытие тестами ≥ 70% на MVP.
- Property-based тесты для расчётов `next_reminder_at`.

## 11. Деплой и CI/CD

### 11.1 Ветки и окружения
- `develop` → staging/preview (Vercel Preview + Render Staging).
- `main` → production (Vercel Prod + Render Prod).
- Любой push/merge в ветку запускает автосборку и выкладку.

### 11.2 Frontend → Vercel (автодеплой из GitHub)
- Подключение репозитория GitHub; Root Directory: `frontend/`.
- Build: `npm run build`; Output: `dist` (Vite).
- Переменные окружения: `VITE_API_BASE_URL`, `VITE_OAUTH_CLIENT_ID`, `VITE_TELEGRAM_BOT_NAME` (опц.).
- Preview deployments для PR; прод — из `main`.
- Кастомный домен через CNAME.

### 11.3 Backend → Render (free, автодеплой из GitHub)
- Render подключается к репозиторию; автодеплой на пуш в выбранные ветки.
- Файл `render.yaml` (в корне) описывает сервисы: web (API), redis, postgres; опционально workers/beat.
- Пример минимальной декларации:
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
- Воркеры Celery:
  - Worker: `poetry run celery -A app.workers.celery_app worker -l info`
  - Beat: `poetry run celery -A app.workers.celery_app beat -l info`
  - Можно оформить как отдельные `type: worker` сервисы в `render.yaml`.

### 11.4 Миграции БД (GitHub Actions)
- Workflow `migrate-db` запускается по push в `main` и вручную:
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
- `RENDER_DATABASE_URL` хранить в GitHub Secrets.

### 11.5 Локальная разработка
- `docker compose up -d --build` для старта всех сервисов.
- Миграции: `poetry run alembic upgrade head`.
- Команды `make` (опц.): `up`, `down`, `migrate`, `fmt`, `test`.

### 11.6 Переменные окружения (минимум)
- **Backend**: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `BASE_URL`, `FRONTEND_URL`, `TELEGRAM_BOT_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `OAUTH_PROVIDER`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`.
- **Frontend (Vercel)**: `VITE_API_BASE_URL`, `VITE_OAUTH_CLIENT_ID`, `VITE_TELEGRAM_BOT_NAME` (опц.).

## 12. Наблюдаемость и эксплуатация
- Логи: структурированные, с `request_id`/`user_id` (где уместно).
- Метрики: `subscriptions_total`, `notifications_sent_total{channel}`, `notification_failures_total`, `reminder_due_gauge`, `queue_latency_seconds`.
- Алерты: отказов отправки > 2% за 15 минут; лаг очереди > 2 минут; неуспешный деплой.

## 13. Валидация и обработка ошибок
- Цена ≥ 0; до 2 знаков после запятой.
- `end_at` при создании не должен быть в прошлом; если так — статус `expired` и включение post-expiry-цикла.
- Все даты храним в UTC, вычисления ведём с учётом TZ пользователя.
- Идемпотентность вебхуков и inline-кнопок (idempotency-key).
- Антиспам/Rate limiting на публичных эндпойнтах и бот-вебхуке.

## 14. Критерии приёмки (выборка)
- Созданная подписка с `end_at` в будущем получает `next_reminder_at = end_at - 7d` (в TZ пользователя).
- Когда `next_reminder_at ≤ now()`, отправляются уведомления в доступные каналы без дублей в сутки.
- После отправки `next_reminder_at` сдвигается ровно на 7 дней.
- Snooze переносит `next_reminder_at` на `now() + 7d`.
- Изменение `end_at` пересчитывает цикл по правилам.
- Привязка Telegram через `/start <token>` однократная и сохраняет `telegram_chat_id`.
- Email-шаблоны рендерятся верно; письма проходят SPF/DKIM/DMARC.
- Автодеплой: push в `develop` создаёт Vercel Preview и Render Staging; push в `main` — прод-выкатка обоих. Миграции выполняются успешно.

## 15. План MVP
1. **Каркас**: OAuth (один провайдер), CRUD подписок (UI+API), PostgreSQL, миграции, базовый деплой (Vercel + Render).
2. **Ценность**: Celery beat + worker (напоминания), Telegram/email, Snooze, изменение даты из уведомления.
3. **Полировка**: настройки (TZ/язык/каналы), дашборд, наблюдаемость, алёрты, e2e-тесты, бэкапы БД.

_Конец ТЗ._
