"""Isolated command-line PDF parser. No application config, secrets or providers."""
import io
import os
import sys
import json


class SourcePagesError(ValueError):
    """A requested range must not fall back to an unrelated source excerpt."""


def extract_pages(reader, max_pages, options=None):
    if reader.is_encrypted:
        raise ValueError('Encrypted PDF')
    requested = options.get('pages') if options else None
    start, end = requested if requested else (1, len(reader.pages))
    if requested and (start < 1 or end < start or end > len(reader.pages)):
        raise SourcePagesError('Requested PDF pages do not exist')
    if end - start + 1 > max_pages:
        raise ValueError('Too many PDF pages')
    chunks, remaining = [], options['max_chars'] if options else 15000
    for index in range(start - 1, end):
        chunk = reader.pages[index].extract_text() or ''
        if options:
            # Separators count too. At exactly the limit, inspect subsequent
            # pages instead of silently accepting only a prefix of the source.
            remaining -= len(chunk) + (1 if chunks else 0)
            if remaining < 0:
                raise OverflowError('Source text exceeds the character limit')
        else:
            chunk = chunk[:remaining]
            remaining -= len(chunk)
        chunks.append(chunk)
        if not options and remaining <= 0:
            break
    return '\n'.join(chunks)


def limit_memory(limit):
    if os.name != 'nt':
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
        return None
    import ctypes as c
    from ctypes import wintypes as w

    class Basic(c.Structure):
        _fields_ = [('process_time', c.c_int64), ('job_time', c.c_int64), ('flags', w.DWORD),
                    ('min_ws', c.c_size_t), ('max_ws', c.c_size_t), ('active', w.DWORD),
                    ('affinity', c.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]

    class IO(c.Structure):
        _fields_ = [(name, c.c_uint64) for name in ('read_ops', 'write_ops', 'other_ops', 'read_bytes', 'write_bytes', 'other_bytes')]

    class Extended(c.Structure):
        _fields_ = [('basic', Basic), ('io', IO), ('process_memory', c.c_size_t),
                    ('job_memory', c.c_size_t), ('peak_process', c.c_size_t), ('peak_job', c.c_size_t)]

    kernel = c.WinDLL('kernel32', use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [c.c_void_p, w.LPCWSTR]
    kernel.CreateJobObjectW.restype = w.HANDLE
    kernel.SetInformationJobObject.argtypes = [w.HANDLE, c.c_int, c.c_void_p, w.DWORD]
    kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
    kernel.GetCurrentProcess.restype = w.HANDLE
    job = kernel.CreateJobObjectW(None, None)
    info = Extended()
    info.basic.flags = 0x100  # JOB_OBJECT_LIMIT_PROCESS_MEMORY
    info.process_memory = limit
    if not job or not kernel.SetInformationJobObject(job, 9, c.byref(info), c.sizeof(info)):
        raise OSError('Cannot configure PDF memory limit')
    if not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        raise OSError('Cannot enforce PDF memory limit')
    return job  # retained until this short-lived process exits


if __name__ == '__main__':
    try:
        job = limit_memory(int(sys.argv[2]))
        from pypdf import PdfReader
        data = sys.stdin.buffer.read(int(sys.argv[3]) + 1)
        if len(data) > int(sys.argv[3]) or not data.startswith(b'%PDF-'):
            raise ValueError('Invalid PDF')
        reader = PdfReader(io.BytesIO(data), strict=True)
        options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
        text = extract_pages(reader, int(sys.argv[1]), options)
        sys.stdout.buffer.write(text.encode('utf-8'))
    except SourcePagesError:
        sys.exit(4)
    except OverflowError:
        sys.exit(3)
    except Exception:
        sys.exit(2)
