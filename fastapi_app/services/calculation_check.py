"""Bounded exact numeric checks; unsupported symbolic/approximate TeX stays unverified."""
import ast
from fractions import Fraction
import re


def _group(text, start):
    while start < len(text) and text[start].isspace():
        start += 1
    if start >= len(text) or text[start] != '{':
        raise ValueError('A braced fraction argument is required')
    depth = 1
    for end in range(start + 1, len(text)):
        depth += (text[end] == '{') - (text[end] == '}')
        if depth == 0:
            return text[start + 1:end], end + 1
    raise ValueError('Unclosed fraction')


def _expression(text, depth=0):
    if depth > 16 or len(text) > 4000:
        raise ValueError('Arithmetic limit')
    while match := re.search(r'\\(?:dfrac|tfrac|frac)\b', text):
        numerator, end = _group(text, match.end())
        denominator, end = _group(text, end)
        replacement = f'(({_expression(numerator, depth + 1)})/({_expression(denominator, depth + 1)}))'
        text = text[:match.start()] + replacement + text[end:]
    text = re.sub(r'\\(?:left|right|displaystyle|textstyle)\b', '', text)
    text = re.sub(r'\\(?:cdot|times)\b', '*', text)
    text = re.sub(r'\\div\b', '/', text)
    text = re.sub(r'\\[,;! ]', '', text).replace('−', '-').replace('·', '*')
    text = text.replace('{', '(').replace('}', ')').replace('^', '**').strip().rstrip('.,;')
    text = re.sub(r'(?<=[\d)])\s*(?=\()', '*', text)
    if not re.fullmatch(r'[\d\s.eE+*/()\-]+', text) or len(text) > 4000:
        raise ValueError('Not supported numeric arithmetic')
    return text


def numeric_value(tex):
    text = _expression(tex)
    tree = ast.parse(text, mode='eval')
    if sum(1 for _ in ast.walk(tree)) > 300:
        raise ValueError('Arithmetic limit')

    def evaluate(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            literal = ast.get_source_segment(text, node)
            exponent = re.search(r'[eE]([+-]?\d+)', literal)
            if len(literal) > 256 or (exponent and abs(int(exponent[1])) > 256):
                raise ValueError('Arithmetic limit')
            value = Fraction(literal)
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = evaluate(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
            left, right = evaluate(node.left), evaluate(node.right)
            if isinstance(node.op, ast.Pow):
                if right.denominator != 1 or abs(right) > 64:
                    raise ValueError('Unsupported exponent')
                value = left ** int(right)
            elif isinstance(node.op, ast.Add):
                value = left + right
            elif isinstance(node.op, ast.Sub):
                value = left - right
            elif isinstance(node.op, ast.Mult):
                value = left * right
            else:
                value = left / right
        else:
            raise ValueError('Unsupported arithmetic node')
        if value.numerator.bit_length() > 4096 or value.denominator.bit_length() > 4096:
            raise ValueError('Arithmetic limit')
        return value

    return evaluate(tree.body)


def fraction_tex(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else rf'\frac{{{value.numerator}}}{{{value.denominator}}}'


def check_equalities(formula):
    if len(formula) > 20_000:
        return []
    formula = re.sub(r'\\(?:begin|end)\{(?:aligned|align\*?|equation\*?|gathered)\}', '', formula)
    formula = re.sub(r'\\\\\s*&?\s*(?==)', '', formula)
    checks = []
    for row in formula.split('\\\\'):
        if r'\approx' in row or '≈' in row:
            continue
        parts = re.split(r'(?<![<>!])=(?!=)', row.replace('&', ''))
        for left, right in zip(parts, parts[1:]):
            try:
                before, after = numeric_value(left.strip()), numeric_value(right.strip())
            except (ValueError, SyntaxError, ArithmeticError, RecursionError):
                continue
            checks.append({'left': left.strip(), 'right': right.strip(),
                           'left_value': str(before), 'right_value': str(after),
                           'status': 'equal' if before == after else 'mismatch'})
            if len(checks) >= 20:
                return checks
    return checks


def mismatch_notice(checks, locale):
    mismatches = [check for check in checks if check['status'] == 'mismatch']
    if not mismatches:
        return ''
    label = ('Exact arithmetic check: the input equality is incorrect.' if locale in ('en', 'английском')
             else 'Дәл арифметикалық тексеру: бастапқы теңдік қате.' if locale in ('kz', 'казахском')
             else 'Точная проверка арифметики: в исходном равенстве ошибка.')
    lines = [f'**{label}**']
    for check in mismatches:
        lines.append(f"$${check['left']} = {fraction_tex(check['left_value'])} \\ne {check['right']}$$")
    return '\n\n'.join(lines) + '\n\n'
