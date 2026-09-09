from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from shared.email.schema import EmailTemplate

BASE_DIR = Path(__file__).parent / "templates"

env = Environment(loader=FileSystemLoader(BASE_DIR))


def load_subject(template_name: EmailTemplate) -> str:
    subject_file = BASE_DIR / template_name / "subject.txt"
    return subject_file.read_text().strip()


def render_html(template_name: EmailTemplate, **context) -> str:
    template = env.get_template(f"{template_name}/html.jinja")
    return template.render(**context)


def render_text(template_name: EmailTemplate, **context) -> str:
    template = env.get_template(f"{template_name}/text.jinja")
    return template.render(**context)
