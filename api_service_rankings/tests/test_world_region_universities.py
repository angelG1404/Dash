import sqlite3
import unittest
from unittest.mock import patch

import api


class WorldRegionUniversitiesTests(unittest.TestCase):
    def setUp(self):
        self.rows = [(i, f"University {i:02}", "Europe", str(i)) for i in range(1, 41)]
        self.rows += [(217, "PUCP", "Latin America", "25"), (500, "Other region", "Asia", "24")]

    def connection(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript("""
            CREATE TABLE dim_university (university_id INTEGER, nombre_universidad TEXT, pais TEXT, region TEXT);
            CREATE TABLE dim_resultado (resultado_id INTEGER PRIMARY KEY, university_id INTEGER, year TEXT, puesto TEXT,
                puntaje_calculado REAL, puntuacion_final TEXT, id_ranking TEXT, id_subject TEXT);
        """)
        for uid, name, region, rank in self.rows:
            conn.execute("INSERT INTO dim_university VALUES (?, ?, ?, ?)", (uid, name, "Peru" if uid == 217 else "Other", region))
            for year in (2024, 2026):
                conn.execute("INSERT INTO dim_resultado VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
                             (uid, str(year), rank, 50, "50", "QS_WORLD", "QS_WORLD_GENERAL"))
        return conn

    def query(self, **kwargs):
        with patch.object(api, "get_connection", self.connection):
            return api.get_universidades("mundial", "QS_WORLD", "QS_WORLD_GENERAL", 2024, 2026, **kwargs)

    def test_filtered_neighbours_without_top(self):
        result = self.query(region="Europe")
        rows = result["universidades"]
        self.assertEqual([r["university_id"] for r in rows], [20, 21, 22, 23, 24, 217, 26, 27, 28, 29, 30])
        self.assertTrue(result["pucp_fuera_region"])
        self.assertEqual(result["total"], 40)
        self.assertEqual(rows[5]["puesto_oficial"], "25")

    def test_overlapping_bands_are_not_better_or_worse(self):
        self.rows = [(uid, name, region, "20-30" if uid in (24, 25, 26, 217) else rank)
                     for uid, name, region, rank in self.rows]
        ids = [r["university_id"] for r in self.query(region="Europe")["universidades"]]
        self.assertEqual(ids, [15, 16, 17, 18, 19, 217, 31, 32, 33, 34, 35])

    def test_fewer_available_neighbours(self):
        self.rows = [(uid, name, region, "2" if uid == 217 else rank) for uid, name, region, rank in self.rows]
        ids = [r["university_id"] for r in self.query(region="Europe")["universidades"]]
        self.assertEqual(ids, [1, 217, 3, 4, 5, 6, 7])

    def test_pucp_in_selected_region(self):
        result = self.query(region="Latin America")
        self.assertFalse(result["pucp_fuera_region"])
        self.assertEqual([r["university_id"] for r in result["universidades"]], [217])

    def test_no_results_does_not_fall_back(self):
        result = self.query(region="Missing")
        self.assertEqual(result["universidades"], [])
        self.assertEqual(result["estado"], "region_sin_datos")

    def test_missing_pucp_does_not_fall_back_to_top(self):
        self.rows = [row for row in self.rows if row[0] != 217]
        result = self.query(region="Europe")
        self.assertEqual(result["estado"], "pucp_sin_datos")
        self.assertEqual(result["universidades"], [])

    def test_unranked_pucp_has_no_artificial_neighbours(self):
        self.rows = [(uid, name, region, "Reporter" if uid == 217 else rank) for uid, name, region, rank in self.rows]
        result = self.query(region="Europe")
        self.assertEqual(result["estado"], "pucp_sin_puesto")
        self.assertEqual(result["universidades"], [])

    def test_all_regions_retains_existing_view(self):
        result = self.query()
        self.assertEqual(len(result["universidades"]), 11)
        self.assertEqual(result["universidades"][5]["university_id"], 217)
        self.assertIn(500, [r["university_id"] for r in result["universidades"]])
        self.assertEqual(result, self.query(region=""))

    def test_zero_neighbours_returns_only_pucp(self):
        result = self.query(region="Europe", vecinos=0)
        self.assertEqual([r["university_id"] for r in result["universidades"]], [217])


if __name__ == "__main__":
    unittest.main()
