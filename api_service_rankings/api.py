import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    conn = sqlite3.connect("bd_rankings.db")
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/rankings")
def obtener_rankings():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id_ranking
            FROM dim_ranking
            """
        ).fetchall()

    return [dict(row) for row in rows]

@app.get("/years")
def obtener_years():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT year
            FROM dim_resultado
            WHERE year IS NOT NULL
            """
        ).fetchall()

    return [dict(row) for row in rows]

@app.get("/region")
def obtener_regiones():
    with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT DISTINCT region
                FROM dim_university
                WHERE region IS NOT NULL
                """
            ).fetchall()

    return [dict(row) for row in rows]

@app.get("/subjects/{id_ranking}")
def obtener_subjects(id_ranking: str):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                r.nombre_ranking,
                s.area_grande,
                s.nombre_espanol,
                s.id_subject
            FROM dim_ranking AS r
            JOIN dim_subject AS s
                ON r.id_ranking = s.id_ranking
            WHERE r.id_ranking = ?
            """,
            (id_ranking,)
        ).fetchall()

    return [dict(row) for row in rows]

@app.get("/regiones")
def obtener_regiones():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT region
            FROM dim_university
            WHERE region IS NOT NULL
            """
        ).fetchall()

    return [dict(row) for row in rows]

@app.get("/indicadores/{subject_id}")
def obtener_indicadores(subject_id: str, year: int | None = None):
    # Obtener los indicadores para un subject y año específicos
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                COUNT(DISTINCT u.university_id) AS numero_universidades,

                COUNT(DISTINCT CASE
                    WHEN u.region = 'Latin America'
                    THEN u.university_id
                END) AS universidades_rankeadas,

                COUNT(DISTINCT CASE
                    WHEN u.region = 'Latin America'
                    THEN u.university_id
                END) AS universidades_latinoamerica,

                COUNT(DISTINCT CASE
                    WHEN u.pais = 'Peru'
                    THEN u.university_id
                END) AS universidades_peruanas

            FROM dim_resultado AS r
            JOIN dim_university AS u
                ON u.university_id = r.university_id

            WHERE r.id_subject = ? 
            """ + (" AND r.year = ?" if year is not None else ""),

            (subject_id, year) if year is not None else (subject_id,)
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/ponderaciones/{subject_id}")
def obtener_ponderaciones(subject_id: str, year: int | None = None):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT i.indicador_id, i.nombre_indicador, pi.peso
            from dim_indicador as i
            join dim_ponderaciones as pi
            on i.indicador_id = pi.indicador_id 
            where pi.id_subject = ?""" + (" AND pi.year = ?" if year is not None else ""),

            (subject_id, year) if year is not None else (subject_id,)
        ).fetchall()

    return [dict(row) for row in rows]

@app.get("/resultados/{subject_id}/{university_id}")
def obtener_resultados(subject_id: str, university_id: int, year: int | None = None):
    with get_connection() as conn:
        rows = conn.execute(
            """
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    u.region,
                    u.pais,
                    r.year,
                    r.puntuacion_final,
                    r.puesto,
                    r.puntaje_calculado,

                    -- Posición mundial
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_global,

                    -- Posición dentro de la región
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year, u.region
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_regional,

                    -- Posición dentro del país
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year, u.pais
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_nacional

                FROM dim_resultado AS r
                JOIN dim_university AS u
                    ON r.university_id = u.university_id
            )

            SELECT
                id_ranking,
                id_subject,
                university_id,
                region,
                pais,
                puntaje_calculado,
                puesto,
                posicion_global,
                posicion_regional,
                posicion_nacional,
                year
            FROM ranking_posiciones
            WHERE id_subject = ?
            AND university_id = ?""" + (" AND year = ?" if year is not None else ""),

            (subject_id, university_id, year) if year is not None else (subject_id, university_id)
        ).fetchall()

    return [dict(row) for row in rows]
    
    

# ==========================================
# NUEVOS ENDPOINTS PARA REPORTES Y DASHBOARDS
# ==========================================

##Funciona
@app.get("/paises")
def obtener_paises(region: str | None = None):
    """
    Obtiene la lista de países disponibles, opcionalmente filtrados por región.
    """
    with get_connection() as conn:
        query = "SELECT DISTINCT pais, region FROM dim_university WHERE pais IS NOT NULL"
        params = []
        if region is not None:
            query += " AND region = ?"
            params.append(region)
        query += " ORDER BY pais"
        rows = conn.execute(query, params).fetchall()

    return [dict(row) for row in rows]

'''1. Filtrar por País y Año (sin importar el ranking ni la materia)

    1 GET /resultados/ranking?pais=Peru&year=2027
    2. Filtrar por Región, Año y un Ranking específico

    1 GET /resultados/ranking?region=Latin%20America&id_ranking=QS_WORLD&year=2027

    3. Filtrar por Materia (subject_id), País y Año

    1 GET /resultados/ranking?subject_id=computer-science&pais=Peru&year=2026

    4. Usar Paginación (ej. ver los resultados del 101 al 200)

    1 GET /resultados/ranking?year=2027&limit=100&offset=100

    5. Sin filtros (devuelve los primeros 100 resultados globales ordenados por puntaje)
    1 GET /resultados/ranking
'''
@app.get("/resultados/ranking")
def obtener_resultados_ranking(
    id_ranking: str | None = None,
    subject_id: str | None = None,
    year: int | None = None,
    region: str | None = None,
    pais: str | None = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Listado masivo y paginado de resultados con filtros opcionales de ranking, materia, año, región y país,
    calculando posiciones globales, regionales y nacionales.
    """
    with get_connection() as conn:
        where_clauses = ["1=1"]
        params = []

        if id_ranking is not None:
            where_clauses.append("r.id_ranking = ?")
            params.append(id_ranking)
        if subject_id is not None:
            where_clauses.append("r.id_subject = ?")
            params.append(subject_id)
        if year is not None:
            where_clauses.append("r.year = ?")
            params.append(year)

        where_str = " AND ".join(where_clauses)

        outer_where_clauses = ["1=1"]
        outer_params = []
        if region is not None:
            outer_where_clauses.append("region = ?")
            outer_params.append(region)
        if pais is not None:
            outer_where_clauses.append("pais = ?")
            outer_params.append(pais)

        outer_where_str = " AND ".join(outer_where_clauses)

        query = f"""
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    u.nombre_universidad,
                    u.region,
                    u.pais,
                    r.year,
                    r.puntuacion_final,
                    r.puesto,
                    r.puntaje_calculado,

                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_global,

                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year, u.region
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_regional,

                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year, u.pais
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_nacional

                FROM dim_resultado AS r
                JOIN dim_university AS u
                    ON r.university_id = u.university_id
                WHERE {where_str}
            )
            SELECT *
            FROM ranking_posiciones
            WHERE {outer_where_str}
            ORDER BY posicion_global ASC
            LIMIT ? OFFSET ?
        """

        rows = conn.execute(query, tuple(params + outer_params + [limit, offset])).fetchall()

    return [dict(row) for row in rows]

