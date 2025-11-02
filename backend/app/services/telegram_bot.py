"""Telegram bot integration built with python-telegram-bot."""
from __future__ import annotations

import calendar
import html
import logging
import uuid
import asyncio
from collections.abc import Callable
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Awaitable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    AIORateLimiter,
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from app.core.config import settings
from app.db.session import get_sessionmaker
from app.models.subscription import AuditAction, Subscription, SubscriptionStatus
from app.models.user import TelegramAccount, User
from app.services.audit import record_audit_log
from app.services.subscriptions import calculate_next_reminder, current_time, resolve_subscription_status
from app.services.telegram_link import complete_telegram_link

logger = logging.getLogger(__name__)

_session_factory = get_sessionmaker
_application: Application | None = None
_application_ready = False
_application_lock = asyncio.Lock()


@asynccontextmanager
async def _session_scope() -> AsyncSession:
    """Yield a database session for bot handlers."""

    session_factory = _session_factory()
    async with session_factory() as session:
        yield session


def _require_bot_token() -> str:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    return settings.telegram_bot_token


def get_telegram_application() -> Application:
    """Return singleton telegram Application with registered handlers."""

    global _application
    if _application is not None:
        return _application

    token = _require_bot_token()
    application = Application.builder().token(token).rate_limiter(AIORateLimiter()).build()

    application.add_handler(CommandHandler("start", handle_start))
    application.add_handler(CommandHandler("help", handle_help))
    application.add_handler(CommandHandler("add", handle_add))
    application.add_handler(CommandHandler("list", handle_list))
    application.add_handler(CallbackQueryHandler(handle_callback_action, pattern=r"^(extend_1m|extend_1y|snooze|cancel):"))

    _application = application
    return application


async def _with_session(handler: Callable[[AsyncSession], Awaitable[str | None]]) -> str | None:
    async with _session_scope() as session:
        return await handler(session)


async def _find_user_by_chat_id(session: AsyncSession, chat_id: int) -> User | None:
    result = await session.execute(
        select(User)
        .join(TelegramAccount, TelegramAccount.user_id == User.id)
        .where(TelegramAccount.telegram_chat_id == chat_id, TelegramAccount.is_active.is_(True))
        .limit(1)
    )
    return result.scalar_one_or_none()


def _format_frontend_url(path: str = "") -> str:
    raw = settings.frontend_url.split(",")[0].strip()
    base = raw.rstrip("/") if raw else "https://example.com"
    if path and not path.startswith("/"):
        path = "/" + path
    return f"{base}{path}"


def _format_subscription_message(subscription: Subscription) -> str:
    status = html.escape(subscription.status.value)
    end_at = subscription.end_at.astimezone().strftime("%d.%m.%Y")
    price = f"{subscription.price_numeric:.2f} {html.escape(subscription.currency)}"
    name = html.escape(subscription.name)
    parts = [
        f"<b>{name}</b>",
        f"Статус: <code>{status}</code>",
        f"Оплачено до: <b>{end_at}</b>",
        f"Стоимость: <b>{price}</b>",
    ]
    if subscription.category:
        parts.append(f"Категория: {html.escape(subscription.category)}")
    if subscription.vendor:
        parts.append(f"Поставщик: {html.escape(subscription.vendor)}")
    if subscription.notes:
        parts.append(f"Заметки: {html.escape(subscription.notes)}")
    return "\n".join(parts)


def _subscription_keyboard(subscription: Subscription) -> InlineKeyboardMarkup:
    subscription_id = str(subscription.id)
    detail_url = _format_frontend_url(f"subscriptions/{subscription_id}/edit")
    custom_url = detail_url + "?open=extend"
    buttons = [
        [
            InlineKeyboardButton("Продлить +1м", callback_data=f"extend_1m:{subscription_id}"),
            InlineKeyboardButton("Продлить +1г", callback_data=f"extend_1y:{subscription_id}"),
            InlineKeyboardButton("Custom", url=custom_url),
        ],
        [
            InlineKeyboardButton("Snooze 1 день", callback_data=f"snooze:{subscription_id}"),
            InlineKeyboardButton("Отменить", callback_data=f"cancel:{subscription_id}"),
        ],
        [
            InlineKeyboardButton("Открыть в веб-UI", url=detail_url),
        ],
    ]
    return InlineKeyboardMarkup(buttons)


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.message
    if message is None:
        return

    args = context.args
    chat_id = message.chat_id

    if args:
        token = args[0]

        async def _link(session: AsyncSession) -> str | None:
            account = await complete_telegram_link(session, token=token, chat_id=chat_id)
            if account is None:
                return "Не удалось привязать аккаунт. Проверьте ссылку и попробуйте ещё раз."
            user_result = await session.get(User, account.user_id)
            assert user_result is not None
            await record_audit_log(
                session,
                user_id=account.user_id,
                action=AuditAction.telegram_link_completed,
                entity="telegram_account",
                entity_id=account.id,
            )
            await session.commit()
            return "Аккаунт успешно привязан! Теперь вы будете получать напоминания в Telegram."

        text = await _with_session(_link)
        if text:
            await message.reply_text(text)
        return

    async def _ensure(session: AsyncSession) -> str:
        user = await _find_user_by_chat_id(session, chat_id)
        if user is None:
            return (
                "Этот чат пока не привязан к аккаунту. "
                "Сгенерируйте ссылку в веб-интерфейсе и отправьте /start <token>."
            )
        return (
            f"Здравствуйте, {user.email}!\n"
            "Вы можете использовать команды /add, /list и /help."
        )

    text = await _with_session(_ensure)
    await message.reply_text(text)


