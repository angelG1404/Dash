with open('../api_service_rankings/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('pucp = next((fila for fila in filas')
print(text[start:start+3500])
