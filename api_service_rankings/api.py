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


def parse_score(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return default
        for dash in ['–', '-']:
            if dash in val:
                parts = val.split(dash)
                try:
                    num1 = float(parts[0].strip().replace(',', '.'))
                    num2 = float(parts[1].strip().replace(',', '.'))
                    return round((num1 + num2) / 2.0, 2)
                except:
                    pass
        try:
            return float(val.replace(',', '.'))
        except:
            return default
    return default


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




@app.get("/subjects/{id_ranking}")
def obtener_subjects(id_ranking: str, university_id: int | None = None):
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
                AND (? IS NULL OR EXISTS (
                    SELECT 1 FROM dim_resultado AS resultado
                    WHERE resultado.id_ranking = r.id_ranking
                        AND resultado.id_subject = s.id_subject
                        AND resultado.university_id = ?
                ))
            """,
            (id_ranking, university_id, university_id)
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
    
    

##################################################################################################
##################################################################################################



#### APIs unificadas para el dashboard.
#### El frontend envia tipo, ranking, categoria y anios en cada llamada.
from typing import Literal
from fastapi import HTTPException
from contextlib import closing


#### KPI por ambito: mundial, regional o nacional.
@app.get("/api/{tipo}/kpis")
def get_kpis(
    tipo: Literal["mundial", "regional", "nacional"],
    anio_fin: int,
    id_ranking: str,
    subject_id: str,
):
    filtros = {
        "mundial": ("", ()),
        "regional": (" AND u.region = ?", ("Latin America",)),
        "nacional": (" AND u.pais = ?", ("Peru",)),
    }
    filtro, parametros = filtros[tipo]
    with closing(get_connection()) as conn:
        pucp = conn.execute(
            """
            SELECT puntaje_calculado, puntuacion_final, puesto
            FROM dim_resultado
            WHERE university_id = 217 AND id_ranking = ?
            AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin),
        ).fetchone()
        rows = conn.execute(
            """
            SELECT r.university_id, r.puntaje_calculado, r.puntuacion_final, r.puesto
            FROM dim_resultado AS r
            LEFT JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.id_ranking = ? AND r.id_subject = ? AND r.year = ?
            """ + filtro,
            (id_ranking, subject_id, anio_fin, *parametros),
        ).fetchall()

    raw_pucp = (
        pucp["puntaje_calculado"] if pucp and pucp["puntaje_calculado"] is not None
        else pucp["puntuacion_final"] if pucp else None
    )
    puntaje_pucp = parse_score(raw_pucp, None)
    scores = [
        parse_score(
            row["puntaje_calculado"] if row["puntaje_calculado"] is not None
            else row["puntuacion_final"], None,
        )
        for row in rows if row["university_id"] != 217
    ]
    valid_scores = [score for score in scores if score is not None]
    promedio = round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else None
    brecha = round(puntaje_pucp - promedio, 2) if puntaje_pucp is not None and promedio is not None else None
    puesto_oficial = pucp["puesto"] if pucp else None
    posicion = puesto_oficial
    if tipo == "nacional":
        # Reuse the table's ordering so the PUCP card always shows the same position.
        tabla = get_universidades(tipo, id_ranking, subject_id, anio_fin, anio_fin)
        posicion = tabla["pucp"]["posicion_ambito"] if tabla["pucp"] else None
    total = len({row["university_id"] for row in rows})
    ambito = {"mundial": "del ranking seleccionado", "regional": "de America Latina", "nacional": "de Peru"}[tipo]
    mensaje = (
        f"PUCP esta {abs(brecha)} puntos {'por encima' if brecha >= 0 else 'por debajo'} "
        f"del promedio {ambito} (sin PUCP)."
        if brecha is not None else "Sin datos suficientes para calcular la brecha."
    )
    # El puesto oficial pertenece al ranking seleccionado, no al filtro geografico.
    if tipo == "nacional" and posicion is not None:
        mensaje += f" Posicion nacional calculada por puesto oficial y puntaje: {posicion} de {total}."
    if puesto_oficial is not None:
        mensaje += f" Puesto oficial del ranking: {puesto_oficial}."
    if tipo != "nacional":
        mensaje += f" Universidades consultadas en el ambito seleccionado: {total}."
    return {
        "puntaje_pucp": puntaje_pucp,
        "promedio_sin_pucp": promedio,
        "brecha": brecha,
        "posicion": posicion,
        "puesto_oficial": puesto_oficial,
        "total": total,
        "mensaje": mensaje,
    }


