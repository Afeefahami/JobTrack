"""Rule-based extraction of job details from pasted text.

The extractor only returns what it can actually find in the text. Anything it cannot identify
is left as None so the user can fill it in by hand.
"""

import re
from dataclasses import dataclass, field

from app.models.enums import EmploymentType, WorkType
from app.services.extraction.skills import find_skills


@dataclass
class ExtractedDetails:
    job_title: str | None = None
    company_name: str | None = None
    location: str | None = None
    work_type: WorkType | None = None
    employment_type: EmploymentType | None = None
    required_skills: list[str] = field(default_factory=list)
    experience_required: str | None = None
    salary: str | None = None


# --------------------------------------------------------------------------- text helpers

HEADER_LINES = 14  # how many non-empty lines count as the "top" of a posting
SEPARATORS = re.compile(r"\s*[·•|]\s*|\s+[-–—]\s+")

TITLE_WORDS = (
    "developer|engineer|programmer|analyst|scientist|designer|architect|manager|lead|consultant|"
    "administrator|specialist|executive|officer|associate|intern|trainee|tester|qa|sdet|devops|sre|"
    "coordinator|director|assistant|technician|recruiter|accountant|writer|marketer|representative|"
    "strategist|planner|supervisor|head of|full[- ]?stack|front[- ]?end|back[- ]?end|software|"
    "data|product owner|scrum master|support"
)
TITLE_RE = re.compile(rf"\b(?:{TITLE_WORDS})\b", re.IGNORECASE)

SECTION_HEADINGS = re.compile(
    r"^(?:about (?:the )?(?:job|role|company|us|team|you|position)|job description|description|"
    r"responsibilities|requirements|qualifications|overview|apply(?: now)?|easy apply|save|"
    r"promoted|actively (?:hiring|recruiting)|reposted|show more|show less|see more|share|"
    r"people clicked apply|meet the hiring team|benefits|skills|key skills|what you.ll do|"
    r"who we are|job details|job summary|position summary|role overview|posted|new|"
    r"be an early applicant|responses managed off linkedin)\b",
    re.IGNORECASE,
)

COMPANY_SUFFIXES = re.compile(
    r"\b(?:inc|llc|ltd|limited|pvt|private|corp|corporation|gmbh|plc|co|company|technologies|"
    r"technology|solutions|systems|labs|software|services|consulting|group|studio|studios)\b\.?",
    re.IGNORECASE,
)
GENERIC_COMPANY = {"company", "team", "us", "job", "role", "position", "the company", "our company"}

KNOWN_PLACES = [
    "Kochi", "Cochin", "Ernakulam", "Kakkanad", "Infopark", "Technopark", "Thiruvananthapuram",
    "Trivandrum", "Kozhikode", "Calicut", "Thrissur", "Kannur", "Kollam", "Bengaluru", "Bangalore",
    "Chennai", "Hyderabad", "Mumbai", "Navi Mumbai", "Pune", "Delhi", "New Delhi", "Gurgaon",
    "Gurugram", "Noida", "Kolkata", "Ahmedabad", "Coimbatore", "Jaipur", "Indore", "Chandigarh",
    "Mysore", "Mysuru", "Mangalore", "Mangaluru", "Nagpur", "Lucknow", "Bhubaneswar",
    "Visakhapatnam", "Vadodara", "Surat", "Madurai", "Kerala", "Karnataka", "Tamil Nadu",
    "Maharashtra", "Telangana", "India", "London", "Manchester", "Edinburgh", "New York",
    "San Francisco", "San Jose", "Seattle", "Austin", "Boston", "Chicago", "Los Angeles", "Denver",
    "Atlanta", "Dallas", "Toronto", "Vancouver", "Berlin", "Munich", "Amsterdam", "Dublin", "Paris",
    "Madrid", "Singapore", "Dubai", "Abu Dhabi", "Doha", "Riyadh", "Sydney", "Melbourne",
    "United States", "United Kingdom", "Canada", "Germany", "Australia", "UAE",
]
_PLACE_ALT = "|".join(re.escape(p) for p in sorted(KNOWN_PLACES, key=len, reverse=True))
PLACE_RE = re.compile(rf"\b(?:{_PLACE_ALT})\b", re.IGNORECASE)
CITY_STATE_RE = re.compile(
    r"^[A-Z][A-Za-z.'\- ]{1,40}(?:,\s*[A-Z][A-Za-z.'\- ]{1,40}){1,3}$"
)