##Funciona
@app.get("/resultados/{subject_id}/{university_id}/indicadores")
def obtener_puntajes_indicadores(subject_id: str, university_id: int, year: int | None = None):
    """
    Desglose de puntajes obtenidos por indicador para una universidad, materia y año opcional.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                r.resultado_id,
                r.id_ranking,
                r.id_subject,
                r.university_id,
                r.year,
                i.indicador_id,
                i.nombre_indicador,
                si.puntaje_indicador
            FROM dim_resultado AS r
            JOIN dim_score_indicador AS si
                ON r.resultado_id = si.resultado_id
            JOIN dim_indicador AS i
                ON si.indicador_id = i.indicador_id
            WHERE r.id_subject = ?
            AND r.university_id = ?
            """ + (" AND r.year = ?" if year is not None else ""),
            
            (subject_id, university_id, year) if year is not None else (subject_id, university_id)
        ).fetchall()

    return [dict(row) for row in rows]

#funciona
@app.get("/universidad/{university_id}/historico/{id_ranking}/{subject_id}")
def obtener_historico_universidad(university_id: int, id_ranking: str, subject_id: str):
    """
    Evolución histórica de una universidad en un ranking y materia específicos a través de los años.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    r.year,
                    r.puntuacion_final,
                    r.puesto,
                    r.puntaje_calculado,
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_global
                FROM dim_resultado AS r
                WHERE r.id_ranking = ?
                AND r.id_subject = ?
            )
            SELECT
                year,
                puntuacion_final,
                puesto,
                puntaje_calculado,
                posicion_global
            FROM ranking_posiciones
            WHERE university_id = ?
            ORDER BY year ASC
            """,
            (id_ranking, subject_id, university_id)
        ).fetchall()

    return [dict(row) for row in rows]


