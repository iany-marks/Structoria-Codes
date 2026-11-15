(function () {
  "use strict";

  const modelUrl = new URL("assets/column-design-model.json", document.baseURI);
  const EPSILON = 1e-10;

  class FormulaError extends Error {}

  function isMatrix(value) {
    return value !== null && typeof value === "object" && value.kind === "matrix";
  }

  function makeMatrix(rows) {
    return { kind: "matrix", rows };
  }

  function flatten(value) {
    if (isMatrix(value)) return value.rows.flat();
    return [value];
  }

  function columnNumber(letters) {
    let result = 0;
    for (const letter of letters.toUpperCase()) {
      result = result * 26 + letter.charCodeAt(0) - 64;
    }
    return result;
  }

  function columnLetters(number) {
    let result = "";
    while (number > 0) {
      const remainder = (number - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      number = Math.floor((number - 1) / 26);
    }
    return result;
  }

  function parseAddress(address) {
    const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(address);
    if (!match) throw new FormulaError(`Invalid cell reference: ${address}`);
    return { column: columnNumber(match[1]), row: Number(match[2]) };
  }

  function translateSharedFormula(formula, masterAddress, targetAddress) {
    const master = parseAddress(masterAddress);
    const target = parseAddress(targetAddress);
    const columnOffset = target.column - master.column;
    const rowOffset = target.row - master.row;
    return formula.replace(/"(?:[^"]|"")*"|\$?[A-Z]{1,3}\$?\d+/gi, (token) => {
      if (token.startsWith('"')) return token;
      const match = /^(\$?)([A-Z]{1,3})(\$?)(\d+)$/i.exec(token);
      let column = columnNumber(match[2]);
      let row = Number(match[4]);
      if (!match[1]) column += columnOffset;
      if (!match[3]) row += rowOffset;
      if (column < 1 || row < 1) return "#REF!";
      return `${match[1]}${columnLetters(column)}${match[3]}${row}`;
    });
  }

  function tokenize(formula) {
    const tokens = [];
    let index = 0;
    while (index < formula.length) {
      const remaining = formula.slice(index);
      if (/^\s+/.test(remaining)) {
        index += /^\s+/.exec(remaining)[0].length;
        continue;
      }

      let match = /^"((?:[^"]|"")*)"/.exec(remaining);
      if (match) {
        tokens.push({ type: "string", value: match[1].replace(/""/g, '"') });
        index += match[0].length;
        continue;
      }

      match = /^'((?:[^']|'')+)'!(\$?[A-Z]{1,3}\$?\d+)/i.exec(remaining);
      if (match) {
        tokens.push({
          type: "reference",
          sheet: match[1].replace(/''/g, "'"),
          address: match[2].toUpperCase(),
        });
        index += match[0].length;
        continue;
      }

      match = /^([A-Z_][A-Z0-9_.]*)!(\$?[A-Z]{1,3}\$?\d+)/i.exec(remaining);
      if (match) {
        tokens.push({ type: "reference", sheet: match[1], address: match[2].toUpperCase() });
        index += match[0].length;
        continue;
      }

      match = /^(\$?[A-Z]{1,3}\$?\d+)/i.exec(remaining);
      if (match) {
        tokens.push({ type: "reference", sheet: null, address: match[1].toUpperCase() });
        index += match[0].length;
        continue;
      }

      match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/i.exec(remaining);
      if (match) {
        tokens.push({ type: "number", value: Number(match[0]) });
        index += match[0].length;
        continue;
      }

      match = /^#[A-Z0-9/?!]+/i.exec(remaining);
      if (match) {
        tokens.push({ type: "error", value: match[0].toUpperCase() });
        index += match[0].length;
        continue;
      }

      match = /^[A-Z_][A-Z0-9_.]*/i.exec(remaining);
      if (match) {
        const word = match[0].toUpperCase();
        tokens.push({ type: "identifier", value: word });
        index += match[0].length;
        continue;
      }

      match = /^(<=|>=|<>|[+\-*/^&=<>():%,])/i.exec(remaining);
      if (match) {
        tokens.push({ type: "operator", value: match[0] });
        index += match[0].length;
        continue;
      }

      throw new FormulaError(`Unsupported formula token near "${remaining.slice(0, 20)}".`);
    }
    return tokens;
  }

  const precedence = {
    "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1,
    "&": 2,
    "+": 3, "-": 3,
    "*": 4, "/": 4,
    "^": 5,
    "%": 6,
    ":": 7,
  };

  function parseFormula(formula) {
    const tokens = tokenize(formula);
    let cursor = 0;
    const peek = () => tokens[cursor];
    const consume = () => tokens[cursor++];

    function parsePrimary() {
      const token = consume();
      if (!token) throw new FormulaError("Unexpected end of formula.");
      if (token.type === "error") return { type: "error", value: token.value };
      if (token.type === "number" || token.type === "string") {
        return { type: "literal", value: token.value };
      }
      if (token.type === "reference") return { type: "reference", ...token };
      if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
        return { type: "unary", operator: token.value, value: parseExpression(6) };
      }
      if (token.type === "operator" && token.value === "(") {
        const expression = parseExpression(0);
        if (peek()?.value !== ")") throw new FormulaError("Missing closing parenthesis.");
        consume();
        return expression;
      }
      if (token.type === "identifier") {
        if (token.value === "TRUE") return { type: "literal", value: true };
        if (token.value === "FALSE") return { type: "literal", value: false };
        if (peek()?.value !== "(") throw new FormulaError(`Unsupported name: ${token.value}`);
        consume();
        const args = [];
        if (peek()?.value !== ")") {
          while (true) {
            args.push(parseExpression(0));
            if (peek()?.value !== ",") break;
            consume();
          }
        }
        if (peek()?.value !== ")") throw new FormulaError(`Missing closing parenthesis for ${token.value}.`);
        consume();
        return { type: "call", name: token.value, args };
      }
      throw new FormulaError(`Unexpected token: ${token.value}`);
    }

    function parseExpression(minimumPrecedence) {
      let left = parsePrimary();
      while (peek()?.type === "operator") {
        const operator = peek().value;
        const currentPrecedence = precedence[operator];
        if (currentPrecedence === undefined || currentPrecedence < minimumPrecedence) break;
        consume();
        if (operator === "%") {
          left = { type: "postfix", operator, value: left };
          continue;
        }
        const rightPrecedence = operator === "^" ? currentPrecedence : currentPrecedence + 1;
        const right = parseExpression(rightPrecedence);
        left = { type: operator === ":" ? "range" : "binary", operator, left, right };
      }
      return left;
    }

    const expression = parseExpression(0);
    if (cursor !== tokens.length) throw new FormulaError(`Unexpected token: ${tokens[cursor].value}`);
    return expression;
  }

  function asNumber(value) {
    if (isMatrix(value)) throw new FormulaError("A range cannot be used as a single number.");
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === null || value === "") return 0;
    const number = Number(value);
    if (Number.isNaN(number)) throw new FormulaError(`Cannot convert "${value}" to a number.`);
    return number;
  }

  function asBoolean(value) {
    if (isMatrix(value)) throw new FormulaError("A range cannot be used as a single logical value.");
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (value === null || value === "") return false;
    if (typeof value === "string") {
      if (value.toUpperCase() === "TRUE") return true;
      if (value.toUpperCase() === "FALSE") return false;
      throw new FormulaError(`Cannot convert "${value}" to a logical value.`);
    }
    return Boolean(value);
  }

  function scalar(value) {
    return isMatrix(value) ? value.rows[0]?.[0] ?? 0 : value;
  }

  function mapBinary(left, right, operation) {
    if (!isMatrix(left) && !isMatrix(right)) return operation(left, right);
    const leftRows = isMatrix(left) ? left.rows.length : 1;
    const rightRows = isMatrix(right) ? right.rows.length : 1;
    const leftColumns = isMatrix(left) ? (left.rows[0]?.length ?? 0) : 1;
    const rightColumns = isMatrix(right) ? (right.rows[0]?.length ?? 0) : 1;
    const rows = Math.max(leftRows, rightRows);
    const columns = Math.max(leftColumns, rightColumns);
    if (leftRows !== 1 && rightRows !== 1 && leftRows !== rightRows) {
      throw new FormulaError("Array row dimensions do not match.");
    }
    if (leftColumns !== 1 && rightColumns !== 1 && leftColumns !== rightColumns) {
      throw new FormulaError("Array column dimensions do not match.");
    }
    return makeMatrix(Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        const a = isMatrix(left) ? left.rows[leftRows === 1 ? 0 : row][leftColumns === 1 ? 0 : column] : left;
        const b = isMatrix(right) ? right.rows[rightRows === 1 ? 0 : row][rightColumns === 1 ? 0 : column] : right;
        return operation(a, b);
      }),
    ));
  }

  function roundAwayFromZero(value, digits, roundUp) {
    const scale = 10 ** digits;
    const scaled = Math.abs(value) * scale;
    const rounded = roundUp ? Math.ceil(scaled - EPSILON) : Math.floor(scaled + 0.5 + EPSILON);
    return Math.sign(value) * rounded / scale;
  }

  function formatText(value, format) {
    if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "");
    const percent = format.includes("%");
    const number = percent ? value * 100 : value;
    const decimalPart = format.split(".")[1]?.replace(/[^0#].*$/, "") ?? "";
    const digits = decimalPart.length;
    const minimumDigits = (decimalPart.match(/0/g) ?? []).length;
    const grouped = format.includes(",");
    const formatted = new Intl.NumberFormat("en-US", {
      useGrouping: grouped,
      minimumFractionDigits: minimumDigits,
      maximumFractionDigits: digits,
    }).format(number);
    return `${formatted}${percent ? "%" : ""}`;
  }

  class WorkbookEvaluator {
    constructor(model) {
      this.model = model;
      this.overrides = new Map();
      this.cache = new Map();
      this.stack = new Set();
      this.currentSheet = "";
      this.currentAddress = "";
    }

    setCell(sheet, address, value) {
      this.overrides.set(`${sheet}!${address.toUpperCase()}`, value);
      this.cache.clear();
    }

    cellKey(sheet, address) {
      return `${sheet}!${address.toUpperCase()}`;
    }

    readCell(sheet, address) {
      address = address.replace(/\$/g, "").toUpperCase();
      const key = this.cellKey(sheet, address);
      if (this.overrides.has(key)) return this.overrides.get(key);
      if (this.cache.has(key)) return this.cache.get(key);
      if (this.stack.has(key)) throw new FormulaError(`Circular formula reference: ${key}`);
      const cell = this.model.sheets[sheet]?.[address.toUpperCase()];
      if (!cell) return 0;
      if (!Object.prototype.hasOwnProperty.call(cell, "f") && !cell.g) return cell.v ?? 0;
      this.stack.add(key);
      const previousSheet = this.currentSheet;
      const previousAddress = this.currentAddress;
      this.currentSheet = sheet;
      this.currentAddress = address;
      try {
        const shared = cell.g ? this.model.sharedFormulas[cell.g] : null;
        if (cell.g && !shared) throw new FormulaError(`Shared formula group is missing: ${cell.g}`);
        const formula = shared
          ? translateSharedFormula(shared.formula, shared.address, address)
          : cell.f;
        try {
          const value = this.evaluate(parseFormula(formula));
          this.cache.set(key, value);
          return value;
        } catch (error) {
          throw new FormulaError(`${error.message} at ${key}.`);
        }
      } finally {
        this.currentSheet = previousSheet;
        this.currentAddress = previousAddress;
        this.stack.delete(key);
      }
    }

    readReference(reference) {
      return this.readCell(reference.sheet ?? this.currentSheet, reference.address);
    }

    readRange(left, right) {
      const sheet = right.sheet ?? left.sheet ?? this.currentSheet;
      if (left.sheet && right.sheet && left.sheet !== right.sheet) {
        throw new FormulaError("3-D ranges are not supported.");
      }
      const start = parseAddress(left.address);
      const end = parseAddress(right.address);
      const rows = [];
      for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row++) {
        const values = [];
        for (let column = Math.min(start.column, end.column); column <= Math.max(start.column, end.column); column++) {
          values.push(this.readCell(sheet, `${columnLetters(column)}${row}`));
        }
        rows.push(values);
      }
      return makeMatrix(rows);
    }

    evaluate(node) {
      if (node.type === "error") throw new FormulaError(node.value);
      if (node.type === "literal") {
        return node.value;
      }
      if (node.type === "reference") return this.readReference(node);
      if (node.type === "range") {
        if (node.left.type !== "reference" || node.right.type !== "reference") {
          throw new FormulaError("Range endpoints must be cell references.");
        }
        return this.readRange(node.left, node.right);
      }
      if (node.type === "postfix") return asNumber(this.evaluate(node.value)) / 100;
      if (node.type === "unary") {
        const value = this.evaluate(node.value);
        return mapBinary(value, 0, (a) => node.operator === "-" ? -asNumber(a) : asNumber(a));
      }
      if (node.type === "binary") {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);
        return mapBinary(left, right, (a, b) => this.binaryOperation(node.operator, a, b));
      }
      return this.evaluateCall(node);
    }

    binaryOperation(operator, left, right) {
      if (operator === "&") return `${left ?? ""}${right ?? ""}`;
      if (["=", "<>", "<", ">", "<=", ">="].includes(operator)) {
        const a = typeof left === "string" ? left.toUpperCase() : asNumber(left);
        const b = typeof right === "string" ? right.toUpperCase() : asNumber(right);
        if (operator === "=") return a === b;
        if (operator === "<>") return a !== b;
        if (operator === "<") return a < b;
        if (operator === ">") return a > b;
        if (operator === "<=") return a <= b;
        return a >= b;
      }
      const a = asNumber(left);
      const b = asNumber(right);
      if (operator === "+") return a + b;
      if (operator === "-") return a - b;
      if (operator === "*") return a * b;
      if (operator === "/") {
        if (b === 0) throw new FormulaError("#DIV/0!");
        return a / b;
      }
      if (operator === "^") return a ** b;
      throw new FormulaError(`Unsupported operator: ${operator}`);
    }

    evaluateCall(node) {
      const evaluateAll = () => node.args.map((argument) => this.evaluate(argument));
      const first = () => node.args.length ? this.evaluate(node.args[0]) : 0;
      switch (node.name) {
        case "IF": {
          const condition = first();
          if (isMatrix(condition)) {
            return mapBinary(condition, 0, (value) => asBoolean(value)
              ? (node.args[1] ? this.evaluate(node.args[1]) : true)
              : (node.args[2] ? this.evaluate(node.args[2]) : false));
          }
          return asBoolean(condition)
            ? (node.args[1] ? this.evaluate(node.args[1]) : true)
            : (node.args[2] ? this.evaluate(node.args[2]) : false);
        }
        case "IFERROR":
          try { return first(); } catch { return node.args[1] ? this.evaluate(node.args[1]) : ""; }
        case "AND":
          return evaluateAll().flatMap(flatten).every(asBoolean);
        case "OR":
          return evaluateAll().flatMap(flatten).some(asBoolean);
        case "SUM":
        case "SUMPRODUCT": {
          const args = evaluateAll();
          if (node.name === "SUM") {
            return args.flatMap(flatten).reduce((sum, value) =>
              sum + (typeof value === "boolean" ? 0 : Number(value) || 0), 0);
          }
          const arrays = args.map(flatten);
          if (!arrays.length) return 0;
          const length = Math.max(...arrays.map((values) => values.length));
          if (arrays.some((values) => values.length !== 1 && values.length !== length)) {
            throw new FormulaError("SUMPRODUCT array dimensions do not match.");
          }
          let sum = 0;
          for (let index = 0; index < length; index++) {
            let product = 1;
            for (const values of arrays) {
              const value = values[values.length === 1 ? 0 : index];
              product *= typeof value === "boolean" ? (value ? 1 : 0) : (Number(value) || 0);
            }
            sum += product;
          }
          return sum;
        }
        case "MIN": {
          const values = evaluateAll().flatMap(flatten).map(asNumber);
          return values.length ? Math.min(...values) : 0;
        }
        case "MAX": {
          const values = evaluateAll().flatMap(flatten).map(asNumber);
          return values.length ? Math.max(...values) : 0;
        }
        case "ABS": return mapBinary(first(), 0, (value) => Math.abs(asNumber(value)));
        case "SQRT": {
          return mapBinary(first(), 0, (raw) => {
            const value = asNumber(raw);
            if (value < 0) throw new FormulaError("#NUM!");
            return Math.sqrt(value);
          });
        }
        case "LN": {
          return mapBinary(first(), 0, (raw) => {
            const value = asNumber(raw);
            if (value <= 0) throw new FormulaError("#NUM!");
            return Math.log(value);
          });
        }
        case "PI": return Math.PI;
        case "ROUND": return roundAwayFromZero(asNumber(first()), asNumber(this.evaluate(node.args[1])), false);
        case "ROUNDUP": return roundAwayFromZero(asNumber(first()), asNumber(this.evaluate(node.args[1])), true);
        case "CEILING":
        case "FLOOR": {
          const value = asNumber(first());
          const significance = asNumber(this.evaluate(node.args[1]));
          if (significance === 0) return 0;
          const quotient = value / significance;
          return (node.name === "CEILING" ? Math.ceil(quotient - EPSILON) : Math.floor(quotient + EPSILON)) * significance;
        }
        case "TEXT": return formatText(scalar(first()), String(this.evaluate(node.args[1])));
        case "T": {
          const value = scalar(first());
          return typeof value === "string" ? value : "";
        }
        case "COLUMN": {
          if (!node.args.length) return parseAddress(this.currentAddress).column;
          const reference = node.args[0];
          if (reference.type === "reference") return parseAddress(reference.address).column;
          if (reference.type === "range") return parseAddress(reference.left.address).column;
          throw new FormulaError("COLUMN expects a reference.");
        }
        case "INDEX": {
          const data = this.evaluate(node.args[0]);
          const matrix = isMatrix(data) ? data.rows : [[data]];
          const row = Math.max(0, Math.trunc(asNumber(this.evaluate(node.args[1]))));
          const column = node.args[2] ? Math.max(0, Math.trunc(asNumber(this.evaluate(node.args[2])))) : 1;
          if (row === 0 && column === 0) return makeMatrix(matrix);
          if (row === 0) return makeMatrix(matrix.map((values) => [values[column - 1] ?? 0]));
          if (column === 0) return makeMatrix([matrix[row - 1] ?? []]);
          const value = matrix[row - 1]?.[column - 1];
          if (value === undefined) throw new FormulaError("#REF!");
          return value;
        }
        case "MATCH": {
          const lookup = scalar(this.evaluate(node.args[0]));
          const source = flatten(this.evaluate(node.args[1]));
          const matchType = node.args[2] ? asNumber(this.evaluate(node.args[2])) : 1;
          if (matchType === 0) {
            const index = source.findIndex((value) => value === lookup);
            if (index < 0) throw new FormulaError("#N/A");
            return index + 1;
          }
          let candidate = -1;
          for (let index = 0; index < source.length; index++) {
            const comparison = typeof lookup === "string"
              ? String(source[index]).localeCompare(lookup, undefined, { sensitivity: "base" })
              : asNumber(source[index]) - asNumber(lookup);
            if ((matchType > 0 && comparison <= 0) || (matchType < 0 && comparison >= 0)) candidate = index;
            else if (matchType > 0) break;
          }
          if (candidate < 0) throw new FormulaError("#N/A");
          return candidate + 1;
        }
        case "COUNTIF":
          return flatten(this.evaluate(node.args[0])).filter((value) =>
            matchesCriteria(value, this.evaluate(node.args[1]))).length;
        case "SUMIF": {
          const criteriaValues = flatten(this.evaluate(node.args[0]));
          const criteria = this.evaluate(node.args[1]);
          const sums = node.args[2] ? flatten(this.evaluate(node.args[2])) : criteriaValues;
          return criteriaValues.reduce((sum, value, index) =>
            sum + (matchesCriteria(value, criteria) ? (Number(sums[index]) || 0) : 0), 0);
        }
        default: throw new FormulaError(`Unsupported Excel function: ${node.name}`);
      }
    }
  }

  function matchesCriteria(value, criterionValue) {
    const criterion = String(criterionValue ?? "");
    const operatorMatch = /^(<=|>=|<>|=|<|>)(.*)$/.exec(criterion);
    const operator = operatorMatch?.[1] ?? "=";
    const expected = operatorMatch ? operatorMatch[2] : criterion;
    if (expected.includes("*") || expected.includes("?")) {
      const escaped = expected.replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*").replace(/\?/g, ".");
      const matched = new RegExp(`^${escaped}$`, "i").test(String(value ?? ""));
      return operator === "<>" ? !matched : matched;
    }
    const numericExpected = Number(expected);
    const numericValue = Number(value);
    const comparable = !Number.isNaN(numericExpected) && !Number.isNaN(numericValue)
      ? [numericValue, numericExpected]
      : [String(value ?? "").toUpperCase(), expected.toUpperCase()];
    if (operator === "=") return comparable[0] === comparable[1];
    if (operator === "<>") return comparable[0] !== comparable[1];
    if (operator === "<") return comparable[0] < comparable[1];
    if (operator === ">") return comparable[0] > comparable[1];
    if (operator === "<=") return comparable[0] <= comparable[1];
    return comparable[0] >= comparable[1];
  }

  function displayValue(value, cell) {
    if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "");
    const formats = {
      "EC 2 Column!C377": [3, 3],
      "EC 2 Column!C379": [0, 3],
      "EC 2 Column!C380": [1, 1],
    };
    const format = formats[cell];
    if (format) return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: format[0],
      maximumFractionDigits: format[1],
    }).format(value);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
  }

  function getCell(evaluator, sheet, address) {
    return evaluator.readCell(sheet, address);
  }

  const calculationSections = [
    {
      title: "Section and material properties",
      description: "Section area, design strengths, strain parameters, cover and axial-load ratio.",
      rows: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75],
    },
    {
      title: "Effective length and slenderness",
      description: "Effective lengths and slenderness are evaluated independently about both column axes.",
      axes: true,
      rows: [80, 81, 82, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98],
    },
    {
      title: "Eccentricity and first-order moments",
      description: "Minimum eccentricity, equivalent end moment and member imperfection establish the first-order design moments.",
      axes: true,
      rows: [104, 105, 106, 107, 108, 109, 110, 111, 112],
    },
    {
      title: "Required longitudinal reinforcement",
      description: "The engine searches reinforcement ratios against axial-flexural resistance and second-order effects.",
      rows: [116, 117, 118, 121, 122, 123, 124, 126, 127, 128, 129, 197, 198],
      axisRows: [121, 122, 123, 124, 126, 127, 128],
    },
    {
      title: "Provided bar arrangement",
      description: "The selected arrangement is checked against required steel area and minimum clear spacing.",
      rows: [202, 219, 220, 221, 222, 223, 224, 238, 240, 241],
      axisRows: [240, 241],
    },
    {
      title: "Verification with the provided reinforcement",
      description: "Actual reinforcement is used to recalculate second-order moments, section capacities and combined bending checks.",
      axes: true,
      rows: [246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 263, 264, 265, 266, 267],
    },
    {
      title: "Detailing, anchorage and laps",
      description: "Cover, bar limits, spacing, restraint and anchorage/lap lengths are checked against the selected detailing inputs.",
      rows: [270, 271, 272, 273, 274, 275, 276, 277, 279, 280, 281, 282, 283, 284],
    },
    {
      title: "Links and shear resistance",
      description: "Link spacing and end zones are detailed; concrete and link shear resistances are checked about both axes.",
      rows: [288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317],
      axisRows: [304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317],
    },
    {
      title: "Reinforcement schedule and quantities",
      description: "The final bar marks and material quantities are taken from the completed design.",
      rows: [346, 347, 348, 349, 350, 377, 379, 380],
    },
  ];

  async function createEngine() {
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error(`Could not load the standalone design model (${response.status}).`);
    const model = await response.json();
    if (model.formatVersion !== 1) throw new Error("The standalone design model version is not supported.");
    return {
      calculate(inputs, titleBlock) {
        const evaluator = new WorkbookEvaluator(model);
        const cellInputs = {
          width: "C13", depth: "C14", clearHeight: "C15", floorLift: "C16",
          nominalCover: "C17", mainBarDiameter: "C18", linkDiameter: "C19",
          aggregateSize: "C20", columnCount: "C21", concreteStrength: "C23",
          steelYield: "C24", gammaConcrete: "C25", gammaSteel: "C26", alphaCc: "C27",
          axialLoad: "C29", momentYMajor: "C30", momentYMinor: "C31", shearY: "C32",
          momentZMajor: "C33", momentZMinor: "C34", shearZ: "C35", structure: "C37",
          effectiveLengthMethod: "C38", endYTop: "C39", endYBottom: "C40",
          endZTop: "C41", endZBottom: "C42", k1Y: "C43", k2Y: "C44",
          k1Z: "C45", k2Z: "C46", creepCoefficient: "C48",
          quasiPermanentRatio: "C49", curvatureFactor: "C50", barSelection: "C52",
          barsOnBFace: "C53", barsOnHFace: "C54", cotTheta: "C55",
          linkReduction: "C56", lapFactor: "C57",
        };
        for (const [key, address] of Object.entries(cellInputs)) {
          if (!(key in inputs)) throw new Error(`Missing design input: ${key}.`);
          const value = ["endYTop", "endYBottom", "endZTop", "endZBottom"].includes(key)
            ? Number(inputs[key])
            : inputs[key];
          evaluator.setCell("EC 2 Column", address, value);
        }
        const titleCells = {
          projectTitle: "C2", jobGroup: "G2", columnReference: "H2", revision: "J2",
          designBy: "C8", designDate: "D8", checkedBy: "E8", checkDate: "F8",
          sheetNumber: "G8", jobReference: "H8",
        };
        for (const [key, address] of Object.entries(titleCells)) {
          evaluator.setCell("EC 2 Column", address, titleBlock?.[key] ?? "");
        }

        const summaryCells = [
          ["Section / cover / links", "C321"], ["Clear / effective length", "C322"],
          ["Concrete / steel", "C323"], ["Ultimate design actions", "C324"],
          ["Slenderness classification", "C325"], ["Design moments", "C326"],
          ["Required / provided reinforcement", "C327"], ["Moment resistance", "C328"],
          ["Main bars", "C346"], ["Links - end zones", "C347"],
          ["Links - middle zone", "C348"], ["Reinforcement tonnage", "C377"],
          ["Concrete volume", "C379"], ["Steel intensity", "C380"],
        ];
        const summary = summaryCells.map(([label, address]) => ({
          label,
          value: displayValue(getCell(evaluator, "EC 2 Column", address), `EC 2 Column!${address}`),
        }));
        const checks = [];
        for (let row = 331; row <= 343; row++) {
          const name = getCell(evaluator, "EC 2 Column", `B${row}`);
          if (name !== "" && name !== 0 && name !== null) {
            checks.push({
              name: displayValue(name),
              demand: displayValue(getCell(evaluator, "EC 2 Column", `C${row}`)),
              capacity: displayValue(getCell(evaluator, "EC 2 Column", `D${row}`)),
              ratio: displayValue(getCell(evaluator, "EC 2 Column", `E${row}`)),
              status: displayValue(getCell(evaluator, "EC 2 Column", `F${row}`)),
            });
          }
        }
        const calculationSteps = calculationSections.map((section) => ({
          title: section.title,
          description: section.description,
          rows: section.rows.flatMap((row) => {
            const label = getCell(evaluator, "EC 2 Column", `B${row}`);
            if (typeof label !== "string" || !label.trim()) return [];
            const formulaCell = (column) => {
              const cell = model.sheets["EC 2 Column"]?.[`${column}${row}`];
              return Boolean(cell && (Object.prototype.hasOwnProperty.call(cell, "f") || cell.g));
            };
            const readValue = (column) => {
              const value = getCell(evaluator, "EC 2 Column", `${column}${row}`);
              return value === "" || value === null ? "" : displayValue(value, `EC 2 Column!${column}${row}`);
            };
            const primary = readValue("C");
            const secondary = readValue("D");
            const isAxisRow = section.axes || section.axisRows?.includes(row);
            const data = isAxisRow
              ? { value: formulaCell("C") ? `y-y: ${primary}` : "", secondaryValue: formulaCell("D") ? `z-z: ${secondary}` : "" }
              : { value: formulaCell("C") || primary !== "" ? primary : "" };
            const unit = getCell(evaluator, "EC 2 Column", `D${row}`);
            if (!isAxisRow && !formulaCell("D") && typeof unit === "string" && unit.length < 20) {
              data.unit = unit;
            }
            if (!data.value && !data.secondaryValue) return [];
            return [{ label: label.trim(), ...data }];
          }),
        }));
        return {
          status: getCell(evaluator, "EC 2 Column", "F344"),
          summary,
          checks,
          calculationSteps,
        };
      },
    };
  }

  window.StructoriaColumnEngineReady = createEngine();
})();