WORK_TYPE_PATTERNS: list[tuple[WorkType, re.Pattern[str]]] = [
    (WorkType.HYBRID, re.compile(r"\bhybrid\b", re.IGNORECASE)),
    (
        WorkType.REMOTE,
        re.compile(
            r"\b(?:fully[- ]remote|remote(?:[- ]first)?|work(?:ing)? from home|wfh|work-from-home)\b",
            re.IGNORECASE,
        ),
    ),
    (
        WorkType.ONSITE,
        re.compile(
            r"\b(?:on[- ]?site|work(?:ing)? from (?:the )?office|wfo|in[- ]office|in[- ]person)\b",
            re.IGNORECASE,
        ),
    ),
]

EMPLOYMENT_PATTERNS: list[tuple[EmploymentType, re.Pattern[str]]] = [
    (EmploymentType.FULL_TIME, re.compile(r"\bfull[- ]?time\b", re.IGNORECASE)),
    (EmploymentType.PART_TIME, re.compile(r"\bpart[- ]?time\b", re.IGNORECASE)),
    (EmploymentType.INTERNSHIP, re.compile(r"\binternship\b|\bintern\b", re.IGNORECASE)),
    (
        EmploymentType.CONTRACT,
        re.compile(
            r"\bcontract(?:ual)?\s+(?:position|role|basis|opportunity|job|employment)\b|"
            r"\bcontract[- ]to[- ]hire\b|\b(?:\d+|six|twelve)[- ]months?\s+contract\b|"
            r"\bjob type\s*[:\-–]\s*contract\b|\bcontract\b(?=\s*[·•|(])",
            re.IGNORECASE,
        ),
    ),
    (EmploymentType.FREELANCE, re.compile(r"\bfreelance\b", re.IGNORECASE)),
    (EmploymentType.TEMPORARY, re.compile(r"\btemporary\b|\btemp\s+position\b", re.IGNORECASE)),
]


def _labeled(lines: list[str], labels: str) -> str | None:
    """Value of the first 'Label: value' line whose label matches the given alternation."""
    pattern = re.compile(rf"^(?:{labels})\s*[:\-–—]\s*(.+)$", re.IGNORECASE)
    for line in lines:
        match = pattern.match(line)
        if match and match.group(1).strip():
            return match.group(1).strip()
    return None


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ")
    text = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _clean_value(value: str, max_len: int = 120) -> str:
    original = re.sub(r"\s+", " ", value)
    value = original.strip(" \t-–—:|·•,;.")
    if original.rstrip().endswith(".") and re.search(r"\b(?:Ltd|Inc|Co|Corp|Pvt)$", value):
        value += "."
    return value[:max_len].strip()


def _strip_work_type_tag(value: str) -> str:
    return re.sub(r"\s*\((?:on[- ]?site|remote|hybrid)\)\s*", " ", value, flags=re.IGNORECASE).strip()


# --------------------------------------------------------------------------- title

HIRING_PREFIX = re.compile(
    r"^(?:we(?:'|’)?re hiring|we are hiring|now hiring|hiring|job opening|opening|vacancy|job)\s*[:\-–—]\s*",
    re.IGNORECASE,
)


def _looks_like_title(line: str) -> bool:
    line = HIRING_PREFIX.sub("", line)
    if not line or len(line) > 90 or len(line.split()) > 11:
        return False
    if SECTION_HEADINGS.match(line):
        return False
    if line.endswith((".", "!", "?")) or "@" in line or line.lower().startswith(("http", "www.")):
        return False
    lowered = line.lower()
    if any(p in lowered for p in ("we are", "we're", "you will", "you'll", "looking for", "our team")):
        return False
    return bool(TITLE_RE.search(line))


