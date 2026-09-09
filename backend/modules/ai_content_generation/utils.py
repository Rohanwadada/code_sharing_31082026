import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# one function which will filter the links which are from recommended domain
# One for tagging particular content type into the links


def extract_hostname_from_url(url: str) -> str:
    if not url:
        return ""
    try:
        # extract netloc like `www.google.com`
        netloc = urlparse(url).netloc.lower()
        # remove 'www.' to normalize the domain

        hostname = netloc[4:] if netloc.startswith("www.") else netloc
        logger.info(f"Hostname: {hostname}")
        return hostname
    except Exception as e:
        logger.error(f"Failed to parse URL {url}: {e}")
        return ""


def filter_content_by_hostname(
    data: dict, allowed_hostnames: list[str], limit: int
) -> list[dict]:
    logger.info(f"LIMIT: {limit}")
    logger.info(f"Data: {data}")
    logger.info(f"Allowed hostname: {allowed_hostnames}")
    allowed_hostnames_set = set(allowed_hostnames)
    preferred, others = [], []

    for item in data:
        if extract_hostname_from_url(item["link"]) in allowed_hostnames_set:
            preferred.append(item)
        else:
            others.append(item)

        # return early if limit reached
        if len(preferred) >= limit:
            logger.info(f"Limit reached: {limit} :: {preferred}")
            return preferred[:limit]

    logger.info(f"Preffered: {preferred}")
    logger.info(f"Others: {others}")

    # will come to this if limit not reached
    remaining = limit - len(preferred)
    return preferred + others[:remaining]
