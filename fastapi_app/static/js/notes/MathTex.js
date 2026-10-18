// Syntax shared by symbol and number annotation. TeX arguments consume one
// token when braces are omitted; generated HTML annotations must stay inside
// that argument, and dimensions/text must never become mathematical targets.
/** @type {Map<string, string[]>} */
const ARGUMENTS = new Map();
/** @type {Array<[string, string[]]>} */
const ARGUMENT_ENTRIES = [
    ['frac dfrac tfrac cfrac binom dbinom tbinom overset underset stackrel stackbin', ['math', 'math']],
    ['sqrt mathbf mathit mathrm mathcal mathbb mathsf mathtt boldsymbol vec hat bar overline underline tilde dot ddot acute grave breve check ring widehat widetilde overrightarrow overleftarrow overleftrightarrow underrightarrow underleftarrow underleftrightarrow overbrace underbrace overgroup undergroup overlinesegment underlinesegment mathord mathbin mathrel mathop mathopen mathclose mathpunct mathinner phantom hphantom vphantom smash boxed fbox llap rlap clap mathllap mathrlap mathclap', ['math']],
    ['text textrm textbf textit textnormal textsf texttt textup textmd textsuperscript textsubscript operatorname begin end color url', ['raw']],
    ['hspace vspace kern mkern hskip mskip', ['size']],
    ['textcolor colorbox href htmlClass htmlId htmlStyle htmlData', ['raw', 'math']],
    ['fcolorbox', ['raw', 'raw', 'math']],
    ['raisebox', ['size', 'math']],
    ['rule', ['size', 'size']],
    ['genfrac', ['raw', 'raw', 'raw', 'raw', 'math', 'math']],
    ['mathchoice', ['math', 'math', 'math', 'math']],
];
for (const names of ARGUMENT_ENTRIES) for (const name of names[0].split(' ')) ARGUMENTS.set(name, names[1]);

class MathTex {
    /** @param {string} text @param {number} start */
    static groupEnd(text, start) {
        const close = text[start] === '{' ? '}' : text[start] === '[' ? ']' : null;
        if (!close) return start;
        let depth = 0;
        for (let i = start; i < text.length; i++) {
            if (text[i] === '\\') { i++; continue; }
            if (text[i] === text[start]) depth++;
            if (text[i] === close && --depth === 0) return i + 1;
        }
        return start;
    }

    /** @param {string} text @param {number} start */
    static argumentEnd(text, start) {
        const group = this.groupEnd(text, start);
        if (group > start) return group;
        const token = text.slice(start).match(/^(?:\\(?:[A-Za-z]+|.)|[^\s{}])/);
        if (!token) return start;
        let end = start + token[0].length;
        // A generated annotation represents the original token, not a new TeX
        // function that can be used as a bare argument on its own.
        if (token[0] === '\\htmlData') {
            for (let arg = 0; arg < 2; arg++) {
                while (/\s/.test(text[end] || '') && end < text.length) end++;
                const next = this.groupEnd(text, end);
                if (next === end) break;
                end = next;
            }
        }
        return end;
    }

    /** @param {string} text */
    static scan(text) {
        const groups = [], ignored = [];
        for (let i = 0; i < text.length;) {
            if (text[i] === '_' || text[i] === '^') {
                let start = i + 1;
                while (/\s/.test(text[start] || '') && start < text.length) start++;
                const end = this.argumentEnd(text, start);
                if (end > start && text[start] !== '{') groups.push({start, end});
            }
            if (text[i] === '%') {
                const end = text.indexOf('\n', i);
                const next = end < 0 ? text.length : end;
                ignored.push({start: i, end: next}); i = next; continue;
            }
            const command = text[i] === '\\' && text.slice(i).match(/^\\([A-Za-z]+|.)/);
            if (!command) { i++; continue; }
            const name = command[1];
            i += command[0].length;
            let cursor = i;
            const spaces = () => {
                while (cursor < text.length) {
                    if (/\s/.test(text[cursor])) cursor++;
                    else if (text[cursor] === '%') {
                        const newline = text.indexOf('\n', cursor);
                        cursor = newline < 0 ? text.length : newline + 1;
                    } else break;
                }
            };
            spaces();
            if (['sqrt', 'cfrac', 'smash', 'rule', '\\'].includes(name) && text[cursor] === '[') {
                const end = this.groupEnd(text, cursor);
                if (end > cursor) { ignored.push({start: cursor, end}); cursor = end; i = end; }
            }
            for (const kind of ARGUMENTS.get(name) || []) {
                spaces();
                const size = kind === 'size' && text.slice(cursor).match(/^[+-]?\s*(?:\d+(?:\.\d*)?|\.\d+)\s*(?:pt|mm|cm|in|ex|em|mu|bp|pc|dd|cc|nd|nc|sp|px)/i);
                const end = size ? cursor + size[0].length : this.argumentEnd(text, cursor);
                if (end === cursor) break;
                if (kind !== 'math') {
                    ignored.push({start: cursor, end});
                    i = end;
                } else if (text[cursor] !== '{') groups.push({start: cursor, end});
                cursor = end;
            }
        }
        return {groups, ignored};
    }

    /** @param {string} text */
    static groupArguments(text) {
        const {groups} = this.scan(text);
        const opens = new Set(groups.map(group => group.start));
        const closes = new Set(groups.map(group => group.end));
        let result = '';
        for (let i = 0; i <= text.length; i++) {
            if (closes.has(i)) result += '}';
            if (opens.has(i)) result += '{';
            if (i < text.length) result += text[i];
        }
        return result;
    }
}

export default MathTex;
