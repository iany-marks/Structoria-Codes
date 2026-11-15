import unittest
import tempfile
from pathlib import Path

from app import create_app


SAMPLE_INPUTS = {
    "width": 400, "depth": 400, "clearHeight": 4250, "floorLift": 4700,
    "nominalCover": 40, "mainBarDiameter": 20, "linkDiameter": 8,
    "aggregateSize": 20, "columnCount": 1, "concreteStrength": 25,
    "steelYield": 500, "gammaConcrete": 1.5, "gammaSteel": 1.15,
    "alphaCc": 0.85, "axialLoad": 2266, "momentYMajor": 130,
    "momentYMinor": -30.33, "shearY": 85, "momentZMajor": 0,
    "momentZMinor": 0, "shearZ": 0, "structure": "Braced",
    "effectiveLengthMethod": "EC2 5.8.3.2 (k1, k2)", "endYTop": 2,
    "endYBottom": 3, "endZTop": 2, "endZBottom": 3, "k1Y": 0.5,
    "k2Y": 1, "k1Z": 0.5, "k2Z": 1, "creepCoefficient": 2,
    "quasiPermanentRatio": 0.7, "curvatureFactor": 10, "barSelection": "Auto",
    "barsOnBFace": 4, "barsOnHFace": 4, "cotTheta": 2.5,
    "linkReduction": 0.6, "lapFactor": 1.5,
}


class ColumnApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary_directory = tempfile.TemporaryDirectory()
        app = create_app(
            database_path=Path(cls.temporary_directory.name) / "structoria.sqlite3",
        )
        app.config["TESTING"] = True
        cls.client = app.test_client()
        cls.calculator_available = cls.client.get("/api/health").get_json()["columnCalculator"] == "ready"

    @classmethod
    def tearDownClass(cls):
        cls.temporary_directory.cleanup()

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ready")

    def test_api_http_errors_are_returned_as_json(self):
        responses = (
            self.client.get("/api/does-not-exist"),
            self.client.put("/api/calculate/rc-column"),
        )
        self.assertEqual([response.status_code for response in responses], [404, 405])
        for response in responses:
            self.assertTrue(response.is_json)
            self.assertIsInstance(response.get_json()["error"], str)

    def test_column_calculation_matches_frontend_response_contract(self):
        if not self.calculator_available:
            self.skipTest("Column design model is not present.")
        response = self.client.post(
            "/api/calculate/rc-column",
            json={"inputs": SAMPLE_INPUTS},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        result = response.get_json()
        self.assertIn("status", result)
        self.assertEqual(len(result["summary"]), 14)
        self.assertTrue(result["checks"])
        self.assertTrue(all({"demand", "capacity", "ratio", "status"} <= check.keys()
                            for check in result["checks"]))
        self.assertGreaterEqual(len(result["calculationSteps"]), 8)
        self.assertTrue(all(
            {"title", "description", "rows"} <= step.keys()
            for step in result["calculationSteps"]
        ))

    def test_rejects_missing_inputs(self):
        if not self.calculator_available:
            self.skipTest("Column design model is not present.")
        response = self.client.post(
            "/api/calculate/rc-column",
            json={"inputs": {"width": 400}},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing design input", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()