"""Eurocode 2 column calculation adapter over the workbook-derived model."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from .formula_engine import FormulaError, WorkbookEvaluator


INPUT_CELLS = {
    "width": "C13", "depth": "C14", "clearHeight": "C15", "floorLift": "C16",
    "nominalCover": "C17", "mainBarDiameter": "C18", "linkDiameter": "C19",
    "aggregateSize": "C20", "columnCount": "C21", "concreteStrength": "C23",
    "steelYield": "C24", "gammaConcrete": "C25", "gammaSteel": "C26",
    "alphaCc": "C27", "axialLoad": "C29", "momentYMajor": "C30",
    "momentYMinor": "C31", "shearY": "C32", "momentZMajor": "C33",
    "momentZMinor": "C34", "shearZ": "C35", "structure": "C37",
    "effectiveLengthMethod": "C38", "endYTop": "C39", "endYBottom": "C40",
    "endZTop": "C41", "endZBottom": "C42", "k1Y": "C43", "k2Y": "C44",
    "k1Z": "C45", "k2Z": "C46", "creepCoefficient": "C48",
    "quasiPermanentRatio": "C49", "curvatureFactor": "C50", "barSelection": "C52",
    "barsOnBFace": "C53", "barsOnHFace": "C54", "cotTheta": "C55",
    "linkReduction": "C56", "lapFactor": "C57",
}

TITLE_CELLS = {
    "projectTitle": "C2", "jobGroup": "G2", "columnReference": "H2",
    "revision": "J2", "designBy": "C8", "designDate": "D8",
    "checkedBy": "E8", "checkDate": "F8", "sheetNumber": "G8",
    "jobReference": "H8",
}

SUMMARY_CELLS = [
    ("Section / cover / links", "C321"), ("Clear / effective length", "C322"),
    ("Concrete / steel", "C323"), ("Ultimate design actions", "C324"),
    ("Slenderness classification", "C325"), ("Design moments", "C326"),
    ("Required / provided reinforcement", "C327"), ("Moment resistance", "C328"),
    ("Main bars", "C346"), ("Links - end zones", "C347"),
    ("Links - middle zone", "C348"), ("Reinforcement tonnage", "C377"),
    ("Concrete volume", "C379"), ("Steel intensity", "C380"),
]

CALCULATION_SECTIONS = [
    ("Section and material properties", "Section area, design strengths, strain parameters, cover and axial-load ratio.", False, [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75], []),
    ("Effective length and slenderness", "Effective lengths and slenderness are evaluated independently about both column axes.", True, [80, 81, 82, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98], []),
    ("Eccentricity and first-order moments", "Minimum eccentricity, equivalent end moment and member imperfection establish the first-order design moments.", True, [104, 105, 106, 107, 108, 109, 110, 111, 112], []),
    ("Required longitudinal reinforcement", "The engine searches reinforcement ratios against axial-flexural resistance and second-order effects.", False, [116, 117, 118, 121, 122, 123, 124, 126, 127, 128, 129, 197, 198], [121, 122, 123, 124, 126, 127, 128]),
    ("Provided bar arrangement", "The selected arrangement is checked against required steel area and minimum clear spacing.", False, [202, 219, 220, 221, 222, 223, 224, 238, 240, 241], [240, 241]),
    ("Verification with the provided reinforcement", "Actual reinforcement is used to recalculate second-order moments, section capacities and combined bending checks.", True, [246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 263, 264, 265, 266, 267], []),
    ("Detailing, anchorage and laps", "Cover, bar limits, spacing, restraint and anchorage/lap lengths are checked against the selected detailing inputs.", False, [270, 271, 272, 273, 274, 275, 276, 277, 279, 280, 281, 282, 283, 284], []),
    ("Links and shear resistance", "Link spacing and end zones are detailed; concrete and link shear resistances are checked about both axes.", False, [288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317], [304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317]),
    ("Reinforcement schedule and quantities", "The final bar marks and material quantities are taken from the completed design.", False, [346, 347, 348, 349, 350, 377, 379, 380], []),
]

_DISPLAY_FORMATS = {"EC 2 Column!C377": (3, 3), "EC 2 Column!C379": (0, 3), "EC 2 Column!C380": (1, 1)}


def load_model(path: str | Path | None = None) -> dict[str, Any]:
    model_path = Path(path) if path else Path(__file__).resolve().parents[2] / "assets" / "column-design-model.json"
    with model_path.open("r", encoding="utf-8") as model_file:
        model = json.load(model_file)
    if model.get("formatVersion") != 1:
        raise ValueError("The standalone design model version is not supported.")
    return model


def validate_inputs(inputs: Any) -> dict[str, Any]:
    if not isinstance(inputs, dict):
        raise ValueError("The request must include a JSON object of column inputs.")
    missing = [key for key in INPUT_CELLS if key not in inputs]
    if missing:
        raise ValueError("Missing design input(s): " + ", ".join(missing))
    result = dict(inputs)
    end_conditions = {"endYTop", "endYBottom", "endZTop", "endZBottom"}
    for key in INPUT_CELLS:
        value = result[key]
        if key in ("structure", "effectiveLengthMethod", "barSelection"):
            if not isinstance(value, str):
                raise ValueError(f"Design input '{key}' must be text.")
        else:
            if key in end_conditions and isinstance(value, str):
                try:
                    value = float(value)
                except ValueError as error:
                    raise ValueError(f"Design input '{key}' must be a number from 1 to 4.") from error
                result[key] = value
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Design input '{key}' must be a finite number.")
    if result["structure"] not in ("Braced", "Unbraced"):
        raise ValueError("'structure' must be 'Braced' or 'Unbraced'.")
    if result["effectiveLengthMethod"] not in ("Table (IStructE / BS 8110)", "EC2 5.8.3.2 (k1, k2)"):
        raise ValueError("'effectiveLengthMethod' is not a supported method.")
    if result["barSelection"] not in ("Auto", "Manual"):
        raise ValueError("'barSelection' must be 'Auto' or 'Manual'.")
    for key in ("width", "depth", "clearHeight", "floorLift", "concreteStrength", "steelYield",
                "gammaConcrete", "gammaSteel", "curvatureFactor"):
        if result[key] <= 0:
            raise ValueError(f"Design input '{key}' must be greater than zero.")
    for key in end_conditions:
        if result[key] not in (1, 2, 3, 4):
            raise ValueError(f"Design input '{key}' must be 1, 2, 3, or 4.")
    return result


def _display(value: Any, cell: str | None = None) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        return str(value if value is not None else "")
    minimum, maximum = _DISPLAY_FORMATS.get(cell or "", (0, 3))
    formatted = f"{value:,.{maximum}f}"
    if maximum > minimum:
        formatted = formatted.rstrip("0").rstrip(".")
    return formatted


def calculate(model: dict[str, Any], inputs: dict[str, Any], title_block: Any = None) -> dict[str, Any]:
    inputs = validate_inputs(inputs)
    if title_block is not None and not isinstance(title_block, dict):
        raise ValueError("'titleBlock' must be a JSON object when provided.")
    evaluator = WorkbookEvaluator(model)
    for key, address in INPUT_CELLS.items():
        evaluator.set_cell("EC 2 Column", address, inputs[key])
    title_block = title_block or {}
    for key, address in TITLE_CELLS.items():
        value = title_block.get(key, "")
        if not isinstance(value, (str, int, float)) or isinstance(value, bool):
            raise ValueError(f"Title-block value '{key}' must be text or a number.")
        evaluator.set_cell("EC 2 Column", address, value)

    def cell(address: str) -> Any:
        return evaluator.read_cell("EC 2 Column", address)

    def formatted(value: Any, address: str | None = None) -> str:
        return _display(value, f"EC 2 Column!{address}" if address else None)

    summary = [{"label": label, "value": formatted(cell(address), address)} for label, address in SUMMARY_CELLS]
    checks = []
    for row in range(331, 344):
        name = cell(f"B{row}")
        if name not in ("", 0, None):
            checks.append({
                "name": formatted(name),
                "demand": formatted(cell(f"C{row}")),
                "capacity": formatted(cell(f"D{row}")),
                "ratio": formatted(cell(f"E{row}")),
                "status": formatted(cell(f"F{row}")),
            })

    calculation_steps = []
    for title, description, axes, rows, axis_rows in CALCULATION_SECTIONS:
        step_rows = []
        for row in rows:
            label = cell(f"B{row}")
            if not isinstance(label, str) or not label.strip():
                continue
            sheet = model.get("sheets", {}).get("EC 2 Column", {})

            def has_formula(column: str) -> bool:
                item = sheet.get(f"{column}{row}", {})
                return "f" in item or "g" in item

            primary_raw, secondary_raw = cell(f"C{row}"), cell(f"D{row}")
            primary = "" if primary_raw in ("", None) else formatted(primary_raw, f"C{row}")
            secondary = "" if secondary_raw in ("", None) else formatted(secondary_raw, f"D{row}")
            is_axis = axes or row in axis_rows
            step = {"label": label.strip()}
            if is_axis:
                step["value"] = f"y-y: {primary}" if has_formula("C") else ""
                step["secondaryValue"] = f"z-z: {secondary}" if has_formula("D") else ""
            elif has_formula("C") or primary != "":
                step["value"] = primary
            unit = cell(f"D{row}")
            if not is_axis and not has_formula("D") and isinstance(unit, str) and len(unit) < 20:
                step["unit"] = unit
            if step.get("value") or step.get("secondaryValue"):
                step_rows.append(step)
        calculation_steps.append({"title": title, "description": description, "rows": step_rows})

    return {"status": cell("F344"), "summary": summary, "checks": checks,
            "calculationSteps": calculation_steps}