#### Evolucion por ambito: mundial, regional o nacional.
@app.get("/api/{tipo}/evolucion")
def get_evolucion(
    tipo: Literal["mundial", "regional", "nacional"],
    anio_inicio: int,
    anio_fin: int,
    id_ranking: str,
    subject_id: str,
    pais: str | None = None,
    university_id: int | None = None,
    region: str | None = None,
):
    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    filtros = {
        "mundial": ("", ()),
        "regional": (" AND u.region = ?", ("Latin America",)),
        "nacional": (" AND u.pais = ?", ("Peru",)),
    }
    filtro, parametros = filtros[tipo]
    parametros = list(parametros)
    # Los filtros se aplican solo a la comparacion; PUCP conserva su serie.
    if tipo == "mundial" and region is not None:
        filtro += " AND u.region = ?"
        parametros.append(region)
    if pais is not None:
        filtro += " AND u.pais = ?"
        parametros.append(pais)
    if university_id is not None:
        filtro += " AND r.university_id = ?"
        parametros.append(university_id)
    with closing(get_connection()) as conn:
        pucp_rows = conn.execute(
            """
            SELECT year, puntaje_calculado, puntuacion_final
            FROM dim_resultado
            WHERE university_id = 217 AND id_ranking = ? AND id_subject = ?
            AND year BETWEEN ? AND ?
            """,
            (id_ranking, subject_id, anio_inicio, anio_fin),
        ).fetchall()
        other_rows = conn.execute(
            """
            SELECT r.year, r.puntaje_calculado, r.puntuacion_final
            FROM dim_resultado AS r
            LEFT JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.university_id != 217 AND r.id_ranking = ? AND r.id_subject = ?
            AND r.year BETWEEN ? AND ?
            """ + filtro,
            (id_ranking, subject_id, anio_inicio, anio_fin, *parametros),
        ).fetchall()

    anios = list(range(anio_inicio, anio_fin + 1))
    pucp_por_anio = {}
    scores_por_anio = {anio: [] for anio in anios}
    for row in pucp_rows:
        raw = row["puntaje_calculado"] if row["puntaje_calculado"] is not None else row["puntuacion_final"]
        pucp_por_anio.setdefault(int(row["year"]), parse_score(raw, None))
    for row in other_rows:
        raw = row["puntaje_calculado"] if row["puntaje_calculado"] is not None else row["puntuacion_final"]
        score = parse_score(raw, None)
        if score is not None:
            scores_por_anio[int(row["year"])].append(score)
    return {
        "anios": anios,
        "pucp": [pucp_por_anio.get(anio) for anio in anios],
        "promedio_sin_pucp": [
            round(sum(scores_por_anio[anio]) / len(scores_por_anio[anio]), 2)
            if scores_por_anio[anio] else None
            for anio in anios
        ],
    }


