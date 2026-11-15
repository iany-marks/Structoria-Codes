import tempfile
import unittest
from pathlib import Path

from app import create_app
from slab_design.calculator import calculate, load_model, validate_inputs


MODEL_PATH = Path(__file__).resolve().parents[2] / "assets" / "slab-design-model.json"
COMMON_INPUTS = {
    "thickness": 150,
    "supportWidth": 230,
    "concreteStrength": 25,
    "steelYield": 500,
    "gammaConcrete": 1.5,
    "gammaSteel": 1.15,
    "concreteUnitWeight": 25,
    "nominalCover": 25,
    "screedThickness": 50,
    "screedUnitWeight": 24,
    "finishesLoad": 1,
    "imposedLoad": 3,
    "partitionLoad": 0,
    "gammaG": 1.35,
    "gammaQ": 1.5,
}
SAMPLE_CASES = {
    "oneWay": {
        **COMMON_INPUTS,
        "supportCondition": "End span (one end continuous)",
        "spanAlongSupports": 9,
        "span": 3,
        "mainBarDiameter": 10,
        "distributionBarDiameter": 10,
        "topMainBarDiameter": 10,
        "topDistributionBarDiameter": 10,
        "edgeBarDiameter": 10,
        "discontinuousEdgeSteel": "Yes",
        "continuousSpanCount": 3,
        "maxSpanVariationPercent": 0,
    },
    "twoWay": {
        **COMMON_INPUTS,
        "edgeCondition": "One Long Edge Discont",
        "shortSpan": 3.2,
        "longSpan": 6.2,
        "thickness": 110,
        "supportWidth": 200,
        "nominalCover": 20,
        "shortSpanBottomBarDiameter": 10,
        "longSpanBottomBarDiameter": 10,
        "shortSpanTopBarDiameter": 10,
        "longSpanTopBarDiameter": 10,
        "edgeBarDiameter": 10,
        "cornersRestrained": "Yes",
        "topSteelAtDiscontinuousEdges": "Yes",
        "imposedLoad": 3,
        "partitionLoad": 1.5,
    },
    "simplySupported": {
        **COMMON_INPUTS,
        "panelType": "2 - Simply supported, corners restrained",
        "shortSpan": 3,
        "longSpan": 5,
        "supportWidth": 200,
        "concreteStrength": 20,
        "nominalCover": 25,
        "shortSpanBottomBarDiameter": 12,
        "longSpanBottomBarDiameter": 12,
        "shortSpanTopBarDiameter": 10,
        "longSpanTopBarDiameter": 10,
        "edgeBarDiameter": 10,
        "screedThickness": 50,
        "imposedLoad": 2,
        "partitionLoad": 0,
        "topSteelAtDiscontinuousEdges": "Yes",
    },
}


class SlabCalculatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_model(MODEL_PATH)

    def test_sanitized_model_excludes_readme_and_input_defaults(self):
        self.assertNotIn("READ ME", self.model["sheets"])
        self.assertNotIn("C13", self.model["sheets"]["EC 1 way"])
        self.assertNotIn("C2", self.model["sheets"]["EC 1 way"])
        self.assertNotIn("C13", self.model["sheets"]["EC 2 WAY SLAB"])

    def test_workbook_examples_return_full_design_records(self):
        expected_mass_kg = {"oneWay": 219.9, "twoWay": 185.7, "simplySupported": 156.0}
        for slab_type, inputs in SAMPLE_CASES.items():
            with self.subTest(slab_type=slab_type):
                result = calculate(self.model, slab_type, inputs)
                self.assertEqual(result["status"], "DESIGN ADEQUATE")
                self.assertEqual(result["summary"][0]["label"], "Total reinforcement mass")
                self.assertAlmostEqual(float(result["summary"][0]["value"].replace(",", "")),
                                       expected_mass_kg[slab_type], places=1)
                self.assertTrue(result["checks"])
                self.assertGreaterEqual(len(result["calculationSections"]), 8)
                self.assertTrue(result["reinforcement"])
                self.assertTrue(result["barSchedule"])
                self.assertIn("BS 8110", result["methodStatement"])
                self.assertIn("Wood-Armer", result["methodComparison"])
                self.assertTrue(result["scopeNotes"])

    def test_continuous_one_way_span_assumptions_are_explicit(self):
        inputs = {**SAMPLE_CASES["oneWay"], "continuousSpanCount": 2}
        result = calculate(self.model, "oneWay", inputs)
        assumption_check = next(
            check for check in result["checks"]
            if check["name"].startswith("Continuous-slab coefficient preconditions")
        )
        self.assertEqual(assumption_check["status"], "REVIEW REQUIRED")
        self.assertTrue(result["status"].startswith("REVIEW REQUIRED"))

    def test_one_way_simply_supported_case_does_not_require_continuous_span_inputs(self):
        inputs = {**SAMPLE_CASES["oneWay"], "supportCondition": "Simply supported"}
        inputs.pop("continuousSpanCount")
        inputs.pop("maxSpanVariationPercent")
        validated = validate_inputs("oneWay", inputs)
        self.assertNotIn("continuousSpanCount", validated)
        result = calculate(self.model, "oneWay", inputs)
        self.assertFalse(any(
            check["name"].startswith("Continuous-slab coefficient preconditions")
            for check in result["checks"]
        ))

    def test_two_way_span_orientation_and_aspect_ratio_are_validated(self):
        inputs = {**SAMPLE_CASES["twoWay"], "shortSpan": 6.2, "longSpan": 3.2}
        with self.assertRaisesRegex(ValueError, "greater than or equal"):
            validate_inputs("twoWay", inputs)
        inputs = {**SAMPLE_CASES["twoWay"], "longSpan": 7}
        with self.assertRaisesRegex(ValueError, "aspect ratios"):
            validate_inputs("twoWay", inputs)

    def test_unsupported_bar_diameter_is_rejected(self):
        inputs = {**SAMPLE_CASES["twoWay"], "shortSpanBottomBarDiameter": 14}
        with self.assertRaisesRegex(ValueError, "listed bar diameters"):
            validate_inputs("twoWay", inputs)


class SlabApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary_directory = tempfile.TemporaryDirectory()
        emails = []
        app = create_app(
            database_path=Path(cls.temporary_directory.name) / "structoria.sqlite3",
            slab_model_path=MODEL_PATH,
            mailer=lambda _email, _name, token: emails.append(token),
        )
        app.config["TESTING"] = True
        cls.client = app.test_client()
        cls.client.post(
            "/api/auth/signup",
            json={"name": "Slab Test Student", "email": "slab-test@example.com", "password": "safe-password"},
        )
        cls.client.post("/api/auth/verify", json={"token": emails[0]})
        login = cls.client.post(
            "/api/auth/login",
            json={"email": "slab-test@example.com", "password": "safe-password"},
        )
        cls.auth_headers = {"Authorization": f'Bearer {login.get_json()["token"]}'}

    @classmethod
    def tearDownClass(cls):
        cls.temporary_directory.cleanup()

    def test_slab_calculation_requires_authentication(self):
        response = self.client.post(
            "/api/calculate/rc-slab",
            json={"slabType": "twoWay", "inputs": SAMPLE_CASES["twoWay"]},
        )
        self.assertEqual(response.status_code, 401)

    def test_authenticated_slab_calculation_returns_report_contract(self):
        response = self.client.post(
            "/api/calculate/rc-slab",
            json={"slabType": "twoWay", "inputs": SAMPLE_CASES["twoWay"]},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        result = response.get_json()
        self.assertEqual(result["slabType"], "twoWay")
        self.assertIn("status", result)
        self.assertIn("calculationSections", result)
        self.assertIn("barSchedule", result)
        self.assertIn("quantities", result)
        self.assertEqual(result["summary"][0]["label"], "Total reinforcement mass")

    def test_invalid_span_ratio_returns_client_error(self):
        inputs = {**SAMPLE_CASES["twoWay"], "longSpan": 7}
        response = self.client.post(
            "/api/calculate/rc-slab",
            json={"slabType": "twoWay", "inputs": inputs},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("aspect ratios", response.get_json()["error"])

    def test_health_reports_slab_calculator_readiness(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.get_json()["slabCalculator"], "ready")


if __name__ == "__main__":
    unittest.main()
