import sqlite3
import unittest
from unittest.mock import patch

import api


class RegionalUniversitiesTests(unittest.TestCase):
    def setUp(self):
        self.rows = [
            (i, f"University {i:02}", str(i))
            for i in range(1, 31) if i != 15
        ]
        self.rows.append((217, "PUCP", "15"))

    def connection(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript("""
            CREATE TABLE dim_university (university_id INTEGER, nombre_universidad TEXT, pais TEXT, region TEXT);
            CREATE TABLE dim_resultado (resultado_id INTEGER PRIMARY KEY, university_id INTEGER, year TEXT, puesto TEXT,
                puntaje_calculado REAL, puntuacion_final TEXT, id_ranking TEXT, id_subject TEXT);
        """)
        for uid, name, rank in self.rows:
            conn.execute(
                "INSERT INTO dim_university VALUES (?, ?, ?, ?)",
                (uid, name, "Peru" if uid == 217 else "Other", "Latin America"),
            )
            for ranking in ("QS_LATAM_CARIBE", "THE_LATAM"):
                for year in (2024, 2026):
                    conn.execute(
                        "INSERT INTO dim_resultado VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
                        (uid, str(year), rank, 50, "50", ranking, f"{ranking}_GENERAL"),
                    )
        return conn

    def query(self, ranking="QS_LATAM_CARIBE", **kwargs):
        with patch.object(api, "get_connection", self.connection):
            return api.get_universidades(
                "regional", ranking, f"{ranking}_GENERAL", 2024, 2026, **kwargs
            )

    def test_qs_returns_top_twenty(self):
        result = self.query()
        self.assertEqual([r["puesto_oficial"] for r in result["universidades"]], [str(i) for i in range(1, 21)])
        self.assertTrue(result["universidades"][14]["es_pucp"])

    def test_qs_outside_top_keeps_pucp_reference(self):
        self.rows = [(uid, name, "40" if uid == 217 else rank) for uid, name, rank in self.rows]
        result = self.query()
        self.assertEqual(len(result["universidades"]), 20)
        self.assertNotIn(217, [r["university_id"] for r in result["universidades"]])
        self.assertEqual(result["pucp"]["puesto_oficial"], "40")

    def test_the_top_and_distant_neighbours_with_gap(self):
        self.rows = [(uid, name, "25" if uid == 217 else rank) for uid, name, rank in self.rows]
        rows = self.query("THE_LATAM")["universidades"]
        self.assertEqual([r["university_id"] for r in rows[:10]], list(range(1, 11)))
        self.assertEqual(len(rows), 21)
        self.assertTrue(rows[10]["salto_antes"])
        self.assertEqual(rows[15]["university_id"], 217)

    def test_the_overlap_has_no_duplicates(self):
        rows = self.query("THE_LATAM")["universidades"]
        ids = [r["university_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual([r["puesto_oficial"] for r in rows], [str(i) for i in range(1, 21)])

    def test_the_includes_ties_at_top_cutoff(self):
        self.rows = [(uid, name, "10" if uid in (11, 12) else "25" if uid == 217 else rank) for uid, name, rank in self.rows]
        rows = self.query("THE_LATAM")["universidades"]
        self.assertEqual([r["university_id"] for r in rows[:12]], list(range(1, 13)))

    def test_missing_pucp_preserves_tops(self):
        self.rows = [row for row in self.rows if row[0] != 217]
        for ranking, count in (("QS_LATAM_CARIBE", 20), ("THE_LATAM", 10)):
            result = self.query(ranking)
            self.assertEqual(result["estado"], "pucp_sin_datos")
            self.assertEqual(len(result["universidades"]), count)

    def test_the_without_rank_preserves_top_and_reference(self):
        self.rows = [(uid, name, "Reporter" if uid == 217 else rank) for uid, name, rank in self.rows]
        result = self.query("THE_LATAM")
        self.assertEqual(result["estado"], "pucp_sin_puesto")
        self.assertEqual(len(result["universidades"]), 10)
        self.assertEqual(result["pucp"]["university_id"], 217)

    def test_world_region_filter_does_not_modify_regional(self):
        for ranking in ("QS_LATAM_CARIBE", "THE_LATAM"):
            self.assertEqual(self.query(ranking), self.query(ranking, region="Europe"))


if __name__ == "__main__":
    unittest.main()
