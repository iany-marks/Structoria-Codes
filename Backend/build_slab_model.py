"""Build a sanitized formula model from the supplied slab-design workbook."""

from __future__ import annotations

import argparse
import json
import math
import posixpath
import zipfile
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


WORKBOOK_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOCUMENT_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
REQUIRED_SHEETS = ("EC 1 way", "EC 2 WAY SLAB", "COEFFICIENTS", "EC 2 SIMPLY SUPPORTED SLAB")
INPUT_CELLS = {
    "EC 1 way": (
        "C13", "C14", "C15", "C16", "C17", "C19", "C20", "C21", "C22", "C23",
        "C25", "C26", "C27", "C28", "C29", "C30", "C32", "C33", "C34", "C35",
        "C36", "C37", "C38", "C40",
    ),
    "EC 2 WAY SLAB": (
        "C13", "C14", "C15", "C16", "C17", "C19", "C20", "C21", "C22", "C23",
        "C25", "C26", "C27", "C28", "C29", "C30", "C32", "C33", "C34", "C35",
        "C36", "C37", "C38", "C40", "C41",
    ),
    "EC 2 SIMPLY SUPPORTED SLAB": (
        "C13", "C14", "C15", "C16", "C17", "C19", "C20", "C21", "C22", "C23",
        "C25", "C26", "C27", "C28", "C29", "C30", "C32", "C33", "C34", "C35",
        "C36", "C37", "C38", "C40",
    ),
}
TITLE_CELLS = ("C2", "G2", "H2", "J2", "G4", "C8", "D8", "E8", "F8", "G8", "H8")


def _tag(name: str) -> str:
    return f"{{{WORKBOOK_NS}}}{name}"


def _read_xml(archive: zipfile.ZipFile, entry_name: str) -> ET.Element:
    try:
        return ET.fromstring(archive.read(entry_name))
    except KeyError as error:
        raise ValueError(f"Workbook entry is missing: {entry_name}") from error


def _cell_value(
    cell: ET.Element,
    shared_strings: list[str],
) -> dict[str, Any] | None:
    formula = cell.find(_tag("f"))
    if formula is not None:
        return {"f": formula.text or ""}

    cell_type = cell.get("t", "")
    value_node = cell.find(_tag("v"))
    if cell_type == "inlineStr":
        value = "".join(node.text or "" for node in cell.iter() if node.tag == _tag("t"))
        return {"v": value}
    if value_node is None:
        return None

    raw_value = value_node.text or ""
    if cell_type == "s":
        try:
            return {"v": shared_strings[int(raw_value)]}
        except (ValueError, IndexError) as error:
            raise ValueError(f"Invalid shared string index in cell {cell.get('r')}.") from error
    if cell_type == "b":
        return {"v": raw_value == "1"}
    if cell_type in ("str", "e"):
        return {"v": raw_value}
    try:
        number = float(raw_value)
    except ValueError:
        return {"v": raw_value}
    if not math.isfinite(number):
        raise ValueError(f"Non-finite workbook value in cell {cell.get('r')}.")
    return {"v": number}


def build_model(workbook_path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(workbook_path) as archive:
        workbook = _read_xml(archive, "xl/workbook.xml")
        relationships = _read_xml(archive, "xl/_rels/workbook.xml.rels")
        relationship_targets = {
            relation.get("Id", ""): relation.get("Target", "")
            for relation in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        }

        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_string_xml = _read_xml(archive, "xl/sharedStrings.xml")
            shared_strings = [
                "".join(node.text or "" for node in item.iter() if node.tag == _tag("t"))
                for item in shared_string_xml.findall(_tag("si"))
            ]

        sheet_targets = {}
        for sheet in workbook.findall(f".//{_tag('sheet')}"):
            sheet_id = sheet.get(f"{{{DOCUMENT_REL_NS}}}id", "")
            sheet_targets[sheet.get("name", "")] = relationship_targets.get(sheet_id, "")
        missing_sheets = [name for name in REQUIRED_SHEETS if name not in sheet_targets]
        if missing_sheets:
            raise ValueError("Required slab workbook sheet(s) are missing: " + ", ".join(missing_sheets))

        model: dict[str, Any] = {
            "formatVersion": 1,
            "sourceWorkbook": workbook_path.name,
            "sharedFormulas": {},
            "sheets": {},
        }

        for sheet_name in REQUIRED_SHEETS:
            target = sheet_targets[sheet_name]
            entry_name = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            sheet_xml = _read_xml(archive, entry_name)
            cells = sheet_xml.findall(f".//{_tag('c')}")
            shared_masters = {}
            for cell in cells:
                formula = cell.find(_tag("f"))
                if formula is not None and formula.get("t") == "shared" and formula.get("ref"):
                    shared_masters[formula.get("si", "")] = {
                        "address": cell.get("r", ""),
                        "formula": formula.text or "",
                    }

            sheet_model: dict[str, Any] = {}
            for cell in cells:
                address = cell.get("r", "")
                formula = cell.find(_tag("f"))
                if formula is not None and formula.get("t") == "shared":
                    shared_index = formula.get("si", "")
                    group = f"{sheet_name}|{shared_index}"
                    if shared_index in shared_masters:
                        model["sharedFormulas"][group] = shared_masters[shared_index]
                    elif group not in model["sharedFormulas"]:
                        raise ValueError(f"Shared formula master not found for {sheet_name}!{address}.")
                    sheet_model[address] = {"g": group}
                    continue
                value = _cell_value(cell, shared_strings)
                if value is not None:
                    sheet_model[address] = value
            model["sheets"][sheet_name] = sheet_model

    for sheet_name, input_addresses in INPUT_CELLS.items():
        for address in (*input_addresses, *TITLE_CELLS):
            model["sheets"][sheet_name].pop(address, None)

    used_groups = {
        cell["g"]
        for sheet in model["sheets"].values()
        for cell in sheet.values()
        if "g" in cell
    }
    model["sharedFormulas"] = {
        group: formula for group, formula in model["sharedFormulas"].items() if group in used_groups
    }
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path, help="Path to the supplied slab-design .xlsx workbook")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "slab-design-model.json",
        help="Destination for the sanitized standalone model",
    )
    arguments = parser.parse_args()
    workbook_path = arguments.workbook.expanduser().resolve()
    if not workbook_path.is_file():
        parser.error(f"Workbook not found: {workbook_path}")

    model = build_model(workbook_path)
    output_path = arguments.output.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Built sanitized slab model: {output_path}")
    print(f"Included sheets: {', '.join(REQUIRED_SHEETS)}")
    print(f"Cells: {sum(len(sheet) for sheet in model['sheets'].values())}")


if __name__ == "__main__":
    main()
