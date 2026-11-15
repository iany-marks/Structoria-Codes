"""Small Excel-formula evaluator for the formulas in the column design model."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any


class FormulaError(ValueError):
    pass


@dataclass
class Matrix:
    rows: list[list[Any]]


def _column_number(letters: str) -> int:
    result = 0
    for letter in letters.upper():
        result = result * 26 + ord(letter) - 64
    return result


def _column_letters(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def _address(address: str) -> tuple[int, int]:
    match = re.fullmatch(r"\$?([A-Z]+)\$?(\d+)", address, re.I)
    if not match:
        raise FormulaError(f"Invalid cell reference: {address}")
    return _column_number(match.group(1)), int(match.group(2))


def _translate_formula(formula: str, master: str, target: str) -> str:
    master_column, master_row = _address(master)
    target_column, target_row = _address(target)
    column_offset = target_column - master_column
    row_offset = target_row - master_row
    pattern = r'"(?:[^\"]|\"\")*"|\$?[A-Z]{1,3}\$?\d+'

    def translate(match: re.Match[str]) -> str:
        token = match.group(0)
        if token.startswith('"'):
            return token
        ref = re.fullmatch(r"(\$?)([A-Z]{1,3})(\$?)(\d+)", token, re.I)
        column, row = _column_number(ref.group(2)), int(ref.group(4))
        if not ref.group(1):
            column += column_offset
        if not ref.group(3):
            row += row_offset
        if column < 1 or row < 1:
            return "#REF!"
        return f"{ref.group(1)}{_column_letters(column)}{ref.group(3)}{row}"

    return re.sub(pattern, translate, formula, flags=re.I)


def _tokens(formula: str) -> list[tuple[str, Any]]:
    tokens: list[tuple[str, Any]] = []
    index = 0
    patterns = [
        ("string", r'"((?:[^\"]|\"\")*)"'),
        ("reference", r"'((?:[^']|'')+)'!(\$?[A-Z]{1,3}\$?\d+)"),
        ("reference", r"([A-Z_][A-Z0-9_.]*)!(\$?[A-Z]{1,3}\$?\d+)"),
        ("reference", r"(\$?[A-Z]{1,3}\$?\d+)"),
        ("number", r"(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?"),
        ("error", r"#[A-Z0-9/?!]+"),
        ("identifier", r"[A-Z_][A-Z0-9_.]*"),
        ("operator", r"<=|>=|<>|[+\-*/^&=<>():%,]"),
    ]
    while index < len(formula):
        if formula[index].isspace():
            index += 1
            continue
        remaining = formula[index:]
        for kind, pattern in patterns:
            match = re.match(pattern, remaining, re.I)
            if not match:
                continue
            if kind == "string":
                tokens.append((kind, match.group(1).replace('""', '"')))
            elif kind == "reference" and len(match.groups()) == 2:
                tokens.append((kind, (match.group(1).replace("''", "'"), match.group(2).upper())))
            elif kind == "reference":
                tokens.append((kind, (None, match.group(1).upper())))
            elif kind == "number":
                tokens.append((kind, float(match.group(0))))
            else:
                tokens.append((kind, match.group(0).upper() if kind != "operator" else match.group(0)))
            index += len(match.group(0))
            break
        else:
            raise FormulaError(f'Unsupported formula token near "{remaining[:20]}".')
    return tokens


_PRECEDENCE = {"=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2,
               "+": 3, "-": 3, "*": 4, "/": 4, "^": 5, "%": 6, ":": 7}


class _Parser:
    def __init__(self, formula: str):
        self.tokens = _tokens(formula)
        self.position = 0

    def _peek(self) -> tuple[str, Any] | None:
        return self.tokens[self.position] if self.position < len(self.tokens) else None

    def _take(self) -> tuple[str, Any] | None:
        token = self._peek()
        self.position += token is not None
        return token

    def _expression(self, minimum: int = 0) -> dict[str, Any]:
        token = self._take()
        if token is None:
            raise FormulaError("Unexpected end of formula.")
        kind, value = token
        if kind in ("number", "string"):
            left = {"type": "literal", "value": value}
        elif kind == "error":
            left = {"type": "error", "value": value}
        elif kind == "reference":
            left = {"type": "reference", "sheet": value[0], "address": value[1]}
        elif kind == "operator" and value in ("+", "-"):
            left = {"type": "unary", "operator": value, "value": self._expression(6)}
        elif kind == "operator" and value == "(":
            left = self._expression()
            if self._take() != ("operator", ")"):
                raise FormulaError("Missing closing parenthesis.")
        elif kind == "identifier":
            if value in ("TRUE", "FALSE") and self._peek() != ("operator", "("):
                left = {"type": "literal", "value": value == "TRUE"}
            elif self._take() == ("operator", "("):
                args = []
                if self._peek() != ("operator", ")"):
                    while True:
                        args.append(self._expression())
                        if self._peek() != ("operator", ","):
                            break
                        self._take()
                if self._take() != ("operator", ")"):
                    raise FormulaError(f"Missing closing parenthesis for {value}.")
                left = {"type": "call", "name": value, "args": args}
            else:
                raise FormulaError(f"Unsupported name: {value}")
        else:
            raise FormulaError(f"Unexpected token: {value}")

        while (peek := self._peek()) and peek[0] == "operator":
            operator = peek[1]
            precedence = _PRECEDENCE.get(operator, -1)
            if precedence < minimum:
                break
            self._take()
            if operator == "%":
                left = {"type": "postfix", "operator": operator, "value": left}
                continue
            right_minimum = precedence if operator == "^" else precedence + 1
            right = self._expression(right_minimum)
            left = {"type": "range" if operator == ":" else "binary",
                    "operator": operator, "left": left, "right": right}
        return left

    def parse(self) -> dict[str, Any]:
        result = self._expression()
        if self.position != len(self.tokens):
            raise FormulaError(f"Unexpected token: {self.tokens[self.position][1]}")
        return result


def _flatten(value: Any) -> list[Any]:
    return [item for row in value.rows for item in row] if isinstance(value, Matrix) else [value]


def _number(value: Any) -> float:
    if isinstance(value, Matrix):
        raise FormulaError("A range cannot be used as a single number.")
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError) as error:
        raise FormulaError(f'Cannot convert "{value}" to a number.') from error


def _boolean(value: Any) -> bool:
    if isinstance(value, Matrix):
        raise FormulaError("A range cannot be used as a single logical value.")
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if value is None or value == "":
        return False
    if isinstance(value, str):
        if value.upper() in ("TRUE", "FALSE"):
            return value.upper() == "TRUE"
        raise FormulaError(f'Cannot convert "{value}" to a logical value.')
    return bool(value)


def _scalar(value: Any) -> Any:
    return value.rows[0][0] if isinstance(value, Matrix) and value.rows and value.rows[0] else (0 if isinstance(value, Matrix) else value)


def _js_string(value: Any) -> str:
    if value is None:
        return ""
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, float) and math.isfinite(value) and value.is_integer():
        return str(int(value))
    return str(value)


def _map_binary(left: Any, right: Any, operation) -> Any:
    if not isinstance(left, Matrix) and not isinstance(right, Matrix):
        return operation(left, right)
    left_rows = len(left.rows) if isinstance(left, Matrix) else 1
    right_rows = len(right.rows) if isinstance(right, Matrix) else 1
    left_cols = len(left.rows[0]) if isinstance(left, Matrix) and left.rows else 0 if isinstance(left, Matrix) else 1
    right_cols = len(right.rows[0]) if isinstance(right, Matrix) and right.rows else 0 if isinstance(right, Matrix) else 1
    if left_rows != 1 and right_rows != 1 and left_rows != right_rows:
        raise FormulaError("Array row dimensions do not match.")
    if left_cols != 1 and right_cols != 1 and left_cols != right_cols:
        raise FormulaError("Array column dimensions do not match.")
    rows, cols = max(left_rows, right_rows), max(left_cols, right_cols)
    output = []
    for row in range(rows):
        values = []
        for col in range(cols):
            a = left.rows[0 if left_rows == 1 else row][0 if left_cols == 1 else col] if isinstance(left, Matrix) else left
            b = right.rows[0 if right_rows == 1 else row][0 if right_cols == 1 else col] if isinstance(right, Matrix) else right
            values.append(operation(a, b))
        output.append(values)
    return Matrix(output)


def _excel_round(value: float, digits: int, upward: bool = False) -> float:
    scale = 10 ** digits
    scaled = abs(value) * scale
    rounded = math.ceil(scaled - 1e-10) if upward else math.floor(scaled + 0.5 + 1e-10)
    return math.copysign(rounded / scale, value)


def _format_text(value: Any, format_string: str) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        return str(value if value is not None else "")
    percent = "%" in format_string
    number = value * 100 if percent else value
    decimal = format_string.split(".", 1)[1] if "." in format_string else ""
    decimal = re.sub(r"[^0#].*$", "", decimal)
    minimum_digits = decimal.count("0")
    formatted = f"{number:,.{len(decimal)}f}" if "," in format_string else f"{number:.{len(decimal)}f}"
    if len(decimal) > minimum_digits:
        formatted = formatted.rstrip("0").rstrip(".")
    return formatted + ("%" if percent else "")


class WorkbookEvaluator:
    def __init__(self, model: dict[str, Any]):
        self.model = model
        self.overrides: dict[str, Any] = {}
        self.cache: dict[str, Any] = {}
        self.stack: set[str] = set()
        self.current_sheet = ""
        self.current_address = ""

    def set_cell(self, sheet: str, address: str, value: Any) -> None:
        self.overrides[f"{sheet}!{address.upper()}"] = value
        self.cache.clear()

    def read_cell(self, sheet: str, address: str) -> Any:
        address = address.replace("$", "").upper()
        key = f"{sheet}!{address}"
        if key in self.overrides:
            return self.overrides[key]
        if key in self.cache:
            return self.cache[key]
        if key in self.stack:
            raise FormulaError(f"Circular formula reference: {key}")
        cell = self.model.get("sheets", {}).get(sheet, {}).get(address)
        if not cell:
            return 0
        if "f" not in cell and "g" not in cell:
            return cell.get("v", 0)
        self.stack.add(key)
        previous = self.current_sheet, self.current_address
        self.current_sheet, self.current_address = sheet, address
        try:
            shared = self.model.get("sharedFormulas", {}).get(cell.get("g")) if cell.get("g") else None
            if cell.get("g") and not shared:
                raise FormulaError(f"Shared formula group is missing: {cell['g']}")
            formula = (_translate_formula(shared["formula"], shared["address"], address)
                       if shared else cell["f"])
            try:
                result = self.evaluate(_Parser(formula).parse())
            except FormulaError as error:
                raise FormulaError(f"{error} at {key}.") from error
            self.cache[key] = result
            return result
        finally:
            self.current_sheet, self.current_address = previous
            self.stack.remove(key)

    def _reference(self, node: dict[str, Any]) -> Any:
        return self.read_cell(node.get("sheet") or self.current_sheet, node["address"])

    def _range(self, left: dict[str, Any], right: dict[str, Any]) -> Matrix:
        sheet = right.get("sheet") or left.get("sheet") or self.current_sheet
        if left.get("sheet") and right.get("sheet") and left["sheet"] != right["sheet"]:
            raise FormulaError("3-D ranges are not supported.")
        left_col, left_row = _address(left["address"])
        right_col, right_row = _address(right["address"])
        return Matrix([[self.read_cell(sheet, f"{_column_letters(col)}{row}")
                        for col in range(min(left_col, right_col), max(left_col, right_col) + 1)]
                       for row in range(min(left_row, right_row), max(left_row, right_row) + 1)])

    def evaluate(self, node: dict[str, Any]) -> Any:
        kind = node["type"]
        if kind == "error":
            raise FormulaError(node["value"])
        if kind == "literal":
            return node["value"]
        if kind == "reference":
            return self._reference(node)
        if kind == "range":
            if node["left"]["type"] != "reference" or node["right"]["type"] != "reference":
                raise FormulaError("Range endpoints must be cell references.")
            return self._range(node["left"], node["right"])
        if kind == "postfix":
            return _number(self.evaluate(node["value"])) / 100
        if kind == "unary":
            value = self.evaluate(node["value"])
            return _map_binary(value, 0, lambda item, _: -_number(item) if node["operator"] == "-" else _number(item))
        if kind == "binary":
            left, right = self.evaluate(node["left"]), self.evaluate(node["right"])
            return _map_binary(left, right, lambda a, b: self._binary(node["operator"], a, b))
        return self._call(node)

    @staticmethod
    def _binary(operator: str, left: Any, right: Any) -> Any:
        if operator == "&":
            return f"{_js_string(left)}{_js_string(right)}"
        if operator in ("=", "<>", "<", ">", "<=", ">="):
            a = left.upper() if isinstance(left, str) else _number(left)
            b = right.upper() if isinstance(right, str) else _number(right)
            return {"=": lambda: a == b, "<>": lambda: a != b, "<": lambda: a < b,
                    ">": lambda: a > b, "<=": lambda: a <= b, ">=": lambda: a >= b}[operator]()
        a, b = _number(left), _number(right)
        if operator == "+": return a + b
        if operator == "-": return a - b
        if operator == "*": return a * b
        if operator == "/":
            if b == 0: raise FormulaError("#DIV/0!")
            return a / b
        if operator == "^": return a ** b
        raise FormulaError(f"Unsupported operator: {operator}")

    def _call(self, node: dict[str, Any]) -> Any:
        args = node["args"]
        name = node["name"]
        first = lambda: self.evaluate(args[0]) if args else 0
        all_args = lambda: [self.evaluate(arg) for arg in args]
        if name == "TRUE": return True
        if name == "FALSE": return False
        if name == "IF":
            condition = first()
            if isinstance(condition, Matrix):
                return _map_binary(condition, 0, lambda val, _: self.evaluate(args[1]) if _boolean(val) and len(args) > 1 else (True if _boolean(val) else self.evaluate(args[2]) if len(args) > 2 else False))
            return self.evaluate(args[1]) if _boolean(condition) and len(args) > 1 else (True if _boolean(condition) else self.evaluate(args[2]) if len(args) > 2 else False)
        if name == "IFERROR":
            try: return first()
            except FormulaError: return self.evaluate(args[1]) if len(args) > 1 else ""
        if name in ("AND", "OR"):
            values = [value for argument in all_args() for value in _flatten(argument)]
            return all(map(_boolean, values)) if name == "AND" else any(map(_boolean, values))
        if name in ("SUM", "SUMPRODUCT"):
            values = all_args()
            if name == "SUM":
                return sum(0 if isinstance(v, bool) else (float(v) if _is_numeric(v) else 0) for arg in values for v in _flatten(arg))
            arrays = [_flatten(value) for value in values]
            if not arrays: return 0
            length = max(map(len, arrays))
            if any(len(array) not in (1, length) for array in arrays):
                raise FormulaError("SUMPRODUCT array dimensions do not match.")
            return sum(math.prod(_number(array[0 if len(array) == 1 else index]) for array in arrays) for index in range(length))
        if name in ("MIN", "MAX"):
            values = [_number(v) for arg in all_args() for v in _flatten(arg)]
            return (min(values) if name == "MIN" else max(values)) if values else 0
        if name == "ABS": return _map_binary(first(), 0, lambda val, _: abs(_number(val)))
        if name == "INT": return _map_binary(first(), 0, lambda val, _: math.floor(_number(val)))
        if name == "ISNUMBER": return _map_binary(first(), 0, lambda val, _: _is_numeric(val))
        if name == "LEFT":
            count = int(_number(self.evaluate(args[1]))) if len(args) > 1 else 1
            if count < 0:
                raise FormulaError("#VALUE!")
            return _map_binary(first(), 0, lambda val, _: (
                ("TRUE" if val else "FALSE") if isinstance(val, bool) else _js_string(val)
            )[:count])
        if name == "SQRT":
            def sqrt(value: Any, _: Any) -> float:
                number = _number(value)
                if number < 0: raise FormulaError("#NUM!")
                return math.sqrt(number)
            return _map_binary(first(), 0, sqrt)
        if name == "LN":
            def ln(value: Any, _: Any) -> float:
                number = _number(value)
                if number <= 0: raise FormulaError("#NUM!")
                return math.log(number)
            return _map_binary(first(), 0, ln)
        if name == "PI": return math.pi
        if name in ("ROUND", "ROUNDUP"):
            return _excel_round(_number(first()), int(_number(self.evaluate(args[1]))), name == "ROUNDUP")
        if name in ("CEILING", "FLOOR"):
            value, significance = _number(first()), _number(self.evaluate(args[1]))
            if significance == 0: return 0
            quotient = value / significance
            return (math.ceil(quotient - 1e-10) if name == "CEILING" else math.floor(quotient + 1e-10)) * significance
        if name == "TEXT": return _format_text(_scalar(first()), str(self.evaluate(args[1])))
        if name == "T":
            value = _scalar(first())
            return value if isinstance(value, str) else ""
        if name == "COLUMN":
            if not args: return _address(self.current_address)[0]
            reference = args[0]
            if reference["type"] == "reference": return _address(reference["address"])[0]
            if reference["type"] == "range": return _address(reference["left"]["address"])[0]
            raise FormulaError("COLUMN expects a reference.")
        if name == "INDEX":
            data = self.evaluate(args[0])
            matrix = data.rows if isinstance(data, Matrix) else [[data]]
            row = max(0, int(_number(self.evaluate(args[1]))))
            if len(args) > 2:
                col = max(0, int(_number(self.evaluate(args[2]))))
            elif len(matrix) == 1:
                if row == 0: return Matrix(matrix)
                row, col = 1, row
            else:
                col = 1
            if row == 0 and col == 0: return Matrix(matrix)
            if row == 0: return Matrix([[values[col - 1] if col <= len(values) else 0] for values in matrix])
            if col == 0: return Matrix([matrix[row - 1] if row <= len(matrix) else []])
            if row > len(matrix) or col > len(matrix[row - 1]): raise FormulaError("#REF!")
            return matrix[row - 1][col - 1]
        if name == "MATCH":
            lookup = _scalar(self.evaluate(args[0]))
            source = _flatten(self.evaluate(args[1]))
            match_type = _number(self.evaluate(args[2])) if len(args) > 2 else 1
            if match_type == 0:
                try: return source.index(lookup) + 1
                except ValueError as error: raise FormulaError("#N/A") from error
            candidate = -1
            for index, value in enumerate(source):
                comparison = ((str(value).casefold() > str(lookup).casefold()) - (str(value).casefold() < str(lookup).casefold())) if isinstance(lookup, str) else _number(value) - _number(lookup)
                if (match_type > 0 and comparison <= 0) or (match_type < 0 and comparison >= 0): candidate = index
                elif match_type > 0: break
            if candidate < 0: raise FormulaError("#N/A")
            return candidate + 1
        if name in ("COUNTIF", "SUMIF"):
            criteria_values = _flatten(self.evaluate(args[0]))
            criterion = self.evaluate(args[1])
            if name == "COUNTIF": return sum(_matches_criteria(value, criterion) for value in criteria_values)
            sums = _flatten(self.evaluate(args[2])) if len(args) > 2 else criteria_values
            return sum((float(sums[i]) if i < len(sums) and _is_numeric(sums[i]) else 0) for i, value in enumerate(criteria_values) if _matches_criteria(value, criterion))
        raise FormulaError(f"Unsupported Excel function: {name}")


def _is_numeric(value: Any) -> bool:
    try:
        return not isinstance(value, bool) and math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _matches_criteria(value: Any, criterion_value: Any) -> bool:
    criterion = str(criterion_value if criterion_value is not None else "")
    match = re.match(r"^(<=|>=|<>|=|<|>)(.*)$", criterion)
    operator, expected = (match.group(1), match.group(2)) if match else ("=", criterion)
    if "*" in expected or "?" in expected:
        pattern = "^" + re.escape(expected).replace(r"\*", ".*").replace(r"\?", ".") + "$"
        matched = re.search(pattern, str(value if value is not None else ""), re.I) is not None
        return not matched if operator == "<>" else matched
    if _is_numeric(expected) and _is_numeric(value):
        left, right = float(value), float(expected)
    else:
        left, right = str(value if value is not None else "").upper(), expected.upper()
    return {"=": left == right, "<>": left != right, "<": left < right, ">": left > right,
            "<=": left <= right, ">=": left >= right}[operator]