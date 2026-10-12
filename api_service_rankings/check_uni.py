import sqlite3
conn = sqlite3.connect('api_service_rankings/bd_rankings.db')
cursor = conn.cursor()
cursor.execute("SELECT university_id, nombre_universidad, pais, region FROM dim_university WHERE nombre_universidad LIKE '%Católica%' OR nombre_universidad LIKE '%PUCP%'")
print(cursor.fetchall())
conn.close()