def _clean_title(line: str) -> str:
    line = HIRING_PREFIX.sub("", line)
    # "Title at Company", "Title - Company", "Title | Company", "Title @ Company" -> keep the title.
    line = re.split(r"\s+(?:at|@)\s+|\s+[|·•]\s+|\s+[-–—]\s+", line, maxsplit=1)[0]
    line = re.sub(r"\s*\((?:m/f/d|f/m/d|m/w/d|remote|hybrid|on[- ]?site|contract|full[- ]?time)\)\s*", " ", line, flags=re.IGNORECASE)
    return _clean_value(line, 100)


def extract_title(lines: list[str], text: str) -> tuple[str | None, int | None]:
    """Return (title, index of the line it came from, if any)."""
    labeled = _labeled(lines, r"job\s*title|position(?:\s*title)?|designation|job\s*role|role|opening|vacancy")
    if labeled:
        return _clean_title(labeled) or None, None

    for index, line in enumerate(lines[:HEADER_LINES]):
        if _looks_like_title(line):
            title = _clean_title(line)
            if title:
                return title, index

    sentence = re.search(
        r"\b(?:looking for|hiring|seeking|in search of|is hiring)\s+(?:an?\s+|the\s+)?"
        r"((?:[A-Z][\w+#./&-]*\s?){1,6})(?=\s+(?:to|who|with|for|in|at|based|join|,|\.|\()|$)",
        text[:1200],
    )
    if sentence and TITLE_RE.search(sentence.group(1)):
        return _clean_value(sentence.group(1), 100), None
    return None, None


# --------------------------------------------------------------------------- company

def _valid_company(value: str | None) -> str | None:
    if not value:
        return None
    value = _clean_value(value, 80)
    if not value or value.lower() in GENERIC_COMPANY or len(value) < 2:
        return None
    if re.search(r"\d+\s+(?:applicants?|days?|weeks?|hours?|months?)", value, re.IGNORECASE):
        return None
    if PLACE_RE.fullmatch(value) or _looks_like_location(value):
        return None
    if _looks_like_title(value) and not COMPANY_SUFFIXES.search(value):
        return None
    if SECTION_HEADINGS.match(value) or len(value.split()) > 8:
        return None
    return value


def extract_company(lines: list[str], text: str, title_index: int | None) -> str | None:
    labeled = _labeled(lines, r"company(?:\s*name)?|employer|organi[sz]ation|hiring\s*company|client")
    company = _valid_company(labeled)
    if company:
        return company

    # "Python Developer at ABC Technologies" (the title line itself)
    if title_index is not None:
        head = lines[title_index]
        match = re.search(r"\s(?:at|@)\s+(.+)$", head) or re.search(r"\s[|·•\-–—]\s+(.+)$", head)
        if match:
            company = _valid_company(SEPARATORS.split(match.group(1))[0])
            if company:
                return company
        # LinkedIn style: the line after the title is "Company · Location (Hybrid) · ..."
        for following in lines[title_index + 1 : title_index + 3]:
            first_segment = SEPARATORS.split(following)[0]
            company = _valid_company(first_segment)
            if company:
                return company

    for pattern in (
        r"^About\s+([A-Z][\w&.,'’\- ]{1,60})$",
        r"^([A-Z][\w&.,'’\- ]{1,60}?)\s+is\s+(?:hiring|looking for|seeking|a\s|an\s|one of|the\s|India)",
        r"^Join\s+(?:the\s+team\s+at\s+|us\s+at\s+)?([A-Z][\w&.'’\- ]{1,50})",
        r"^Why\s+(?:join\s+)?([A-Z][\w&.'’\- ]{1,50})\?$",
    ):
        for line in lines[:60]:
            match = re.match(pattern, line)
            if match:
                company = _valid_company(match.group(1))
                if company and not re.match(r"(?:the|this|our)\b", company, re.IGNORECASE):
                    return company
    return None


# --------------------------------------------------------------------------- location

