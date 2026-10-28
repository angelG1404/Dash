with open('../api_service_rankings/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('def get_universidades')
print(text[start:start+3500])
