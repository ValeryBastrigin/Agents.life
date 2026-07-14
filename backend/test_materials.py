import sys
sys.path.insert(0, 'src')
from materials_data import get_materials_for_step

test_steps = [
    ('Изучить основы инвестиций', 'Разобраться в фондовом рынке', 'MATERIAL_ASSET'),
    ('Научиться программировать на Python', 'Пройди онлайн курс', 'SKILL_DEVELOPMENT'),
    ('Развить навыки лидерства', 'Управление командой', 'CAREER_GROWTH'),
]

for text, desc, cat in test_steps:
    print(f'\nStep: {text} ({cat})')
    materials = get_materials_for_step(text, desc, cat, count=2)
    for m in materials:
        print(f'  - [{m["type"]}] {m["title"]}')
        print(f'    Поиск: {m["goal"]}')
    print(f'  -> {len(materials)} materials found')

print('\nDone!')