def _looks_like_location(value: str) -> bool:
    value = _strip_work_type_tag(value).strip()
    if not value or len(value) > 80:
        return False
    if COMPANY_SUFFIXES.search(value) and "," not in value:
        return False
    words = value.split()
    if PLACE_RE.search(value) and len(words) <= 6 and not re.search(r"[.!?]\s|[.!?]$", value):
        capitalised = sum(1 for word in words if word[:1].isupper())
        if capitalised * 2 >= len(words):
            return True
    if CITY_STATE_RE.match(value):
        parts = [part.strip() for part in value.split(",")]
        # "Kochi, Kerala, India": short parts made of capitalised words only.
        capitalised = all(
            len(part.split()) <= 3 and all(word[:1].isupper() for word in part.split()) for part in parts
        )
        return capitalised and not COMPANY_SUFFIXES.fullmatch(parts[-1])
    return False


def extract_location(lines: list[str], text: str, title_index: int | None) -> str | None:
    labeled = _labeled(
        lines, r"(?:job\s+|work\s+|office\s+)?location(?:s)?|based\s+in|city|work\s*place"
    )
    if labeled:
        value = _clean_value(_strip_work_type_tag(SEPARATORS.split(labeled)[0]))
        if value and not re.fullmatch(r"remote|hybrid|on[- ]?site", value, re.IGNORECASE):
            return value

    # LinkedIn / Indeed headers: "Company · Kochi, Kerala, India (Hybrid) · 2 days ago"
    start = (title_index or 0) + 1
    for line in lines[start : start + 6]:
        for segment in SEPARATORS.split(line):
            if _looks_like_location(segment):
                value = _clean_value(_strip_work_type_tag(segment))
                if value:
                    return value

    match = re.search(
        r"\b(?:located|based|office|offices|position|role|hybrid|onsite|on-site)\s+(?:is\s+)?(?:in|at)\s+"
        r"([A-Z][A-Za-z'\- ]{2,30}(?:,\s*[A-Z][A-Za-z'\- ]{2,30}){0,2})",
        text,
    )
    if match:
        value = _clean_value(match.group(1))
        if _looks_like_location(value):
            return value
    return None


# --------------------------------------------------------------------------- work / employment type

def _match_enum_value(value: str, patterns) -> object | None:
    best: tuple[int, object] | None = None
    for enum_value, pattern in patterns:
        match = pattern.search(value)
        if match and (best is None or match.start() < best[0]):
            best = (match.start(), enum_value)
    return best[1] if best else None


def extract_work_type(lines: list[str], text: str) -> WorkType | None:
    labeled = _labeled(lines, r"work\s*type|workplace(?:\s*type)?|work\s*mode|work\s*model|mode\s*of\s*work|work\s*arrangement")
    if labeled:
        found = _match_enum_value(labeled, WORK_TYPE_PATTERNS)
        if found:
            return found

    header = "\n".join(lines[:HEADER_LINES])
    found = _match_enum_value(header, WORK_TYPE_PATTERNS)
    if found:
        return found

    counts: list[tuple[int, int, WorkType]] = []  # (-count, first position, type)
    for work_type, pattern in WORK_TYPE_PATTERNS:
        matches = list(pattern.finditer(text))
        if matches:
            counts.append((-len(matches), matches[0].start(), work_type))
    if counts:
        counts.sort()
        return counts[0][2]
    return None


_EMPLOYMENT_CONTEXT = re.compile(
    r"\b(?:this is|position is|role is|job is|offering|offer)\s+(?:an?\s+)?"
    r"(full[- ]?time|part[- ]?time|contract(?:ual)?|temporary|freelance|internship)\b",
    re.IGNORECASE,
)


