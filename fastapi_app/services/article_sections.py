"""Resolve a linked HTML section before any source text reaches the model."""
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
import re
from urllib.parse import parse_qs, unquote, urlsplit

from fastapi import HTTPException


def source_selection(url, selection='', quote=''):
    if selection.strip():
        return selection.strip()
    if urlsplit(url).fragment:
        return ''  # A precise link takes precedence over a description of the source.
    match = re.search(r'(?:раздел\w*|глав\w*|страниц\w*|стр\.|sections?|chapters?|pages?)\s+(\d+(?:\.\d+)*(?:\s*[–—-]\s*\d+(?:\.\d+)*)?)',
                      quote, flags=re.I)
    return match[1] if match else ''


@dataclass
class _Node:
    tag: str
    attrs: dict
    start: int
    end: int
    parent: object = None


class _Sections(HTMLParser):
    void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, body):
        super().__init__(convert_charrefs=True)
        self.body, self.nodes, self.stack = body, [], []
        self.lines = [0] + [match.end() for match in re.finditer('\n', body)]
        self.feed(body)
        self.close()

    def source_offset(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        node = _Node(tag, dict(attrs), self.source_offset(), len(self.body), self.stack[-1] if self.stack else None)
        self.nodes.append(node)
        if tag not in self.void:
            self.stack.append(node)
        else:
            node.end = node.start + len(self.get_starttag_text())

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index].tag == tag:
                end = self.body.find('>', self.source_offset()) + 1
                for node in self.stack[index:]:
                    node.end = end
                del self.stack[index:]
                break

    @staticmethod
    def heading(node):
        return bool(re.fullmatch(r'h[1-6]', node.tag))

    def heading_text(self, node):
        return unescape(re.sub('<[^>]*>', '', self.body[node.start:node.end])).strip()

    def through_heading(self, first, last=None):
        last = last or first
        end = next((node.start for node in self.nodes if node.start > last.start
                    and self.heading(node) and node.tag <= last.tag), len(self.body))
        return self.body[first.start:end]

    def anchor(self, fragment):
        target = next((node for node in self.nodes if fragment in (node.attrs.get('id'), node.attrs.get('name'))), None)
        if target is None:
            raise HTTPException(422, 'Раздел по якорю ссылки не найден. Уточните ссылку или номер раздела.')
        parent = target
        while parent:
            if self.heading(parent):
                return self.through_heading(parent)
            parent = parent.parent
        if target.tag in {'a', 'span'}:
            following = next((node for node in self.nodes if node.start >= target.end and self.heading(node)), None)
            if following and not re.sub('<[^>]*>', '', self.body[target.end:following.start]).strip():
                return self.through_heading(following)
        return self.body[target.start:target.end]

    def numbered(self, selection):
        cleaned = re.sub(r'^(?:раздел\w*|глав\w*|sections?|chapters?)\s+', '', selection, flags=re.I).strip()
        numbers = re.fullmatch(r'(\d+(?:\.\d+)*)(?:\s*[–—-]\s*(\d+(?:\.\d+)*))?\.?', cleaned)
        headings = [node for node in self.nodes if self.heading(node)]
        if numbers:
            def number(node):
                match = re.match(r'(?:глава\s+|chapter\s+)?(\d+(?:\.\d+)*)', self.heading_text(node), flags=re.I)
                return match[1] if match else None
            first = next((node for node in headings if number(node) == numbers[1]), None)
            last = next((node for node in headings if number(node) == (numbers[2] or numbers[1])
                         and first and node.start >= first.start), None)
        else:
            first = next((node for node in headings if self.heading_text(node).rstrip('¶# ').casefold() == cleaned.casefold()), None)
            last = first
        if not first or not last:
            raise HTTPException(422, 'Указанный раздел не найден в тексте. Проверьте номер или заголовок раздела.')
        return self.through_heading(first, last)


def select_html(body, url, selection=''):
    fragment = unquote(urlsplit(url).fragment)
    if fragment:
        body = _Sections(body).anchor(fragment)
    if selection:
        sections = _Sections(body)
        body = sections.anchor(selection[1:]) if selection.startswith('#') else sections.numbered(selection)
    return body


def pdf_pages(url, selection=''):
    fragment = unquote(urlsplit(url).fragment)
    page = parse_qs(fragment).get('page', [''])[0]
    value = selection or page
    if not value and not fragment:
        return None
    match = re.fullmatch(r'(?:(?:страниц\w*|стр\.?|pages?|pp?\.?)\s*)?(\d+)(?:\s*[–—-]\s*(\d+))?', value, flags=re.I)
    if not match or int(match[1]) < 1 or int(match[2] or match[1]) < int(match[1]):
        raise HTTPException(422, 'Для PDF укажите страницы, например «стр. 12–16» или ссылку с #page=12.')
    return [int(match[1]), int(match[2] or match[1])]
