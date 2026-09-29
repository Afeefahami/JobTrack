"""Skill catalogue used by the local extractor.

Each entry is (canonical name, aliases, case_sensitive). A skill is only reported when one of
its aliases literally appears in the pasted text, so nothing is invented.
"""

import re

# fmt: off
_CATALOGUE: list[tuple[str, tuple[str, ...], bool]] = [
    # Languages
    ("Python", ("Python",), False),
    ("Java", ("Java",), False),
    ("JavaScript", ("JavaScript", "Java Script", "ECMAScript", "ES6"), False),
    ("TypeScript", ("TypeScript",), False),
    ("C++", ("C++",), False),
    ("C#", ("C#",), False),
    ("Go", ("Golang",), False),
    ("Rust", ("Rust",), True),
    ("PHP", ("PHP",), False),
    ("Ruby", ("Ruby",), True),
    ("Kotlin", ("Kotlin",), False),
    ("Swift", ("Swift",), True),
    ("Scala", ("Scala",), True),
    ("Dart", ("Dart",), True),
    ("SQL", ("SQL",), False),
    ("PL/SQL", ("PL/SQL", "PLSQL"), False),
    ("HTML", ("HTML", "HTML5"), False),
    ("CSS", ("CSS", "CSS3"), False),
    ("SASS/SCSS", ("SASS", "SCSS"), False),
    ("Bash", ("Bash", "Shell scripting", "Shell script"), False),
    ("PowerShell", ("PowerShell",), False),
    ("MATLAB", ("MATLAB",), False),
    # Front end
    ("React", ("React", "React.js", "ReactJS"), False),
    ("React Native", ("React Native",), False),
    ("Angular", ("Angular", "AngularJS", "Angular.js"), False),
    ("Vue.js", ("Vue", "Vue.js", "VueJS"), False),
    ("Next.js", ("Next.js", "NextJS"), False),
    ("Nuxt", ("Nuxt", "Nuxt.js"), False),
    ("Svelte", ("Svelte", "SvelteKit"), False),
    ("Redux", ("Redux", "NgRx"), False),
    ("RxJS", ("RxJS",), False),
    ("jQuery", ("jQuery",), False),
    ("Bootstrap", ("Bootstrap",), False),
    ("Tailwind CSS", ("Tailwind", "Tailwind CSS", "TailwindCSS"), False),
    ("Material UI", ("Material UI", "Angular Material", "MUI"), False),
    ("Webpack", ("Webpack",), False),
    # Back end
    ("Node.js", ("Node.js", "NodeJS", "Node JS"), False),
    ("Express.js", ("Express.js", "ExpressJS", "Express JS"), False),
    ("NestJS", ("NestJS", "Nest.js"), False),
    ("Django", ("Django",), False),
    ("Flask", ("Flask",), False),
    ("FastAPI", ("FastAPI", "Fast API"), False),
    ("Spring Boot", ("Spring Boot", "SpringBoot", "Spring Framework", "Spring MVC"), False),
    (".NET", (".NET", "ASP.NET", ".NET Core", "dotnet"), False),
    ("Laravel", ("Laravel",), False),
    ("Ruby on Rails", ("Ruby on Rails", "Rails"), True),
    ("Flutter", ("Flutter",), False),
    ("Hibernate", ("Hibernate",), False),
    ("SQLAlchemy", ("SQLAlchemy",), False),
    ("Celery", ("Celery",), False),
    ("REST APIs", ("REST", "RESTful", "REST API", "REST APIs", "RESTful APIs", "RESTful API"), True),
    ("GraphQL", ("GraphQL",), False),
    ("gRPC", ("gRPC",), False),
    ("Microservices", ("Microservices", "Micro-services", "Microservice"), False),
    ("WebSockets", ("WebSocket", "WebSockets"), False),
    ("Kafka", ("Kafka",), False),
    ("RabbitMQ", ("RabbitMQ",), False),
    # Databases
    ("MySQL", ("MySQL",), False),
    ("PostgreSQL", ("PostgreSQL", "Postgres"), False),
    ("MongoDB", ("MongoDB", "Mongo DB"), False),
    ("SQLite", ("SQLite",), False),
    ("Oracle", ("Oracle DB", "Oracle Database", "Oracle"), True),
    ("SQL Server", ("SQL Server", "MSSQL", "MS SQL"), False),
    ("Redis", ("Redis",), False),
    ("Elasticsearch", ("Elasticsearch", "Elastic Search"), False),
    ("Cassandra", ("Cassandra",), False),
    ("DynamoDB", ("DynamoDB",), False),
    ("Firebase", ("Firebase", "Firestore"), False),
    ("NoSQL", ("NoSQL",), False),
    # Cloud and DevOps
    ("AWS", ("AWS", "Amazon Web Services"), False),
    ("Azure", ("Azure",), False),
    ("GCP", ("GCP", "Google Cloud"), False),
    ("Docker", ("Docker",), False),
    ("Kubernetes", ("Kubernetes", "K8s"), False),
    ("Terraform", ("Terraform",), False),
    ("Ansible", ("Ansible",), False),
    ("Jenkins", ("Jenkins",), False),
    ("CI/CD", ("CI/CD", "CICD", "CI-CD"), False),
    ("GitHub Actions", ("GitHub Actions",), False),
    ("Git", ("Git",), False),
    ("GitHub", ("GitHub",), False),
    ("GitLab", ("GitLab",), False),
    ("Linux", ("Linux",), False),
    ("Nginx", ("Nginx",), False),
    ("Prometheus", ("Prometheus",), False),
    ("Grafana", ("Grafana",), False),
    # Data and AI
    ("Pandas", ("Pandas",), True),
    ("NumPy", ("NumPy",), False),
    ("Scikit-learn", ("Scikit-learn", "scikit learn", "sklearn"), False),
    ("TensorFlow", ("TensorFlow",), False),
    ("PyTorch", ("PyTorch",), False),
    ("Keras", ("Keras",), False),
    ("Machine Learning", ("Machine Learning",), False),
    ("Deep Learning", ("Deep Learning",), False),
    ("NLP", ("NLP", "Natural Language Processing"), False),
    ("Computer Vision", ("Computer Vision",), False),
    ("LLMs", ("LLM", "LLMs", "Large Language Models"), False),
    ("Generative AI", ("Generative AI", "GenAI"), False),
    ("Power BI", ("Power BI", "PowerBI"), False),
    ("Tableau", ("Tableau",), False),
    ("Excel", ("Excel", "MS Excel", "Microsoft Excel"), False),
    ("Apache Spark", ("Spark", "PySpark", "Apache Spark"), True),
    ("Hadoop", ("Hadoop",), False),
    ("Airflow", ("Airflow",), False),
    ("ETL", ("ETL",), False),
    ("Data Analysis", ("Data Analysis", "Data Analytics"), False),
    ("Data Structures", ("Data Structures",), False),
    ("Algorithms", ("Algorithms",), False),
    # Testing and quality
    ("Selenium", ("Selenium",), False),
    ("Cypress", ("Cypress",), False),
    ("Playwright", ("Playwright",), False),
    ("Jest", ("Jest",), False),
    ("Pytest", ("Pytest",), False),
    ("JUnit", ("JUnit",), False),
    ("Postman", ("Postman",), False),
    ("Unit Testing", ("Unit Testing", "Unit Tests", "Unit Test"), False),
    ("Test Automation", ("Test Automation", "Automation Testing"), False),
    # Practices and tools
    ("Agile", ("Agile",), False),
    ("Scrum", ("Scrum",), False),
    ("Jira", ("Jira",), False),
    ("OOP", ("OOP", "OOPS", "Object-Oriented Programming", "Object Oriented Programming"), False),
    ("TDD", ("TDD", "Test Driven Development", "Test-Driven Development"), False),
    ("Design Patterns", ("Design Patterns",), False),
    ("System Design", ("System Design",), False),
    ("Figma", ("Figma",), False),
    ("JWT", ("JWT",), False),
    ("OAuth", ("OAuth", "OAuth2"), False),
    ("Selenium WebDriver", ("WebDriver",), False),
]
# fmt: on

_LEFT = r"(?<![\w.+#/-])"
_RIGHT = r"(?![\w+#])"


def _compile(aliases: tuple[str, ...], case_sensitive: bool) -> re.Pattern[str]:
    # Longest alias first so "Spring Boot" wins over "Spring".
    ordered = sorted(aliases, key=len, reverse=True)
    body = "|".join(re.escape(alias) for alias in ordered)
    return re.compile(f"{_LEFT}(?:{body}){_RIGHT}", 0 if case_sensitive else re.IGNORECASE)


_COMPILED = [(name, _compile(aliases, cs)) for name, aliases, cs in _CATALOGUE]


def find_skills(text: str, limit: int = 25) -> list[str]:
    """Return catalogue skills mentioned in the text, ordered by first appearance."""
    hits: list[tuple[int, str]] = []
    for name, pattern in _COMPILED:
        match = pattern.search(text)
        if match:
            hits.append((match.start(), name))
    hits.sort()
    return [name for _, name in hits][:limit]
