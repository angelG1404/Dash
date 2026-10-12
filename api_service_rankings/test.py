import sqlite3
conn = sqlite3.connect('bd_rankings.db')
for row in conn.execute("SELECT university_id, nombre_universidad, pais FROM dim_university WHERE pais = 'Peru'"):
    print(row)
conn.close()