def extract_employment_type(lines: list[str], text: str, title: str | None) -> EmploymentType | None:
    labeled = _labeled(lines, r"employment\s*type|job\s*type|type\s*of\s*employment|job\s*nature|position\s*type")
    if labeled:
        found = _match_enum_value(labeled, EMPLOYMENT_PATTERNS)
        if found:
            return found
        if re.search(r"\bcontract", labeled, re.IGNORECASE):
            return EmploymentType.CONTRACT

    if title and re.search(r"\bintern(?:ship)?\b", title, re.IGNORECASE):
        return EmploymentType.INTERNSHIP

    # Header metadata lines look like "Full-time · Mid-Senior level": short and not a sentence.
    metadata = [
        line for line in lines[:HEADER_LINES]
        if len(line) <= 70 and len(line.split()) <= 10 and not line.endswith((".", "!", "?"))
    ]
    found = _match_enum_value("\n".join(metadata), EMPLOYMENT_PATTERNS)
    if found:
        return found

    # In the body, only trust explicit statements, so "internship opportunities also available"
    # or "contract" in legal text does not change the type of this job.
    context = _EMPLOYMENT_CONTEXT.search(text)
    if context:
        return _match_enum_value(context.group(1), EMPLOYMENT_PATTERNS)
    for employment_type in (EmploymentType.FULL_TIME, EmploymentType.PART_TIME):
        pattern = dict(EMPLOYMENT_PATTERNS)[employment_type]
        if pattern.search(text):
            return employment_type
    return None


# --------------------------------------------------------------------------- skills

SKILL_LABELS = (
    r"(?:(?:required|key|technical|core|primary|desired|preferred|must[- ]have)\s+)?"
    r"(?:skills?(?:\s*(?:required|set))?|tech(?:nical)?\s*stack|technologies|tools)"
)


def extract_skills(lines: list[str], text: str) -> list[str]:
    skills = find_skills(text)
    known = {skill.lower() for skill in skills}

    # A line such as "Skills: Python, FastAPI, Team leadership" may name skills the catalogue lacks.
    labeled = _labeled(lines, SKILL_LABELS)
    if labeled:
        for item in re.split(r"[,;/•|]", labeled):
            item = _clean_value(item, 40)
            if 1 < len(item) <= 40 and len(item.split()) <= 4 and item.lower() not in known:
                if not re.search(r"\b(?:and|or|with|in|the)\b\s*$", item, re.IGNORECASE):
                    skills.append(item)
                    known.add(item.lower())
    return skills[:25]


# --------------------------------------------------------------------------- experience

_EXPERIENCE_WORD = re.compile(r"experience|exp\b", re.IGNORECASE)
_RANGE_RE = re.compile(r"(\d{1,2})\s*(?:\+|plus)?\s*(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b", re.IGNORECASE)
_SINGLE_RE = re.compile(
    r"(?P<qualifier>minimum(?:\s+of)?|min\.?|at\s+least|over|more\s+than)?\s*(?P<n>\d{1,2})\s*(?P<plus>\+|plus)?\s*"
    r"(?:years?|yrs?)(?:['’]s?)?\s*(?:of\s+)?(?:(?:relevant|professional|hands[- ]on|industry|work|proven|total|overall)\s+)*"
    r"(?:experience|exp\b)",
    re.IGNORECASE,
)
_EXPERIENCE_OF_RE = re.compile(r"experience\s*(?:of|:)?\s*(\d{1,2})\s*(\+)?\s*(?:years?|yrs?)", re.IGNORECASE)


def _near_experience(text: str, start: int, end: int) -> bool:
    window = text[max(0, start - 45) : end + 45]
    return bool(_EXPERIENCE_WORD.search(window))