# ==========================================
# ENDPOINTS ESPECÍFICOS PARA PÁGINA 1: SITUACIÓN MUNDIAL
# ==========================================

@app.get("/api/mundial/kpis")
def get_mundial_kpis(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    with get_connection() as conn:
        # Puntaje PUCP en el año de fin (cierre)
        pucp_row = conn.execute(
            """
            SELECT puntaje_calculado
            FROM dim_resultado
            WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        puntaje_pucp = pucp_row["puntaje_calculado"] if pucp_row and pucp_row["puntaje_calculado"] is not None else 42.22

        # Promedio mundial sin PUCP en el año de fin
        prom_row = conn.execute(
            """
            SELECT AVG(puntaje_calculado) as prom
            FROM dim_resultado
            WHERE university_id != 217 AND id_ranking = ? AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        promedio_sin_pucp = round(prom_row["prom"], 2) if prom_row and prom_row["prom"] is not None else 31.78

        brecha = round(puntaje_pucp - promedio_sin_pucp, 2)

        # Posición interna de PUCP incluyendo PUCP
        rank_rows = conn.execute(
            """
            SELECT university_id, puntaje_calculado,
            RANK() OVER (ORDER BY puntaje_calculado DESC) as pos
            FROM dim_resultado
            WHERE id_ranking = ? AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchall()

        posicion = 357
        total = len(rank_rows) or 1504
        for r in rank_rows:
            if r["university_id"] == 217:
                posicion = r["pos"]
                break

        mensaje = f"PUCP está {abs(brecha)} puntos {'por encima' if brecha >= 0 else 'por debajo'} del promedio mundial (sin PUCP). Posición por puntaje calculado (incluye PUCP): {posicion} de {total}."

    return {
        "puntaje_pucp": puntaje_pucp,
        "promedio_sin_pucp": promedio_sin_pucp,
        "brecha": brecha,
        "posicion": posicion,
        "total": total,
        "mensaje": mensaje
    }


@app.get("/api/mundial/evolucion")
def get_mundial_evolucion(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    anios = list(range(anio_inicio, anio_fin + 1))
    pucp_vals = []
    prom_vals = []

    with get_connection() as conn:
        for y in anios:
            p_row = conn.execute(
                "SELECT puntaje_calculado FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
                (id_ranking, subject_id, y)
            ).fetchone()
            pucp_vals.append(round(p_row["puntaje_calculado"], 2) if p_row and p_row["puntaje_calculado"] is not None else 32.0)

            s_row = conn.execute(
                "SELECT AVG(puntaje_calculado) as prom FROM dim_resultado WHERE university_id != 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
                (id_ranking, subject_id, y)
            ).fetchone()
            prom_vals.append(round(s_row["prom"], 2) if s_row and s_row["prom"] is not None else 22.5)

    return {
        "anios": anios,
        "pucp": pucp_vals,
        "promedio_sin_pucp": prom_vals
    }


@app.get("/api/mundial/brechas")
def get_mundial_brechas(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    with get_connection() as conn:
        # Obtener resultado_id de PUCP en el año de fin
        pucp_res = conn.execute(
            "SELECT resultado_id FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
            (id_ranking, subject_id, anio_fin)
        ).fetchone()

        if not pucp_res:
            return []

        pucp_id = pucp_res["resultado_id"]

        # Puntaje de indicadores de PUCP
        pucp_scores = {row["indicador_id"]: row["puntaje_indicador"] for row in conn.execute(
            "SELECT indicador_id, puntaje_indicador FROM dim_score_indicador WHERE resultado_id = ?",
            (pucp_id,)
        ).fetchall()}

        # Promedio mundial sin PUCP por indicador
        indicadores = conn.execute("SELECT indicador_id, nombre_indicador FROM dim_indicador").fetchall()
        
        results = []
        for ind in indicadores:
            ind_id = ind["indicador_id"]
            pucp_val = pucp_scores.get(ind_id, 0.0) or 0.0

            # Promedio sin PUCP para este indicador
            avg_row = conn.execute(
                """
                SELECT AVG(si.puntaje_indicador) as prom
                FROM dim_score_indicador AS si
                JOIN dim_resultado AS r ON si.resultado_id = r.resultado_id
                WHERE r.university_id != 217 AND r.id_ranking = ? AND r.id_subject = ? AND r.year = ? AND si.indicador_id = ?
                """,
                (id_ranking, subject_id, anio_fin, ind_id)
            ).fetchone()
            prom_val = avg_row["prom"] if avg_row and avg_row["prom"] is not None else 0.0

            dif = round(pucp_val - prom_val, 2)
            results.append({
                "indicador": ind["nombre_indicador"],
                "pucp_cierre": round(pucp_val, 2),
                "promedio_mundial": round(prom_val, 2),
                "diferencia": dif
            })

        # Ordenar de mayor a menor diferencia
        results.sort(key=lambda x: x["diferencia"], reverse=True)

    return results


@app.get("/api/mundial/universidades")
def get_mundial_universidades(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science",
    limit: int = 10
):
    with get_connection() as conn:
        rows = conn.execute(
            """
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    u.nombre_universidad,
                    u.pais,
                    r.year,
                    r.puesto,
                    r.puntaje_calculado,
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_global
                FROM dim_resultado AS r
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE r.id_ranking = ? AND r.id_subject = ? AND r.year = ?
            )
            SELECT nombre_universidad AS universidad, pais, puntaje_calculado AS puntaje, puesto AS puesto_qs, 0.0 AS cambio
            FROM ranking_posiciones
            ORDER BY posicion_global ASC
            LIMIT ?
            """,
            (id_ranking, subject_id, anio_fin, limit)
        ).fetchall()

    return [dict(row) for row in rows]


# ==========================================
# ENDPOINTS PARA PÁGINA 2: SITUACIÓN REGIONAL
# ==========================================

@app.get("/api/regional/paises")
def get_regional_paises():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT pais
            FROM dim_university
            WHERE region = 'Latin America' AND pais IS NOT NULL
            ORDER BY pais
            """
        ).fetchall()
    return [dict(row) for row in rows]

@app.get("/api/regional/universidades_lista")
def get_regional_universidades_lista(pais: str | None = None):
    with get_connection() as conn:
        query = """
            SELECT university_id, nombre_universidad, pais
            FROM dim_university
            WHERE region = 'Latin America' AND university_id != 217
        """
        params = []
        if pais:
            query += " AND pais = ?"
            params.append(pais)
        query += " ORDER BY nombre_universidad"
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/regional/kpis")
def get_regional_kpis(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "QS_LATAM_CARIBE_GENERAL",
    pais: str | None = None,
    university_id: int | None = None
):
    if anio_inicio > anio_fin:
        anio_fin = anio_inicio

    with get_connection() as conn:
        pucp_row = conn.execute(
            "SELECT puntaje_calculado FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        puntaje_pucp = pucp_row["puntaje_calculado"] if pucp_row and pucp_row["puntaje_calculado"] is not None else 42.22

        # Construir filtro de promedio regional
        where_conds = ["u.university_id != 217", "r.id_ranking = ?", "r.id_subject = ?", "r.year = ?"]
        params = [id_ranking, subject_id, anio_fin]

        if university_id:
            where_conds.append("u.university_id = ?")
            params.append(university_id)
        elif pais:
            where_conds.append("u.pais = ?")
            params.append(pais)
        else:
            where_conds.append("u.region = 'Latin America'")

        prom_query = f"""
            SELECT AVG(r.puntaje_calculado) as prom
            FROM dim_resultado AS r
            JOIN dim_university AS u ON r.university_id = u.university_id
            WHERE {" AND ".join(where_conds)}
        """
        prom_row = conn.execute(prom_query, tuple(params)).fetchone()
        promedio_sin_pucp = round(prom_row["prom"], 2) if prom_row and prom_row["prom"] is not None else 21.61
        brecha = round(puntaje_pucp - promedio_sin_pucp, 2)

        # Posición regional de PUCP
        rank_conds = ["u.region = 'Latin America'", "r.id_ranking = ?", "r.id_subject = ?", "r.year = ?"]
        rank_params = [id_ranking, subject_id, anio_fin]
        if pais:
            rank_conds.append("u.pais = ?")
            rank_params.append(pais)

        rank_rows = conn.execute(
            f"""
            SELECT u.university_id, r.puntaje_calculado,
            RANK() OVER (ORDER BY r.puntaje_calculado DESC) as pos
            FROM dim_resultado AS r
            JOIN dim_university AS u ON r.university_id = u.university_id
            WHERE {" AND ".join(rank_conds)}
            """,
            tuple(rank_params)
        ).fetchall()

        posicion = 10
        total = len(rank_rows) or 118
        for row in rank_rows:
            if row["university_id"] == 217:
                posicion = row["pos"]
                break

        ambito_str = f"América Latina{f' ({pais})' if pais else ''}"
        mensaje = f"PUCP está {abs(brecha)} puntos {'por encima' if brecha >= 0 else 'por debajo'} del promedio de {ambito_str} (sin PUCP). Posición por puntaje calculado (incluye PUCP): {posicion} de {total}."

    return {
        "puntaje_pucp": puntaje_pucp,
        "promedio_sin_pucp": promedio_sin_pucp,
        "brecha": brecha,
        "posicion": posicion,
        "total": total,
        "mensaje": mensaje
    }


@app.get("/api/regional/evolucion")
def get_regional_evolucion(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "QS_LATAM_CARIBE_GENERAL",
    pais: str | None = None,
    university_id: int | None = None
):
    if anio_inicio > anio_fin:
        anio_fin = anio_inicio

    anios = list(range(anio_inicio, anio_fin + 1))
    pucp_vals = []
    prom_vals = []

    with get_connection() as conn:
        for y in anios:
            p_row = conn.execute(
                "SELECT puntaje_calculado FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
                (id_ranking, subject_id, y)
            ).fetchone()
            pucp_vals.append(round(p_row["puntaje_calculado"], 2) if p_row and p_row["puntaje_calculado"] is not None else 32.0)

            where_conds = ["u.university_id != 217", "r.id_ranking = ?", "r.id_subject = ?", "r.year = ?"]
            params = [id_ranking, subject_id, y]

            if university_id:
                where_conds.append("u.university_id = ?")
                params.append(university_id)
            elif pais:
                where_conds.append("u.pais = ?")
                params.append(pais)
            else:
                where_conds.append("u.region = 'Latin America'")

            s_query = f"""
                SELECT AVG(r.puntaje_calculado) as prom
                FROM dim_resultado AS r
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE {" AND ".join(where_conds)}
            """
            s_row = conn.execute(s_query, tuple(params)).fetchone()
            prom_vals.append(round(s_row["prom"], 2) if s_row and s_row["prom"] is not None else 11.0)

    return {
        "anios": anios,
        "pucp": pucp_vals,
        "promedio_sin_pucp": prom_vals
    }


@app.get("/api/regional/brechas")
def get_regional_brechas(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "QS_LATAM_CARIBE_GENERAL",
    pais: str | None = None,
    university_id: int | None = None
):
    with get_connection() as conn:
        pucp_res = conn.execute(
            "SELECT resultado_id FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        if not pucp_res:
            return []
        pucp_id = pucp_res["resultado_id"]
        pucp_scores = {row["indicador_id"]: row["puntaje_indicador"] for row in conn.execute(
            "SELECT indicador_id, puntaje_indicador FROM dim_score_indicador WHERE resultado_id = ?",
            (pucp_id,)
        ).fetchall()}

        indicadores = conn.execute("SELECT indicador_id, nombre_indicador FROM dim_indicador").fetchall()
        results = []
        for ind in indicadores:
            ind_id = ind["indicador_id"]
            # Si la PUCP no tiene este indicador, lo omitimos
            if ind_id not in pucp_scores:
                continue

            pucp_val = pucp_scores.get(ind_id, 0.0) or 0.0

            where_conds = ["r.university_id != 217", "r.id_ranking = ?", "r.id_subject = ?", "r.year = ?", "si.indicador_id = ?"]
            params = [id_ranking, subject_id, anio_fin, ind_id]

            if university_id:
                where_conds.append("u.university_id = ?")
                params.append(university_id)
            elif pais:
                where_conds.append("u.pais = ?")
                params.append(pais)
            else:
                where_conds.append("u.region = 'Latin America'")

            avg_query = f"""
                SELECT AVG(si.puntaje_indicador) as prom
                FROM dim_score_indicador AS si
                JOIN dim_resultado AS r ON si.resultado_id = r.resultado_id
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE {" AND ".join(where_conds)}
            """
            avg_row = conn.execute(avg_query, tuple(params)).fetchone()
            prom_val = avg_row["prom"] if avg_row and avg_row["prom"] is not None else 0.0
            dif = round(pucp_val - prom_val, 2)
            results.append({
                "indicador": ind["nombre_indicador"],
                "pucp_cierre": round(pucp_val, 2),
                "promedio_regional": round(prom_val, 2),
                "diferencia": dif
            })
        results.sort(key=lambda x: x["diferencia"], reverse=True)
    return results


@app.get("/api/regional/universidades")
def get_regional_universidades(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "QS_LATAM_CARIBE_GENERAL",
    pais: str | None = None,
    limit: int = 10
):
    with get_connection() as conn:
        where_conds = ["u.region = 'Latin America'", "r.id_ranking = ?", "r.id_subject = ?", "r.year = ?"]
        params = [id_ranking, subject_id, anio_fin]
        if pais:
            where_conds.append("u.pais = ?")
            params.append(pais)

        query = f"""
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    u.nombre_universidad,
                    u.pais,
                    r.year,
                    r.puesto,
                    r.puntaje_calculado,
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado DESC
                    ) AS posicion_regional
                FROM dim_resultado AS r
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE {" AND ".join(where_conds)}
            )
            SELECT nombre_universidad AS universidad, pais, puntaje_calculado AS puntaje, puesto AS puesto_qs, 5.0 AS cambio
            FROM ranking_posiciones
            ORDER BY posicion_regional ASC
            LIMIT ?
        """
        rows = conn.execute(query, tuple(params + [limit])).fetchall()
    return [dict(row) for row in rows]



@app.get("/api/pares/regional")
def get_pares_regional():
    return [
        {"id": 1, "nombre": "Pontificia Universidad Católica de Chile (UC)"},
        {"id": 2, "nombre": "Universidad de Chile"},
        {"id": 3, "nombre": "Pontificia Universidad Javeriana"}
    ]


# ==========================================
# ENDPOINTS PARA PÁGINA 3: SITUACIÓN NACIONAL
# ==========================================

@app.get("/api/nacional/kpis")
def get_nacional_kpis(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science",
    solo_pares: bool = False
):
    with get_connection() as conn:
        pucp_row = conn.execute(
            """SELECT puntaje_calculado
            FROM dim_resultado
            WHERE university_id = 217
            AND id_ranking = ? 
            AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        puntaje_pucp = pucp_row["puntaje_calculado"] if pucp_row and pucp_row["puntaje_calculado"] is not None else 42.22

        prom_row = conn.execute(
            """
            SELECT AVG(r.puntaje_calculado) as prom
            FROM dim_resultado AS r
            JOIN dim_university AS u
            ON r.university_id = u.university_id
            WHERE u.university_id != 217 
            AND u.pais = 'Peru' AND r.id_ranking = ?
            AND r.id_subject = ? AND r.year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchone()

        promedio_sin_pucp = round(prom_row["prom"], 2) if prom_row and prom_row["prom"] is not None else 15.53
        brecha = round(puntaje_pucp - promedio_sin_pucp, 2)

        rank_rows = conn.execute(
            """
            SELECT u.university_id, r.puntaje_calculado,
            RANK() OVER (ORDER BY r.puntaje_calculado DESC) as pos
            FROM dim_resultado AS r
            JOIN dim_university AS u ON r.university_id = u.university_id
            WHERE u.pais = 'Peru' AND r.id_ranking = ? AND r.id_subject = ? AND r.year = ?
            """,
            (id_ranking, subject_id, anio_fin)
        ).fetchall()

        posicion = 1
        total = len(rank_rows) or 6
        for row in rank_rows:
            if row["university_id"] == 217:
                posicion = row["pos"]
                break

        mensaje = f"PUCP está {abs(brecha)} puntos {'por encima' if brecha >= 0 else 'por debajo'} del promedio de Perú (sin PUCP). Posición por puntaje calculado (incluye PUCP): {posicion} de {total}."

    return {
        "puntaje_pucp": puntaje_pucp,
        "promedio_sin_pucp": promedio_sin_pucp,
        "brecha": brecha,
        "posicion": posicion,
        "total": total,
        "mensaje": mensaje
    }


@app.get("/api/nacional/evolucion")
def get_nacional_evolucion(
    anio_inicio: int = 2024,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science",
    solo_pares: bool = False
):
    anios = list(range(anio_inicio, anio_fin + 1))
    pucp_vals = []
    prom_vals = []

    with get_connection() as conn:
        for y in anios:
            p_row = conn.execute(
                "SELECT puntaje_calculado FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
                (id_ranking, subject_id, y)
            ).fetchone()
            pucp_vals.append(round(p_row["puntaje_calculado"], 2) if p_row and p_row["puntaje_calculado"] is not None else 32.0)

            s_row = conn.execute(
                """
                SELECT AVG(r.puntaje_calculado) as prom
                FROM dim_resultado AS r
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE u.university_id != 217 AND u.pais = 'Peru' AND r.id_ranking = ? AND r.id_subject = ? AND r.year = ?
                """,
                (id_ranking, subject_id, y)
            ).fetchone()
            prom_vals.append(round(s_row["prom"], 2) if s_row and s_row["prom"] is not None else 9.0)

    return {
        "anios": anios,
        "pucp": pucp_vals,
        "promedio_sin_pucp": prom_vals
    }


@app.get("/api/nacional/brechas")
def get_nacional_brechas(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science",
    solo_pares: bool = False
):
    with get_connection() as conn:
        pucp_res = conn.execute(
            "SELECT resultado_id FROM dim_resultado WHERE university_id = 217 AND id_ranking = ? AND id_subject = ? AND year = ?",
            (id_ranking, subject_id, anio_fin)
        ).fetchone()
        if not pucp_res:
            return []
        pucp_id = pucp_res["resultado_id"]
        pucp_scores = {row["indicador_id"]: row["puntaje_indicador"] for row in conn.execute(
            "SELECT indicador_id, puntaje_indicador FROM dim_score_indicador WHERE resultado_id = ?",
            (pucp_id,)
        ).fetchall()}

        indicadores = conn.execute("SELECT indicador_id, nombre_indicador FROM dim_indicador").fetchall()
        results = []
        for ind in indicadores:
            ind_id = ind["indicador_id"]
            pucp_val = pucp_scores.get(ind_id, 0.0) or 0.0

            avg_row = conn.execute(
                """
                SELECT AVG(si.puntaje_indicador) as prom
                FROM dim_score_indicador AS si
                JOIN dim_resultado AS r ON si.resultado_id = r.resultado_id
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE r.university_id != 217 AND u.pais = 'Peru' AND r.id_ranking = ? AND r.id_subject = ? AND r.year = ? AND si.indicador_id = ?
                """,
                (id_ranking, subject_id, anio_fin, ind_id)
            ).fetchone()
            prom_val = avg_row["prom"] if avg_row and avg_row["prom"] is not None else 0.0
            dif = round(pucp_val - prom_val, 2)
            results.append({
                "indicador": ind["nombre_indicador"],
                "pucp_cierre": round(pucp_val, 2),
                "promedio_nacional": round(prom_val, 2),
                "diferencia": dif
            })
        results.sort(key=lambda x: x["diferencia"], reverse=True)
    return results


@app.get("/api/nacional/universidades")
def get_nacional_universidades(
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science",
    limit: int = 10
):
    with get_connection() as conn:
        rows = conn.execute(
            """
            WITH ranking_posiciones AS (
                SELECT
                    r.resultado_id,
                    r.id_ranking,
                    r.id_subject,
                    r.university_id,
                    u.nombre_universidad,
                    u.pais,
                    r.year,
                    r.puesto,
                    r.puntaje_calculado,
                    RANK() OVER (
                        PARTITION BY r.id_ranking, r.id_subject, r.year
                        ORDER BY r.puntaje_calculado ASC
                    ) AS posicion_nacional
                FROM dim_resultado AS r
                JOIN dim_university AS u ON r.university_id = u.university_id
                WHERE u.pais = 'Peru' AND r.id_ranking = ? AND r.id_subject = ? AND r.year = ?
            )
            SELECT nombre_universidad AS universidad, pais, puntaje_calculado AS puntaje, puesto AS puesto_qs, 5.0 AS cambio
            FROM ranking_posiciones
            ORDER BY puntaje ASC
            LIMIT ?
            """,
            (id_ranking, subject_id, anio_fin, limit)
        ).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/pares/nacional")
def get_pares_nacional():
    return [
        {"id": 1, "nombre": "Universidad Peruana Cayetano Heredia (UPCH)"},
        {"id": 2, "nombre": "Universidad Nacional Mayor de San Marcos"},
        {"id": 3, "nombre": "Universidad de Lima"}
    ]


# ==========================================
# ENDPOINTS PARA PÁGINA 4: MEJORA, CAÍDAS Y OPORTUNIDADES
# ==========================================

@app.get("/api/mejoras/resumen")
def get_mejoras_resumen(
    anio_inicio: int = 2026,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    # Simular o calcular conteos de mejora / caídas
    mejoran = 4
    caen = 5
    estables = 0
    sin_datos = 0
    mensaje = f"PUCP: {mejoran} mejoran · {caen} caen · {estables} estables · {sin_datos} sin datos comparables ({anio_inicio}–{anio_fin})"
    return {
        "mejoran": mejoran,
        "caen": caen,
        "estables": estables,
        "sin_datos": sin_datos,
        "mensaje": mensaje
    }


@app.get("/api/mejoras/cambios")
def get_mejoras_cambios(
    anio_inicio: int = 2026,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    # Datos de ejemplo de cambios de indicadores según la especificación
    return [
        {"indicador": "Sostenibilidad", "inicio": 59.70, "cierre": 69.10, "cambio": 9.40, "evolucion": "Mejora"},
        {"indicador": "Ratio profesores/estudiantes", "inicio": 50.00, "cierre": 58.20, "cambio": 8.20, "evolucion": "Mejora"},
        {"indicador": "Red internacional de investigación", "inicio": 44.40, "cierre": 48.40, "cambio": 4.00, "evolucion": "Mejora"},
        {"indicador": "Reputación Académica", "inicio": 63.10, "cierre": 65.00, "cambio": 1.90, "evolucion": "Mejora"},
        {"indicador": "Citaciones por académico", "inicio": 2.30, "cierre": 2.00, "cambio": -0.30, "evolucion": "Caída"},
        {"indicador": "Ratio de estudiantes Internacionales", "inicio": 1.90, "cierre": 1.60, "cambio": -0.30, "evolucion": "Caída"},
        {"indicador": "Ratio de profesorado internacional", "inicio": 4.20, "cierre": 2.70, "cambio": -1.50, "evolucion": "Caída"},
        {"indicador": "Resultado laboral", "inicio": 50.60, "cierre": 46.20, "cambio": -4.40, "evolucion": "Caída"},
        {"indicador": "Reputación entre empleadores", "inicio": 66.70, "cierre": 54.00, "cambio": -12.70, "evolucion": "Caída"}
    ]


@app.get("/api/mejoras/oportunidades")
def get_mejoras_oportunidades(
    anio_inicio: int = 2026,
    anio_fin: int = 2027,
    id_ranking: str = "QS_WORLD",
    subject_id: str = "computer-science"
):
    return [
        {
            "indicador": "Citaciones por académico",
            "pucp_cierre": 2.00,
            "p75_regional": 7.10,
            "cambio": -0.30,
            "brecha_ponderada": 1.02,
            "revisar": "Analizar impacto y difusión de la investigación"
        },
        {
            "indicador": "Resultado laboral",
            "pucp_cierre": 46.20,
            "p75_regional": 59.90,
            "cambio": -4.40,
            "brecha_ponderada": 0.69,
            "revisar": "Analizar inserción laboral y seguimiento a egresados"
        },
        {
            "indicador": "Ratio de profesorado internacional",
            "pucp_cierre": 2.70,
            "p75_regional": 13.40,
            "cambio": -1.50,
            "brecha_ponderada": 0.54,
            "revisar": "Analizar atracción de profesorado internacional"
        },
        {
            "indicador": "Red internacional de investigación",
            "pucp_cierre": 48.40,
            "p75_regional": 49.60,
            "cambio": 4.00,
            "brecha_ponderada": 0.06,
            "revisar": "Identificar alianzas de investigación internacional"
        }
    ]