#### Brechas unificadas por ambito.
#### Pais y universidad restringen el ambito; PUCP se excluye del promedio.
@app.get("/api/{tipo}/brechas")
def get_brechas(
    tipo: Literal["mundial", "regional", "nacional"],
    anio_fin: int,
    id_ranking: str,
    subject_id: str,
    pais: str | None = None,
    university_id: int | None = None,
    region: str | None = None,
):
    condiciones = [
        "r.university_id != 217", "r.id_ranking = ?",
        "r.id_subject = ?", "r.year = ?",
    ]
    parametros = [id_ranking, subject_id, anio_fin]
    if tipo == "mundial" and region is not None:
        condiciones.append("u.region = ?")
        parametros.append(region)
    elif tipo == "regional":
        condiciones.append("u.region = ?")
        parametros.append("Latin America")
    elif tipo == "nacional":
        condiciones.append("u.pais = ?")
        parametros.append("Peru")
    if pais is not None:
        condiciones.append("u.pais = ?")
        parametros.append(pais)
    if university_id is not None:
        condiciones.append("r.university_id = ?")
        parametros.append(university_id)

    with closing(get_connection()) as conn:
        pucp_res = conn.execute(
            """
            SELECT resultado_id FROM dim_resultado
            WHERE university_id = 217 AND id_ranking = ?
            AND id_subject = ? AND year = ?
            """,
            (id_ranking, subject_id, anio_fin),
        ).fetchone()
        if pucp_res is None:
            return []
        pucp_rows = conn.execute(
            """
            SELECT si.indicador_id, i.nombre_indicador, si.puntaje_indicador
            FROM dim_score_indicador AS si
            JOIN dim_indicador AS i ON i.indicador_id = si.indicador_id
            WHERE si.resultado_id = ?
            """,
            (pucp_res["resultado_id"],),
        ).fetchall()
        if not pucp_rows:
            return []
        other_rows = conn.execute(
            """
            SELECT r.university_id, si.indicador_id, si.puntaje_indicador
            FROM dim_score_indicador AS si
            JOIN dim_resultado AS r ON r.resultado_id = si.resultado_id
            LEFT JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE """ + " AND ".join(condiciones),
            tuple(parametros),
        ).fetchall()

    # Agrupar en Python permite interpretar rangos y decimales con parse_score.
    scores = {row["indicador_id"]: [] for row in pucp_rows}
    universidades = {indicador_id: set() for indicador_id in scores}
    for row in other_rows:
        indicador_id = row["indicador_id"]
        if indicador_id not in scores:
            continue
        valor = parse_score(row["puntaje_indicador"], None)
        if valor is not None:
            scores[indicador_id].append(valor)
            universidades[indicador_id].add(row["university_id"])

    results = []
    for row in pucp_rows:
        indicador_id = row["indicador_id"]
        pucp_val = parse_score(row["puntaje_indicador"], None)
        valores = scores[indicador_id]
        promedio = sum(valores) / len(valores) if valores else None
        diferencia = round(pucp_val - promedio, 2) if pucp_val is not None and promedio is not None else None
        results.append({
            "indicador_id": indicador_id,
            "indicador": row["nombre_indicador"],
            "pucp_cierre": round(pucp_val, 2) if pucp_val is not None else None,
            "promedio_comparacion": round(promedio, 2) if promedio is not None else None,
            "diferencia": diferencia,
            "universidades_comparadas": len(universidades[indicador_id]),
        })
    # Las brechas sin datos comparables se presentan al final.
    results.sort(key=lambda item: (
        item["diferencia"] is None,
        -item["diferencia"] if item["diferencia"] is not None else 0,
        item["indicador_id"],
    ))
    return results


#### Filtros para el dashboard: se conservan los endpoints anteriores.
#### Anios disponibles para el ranking y la categoria seleccionados.
@app.get("/api/filtros/anios")
def get_filtros_anios(id_ranking: str, subject_id: str, university_id: int | None = None):
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT year AS anio
            FROM dim_resultado
            WHERE id_ranking = ? AND id_subject = ? AND year IS NOT NULL
                AND (? IS NULL OR university_id = ?)
            ORDER BY year
            """,
            (id_ranking, subject_id, university_id, university_id),
        ).fetchall()
    return [{"anio": int(row["anio"])} for row in rows]


#### Regiones para la pagina de analisis mundial.
@app.get("/api/filtros/regiones")
def get_filtros_regiones(
    id_ranking: str,
    subject_id: str,
    anio_inicio: int,
    anio_fin: int,
):
    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT u.region
            FROM dim_resultado AS r
            JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.id_ranking = ? AND r.id_subject = ?
            AND r.year BETWEEN ? AND ?
            AND u.region IS NOT NULL AND TRIM(u.region) != ''
            ORDER BY u.region
            """,
            (id_ranking, subject_id, anio_inicio, anio_fin),
        ).fetchall()
    return [dict(row) for row in rows]


