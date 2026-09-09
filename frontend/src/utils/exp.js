const path = require('node:path');
const { getReactflowDiagramFromRoadmapDSL } = require('./roadmapDSLParser');
fs = require('node:fs');


const DSL = "# Principal Backend Engineer (Java) Roadmap\n## Advanced Java Language Features\n### Modern Java Constructs\n- Java 8+ Features (Lambdas, Streams, Optionals) [1]\n- Records and Pattern Matching [1]\n- Sealed Classes and Interfaces [2]\n- Virtual Threads (Project Loom) [1]\n@m.assessment: Module Assessment\n### Concurrency and Parallelism\n- Advanced Concurrency Utilities (Executors, Fork/Join) [1]\n- Reactive Programming with Project Reactor/RxJava [2]\n- Non-blocking I/O (NIO.2) [2]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## High-Performance Backend Systems\n### Performance Tuning and Profiling\n- JVM Internals and Memory Management [1]\n- Garbage Collection Tuning [1]\n- Java Profiling Tools (JFR, VisualVM, YourKit) [1]\n- Benchmarking with JMH [2]\n@m.assessment: Module Assessment\n### Distributed Systems Patterns\n- Microservices Architecture Principles [1]\n- Event-Driven Architectures (Kafka, RabbitMQ) [1]\n- Distributed Caching (Redis, Hazelcast) [2]\n- API Gateway and Service Mesh Concepts [2]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Robust and Scalable Architectures\n### Design Patterns and Principles\n- Advanced Design Patterns (e.g., Saga, CQRS) [1]\n- SOLID Principles in Practice [1]\n- Domain-Driven Design (DDD) [2]\n- Clean Architecture and Hexagonal Architecture [2]\n@m.assessment: Module Assessment\n### Database and Data Management\n- Advanced SQL and NoSQL Database Optimization [1]\n- ORM Deep Dive (Hibernate/JPA Performance) [1]\n- Data Consistency in Distributed Systems [2]\n- Polyglot Persistence Strategies [3]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Cloud-Native and DevOps\n### Cloud Platforms and Deployment\n- Containerization with Docker and Kubernetes [1]\n- Cloud Providers (AWS, Azure, GCP) for Java Apps [1]\n- Serverless Architectures (AWS Lambda, Azure Functions) [2]\n- Infrastructure as Code (Terraform) [3]\n@m.assessment: Module Assessment\n### Observability and Reliability\n- Logging Best Practices (SLF4J, Logback) [1]\n- Monitoring and Alerting (Prometheus, Grafana) [1]\n- Tracing (OpenTelemetry, Jaeger) [2]\n- Chaos Engineering Principles [3]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Leadership and Mentorship\n### Technical Leadership\n- Code Review Best Practices [1]\n- Mentoring Junior Developers [2]\n- System Design Interview Preparation [1]\n- Architectural Decision Records (ADRs) [2]\n@m.assessment: Module Assessment\n### Project Management and Best Practices\n- Agile Methodologies (Scrum, Kanban) [1]\n- Git Advanced Workflows [1]\n- CI/CD Pipelines (Jenkins, GitLab CI, GitHub Actions) [1]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n@r.assessment: Final Assessment\n@r.project: Capstone Project"


function saveToTxt(data, filePath = './final-list_2.txt') {
  // Create parent directory if it doesn't exist
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Save pretty-printed JSON to the txt file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`File saved to ${filePath}`);
}

saveToTxt(getReactflowDiagramFromRoadmapDSL(DSL))