def extract_experience(lines: list[str], text: str) -> str | None:
    labeled = _labeled(lines, r"(?:required\s+|work\s+|total\s+)?experience(?:\s+required)?|exp|years\s+of\s+experience")
    if labeled:
        range_match = _RANGE_RE.search(labeled)
        if range_match:
            return f"{range_match.group(1)}-{range_match.group(2)} years"
        single = re.search(r"(\d{1,2})\s*(\+)?\s*(?:years?|yrs?)", labeled, re.IGNORECASE)
        if single:
            return f"{single.group(1)}{'+' if single.group(2) else ''} years"
        if re.search(r"fresher|entry[- ]level|no experience", labeled, re.IGNORECASE):
            return _clean_value(labeled, 60)

    candidates: list[tuple[int, str]] = []
    for match in _RANGE_RE.finditer(text):
        if _near_experience(text, match.start(), match.end()):
            candidates.append((match.start(), f"{match.group(1)}-{match.group(2)} years"))
    for match in _SINGLE_RE.finditer(text):
        plus = bool(match.group("plus") or match.group("qualifier"))
        candidates.append((match.start(), f"{match.group('n')}{'+' if plus else ''} years"))
    for match in _EXPERIENCE_OF_RE.finditer(text):
        candidates.append((match.start(), f"{match.group(1)}{'+' if match.group(2) else ''} years"))
    if candidates:
        candidates.sort()
        return candidates[0][1]

    if re.search(r"\bfreshers?\b", text, re.IGNORECASE):
        return "Fresher"
    if re.search(r"\bentry[- ]level\b", text, re.IGNORECASE):
        return "Entry level"
    return None


# --------------------------------------------------------------------------- salary

_CUR = r"(?:₹|Rs\.?|INR|USD|US\$|\$|£|GBP|€|EUR|AED|SGD|CAD|AUD)"
_UNIT = r"(?:k|lpa|lakhs?|lacs?|l|m|mn|million|cr|crores?)"
_NUM = r"\d[\d,]*(?:\.\d+)?"
_PERIOD = r"(?:\s*(?:per|/|a)\s*(?:year|annum|month|hour|hr|yr|mo|week)\b|\s*p\.?a\.?\b|\s*pm\b)"

_SALARY_WITH_CURRENCY = re.compile(
    rf"{_CUR}\s?{_NUM}\s?(?:{_UNIT}\b)?(?:\s?(?:-|–|—|to)\s?(?:{_CUR}\s?)?{_NUM}\s?(?:{_UNIT}\b)?)?(?:{_PERIOD})?",
    re.IGNORECASE,
)
_SALARY_LPA = re.compile(
    rf"{_NUM}\s?(?:(?:-|–|—|to)\s?{_NUM}\s?)?(?:lpa|lakhs?(?:\s+per\s+annum)?|lacs?|lakh\s+pa)\b(?:{_PERIOD})?",
    re.IGNORECASE,
)
_SALARY_CONTEXT = re.compile(
    r"salary|compensation|pay\b|ctc|package|remuneration|stipend|earn|range|base|wage|lpa|per annum|"
    r"per year|per month|per hour|annual",
    re.IGNORECASE,
)


def extract_salary(lines: list[str], text: str) -> str | None:
    labeled = _labeled(
        lines,
        r"(?:expected\s+|annual\s+|base\s+)?(?:salary|pay|compensation|ctc|package|remuneration|stipend)(?:\s*range)?",
    )
    if labeled and re.search(r"\d", labeled):
        return _clean_value(labeled, 100)

    candidates: list[tuple[int, str]] = []
    for pattern in (_SALARY_WITH_CURRENCY, _SALARY_LPA):
        for match in pattern.finditer(text):
            value = match.group(0).strip()
            window = text[max(0, match.start() - 70) : match.end() + 40]
            has_period = bool(re.search(_PERIOD, value, re.IGNORECASE)) or bool(
                re.search(r"lpa|lakh|lac", value, re.IGNORECASE)
            )
            if has_period or _SALARY_CONTEXT.search(window):
                candidates.append((match.start(), _clean_value(value, 100)))
    if candidates:
        candidates.sort()
        return candidates[0][1]
    return None


# --------------------------------------------------------------------------- public API

def extract_locally(raw_text: str) -> ExtractedDetails:
    text = normalize_text(raw_text)
    lines = [line.strip(" \t*#>") for line in text.split("\n")]
    lines = [line for line in lines if line]

    title, title_index = extract_title(lines, text)
    return ExtractedDetails(
        job_title=title,
        company_name=extract_company(lines, text, title_index),
        location=extract_location(lines, text, title_index),
        work_type=extract_work_type(lines, text),
        employment_type=extract_employment_type(lines, text, title),
        required_skills=extract_skills(lines, text),
        experience_required=extract_experience(lines, text),
        salary=extract_salary(lines, text),
    )