#### Paises solo de Latinoamerica para la pagina de analisis regional.
@app.get("/api/filtros/paises")
def get_filtros_paises(
    id_ranking: str,
    subject_id: str,
    anio_inicio: int,
    anio_fin: int,
):
    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT u.pais
            FROM dim_resultado AS r
            JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.id_ranking = ? AND r.id_subject = ?
            AND r.year BETWEEN ? AND ?
            AND u.region = 'Latin America' AND u.pais IS NOT NULL AND TRIM(u.pais) != ''
            ORDER BY u.pais
            """,
            (id_ranking, subject_id, anio_inicio, anio_fin),
        ).fetchall()
    return [dict(row) for row in rows]


#### Universidades del pais seleccionado para comparar con PUCP.
@app.get("/api/filtros/universidades")
def get_filtros_universidades(
    id_ranking: str,
    subject_id: str,
    anio_inicio: int,
    anio_fin: int,
    pais: str,
):
    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT u.university_id, u.nombre_universidad, u.pais
            FROM dim_resultado AS r
            JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.id_ranking = ? AND r.id_subject = ?
            AND r.year BETWEEN ? AND ?
            AND u.pais = ? AND u.university_id != 217
            ORDER BY u.nombre_universidad, u.university_id
            """,
            (id_ranking, subject_id, anio_inicio, anio_fin, pais),
        ).fetchall()
    return [dict(row) for row in rows]


