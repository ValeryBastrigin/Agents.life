# Анализ ключей localStorage на привязку к userId

## Файлы с КОРРЕКТНОЙ привязкой к userId

| Файл | Ключ | Статус |
|------|------|--------|
| `Dietitian.jsx` | `dietitian_profile_{userId}` | ✅ OK |

## Файлы БЕЗ привязки к userId (нужно исправить)

| Файл | Ключ | Проблема |
|------|------|----------|
| `DietPlanPage.jsx` | `dietitian_profile` | ❌ Должен быть `dietitian_profile_{userId}` |
| `Mentor.jsx` | `habit_tracker_data` | ❌ Должен быть `habit_tracker_data_{userId}` |
| `HabitTracker.jsx` | `habit_tracker_data` | ❌ Должен быть `habit_tracker_data_{userId}` |
| `DevelopmentTree.jsx` | `devtree_node_positions` | ❌ Должен быть `devtree_node_positions_{userId}` |

## Системные ключи (не данные пользователя - исправлять не нужно)

| Файл | Ключ | Обоснование |
|------|------|-------------|
| `App.jsx` | `theme`, `onboarding_completed`, `google_token` | Системные/глобальные настройки |
| `UserContext.jsx` | `user_id` | Хранит сам userId |
| `LanguageContext.jsx` | `language` | Язык - глобальная настройка |
| `Secretary.jsx` | `secretary_calendar_hint` | Одноразовая подсказка |