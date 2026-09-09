from fastapi import BackgroundTasks

from shared.email import tempplate_loader
from shared.email.provider import EmailProvider
from shared.email.schema import EmailAttachment, EmailTemplate


class EmailService:
    def __init__(self, provider: EmailProvider) -> None:
        self.provider = provider

    async def send_email(
        self,
        template: EmailTemplate,
        to_emails: list[str],
        attachments: list[EmailAttachment] | None = None,
        **context,
    ):
        subject = tempplate_loader.load_subject(template_name=template)
        html = tempplate_loader.render_html(template_name=template, **context)
        text = tempplate_loader.render_text(template_name=template, **context)

        await self.provider.send(
            to_emails=to_emails,
            subject=subject,
            html=html,
            text=text,
            attachments=attachments,
        )


class BackgroundEmailService:
    def __init__(self, provider: EmailProvider, background_tasks: BackgroundTasks):
        self.provider = provider
        self.background_tasks = background_tasks

    def send_email(self, template, to_emails, attachments=None, **context):
        """Fire-and-forget: adds email to background tasks instead of awaiting."""
        subject = tempplate_loader.load_subject(template_name=template)
        html = tempplate_loader.render_html(template_name=template, **context)
        text = tempplate_loader.render_text(template_name=template, **context)

        self.background_tasks.add_task(
            self.provider.send, to_emails, subject, html, text, attachments
        )