#### Mejoras de PUCP: calculos reales compartidos por los tres endpoints.
def calcular_cambios_pucp(id_ranking: str, subject_id: str, anio_inicio: int, anio_fin: int):
    from decimal import Decimal
    from math import isfinite

    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT r.year, si.indicador_id, i.nombre_indicador, si.puntaje_indicador
            FROM dim_resultado AS r
            JOIN dim_score_indicador AS si ON si.resultado_id = r.resultado_id
            JOIN dim_indicador AS i ON i.indicador_id = si.indicador_id
            WHERE r.university_id = 217 AND r.id_ranking = ? AND r.id_subject = ?
            AND r.year IN (?, ?)
            ORDER BY si.indicador_id, r.year, r.resultado_id
            """,
            (id_ranking, subject_id, anio_inicio, anio_fin),
        ).fetchall()

    indicadores = {}
    for row in rows:
        indicador = indicadores.setdefault(row["indicador_id"], {
            "nombre": row["nombre_indicador"], "puntajes": {},
        })
        valor = parse_score(row["puntaje_indicador"], None)
        indicador["puntajes"].setdefault(
            int(row["year"]), valor if valor is not None and isfinite(valor) else None,
        )

    resultados = []
    for indicador_id, indicador in indicadores.items():
        inicio = indicador["puntajes"].get(anio_inicio)
        cierre = indicador["puntajes"].get(anio_fin)
        cambio = None
        evolucion = "Sin datos comparables"
        if inicio is not None and cierre is not None:
            # Decimal evita que una diferencia exacta de 0.25 falle por precision binaria.
            cambio = Decimal(str(cierre)) - Decimal(str(inicio))
            if cambio >= Decimal("0.25"):
                evolucion = "Mejora"
            elif cambio <= Decimal("-0.25"):
                evolucion = "Caída"
            else:
                evolucion = "Estable"
        resultados.append((cambio, {
            "indicador_id": indicador_id,
            "indicador": indicador["nombre"],
            "inicio": inicio,
            "cierre": cierre,
            "cambio": float(round(cambio, 2)) if cambio is not None else None,
            "evolucion": evolucion,
        }))
    resultados.sort(key=lambda item: (
        item[0] is None, -item[0] if item[0] is not None else Decimal(0),
        item[1]["indicador_id"],
    ))
    return [item[1] for item in resultados]


#### Grafico verde: hasta cuatro incrementos mayores o iguales a +0.25.
@app.get("/api/mejoras/mejoras")
def get_mejoras_mejoras(
    id_ranking: str, subject_id: str, anio_inicio: int, anio_fin: int,
):
    cambios = calcular_cambios_pucp(id_ranking, subject_id, anio_inicio, anio_fin)
    return [
        {key: value for key, value in row.items() if key != "evolucion"}
        for row in cambios if row["evolucion"] == "Mejora"
    ][:4]


#### Grafico rojo: hasta cuatro caidas menores o iguales a -0.25.
@app.get("/api/mejoras/caidas")
def get_mejoras_caidas(
    id_ranking: str, subject_id: str, anio_inicio: int, anio_fin: int,
):
    cambios = calcular_cambios_pucp(id_ranking, subject_id, anio_inicio, anio_fin)
    return [
        {key: value for key, value in row.items() if key != "evolucion"}
        for row in reversed(cambios) if row["evolucion"] == "Caída"
    ][:4]


#### Tabla completa: indicadores presentes en cualquiera de los dos anios.
@app.get("/api/mejoras/cambios")
def get_mejoras_cambios(
    id_ranking: str, subject_id: str, anio_inicio: int, anio_fin: int,
):
    return calcular_cambios_pucp(id_ranking, subject_id, anio_inicio, anio_fin)


#### Tabla unificada: cierre, comparacion de puntajes y seleccion por tipo.
@app.get("/api/{tipo}/universidades")
def get_universidades(
    tipo: Literal["mundial", "regional", "nacional"],
    id_ranking: str,
    subject_id: str,
    anio_inicio: int,
    anio_fin: int,
    vecinos: int = 5,
    region: str | None = None,
    limit: int = 20,
):
    import re
    from decimal import Decimal
    from math import isfinite

    if anio_inicio > anio_fin:
        raise HTTPException(status_code=422, detail="anio_inicio no puede ser mayor que anio_fin")
    if tipo == "mundial" and not 0 <= vecinos <= 100:
        raise HTTPException(status_code=422, detail="vecinos debe estar entre 0 y 100")
    if tipo == "regional" and limit not in (15, 20):
        raise HTTPException(status_code=422, detail="limit debe ser 15 o 20 para regional")

    def puesto_intervalo(valor):
        if valor is None:
            return None
        texto = str(valor).strip().replace("–", "-").replace("—", "-")
        match = re.fullmatch(r"=?\s*(\d+)\s*(?:-\s*(\d+)|(\+))?", texto)
        if not match:
            return None
        inicio = int(match.group(1))
        fin = int(match.group(2)) if match.group(2) else float("inf") if match.group(3) else inicio
        return (inicio, fin) if 0 < inicio <= fin else None

    def puntaje(row):
        if row is None:
            return None
        raw = row["puntaje_calculado"] if row["puntaje_calculado"] is not None else row["puntuacion_final"]
        valor = parse_score(raw, None)
        return valor if valor is not None and isfinite(valor) else None

    filtro, params = {
        "mundial": ("", ()),
        "regional": (" AND u.region = ?", ("Latin America",)),
        "nacional": (" AND u.pais = ?", ("Peru",)),
    }[tipo]
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT r.university_id, r.year, r.puesto,
                r.puntaje_calculado, r.puntuacion_final,
                u.nombre_universidad, u.pais, u.region
            FROM dim_resultado AS r
            JOIN dim_university AS u ON u.university_id = r.university_id
            WHERE r.id_ranking = ? AND r.id_subject = ? AND r.year IN (?, ?)
            """ + filtro + " ORDER BY r.resultado_id",
            (id_ranking, subject_id, anio_inicio, anio_fin, *params),
        ).fetchall()

    inicio_por_uni = {}
    cierre_por_uni = {}
    for row in rows:
        if int(row["year"]) == anio_inicio:
            inicio_por_uni.setdefault(row["university_id"], row)
        if int(row["year"]) == anio_fin:
            cierre_por_uni.setdefault(row["university_id"], row)
    intervalos = {uid: puesto_intervalo(row["puesto"]) for uid, row in cierre_por_uni.items()}

    # National positions break official-rank ties by score, then name and ID.
    ordenadas = sorted(cierre_por_uni.values(), key=lambda row: (
        intervalos[row["university_id"]] is None,
        intervalos[row["university_id"]] or (float("inf"), float("inf")),
        *((puntaje(row) is None, -puntaje(row) if puntaje(row) is not None else 0) if tipo == "nacional" else ()),
        (row["nombre_universidad"] or "").casefold(), row["university_id"],
    ))
    filas = []
    for numero, row in enumerate(ordenadas, start=1):
        uid = row["university_id"]
        intervalo = intervalos[uid]
        posicion = row["puesto"]
        if tipo == "nacional":
            posicion = numero
        elif tipo == "regional":
            posicion = (1 + sum(
                otro is not None and otro[1] < intervalo[0]
                for otro in intervalos.values()
            )) if intervalo is not None else None
        inicio = puntaje(inicio_por_uni.get(uid))
        cierre = puntaje(row)
        cambio = float(round(Decimal(str(cierre)) - Decimal(str(inicio)), 2)) if inicio is not None and cierre is not None else None
        filas.append({
            "university_id": uid,
            "universidad": row["nombre_universidad"],
            "pais": row["pais"],
            "puesto_oficial": row["puesto"],
            "posicion_ambito": posicion,
            "puntaje_inicio": inicio,
            "puntaje_cierre": cierre,
            "cambio": cambio,
            "es_pucp": uid == 217,
        })

    pucp = next((fila for fila in filas if fila["es_pucp"]), None)
    total = len(filas)
    pucp_fuera_region = False
    estado = "ok"
    if not filas:
        estado = "sin_datos"
    elif pucp is None:
        estado = "pucp_sin_datos"
    if tipo == "mundial" and region:
        # Filter comparison universities, retaining PUCP's global rank as the anchor.
        regionales = [fila for fila in filas if cierre_por_uni[fila["university_id"]]["region"] == region]
        total = len(regionales)
        seleccion = []
        if not regionales:
            estado = "region_sin_datos"
        elif pucp is not None:
            pucp_fuera_region = cierre_por_uni[217]["region"] != region
            referencia = intervalos[217]
            if referencia is None:
                estado = "pucp_sin_puesto"
            else:
                clasificadas = [fila for fila in regionales if intervalos[fila["university_id"]] is not None]
                # Equal/overlapping bands cannot be labelled better or worse.
                anteriores = [fila for fila in clasificadas if intervalos[fila["university_id"]][1] < referencia[0]]
                posteriores = [fila for fila in clasificadas if intervalos[fila["university_id"]][0] > referencia[1]]
                seleccion = (anteriores[-vecinos:] if vecinos else []) + [pucp] + posteriores[:vecinos]
    elif tipo == "mundial":
        # No ubicar a PUCP artificialmente cuando carece de un puesto interpretable.
        clasificadas = [fila for fila in filas if intervalos[fila["university_id"]] is not None]
        if pucp is None:
            seleccion = []
        elif intervalos[217] is None:
            estado = "pucp_sin_puesto"
            seleccion = []
        else:
            indice = next(i for i, fila in enumerate(clasificadas) if fila["es_pucp"])
            seleccion = clasificadas[max(0, indice - vecinos):indice + vecinos + 1]
    elif tipo == "regional" and id_ranking == "THE_LATAM":
        clasificadas = [fila for fila in filas if intervalos[fila["university_id"]] is not None]
        top = clasificadas[:10]
        if top:
            corte = intervalos[top[-1]["university_id"]]
            top.extend(fila for fila in clasificadas[10:] if intervalos[fila["university_id"]] == corte)
        ids = {fila["university_id"] for fila in top}
        if pucp is not None and intervalos[217] is not None:
            indice = next(i for i, fila in enumerate(clasificadas) if fila["es_pucp"])
            ids.update(fila["university_id"] for fila in clasificadas[max(0, indice - 5):indice + 6])
        elif pucp is not None:
            estado = "pucp_sin_puesto"
        seleccion = []
        anterior = -1
        for indice, fila in enumerate(clasificadas):
            if fila["university_id"] in ids:
                seleccion.append({**fila, "salto_antes": indice > anterior + 1})
                anterior = indice
    elif tipo == "regional":
        seleccion = filas[:limit]
    else:
        seleccion = filas
    return {
        "tipo": tipo,
        "anio_inicio": anio_inicio,
        "anio_fin": anio_fin,
        "total": total,
        "pucp_fuera_region": pucp_fuera_region,
        "estado": estado,
        "pucp": pucp,
        "universidades": seleccion,
    }
