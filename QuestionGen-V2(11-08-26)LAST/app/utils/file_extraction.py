import io
from fastapi import UploadFile

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except ImportError:
        return "pypdf is not installed. Cannot extract PDF text."
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except ImportError:
        return "python-docx is not installed. Cannot extract DOCX text."
    except Exception as e:
        return f"Error extracting DOCX: {str(e)}"

async def extract_jd_text(jd_file: UploadFile) -> str:
    """
    Reads the uploaded file's bytes, extracts text based on its content type or extension,
    and resets the file cursor to 0 so it can be uploaded or processed further.
    """
    if not jd_file or not jd_file.filename:
        return ""

    file_bytes = await jd_file.read()
    
    # reset cursor for downstream usage (e.g. azure blob upload)
    await jd_file.seek(0)
    
    filename = jd_file.filename.lower()
    
    if filename.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif filename.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    elif filename.endswith(".txt") or filename.endswith(".md"):
        return file_bytes.decode("utf-8", errors="replace")
    else:
        # Fallback decode
        return file_bytes.decode("utf-8", errors="replace")
