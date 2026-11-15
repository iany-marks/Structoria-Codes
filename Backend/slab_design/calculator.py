"""Slab design adapter over the sanitized, workbook-derived calculation model."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from column_design.formula_engine import WorkbookEvaluator


BAR_DIAMETERS = (6, 8, 10, 12, 16, 20, 25, 32, 40)
CONCRETE_STRENGTHS = (20, 25, 30, 35, 40, 45, 50)
STEEL_YIELDS = (460, 500)
YES_NO = ("Yes", "No")

TITLE_CELLS = {
    "projectTitle": "C2",
    "jobGroup": "G2",
    "slabReference": "H2",
    "revision": "J2",
    "client": "G4",
    "designBy": "C8",
    "designDate": "D8",
    "checkedBy": "E8",
    "checkDate": "F8",
    "sheetNumber": "G8",
    "jobReference": "H8",
}

SLAB_TYPES: dict[str, dict[str, Any]] = {
    "oneWay": {
        "sheet": "EC 1 way",
        "label": "One-way solid slab",
        "inputCells": {
            "supportCondition": "C13",
            "spanAlongSupports": "C14",
            "span": "C15",
            "thickness": "C16",
            "supportWidth": "C17",
            "concreteStrength": "C19",
            "steelYield": "C20",
            "gammaConcrete": "C21",
            "gammaSteel": "C22",
            "concreteUnitWeight": "C23",
            "nominalCover": "C25",
            "mainBarDiameter": "C26",
            "distributionBarDiameter": "C27",
            "topMainBarDiameter": "C28",
            "topDistributionBarDiameter": "C29",
            "edgeBarDiameter": "C30",
            "screedThickness": "C32",
            "screedUnitWeight": "C33",
            "finishesLoad": "C34",
            "imposedLoad": "C35",
            "partitionLoad": "C36",
            "gammaG": "C37",
            "gammaQ": "C38",
            "discontinuousEdgeSteel": "C40",
        },
        "groups": [
            ("Panel geometry and support", [
                ("supportCondition", "Support condition", ""),
                ("span", "Effective span between supports", "m"),
                ("spanAlongSupports", "Slab length along supports", "m"),
                ("thickness", "Slab thickness", "mm"),
                ("supportWidth", "Support width", "mm"),
            ]),
            ("Materials and detailing", [
                ("concreteStrength", "Concrete strength fck", "MPa"),
                ("steelYield", "Reinforcement yield strength fyk", "MPa"),
                ("nominalCover", "Nominal cover", "mm"),
                ("mainBarDiameter", "Bottom main bar diameter", "mm"),
                ("distributionBarDiameter", "Bottom distribution bar diameter", "mm"),
                ("topMainBarDiameter", "Top main bar diameter", "mm"),
                ("topDistributionBarDiameter", "Top distribution bar diameter", "mm"),
                ("edgeBarDiameter", "Discontinuous-edge bar diameter", "mm"),
                ("discontinuousEdgeSteel", "Provide discontinuous-edge top steel", ""),
            ]),
            ("Loads and partial factors", [
                ("concreteUnitWeight", "Concrete unit weight", "kN/m³"),
                ("screedThickness", "Screed thickness", "mm"),
                ("screedUnitWeight", "Screed unit weight", "kN/m³"),
                ("finishesLoad", "Finishes, services and fixtures", "kN/m²"),
                ("imposedLoad", "Imposed load", "kN/m²"),
                ("partitionLoad", "Partition load", "kN/m²"),
                ("gammaG", "Permanent-load factor γG", ""),
                ("gammaQ", "Variable-load factor γQ", ""),
                ("gammaConcrete", "Concrete factor γc", ""),
                ("gammaSteel", "Steel factor γs", ""),
            ]),
            ("Continuous-span applicability (user-reported)", [
                ("continuousSpanCount", "Number of similar spans", ""),
                ("maxSpanVariationPercent", "Maximum span variation", "%"),
            ]),
        ],
        "textChoices": {
            "supportCondition": ("Simply supported", "End span (one end continuous)", "Interior span (both ends continuous)"),
            "discontinuousEdgeSteel": YES_NO,
        },
        "checks": (161, 168),
        "statusCell": "F169",
        "flexure": (98, 99, 117, ("C", "D")),
        "reinforcement": (187, 191),
        "schedule": (195, 200),
        "quantities": [
            ("Total reinforcement mass", "C204", "D204"),
            ("Slab panel area", "C205", "D205"),
            ("Concrete volume", "C206", "D206"),
            ("Steel intensity per slab area", "C207", "D207"),
            ("Steel intensity per concrete volume", "C208", "D208"),
        ],
        "massCell": "K201",
        "areaCell": "C205",
        "volumeCell": "C206",
        "steelIntensityCell": "C208",
        "scheduleNoteCell": "B219",
        "calculationSections": [
            ("Panel geometry and support classification", "Span, effective depth and support assumptions used by the one-way coefficient method.", [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71], ("C",)),
            ("Material properties", "Characteristic material strengths and derived design properties.", [74, 75, 76, 77, 78], ("C",)),
            ("Loads and ultimate design action", "Self-weight, superimposed permanent and variable loads, then the workbook's ultimate load combination.", [81, 82, 83, 84, 86, 88, 89], ("C",)),
            ("Design moments and shear", "Coefficient-based span moments and design shear for a one-metre strip.", [92, 93, 94], ("C",)),
            ("Serviceability: deflection", "The workbook checks span/effective-depth against the applicable Eurocode 2 limit.", [123, 124, 125, 126, 127, 128, 129, 130, 131], ("C",)),
            ("Shear resistance", "Concrete shear resistance is checked without shear reinforcement.", [135, 136, 137, 138, 139, 140, 141, 142], ("C",)),
            ("Support anchorage", "Available embedment is compared with the required anchorage for bottom bars.", [145, 146, 147, 148, 149, 150], ("C",)),
        ],
    },
    "twoWay": {
        "sheet": "EC 2 WAY SLAB",
        "label": "Two-way slab panel",
        "inputCells": {
            "edgeCondition": "C13",
            "longSpan": "C14",
            "shortSpan": "C15",
            "thickness": "C16",
            "supportWidth": "C17",
            "concreteStrength": "C19",
            "steelYield": "C20",
            "gammaConcrete": "C21",
            "gammaSteel": "C22",
            "concreteUnitWeight": "C23",
            "nominalCover": "C25",
            "shortSpanBottomBarDiameter": "C26",
            "longSpanBottomBarDiameter": "C27",
            "shortSpanTopBarDiameter": "C28",
            "longSpanTopBarDiameter": "C29",
            "edgeBarDiameter": "C30",
            "screedThickness": "C32",
            "screedUnitWeight": "C33",
            "finishesLoad": "C34",
            "imposedLoad": "C35",
            "partitionLoad": "C36",
            "gammaG": "C37",
            "gammaQ": "C38",
            "cornersRestrained": "C40",
            "topSteelAtDiscontinuousEdges": "C41",
        },
        "groups": [
            ("Panel geometry and support", [
                ("shortSpan", "Shorter span Lx", "m"),
                ("longSpan", "Longer span Ly", "m"),
                ("edgeCondition", "Panel edge condition", ""),
                ("thickness", "Slab thickness", "mm"),
                ("supportWidth", "Support width", "mm"),
                ("cornersRestrained", "Restrained corners", ""),
                ("topSteelAtDiscontinuousEdges", "Top steel at discontinuous edges", ""),
            ]),
            ("Materials and detailing", [
                ("concreteStrength", "Concrete strength fck", "MPa"),
                ("steelYield", "Reinforcement yield strength fyk", "MPa"),
                ("nominalCover", "Nominal cover", "mm"),
                ("shortSpanBottomBarDiameter", "Short-span bottom bar diameter", "mm"),
                ("longSpanBottomBarDiameter", "Long-span bottom bar diameter", "mm"),
                ("shortSpanTopBarDiameter", "Short-span top bar diameter", "mm"),
                ("longSpanTopBarDiameter", "Long-span top bar diameter", "mm"),
                ("edgeBarDiameter", "Edge bar diameter", "mm"),
            ]),
            ("Loads and partial factors", [
                ("concreteUnitWeight", "Concrete unit weight", "kN/m³"),
                ("screedThickness", "Screed thickness", "mm"),
                ("screedUnitWeight", "Screed unit weight", "kN/m³"),
                ("finishesLoad", "Finishes, services and fixtures", "kN/m²"),
                ("imposedLoad", "Imposed load", "kN/m²"),
                ("partitionLoad", "Partition load", "kN/m²"),
                ("gammaG", "Permanent-load factor γG", ""),
                ("gammaQ", "Variable-load factor γQ", ""),
                ("gammaConcrete", "Concrete factor γc", ""),
                ("gammaSteel", "Steel factor γs", ""),
            ]),
        ],
        "textChoices": {
            "edgeCondition": (
                "Interior Panel", "One Short Edge Discont", "One Long Edge Discont",
                "Two Adjacent Edges Discont", "Two Short Edges Discont", "Two Long Edges Discont",
                "Three Edges Discont (Long Cont)", "Three Edges Discont (Short Cont)", "Four Edges Discont",
            ),
            "cornersRestrained": YES_NO,
            "topSteelAtDiscontinuousEdges": YES_NO,
        },
        "checks": (196, 204),
        "statusCell": "F205",
        "flexure": (118, 119, 137, ("C", "D", "E", "F", "G", "H")),
        "reinforcement": (222, 229),
        "schedule": (233, 241),
        "quantities": [
            ("Total reinforcement mass", "C245", "D245"),
            ("Slab panel area", "C246", "D246"),
            ("Concrete volume", "C247", "D247"),
            ("Steel intensity per slab area", "C248", "D248"),
            ("Steel intensity per concrete volume", "C249", "D249"),
        ],
        "massCell": "K242",
        "areaCell": "C246",
        "volumeCell": "C247",
        "steelIntensityCell": "C249",
        "scheduleNoteCell": "B260",
        "calculationSections": [
            ("Panel geometry and support classification", "The shorter and longer spans define the coefficient-table aspect ratio and reinforcement directions.", [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73], ("C",)),
            ("Material properties", "Characteristic material strengths and derived design properties.", [78, 79, 80, 81, 82, 83, 84], ("C",)),
            ("Loads and ultimate design action", "Permanent and variable area loads are combined using the factors entered above.", [88, 89, 90, 91, 93, 95], ("C",)),
            ("Coefficient-based design moments", "Moment coefficients are interpolated from the workbook tables for the selected panel edge condition and aspect ratio.", [99, 100, 101, 102, 103, 105, 106, 107, 108, 111, 112, 113, 114], ("C",)),
            ("Corner torsion reinforcement", "Corner reinforcement is selected only when the panel edge and corner-restraint conditions require it.", [141, 142, 143, 144, 145], ("C",)),
            ("Serviceability: deflection", "The shorter-span deflection check compares actual and allowable span/effective-depth ratios.", [149, 150, 151, 152, 153, 154, 155, 156, 157], ("C",)),
            ("Shear resistance", "Conservative support shear and concrete resistance are reported in both slab directions.", [162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172], ("C", "D")),
            ("Support anchorage", "Required anchorage is checked against the available embedment for each bottom reinforcement direction.", [177, 178, 179, 180, 181, 182, 183], ("C", "D")),
        ],
    },
    "simplySupported": {
        "sheet": "EC 2 SIMPLY SUPPORTED SLAB",
        "label": "Simply supported two-way slab",
        "inputCells": {
            "panelType": "C13",
            "longSpan": "C14",
            "shortSpan": "C15",
            "thickness": "C16",
            "supportWidth": "C17",
            "concreteStrength": "C19",
            "steelYield": "C20",
            "gammaConcrete": "C21",
            "gammaSteel": "C22",
            "concreteUnitWeight": "C23",
            "nominalCover": "C25",
            "shortSpanBottomBarDiameter": "C26",
            "longSpanBottomBarDiameter": "C27",
            "shortSpanTopBarDiameter": "C28",
            "longSpanTopBarDiameter": "C29",
            "edgeBarDiameter": "C30",
            "screedThickness": "C32",
            "screedUnitWeight": "C33",
            "finishesLoad": "C34",
            "imposedLoad": "C35",
            "partitionLoad": "C36",
            "gammaG": "C37",
            "gammaQ": "C38",
            "topSteelAtDiscontinuousEdges": "C40",
        },
        "groups": [
            ("Panel geometry and support", [
                ("shortSpan", "Shorter span Lx", "m"),
                ("longSpan", "Longer span Ly", "m"),
                ("panelType", "Corner restraint case", ""),
                ("thickness", "Slab thickness", "mm"),
                ("supportWidth", "Support width", "mm"),
                ("topSteelAtDiscontinuousEdges", "Top steel at discontinuous edges", ""),
            ]),
            ("Materials and detailing", [
                ("concreteStrength", "Concrete strength fck", "MPa"),
                ("steelYield", "Reinforcement yield strength fyk", "MPa"),
                ("nominalCover", "Nominal cover", "mm"),
                ("shortSpanBottomBarDiameter", "Short-span bottom bar diameter", "mm"),
                ("longSpanBottomBarDiameter", "Long-span bottom bar diameter", "mm"),
                ("shortSpanTopBarDiameter", "Short-span top bar diameter", "mm"),
                ("longSpanTopBarDiameter", "Long-span top bar diameter", "mm"),
                ("edgeBarDiameter", "Edge bar diameter", "mm"),
            ]),
            ("Loads and partial factors", [
                ("concreteUnitWeight", "Concrete unit weight", "kN/m³"),
                ("screedThickness", "Screed thickness", "mm"),
                ("screedUnitWeight", "Screed unit weight", "kN/m³"),
                ("finishesLoad", "Finishes, services and fixtures", "kN/m²"),
                ("imposedLoad", "Imposed load", "kN/m²"),
                ("partitionLoad", "Partition load", "kN/m²"),
                ("gammaG", "Permanent-load factor γG", ""),
                ("gammaQ", "Variable-load factor γQ", ""),
                ("gammaConcrete", "Concrete factor γc", ""),
                ("gammaSteel", "Steel factor γs", ""),
            ]),
        ],
        "textChoices": {
            "panelType": (
                "1 - Simply supported (corners free to lift)",
                "2 - Simply supported, corners restrained",
            ),
            "topSteelAtDiscontinuousEdges": YES_NO,
        },
        "checks": (195, 203),
        "statusCell": "F204",
        "flexure": (117, 118, 136, ("C", "D", "E", "F", "G", "H")),
        "reinforcement": (221, 228),
        "schedule": (232, 240),
        "quantities": [
            ("Total reinforcement mass", "C244", "D244"),
            ("Slab panel area", "C245", "D245"),
            ("Concrete volume", "C246", "D246"),
            ("Steel intensity per slab area", "C247", "D247"),
            ("Steel intensity per concrete volume", "C248", "D248"),
        ],
        "massCell": "K241",
        "areaCell": "C245",
        "volumeCell": "C246",
        "steelIntensityCell": "C248",
        "scheduleNoteCell": "B259",
        "calculationSections": [
            ("Panel geometry and support classification", "The shorter and longer spans define the coefficient-table aspect ratio and reinforcement directions.", [54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], ("C",)),
            ("Material properties", "Characteristic material strengths and derived design properties.", [77, 78, 79, 80, 81, 82], ("C",)),
            ("Loads and ultimate design action", "Permanent and variable area loads are combined using the factors entered above.", [86, 87, 88, 89, 91, 93], ("C",)),
            ("Coefficient-based design moments", "Simply supported moment coefficients are interpolated for the selected corner-restraint case and aspect ratio.", [97, 98, 99, 100, 101, 102, 104, 105, 106, 107, 110, 111, 112, 113], ("C",)),
            ("Corner torsion reinforcement", "Corner reinforcement is selected for restrained corners; free corners are reported as not requiring torsion steel.", [140, 141, 142, 143, 144], ("C",)),
            ("Serviceability: deflection", "The shorter-span deflection check compares actual and allowable span/effective-depth ratios.", [148, 149, 150, 151, 152, 153, 154, 155, 156], ("C",)),
            ("Shear resistance", "Conservative support shear and concrete resistance are reported in both slab directions.", [161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171], ("C", "D")),
            ("Support anchorage", "Required anchorage is checked against the available embedment for each bottom reinforcement direction.", [176, 177, 178, 179, 180, 181, 182], ("C", "D")),
        ],
    },
}

SCOPE_NOTES = [
    "This student-focused calculation aid does not replace independent structural design or checking by a qualified engineer.",
    "The workbook combines EN 1992-1-1 (UK National Annex) reinforced-concrete checks with BS 8110 coefficient tables for slab moment analysis and BS 8666:2020 bar scheduling. Do not describe the complete method as Eurocode-only.",
    "The Lunia examples use plate-analysis moments with Wood-Armer design combinations. The workbook uses coefficient tables and different example geometries; moment values from the two sources are not directly comparable.",
    "The model assumes rectangular panels, uniform area loading, a 1,000 mm design strip, equal support widths and the support idealization selected in the form. It does not analyze a plate or frame.",
    "Cantilevers, flat slabs and punching shear, concentrated or line loads, openings, shear reinforcement, crack-width calculations, vibration and fire design are outside this template.",
    "The workbook's bar quantities do not include laps, spacers/chairs, binding wire or wastage. Its standard-stock assumption and quantity notes are included in the schedule section.",
    "The one-way coefficient method has span-count, span-similarity and loading preconditions. Span count and span variation are user-reported and cannot be independently verified by this calculator.",
]


def load_model(path: str | Path | None = None) -> dict[str, Any]:
    model_path = Path(path) if path else Path(__file__).resolve().parents[2] / "assets" / "slab-design-model.json"
    with model_path.open("r", encoding="utf-8") as model_file:
        model = json.load(model_file)
    if model.get("formatVersion") != 1:
        raise ValueError("The standalone slab design model version is not supported.")
    required_sheets = {"COEFFICIENTS", *(config["sheet"] for config in SLAB_TYPES.values())}
    if not required_sheets.issubset(model.get("sheets", {})):
        raise ValueError("The standalone slab model is missing one or more required calculation sheets.")
    return model


def _is_finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_inputs(slab_type: Any, inputs: Any) -> dict[str, Any]:
    if not isinstance(slab_type, str) or slab_type not in SLAB_TYPES:
        raise ValueError("'slabType' must be 'oneWay', 'twoWay' or 'simplySupported'.")
    if not isinstance(inputs, dict):
        raise ValueError("The request must include a JSON object of slab design inputs.")

    config = SLAB_TYPES[slab_type]
    required = list(config["inputCells"])
    if slab_type == "oneWay" and inputs.get("supportCondition") != "Simply supported":
        required.extend(("continuousSpanCount", "maxSpanVariationPercent"))
    missing = [key for key in required if key not in inputs]
    if missing:
        raise ValueError("Missing design input(s): " + ", ".join(missing))

    result = dict(inputs)
    for key in config["textChoices"]:
        value = result[key]
        if not isinstance(value, str) or value not in config["textChoices"][key]:
            raise ValueError(f"Design input '{key}' must be one of the listed workbook choices.")

    numeric_inputs = set(config["inputCells"]) - set(config["textChoices"])
    numeric_inputs.discard("supportCondition")
    for key in numeric_inputs:
        value = result[key]
        if not _is_finite_number(value):
            raise ValueError(f"Design input '{key}' must be a finite number.")

    if result["concreteStrength"] not in CONCRETE_STRENGTHS:
        raise ValueError("'concreteStrength' must be one of the workbook's listed concrete grades.")
    if result["steelYield"] not in STEEL_YIELDS:
        raise ValueError("'steelYield' must be 460 or 500 MPa.")
    for key in set(config["inputCells"]) & {
        "mainBarDiameter", "distributionBarDiameter", "topMainBarDiameter",
        "topDistributionBarDiameter", "edgeBarDiameter", "shortSpanBottomBarDiameter",
        "longSpanBottomBarDiameter", "shortSpanTopBarDiameter", "longSpanTopBarDiameter",
    }:
        if result[key] not in BAR_DIAMETERS:
            raise ValueError(f"Design input '{key}' must be one of the workbook's listed bar diameters.")

    positive_inputs = {
        "thickness", "supportWidth", "concreteStrength", "steelYield", "gammaConcrete",
        "gammaSteel", "concreteUnitWeight", "screedUnitWeight", "gammaG", "gammaQ",
        "span", "spanAlongSupports", "shortSpan", "longSpan",
    }
    for key in positive_inputs & set(config["inputCells"]):
        if result[key] <= 0:
            raise ValueError(f"Design input '{key}' must be greater than zero.")
    for key in ("screedThickness", "nominalCover", "finishesLoad", "imposedLoad", "partitionLoad"):
        if result[key] < 0:
            raise ValueError(f"Design input '{key}' cannot be negative.")
    if result["nominalCover"] >= result["thickness"]:
        raise ValueError("'nominalCover' must be less than the slab thickness.")

    if slab_type == "oneWay":
        if result["spanAlongSupports"] / result["span"] < 2:
            raise ValueError("The one-way sheet requires the supported length/span ratio to be at least 2.0.")
        if result["supportCondition"] != "Simply supported":
            span_count = result["continuousSpanCount"]
            span_variation = result["maxSpanVariationPercent"]
            if not _is_finite_number(span_count) or not float(span_count).is_integer() or span_count < 1:
                raise ValueError("'continuousSpanCount' must be a positive whole number.")
            if not _is_finite_number(span_variation) or not 0 <= span_variation <= 100:
                raise ValueError("'maxSpanVariationPercent' must be between 0 and 100.")
    else:
        ratio = result["longSpan"] / result["shortSpan"]
        if ratio < 1:
            raise ValueError("'longSpan' must be greater than or equal to 'shortSpan'.")
        if ratio > 2:
            raise ValueError("The two-way coefficient tables apply only to aspect ratios from 1.0 to 2.0.")

    layer_pairs = []
    if slab_type == "oneWay":
        layer_pairs = [
            (result["mainBarDiameter"], result["distributionBarDiameter"]),
            (result["topMainBarDiameter"], result["topDistributionBarDiameter"]),
        ]
    else:
        layer_pairs = [
            (result["shortSpanBottomBarDiameter"], result["longSpanBottomBarDiameter"]),
            (result["shortSpanTopBarDiameter"], result["longSpanTopBarDiameter"]),
        ]
    for outer_diameter, inner_diameter in layer_pairs:
        if result["thickness"] <= result["nominalCover"] + outer_diameter + inner_diameter / 2:
            raise ValueError("The slab thickness must leave a positive effective depth for the selected reinforcement layers.")

    return result


def _display(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)) and math.isfinite(value):
        return f"{value:,.3f}".rstrip("0").rstrip(".")
    return str(value)


def _empty(value: Any) -> bool:
    return value in (None, "")


def _input_groups(config: dict[str, Any], inputs: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "title": title,
            "fields": [
                {"label": label, "value": _display(inputs[key]), "unit": unit}
                for key, label, unit in fields
            ],
        }
        for title, fields in config["groups"]
        if not (
            title == "Continuous-span applicability (user-reported)"
            and inputs.get("supportCondition") == "Simply supported"
        )
        and all(key in inputs for key, _, _ in fields)
    ]


def _calculation_sections(evaluator: WorkbookEvaluator, config: dict[str, Any]) -> list[dict[str, Any]]:
    sections = []
    for title, description, rows, columns in config["calculationSections"]:
        items = []
        column_labels = (
            {"C": "Short span (x)", "D": "Long span (y)"}
            if columns == ("C", "D")
            else {"C": "Value"}
        )
        for row in rows:
            label = evaluator.read_cell(config["sheet"], f"B{row}")
            if not isinstance(label, str) or not label.strip():
                continue
            values = {}
            for column in columns:
                raw = evaluator.read_cell(config["sheet"], f"{column}{row}")
                if not _empty(raw):
                    if label.strip() == "Applicable?" and raw in (0, 1, 0.0, 1.0):
                        values[column_labels[column]] = "Yes" if raw else "No"
                    else:
                        values[column_labels[column]] = _display(raw)
            unit = evaluator.read_cell(config["sheet"], f"D{row}") if columns == ("C",) else ""
            working = evaluator.read_cell(config["sheet"], f"E{row}")
            reference = evaluator.read_cell(config["sheet"], f"A{row}")
            note = evaluator.read_cell(config["sheet"], f"K{row}")
            item = {"label": label.strip(), "values": values}
            if isinstance(unit, str) and unit.strip() and len(unit) < 24:
                item["unit"] = unit.strip()
            if isinstance(working, str) and working.strip():
                item["working"] = working.strip()
            if isinstance(reference, str) and reference.strip():
                item["reference"] = reference.strip()
            if isinstance(note, str) and note.strip():
                item["note"] = note.strip()
            items.append(item)
        sections.append({"title": title, "description": description, "rows": items})

    header_row, first_row, last_row, columns = config["flexure"]
    table_columns = []
    for column in columns:
        heading = evaluator.read_cell(config["sheet"], f"{column}{header_row}")
        table_columns.append(_display(heading) or column)
    table_rows = []
    for row in range(first_row, last_row + 1):
        label = evaluator.read_cell(config["sheet"], f"B{row}")
        if not isinstance(label, str) or not label.strip():
            continue
        values = []
        for column in columns:
            value = evaluator.read_cell(config["sheet"], f"{column}{row}")
            if label.strip() == "Applicable?" and value in (0, 1, 0.0, 1.0):
                values.append("Yes" if value else "No")
            else:
                values.append(_display(value))
        table_rows.append({
            "label": label.strip(),
            "values": values,
            "reference": _display(evaluator.read_cell(config["sheet"], f"A{row}")),
        })
    sections.insert(4 if len(sections) > 4 else len(sections), {
        "title": "Flexural reinforcement selection",
        "description": "Each row preserves the workbook's calculated values for the reinforcement layers used in each design direction.",
        "table": {"columns": table_columns, "rows": table_rows},
    })
    return sections


def calculate(
    model: dict[str, Any],
    slab_type: Any,
    inputs: Any,
    title_block: Any = None,
) -> dict[str, Any]:
    inputs = validate_inputs(slab_type, inputs)
    if title_block is not None and not isinstance(title_block, dict):
        raise ValueError("'titleBlock' must be a JSON object when provided.")
    title_block = dict(title_block or {})
    for key, value in tuple(title_block.items()):
        if key not in TITLE_CELLS:
            raise ValueError(f"Unknown title-block field '{key}'.")
        if value is None:
            title_block[key] = ""
        elif not isinstance(value, (str, int, float)) or isinstance(value, bool):
            raise ValueError(f"Title-block value '{key}' must be text or a number.")
        elif len(str(value)) > 120:
            raise ValueError(f"Title-block value '{key}' must be 120 characters or fewer.")

    config = SLAB_TYPES[slab_type]
    sheet = config["sheet"]
    evaluator = WorkbookEvaluator(model)
    for key, address in config["inputCells"].items():
        evaluator.set_cell(sheet, address, inputs[key])
    for key, address in TITLE_CELLS.items():
        evaluator.set_cell(sheet, address, title_block.get(key, ""))

    def cell(address: str) -> Any:
        return evaluator.read_cell(sheet, address)

    checks = []
    first_check, last_check = config["checks"]
    for row in range(first_check, last_check + 1):
        name = cell(f"B{row}")
        if _empty(name):
            continue
        checks.append({
            "name": _display(name),
            "demand": _display(cell(f"C{row}")),
            "capacity": _display(cell(f"D{row}")),
            "ratio": _display(cell(f"E{row}")),
            "status": _display(cell(f"F{row}")),
        })

    if slab_type == "oneWay" and inputs["supportCondition"] != "Simply supported":
        workbook_limit = _display(cell("C89"))
        within_span_assumptions = (
            inputs["continuousSpanCount"] >= 3
            and inputs["maxSpanVariationPercent"] <= 15
            and workbook_limit == "OK"
        )
        checks.append({
            "name": "Continuous-slab coefficient preconditions (user-reported spans)",
            "demand": (
                f"{_display(inputs['continuousSpanCount'])} spans; "
                f"{_display(inputs['maxSpanVariationPercent'])}% maximum variation; "
                f"workbook load check: {workbook_limit}"
            ),
            "capacity": "At least 3 similar spans; variation no more than 15%; workbook load limits satisfied",
            "ratio": "",
            "status": "OK" if within_span_assumptions else "REVIEW REQUIRED",
        })

    reinforcement_start, reinforcement_end = config["reinforcement"]
    reinforcement = []
    for row in range(reinforcement_start, reinforcement_end + 1):
        label = cell(f"B{row}")
        if _empty(label):
            continue
        mark = cell(f"A{row}")
        reinforcement.append({
            "mark": _display(mark),
            "description": _display(label),
            "tag": _display(cell(f"C{row}")),
            "placing": _display(cell(f"F{row}")),
        })

    schedule_start, schedule_end = config["schedule"]
    bar_schedule = []
    for row in range(schedule_start, schedule_end + 1):
        mark = cell(f"A{row}")
        if _empty(mark) or str(mark).upper().startswith("TOTAL"):
            continue
        total_bars = cell(f"F{row}")
        if not _is_finite_number(total_bars) or total_bars <= 0:
            continue
        bar_schedule.append({
            "mark": _display(mark),
            "location": _display(cell(f"B{row}")),
            "barType": _display(cell(f"C{row}")),
            "numberEach": _display(cell(f"D{row}")),
            "numberOfMembers": _display(cell(f"E{row}")),
            "totalBars": _display(total_bars),
            "shapeCode": _display(cell(f"G{row}")),
            "dimensionA": _display(cell(f"H{row}")),
            "dimensionB": _display(cell(f"I{row}")),
            "lengthEach": _display(cell(f"J{row}")),
            "mass": _display(cell(f"K{row}")),
        })

    quantities = [
        {"label": label, "value": _display(cell(value_cell)), "unit": _display(cell(unit_cell))}
        for label, value_cell, unit_cell in config["quantities"]
    ]
    status = _display(cell(config["statusCell"]))
    supplemental_review = any(check["status"] == "REVIEW REQUIRED" for check in checks)
    if supplemental_review and status.startswith("DESIGN ADEQUATE"):
        status = "REVIEW REQUIRED - COEFFICIENT METHOD ASSUMPTION NOT MET"

    return {
        "slabType": slab_type,
        "slabTypeLabel": config["label"],
        "status": status,
        "workbookStatus": _display(cell(config["statusCell"])),
        "titleBlock": title_block,
        "inputs": inputs,
        "inputGroups": _input_groups(config, inputs),
        "checks": checks,
        "calculationSections": _calculation_sections(evaluator, config),
        "reinforcement": reinforcement,
        "barSchedule": bar_schedule,
        "quantities": quantities,
        "scheduleNote": _display(cell(config["scheduleNoteCell"])),
        "summary": [
            {"label": "Total reinforcement mass", "value": _display(cell(config["massCell"])), "unit": "kg"},
            *[
                {"label": label, "value": _display(cell(value_cell)), "unit": _display(cell(unit_cell))}
                for label, value_cell, unit_cell in config["quantities"][1:]
            ],
        ],
        "methodStatement": (
            "EN 1992-1-1 (2004) with the UK National Annex for reinforced-concrete checks; "
            "BS 8110 coefficient tables for slab moments; BS 8666:2020 for bar scheduling."
        ),
        "methodComparison": (
            "The supplied Lunia examples derive moments from plate analysis and use Wood-Armer combinations. "
            "This workbook uses tabulated slab coefficients; different model methods and geometries mean their "
            "moment values must not be compared as if they were the same calculation."
        ),
        "scopeNotes": SCOPE_NOTES,
    }
