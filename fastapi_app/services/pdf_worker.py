"""Isolated command-line PDF parser. No application config, secrets or providers."""
import io
import os
import sys


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
        if reader.is_encrypted or len(reader.pages) > int(sys.argv[1]):
            raise ValueError('PDF encrypted or too many pages')
        chunks, remaining = [], 15000
        for page in reader.pages:
            chunk = (page.extract_text() or '')[:remaining]
            chunks.append(chunk)
            remaining -= len(chunk)
            if remaining <= 0:
                break
        sys.stdout.buffer.write('\n'.join(chunks).encode('utf-8'))
    except Exception:
        sys.exit(2)
