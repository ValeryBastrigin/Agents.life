import os
import sys

d = 'frontend/public/assets/icons/agents'

svgs = {
    'ixteria': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="url(#g-ix)"/>\n  <path d="M16 6l1.91 5.87L24 12l-4.55 3.63L21 22l-5-3.5L11 22l1.55-6.37L8 12l6.09-.13L16 6z" fill="#fff" opacity="0.95"/>\n  <defs>\n    <linearGradient id="g-ix" x1="0" y1="0" x2="32" y2="32">\n      <stop stop-color="#7c3aed"/>\n      <stop offset="1" stop-color="#a855f7"/>\n    </linearGradient>\n  </defs>\n</svg>',

    'диетолог': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="#22c55e"/>\n  <path d="M10 22c0-1.5 1-4 2-5.5C10 14 11 12 13.5 10.5 14 9 16 8 16 8s2 1 2.5 2.5C21 12 22 14 20 16.5c1 1.5 2 4 2 5.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>\n  <path d="M13 22c0-1 .5-3 1.5-3.5C13 17 14 15 16 14c2 1 3 3 1.5 4.5 1 .5 1.5 2.5 1.5 3.5" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round"/>\n</svg>',

    'секретарь': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="#3b82f6"/>\n  <rect x="10" y="9" width="12" height="14" rx="2" fill="#fff" opacity="0.9"/>\n  <rect x="12" y="12" width="8" height="2" rx="1" fill="#3b82f6"/>\n  <rect x="12" y="16" width="8" height="2" rx="1" fill="#3b82f6"/>\n  <rect x="12" y="20" width="5" height="1.5" rx="0.75" fill="#3b82f6"/>\n</svg>',

    'психолог': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="#ec4899"/>\n  <path d="M16 10c.83 0 1.5.67 1.5 1.5v1c2.32.8 4 3.04 4 5.66 0 3.31-2.69 6-6 6a6 6 0 01-6-6c0-2.62 1.68-4.86 4-5.66v-1C14.5 10.67 15.17 10 16 10z" fill="#fff" opacity="0.9"/>\n  <path d="M13 18l2 2 4-4" stroke="#ec4899" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n</svg>',

    'ментор': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="#f59e0b"/>\n  <path d="M16 9l1.5 4.5H22l-3.5 2.5 1.5 4.5L16 18l-4 2.5 1.5-4.5L10 13.5h4.5L16 9z" fill="#fff" opacity="0.95"/>\n  <path d="M11 21h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>\n</svg>',

    'финансовый ассистент': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">\n  <circle cx="16" cy="16" r="15" fill="#10b981"/>\n  <rect x="9" y="12" width="14" height="12" rx="2" fill="#fff" opacity="0.9"/>\n  <path d="M12 14h8v2H12v-2zm0 4h8v2H12v-2z" fill="#10b981"/>\n  <path d="M16 10v2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>\n</svg>',
}

for name, content in svgs.items():
    path = os.path.join(d, name + '.svg')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content + '\n')
    print(f'Created: {path}')

print('All SVGs created successfully!')