async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.message or update.effective_message
    if message is None:
        return
    commands = [
        "/start <token> — привязать аккаунт",
        "/add — добавить подписку",
        "/list — показать активные подписки",
        "/help — список команд",
    ]
    await message.reply_text("Команды:\n" + "\n".join(commands))


async def handle_add(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.message
    if message is None:
        return

    target_url = _format_frontend_url("subscriptions/new")

    async def _check(session: AsyncSession) -> str:
        user = await _find_user_by_chat_id(session, message.chat_id)
        if user is None:
            return (
                "Похоже, аккаунт не привязан. Получите ссылку в веб-интерфейсе и повторите /start <token>."
            )
        return (
            "Добавление подписок доступно в веб-интерфейсе. "
            f"Откройте форму: {target_url}"
        )

    text = await _with_session(_check)
    await message.reply_text(text)


async def handle_list(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.message
    if message is None:
        return

    chat_id = message.chat_id

    async def _list(session: AsyncSession) -> str | None:
        user = await _find_user_by_chat_id(session, chat_id)
        if user is None:
            return (
                "Аккаунт не привязан. Сгенерируйте токен на сайте и отправьте /start <token>."
            )
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user.id, Subscription.status != SubscriptionStatus.archived)
            .order_by(Subscription.end_at.asc())
            .limit(5)
        )
        result = await session.execute(stmt)
        subscriptions = result.scalars().all()
        if not subscriptions:
            return "Подписок пока нет. Добавьте первую через веб-интерфейс."

        for subscription in subscriptions:
            text = _format_subscription_message(subscription)
            keyboard = _subscription_keyboard(subscription)
            await context.bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=ParseMode.HTML,
                reply_markup=keyboard,
            )
        return None

    text = await _with_session(_list)
    if text:
        await message.reply_text(text)


def _add_months(date, months: int):
    month = date.month - 1 + months
    year = date.year + month // 12
    month = month % 12 + 1
    day = min(date.day, calendar.monthrange(year, month)[1])
    return date.replace(year=year, month=month, day=day)


async def handle_callback_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None:
        return
    await query.answer()

    action, subscription_id_str = query.data.split(":", 1)
    try:
        subscription_id = uuid.UUID(subscription_id_str)
    except ValueError:
        await query.edit_message_reply_markup(reply_markup=None)
        return

    chat_id = query.message.chat_id if query.message else None
    if chat_id is None:
        await query.edit_message_reply_markup(reply_markup=None)
        return

    async def _apply(session: AsyncSession) -> str:
        user = await _find_user_by_chat_id(session, chat_id)
        if user is None:
            return "Аккаунт не привязан."
        subscription = await session.get(Subscription, subscription_id)
        if subscription is None or subscription.user_id != user.id:
            return "Подписка не найдена."

        now = current_time()

        if action == "extend_1m":
            subscription.end_at = _add_months(subscription.end_at, 1)
            meta = {"action": "extend", "amount": "+1m"}
            audit_action = AuditAction.subscription_updated
        elif action == "extend_1y":
            subscription.end_at = _add_months(subscription.end_at, 12)
            meta = {"action": "extend", "amount": "+1y"}
            audit_action = AuditAction.subscription_updated
        elif action == "snooze":
            subscription.next_reminder_at = now + timedelta(days=7)
            meta = {"action": "snooze"}
            audit_action = AuditAction.subscription_snoozed
        elif action == "cancel":
            subscription.status = SubscriptionStatus.canceled
            meta = {"action": "cancel"}
            audit_action = AuditAction.subscription_status_changed
        else:
            return "Действие не поддерживается."

        if action in {"extend_1m", "extend_1y", "cancel"}:
            subscription.status = resolve_subscription_status(
                end_at=subscription.end_at,
                provided_status=subscription.status,
                existing_status=subscription.status,
                now=now,
            )
            subscription.next_reminder_at = calculate_next_reminder(
                end_at=subscription.end_at,
                status=subscription.status,
                last_notified_at=subscription.last_notified_at,
                now=now,
                user_timezone=user.tz,
            )
        await session.flush()
        await record_audit_log(
            session,
            user_id=user.id,
            action=audit_action,
            entity="subscription",
            entity_id=subscription.id,
            meta=meta,
        )
        await session.commit()
        await session.refresh(subscription)

        text = _format_subscription_message(subscription)
        keyboard = _subscription_keyboard(subscription)
        await query.edit_message_text(text=text, parse_mode=ParseMode.HTML, reply_markup=keyboard)
        return "Готово"

    result = await _with_session(_apply)
    if result:
        await query.answer(result, show_alert=False)


async def send_subscription_notification(chat_id: int, subscription: Subscription, bot: Application | None = None) -> None:
    """Utility for future usage to send notifications with inline keyboard."""

    application = bot or await ensure_application_ready()
    text = _format_subscription_message(subscription)
    keyboard = _subscription_keyboard(subscription)
    await application.bot.send_message(
        chat_id=chat_id,
        text=text,
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard,
    )


async def ensure_application_ready() -> Application:
    """Ensure telegram application is initialized once per process."""

    global _application_ready
    application = get_telegram_application()
    async with _application_lock:
        if not _application_ready:
            await application.initialize()
            _application_ready = True
    return application


async def shutdown_application() -> None:
    """Shutdown telegram application if it was initialized."""

    global _application_ready
    if not _application_ready:
        return
    application = get_telegram_application()
    async with _application_lock:
        if _application_ready:
            await application.shutdown()
            _application_ready = False


async def process_update(update: Update) -> None:
    """Process incoming Telegram update via configured application."""

    application = await ensure_application_ready()
    await application.process_update(update)
