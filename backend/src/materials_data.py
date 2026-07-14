"""
Предопределённые образовательные материалы для каждой категории целей.
Каждый материал: {title, description, type, icon, goal}
- url не храним — ссылки битые; пользователь ищет материал через Google по запросу
"""

MATERIALS_BY_CATEGORY = {
    "MATERIAL_ASSET": [
        {
            "title": "Богатый папа, бедный папа",
            "description": "Классика финансовой грамотности. Роберт Кийосаки",
            "type": "book",
            "icon": "📖",
            "goal": "финансовая грамотность инвестиции"
        },
        {
            "title": "Курс по инвестициям для начинающих",
            "description": "Бесплатный курс на Stepik для начинающих инвесторов",
            "type": "course",
            "icon": "🎓",
            "goal": "инвестиции курс для начинающих"
        },
        {
            "title": "Финансовая культура (ЦБ РФ)",
            "description": "Официальный просветительский ресурс по финансам",
            "type": "article",
            "icon": "🎓",
            "goal": "финансовая культура ЦБ РФ"
        },
        {
            "title": "Основы личных финансов",
            "description": "Базовые принципы управления деньгами на YouTube",
            "type": "video",
            "icon": "🎥",
            "goal": "основы личных финансов управление деньгами"
        }
    ],
    "SKILL_DEVELOPMENT": [
        {
            "title": "Learning How to Learn",
            "description": "Курс на Coursera о методиках эффективного обучения",
            "type": "course",
            "icon": "🎓",
            "goal": "эффективное обучение методики learning how to learn"
        },
        {
            "title": "Атомные привычки",
            "description": "Джеймс Клир — как формировать полезные привычки",
            "type": "book",
            "icon": "📖",
            "goal": "формирование привычек атомные привычки"
        },
        {
            "title": "Метод Фейнмана",
            "description": "Статья о технике глубокого обучения на Habr",
            "type": "article",
            "icon": "📝",
            "goal": "метод фейнмана глубокое обучение"
        }
    ],
    "CAREER_GROWTH": [
        {
            "title": "Карьерное планирование",
            "description": "Статьи по развитию карьеры от Т-Ж",
            "type": "article",
            "icon": "🎓",
            "goal": "карьерное планирование развитие карьеры"
        },
        {
            "title": "От хорошего к великому",
            "description": "Джим Коллинз — книга о достижении выдающихся результатов",
            "type": "book",
            "icon": "📖",
            "goal": "достижение успеха выдающиеся результаты"
        },
        {
            "title": "Курс по лидерству",
            "description": "Основы лидерства и управления на Coursera",
            "type": "course",
            "icon": "🎓",
            "goal": "лидерство управление курсы"
        }
    ],
    "LIFE_EXPERIENCE": [
        {
            "title": "Планирование путешествий",
            "description": "Гайды по бюджетным путешествиям от Т-Ж",
            "type": "article",
            "icon": "✈️",
            "goal": "бюджетные путешествия планирование"
        },
        {
            "title": "Алхимик",
            "description": "Пауло Коэльо — книга о поиске своего пути",
            "type": "book",
            "icon": "📖",
            "goal": "поиск себя путь алхимик коэльо"
        },
        {
            "title": "Волонтёрство и культурный обмен",
            "description": "Workaway — практика международного волонтёрства",
            "type": "practice",
            "icon": "🌍",
            "goal": "волонтёрство культурный обмен workaway"
        }
    ],
    "EXISTENTIAL_WELLBEING": [
        {
            "title": "The Science of Well-Being",
            "description": "Курс о счастье от Йельского университета на Coursera",
            "type": "course",
            "icon": "🎓",
            "goal": "счастье благополучие yale science of well being"
        },
        {
            "title": "Сила настоящего",
            "description": "Экхарт Толле — книга о жизни в моменте",
            "type": "book",
            "icon": "📖",
            "goal": "осознанность сила настоящего момент"
        },
        {
            "title": "Медитация Headspace",
            "description": "Практика осознанности и медитации",
            "type": "practice",
            "icon": "🧘",
            "goal": "медитация осознанность headspace"
        }
    ],
    "ABSTRACT_AMBITION": [
        {
            "title": "Дизайн-мышление",
            "description": "Креативный подход к задачам — статья на Нетологии",
            "type": "article",
            "icon": "🎓",
            "goal": "креативность дизайн мышление задачи"
        },
        {
            "title": "Искусство войны",
            "description": "Сунь Цзы — стратагемы для достижения целей",
            "type": "book",
            "icon": "📖",
            "goal": "стратегия достижение целей искусство войны"
        },
        {
            "title": "Как достигать целей",
            "description": "Вдохновляющее выступление на TED",
            "type": "video",
            "icon": "🎥",
            "goal": "достижение целей мотивация TED"
        }
    ]
}

DEFAULT_MATERIALS = [
    {
        "title": "7 навыков высокоэффективных людей",
        "description": "Стивен Кови — книга о достижении целей",
        "type": "book",
        "icon": "📖",
        "goal": "эффективность достижение целей кови"
    },
    {
        "title": "Постановка целей",
        "description": "Статья о целеполагании от Т-Ж",
        "type": "article",
        "icon": "🎓",
        "goal": "целеполагание постановка целей SMART"
    },
    {
        "title": "Метод Айви Ли",
        "description": "Ежедневная приоритизация задач",
        "type": "practice",
        "icon": "📋",
        "goal": "приоритизация задач метод айви ли"
    }
]


def get_materials_for_category(category: str) -> list:
    return MATERIALS_BY_CATEGORY.get(category, DEFAULT_MATERIALS)


def get_materials_for_step(step_text: str, step_description: str, category: str, count: int = 2) -> list:
    category_materials = get_materials_for_category(category)
    step_lower = (step_text + " " + step_description).lower()
    scored_materials = []

    for mat in category_materials:
        score = 0
        mat_text = (mat["title"] + " " + mat["description"]).lower()
        common_words = set(step_lower.split()) & set(mat_text.split())
        score += len(common_words) * 2
        scored_materials.append((score, mat))

    scored_materials.sort(key=lambda x: x[0], reverse=True)

    selected = []
    used_types = set()

    for score, mat in scored_materials:
        if len(selected) >= count:
            break
        if mat["type"] not in used_types or len(selected) == 0:
            selected.append(mat)
            used_types.add(mat["type"])

    if len(selected) < count:
        for score, mat in scored_materials:
            if len(selected) >= count:
                break
            if mat not in selected:
                selected.append(mat)

    return selected[:count]