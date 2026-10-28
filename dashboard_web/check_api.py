with open('../api_service_rankings/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'elif tipo ==', text)]
for pos in matches:
    print(text[pos:pos+800])
    print("="*60)
