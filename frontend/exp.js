import {getReactflowDiagramFromRoadmapDSL} from ''
const fs = require('fs');
const path = require('path');

function attachQuestionsByCompetency(data, questions) {
  // Create a lookup map
  const questionMap = questions.reduce((map, question) => {
    const key = `${question.competency}||${question.subcompetency}`;

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(question);
    return map;
  }, {});

  // Attach questions to each competency object
  return data.map((item) => {
    const key = `${item.competency}||${item.subcompetency}`;

    return {
      ...item,
      questions: questionMap[key] || [],
    };
  });
}

const competencyList = [
  {
    priority: 'good to have',
    competency: 'Technical Skills',
    add_to_test: true,
    question_ids: [],
    competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
    sub_competency: 'Python Programming',
    sub_competency_id: 'de0d31bb-984b-4e0e-9b8b-742f230bcc60',
    competency_definition:
      'Core programming and technical abilities required to build software applications.',
    sub_competency_definition:
      'Proficiency in Python, including frameworks like Django or Flask, and understanding of Pythonic principles.',
  },
  {
    priority: 'icing on the cake',
    competency: 'Technical Skills',
    add_to_test: true,
    question_ids: [],
    competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
    sub_competency: 'Java Programming',
    sub_competency_id: '7c3935f0-2bdf-4954-b78c-9aec47d9da37',
    competency_definition:
      'Core programming and technical abilities required to build software applications.',
    sub_competency_definition:
      'Proficiency in Java, encompassing the Spring Boot framework, object-oriented design, and JVM concepts.',
  },
];

const questionsList = [
  {
    id: '1494031a-ef99-4feb-8ebf-43844cbb842e',
    row_number: 1,
    question:
      'In a real-time online payment gateway processing millions of logs, the SlidingWindowTracker class below suffers from latency spikes under peak load. Which modification best optimizes insertion, eviction, and aggregation to achieve sub-linear time complexity per transaction?',
    competency: 'Technical Skills',
    subCompetency: 'Python Programming',
    question_type: 'programming',
    scenario_title: 'Real-Time Transaction Log Parser',
    business_scenario:
      'An online payment gateway needs to process millions of transaction logs in real time. To detect potential fraud quickly, they require an in-memory sliding window algorithm that tracks transactions per user id and flags anomalous volume or rapid successions of high-value charges. The system must process these events efficiently with minimal memory overhead while handling out-of-order logs.',
    code_snippet:
      'import bisect\\n\\nclass SlidingWindowTracker:\\n    def __init__(self, window_seconds=60):\\n        self.window_seconds = window_seconds\\n        self.transactions = []\\n\\n    def add_and_check_anomaly(self, timestamp, amount, limit=10000):\\n        bisect.insort(self.transactions, (timestamp, amount))\\n        latest_time = max(t[0] for t in self.transactions)\\n        cutoff = latest_time - self.window_seconds\\n        \\n        idx = bisect.bisect_left(self.transactions, (cutoff, 0))\\n        self.transactions = self.transactions[idx:]\\n        \\n        total_amount = sum(t[1] for t in self.transactions)\\n        return total_amount > limit',
    options: [
      'Maintain a running sum, store transactions in a min-heap (heapq), track the maximum timestamp seen, and iteratively pop expired transactions from the heap while decrementing the running sum.',
      'Convert self.transactions to a collections.deque, keep it sorted by performing linear-scan insertions, and slide the window by popping from the left until the first timestamp is within the window.',
      "Maintain a dictionary of transactions grouped by timestamp, and use Python's built-in sum() function on a filtered dict comprehension to dynamically calculate the sum.",
      'Replace the list slice with a collections.OrderedDict that stores timestamps as keys, using popitem(last=False) to remove expired elements in O(1) time.',
    ],
    correct_option: 'A',
    correct_answer:
      'Maintain a running sum, store transactions in a min-heap (heapq), track the maximum timestamp seen, and iteratively pop expired transactions from the heap while decrementing the running sum.',
    correct_answer_explanation:
      'Using a min-heap (heapq) allows O(log N) insertion of out-of-order logs. Because the oldest elements are always at the root of the heap, we can incrementally evict expired logs in O(log N) per eviction. Combining this with a running sum allows us to check the threshold in O(1) time, avoiding the expensive O(N) list slicing and O(N) summation on every transaction.',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'In a real-time online payment gateway processing millions of logs, the SlidingWindowTracker class below suffers from latency spikes under peak load. Which modification best optimizes insertion, eviction, and aggregation to achieve sub-linear time complexity per transaction?',
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Python Programming',
          question_type: 'programming',
          scenario_title: 'Real-Time Transaction Log Parser',
          business_scenario:
            'An online payment gateway needs to process millions of transaction logs in real time. To detect potential fraud quickly, they require an in-memory sliding window algorithm that tracks transactions per user id and flags anomalous volume or rapid successions of high-value charges. The system must process these events efficiently with minimal memory overhead while handling out-of-order logs.',
          code_snippet:
            'import bisect\\n\\nclass SlidingWindowTracker:\\n    def __init__(self, window_seconds=60):\\n        self.window_seconds = window_seconds\\n        self.transactions = []\\n\\n    def add_and_check_anomaly(self, timestamp, amount, limit=10000):\\n        bisect.insort(self.transactions, (timestamp, amount))\\n        latest_time = max(t[0] for t in self.transactions)\\n        cutoff = latest_time - self.window_seconds\\n        \\n        idx = bisect.bisect_left(self.transactions, (cutoff, 0))\\n        self.transactions = self.transactions[idx:]\\n        \\n        total_amount = sum(t[1] for t in self.transactions)\\n        return total_amount > limit',
          question:
            'In a real-time online payment gateway processing millions of logs, the SlidingWindowTracker class below suffers from latency spikes under peak load. Which modification best optimizes insertion, eviction, and aggregation to achieve sub-linear time complexity per transaction?',
          options: [
            'Maintain a running sum, store transactions in a min-heap (heapq), track the maximum timestamp seen, and iteratively pop expired transactions from the heap while decrementing the running sum.',
            'Convert self.transactions to a collections.deque, keep it sorted by performing linear-scan insertions, and slide the window by popping from the left until the first timestamp is within the window.',
            "Maintain a dictionary of transactions grouped by timestamp, and use Python's built-in sum() function on a filtered dict comprehension to dynamically calculate the sum.",
            'Replace the list slice with a collections.OrderedDict that stores timestamps as keys, using popitem(last=False) to remove expired elements in O(1) time.',
          ],
          correct_option: 'A',
          correct_answer:
            'Maintain a running sum, store transactions in a min-heap (heapq), track the maximum timestamp seen, and iteratively pop expired transactions from the heap while decrementing the running sum.',
          correct_answer_explanation:
            'Using a min-heap (heapq) allows O(log N) insertion of out-of-order logs. Because the oldest elements are always at the root of the heap, we can incrementally evict expired logs in O(log N) per eviction. Combining this with a running sum allows us to check the threshold in O(1) time, avoiding the expensive O(N) list slicing and O(N) summation on every transaction.',
          feedback: 'Not Applicable',
          id: '1494031a-ef99-4feb-8ebf-43844cbb842e',
          row_number: 1,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
  {
    id: '18dff889-5236-45c2-8afa-39142e95b755',
    row_number: 2,
    question:
      'Your marketing analytics pipeline uses the code below to parse and aggregate active users from a multi-gigabyte JSON Lines file. Although stream_events successfully processes the file line-by-line, the cloud worker still crashes with an Out-Of-Memory (OOM) error during peak daily traffic containing millions of unique user IDs. Which architectural refactoring best ensures constant O(1) auxiliary memory consumption for this aggregation?',
    competency: 'Technical Skills',
    subCompetency: 'Python Programming',
    question_type: 'programming',
    scenario_title: 'Memory-Efficient Large-Scale JSON Data Aggregator',
    business_scenario:
      'A marketing analytics agency receives daily multi-gigabyte nested JSON exports containing user interaction events from mobile apps. The current Python pipeline loads the entire JSON file into memory, causing frequent Out-Of-Memory (OOM) crashes on their cloud workers. The pipeline needs to be refactored to parse, filter, and stream aggregations (such as monthly active users per region) efficiently using generators or streaming parsers.',
    code_snippet:
      "import json\\n\\ndef stream_events(file_path):\\n    with open(file_path, 'r') as f:\\n        for line in f:\\n            yield json.loads(line)\\n\\ndef aggregate_unique_users(file_path):\\n    region_users = {}\\n    for event in stream_events(file_path):\\n        region = event['region']\\n        user_id = event['user_id']\\n        if region not in region_users:\\n            region_users[region] = set()\\n        region_users[region].add(user_id)\\n    return {r: len(u) for r, u in region_users.items()}",
    options: [
      'Process the JSON stream to yield (region, user_id) pairs, sort them externally on disk, and then use a single-pass generator with itertools.groupby to count unique users per region.',
      'Parallelize the aggregation using a multiprocessing.Pool so that each worker process only keeps a fraction of the unique user IDs in memory at any given time.',
      'Use a generator expression combined with a Python collections.defaultdict containing sys.intern(user_id) to reduce the string allocation overhead of unique user IDs.',
      'Keep the current streaming parser but clear and dump the regional user sets to a temporary SQLite database whenever the combined size of the sets exceeds 100,000 elements.',
    ],
    correct_option: 'A',
    correct_answer:
      'Process the JSON stream to yield (region, user_id) pairs, sort them externally on disk, and then use a single-pass generator with itertools.groupby to count unique users per region.',
    correct_answer_explanation:
      'An external merge-sort on disk organizes the stream by region and user_id. Once sorted, a single-pass generator using itertools.groupby can aggregate unique users per region by comparing adjacent elements, achieving true O(1) auxiliary memory consumption regardless of the cardinality of unique user IDs.',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'Your marketing analytics pipeline uses the code below to parse and aggregate active users from a multi-gigabyte JSON Lines file. Although stream_events successfully processes the file line-by-line, the cloud worker still crashes with an Out-Of-Memory (OOM) error during peak daily traffic containing millions of unique user IDs. Which architectural refactoring best ensures constant O(1) auxiliary memory consumption for this aggregation?',
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Python Programming',
          question_type: 'programming',
          scenario_title: 'Memory-Efficient Large-Scale JSON Data Aggregator',
          business_scenario:
            'A marketing analytics agency receives daily multi-gigabyte nested JSON exports containing user interaction events from mobile apps. The current Python pipeline loads the entire JSON file into memory, causing frequent Out-Of-Memory (OOM) crashes on their cloud workers. The pipeline needs to be refactored to parse, filter, and stream aggregations (such as monthly active users per region) efficiently using generators or streaming parsers.',
          code_snippet:
            "import json\\n\\ndef stream_events(file_path):\\n    with open(file_path, 'r') as f:\\n        for line in f:\\n            yield json.loads(line)\\n\\ndef aggregate_unique_users(file_path):\\n    region_users = {}\\n    for event in stream_events(file_path):\\n        region = event['region']\\n        user_id = event['user_id']\\n        if region not in region_users:\\n            region_users[region] = set()\\n        region_users[region].add(user_id)\\n    return {r: len(u) for r, u in region_users.items()}",
          question:
            'Your marketing analytics pipeline uses the code below to parse and aggregate active users from a multi-gigabyte JSON Lines file. Although stream_events successfully processes the file line-by-line, the cloud worker still crashes with an Out-Of-Memory (OOM) error during peak daily traffic containing millions of unique user IDs. Which architectural refactoring best ensures constant O(1) auxiliary memory consumption for this aggregation?',
          options: [
            'Process the JSON stream to yield (region, user_id) pairs, sort them externally on disk, and then use a single-pass generator with itertools.groupby to count unique users per region.',
            'Parallelize the aggregation using a multiprocessing.Pool so that each worker process only keeps a fraction of the unique user IDs in memory at any given time.',
            'Use a generator expression combined with a Python collections.defaultdict containing sys.intern(user_id) to reduce the string allocation overhead of unique user IDs.',
            'Keep the current streaming parser but clear and dump the regional user sets to a temporary SQLite database whenever the combined size of the sets exceeds 100,000 elements.',
          ],
          correct_option: 'A',
          correct_answer:
            'Process the JSON stream to yield (region, user_id) pairs, sort them externally on disk, and then use a single-pass generator with itertools.groupby to count unique users per region.',
          correct_answer_explanation:
            'An external merge-sort on disk organizes the stream by region and user_id. Once sorted, a single-pass generator using itertools.groupby can aggregate unique users per region by comparing adjacent elements, achieving true O(1) auxiliary memory consumption regardless of the cardinality of unique user IDs.',
          feedback: 'Not Applicable',
          id: '18dff889-5236-45c2-8afa-39142e95b755',
          row_number: 2,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
  {
    id: 'aa9c48d2-e648-4067-9a6a-5b988cdf2e52',
    row_number: 3,
    question:
      "A stock photography service must download high-resolution images from an external bucket, extract EXIF metadata, and apply digital watermarks. Given Python's Global Interpreter Lock (GIL) constraints, which concurrency architecture achieves the highest overall throughput under heavy production load?",
    competency: 'Technical Skills',
    subCompetency: 'Python Programming',
    question_type: 'non-programming',
    scenario_title:
      'Choosing a Concurrency Model for an Image Processing and Metadata Extraction Service',
    business_scenario:
      'A stock photography company is designing a backend service that downloads high-resolution images from a third-party storage bucket, extracts EXIF metadata, and applies watermarks. The engineering team is debating whether to use standard multithreading, multiprocessing, or asyncio in Python to optimize throughput. The system architect must evaluate the bottlenecks (network I/O vs. CPU-bound image manipulation) and the Global Interpreter Lock (GIL) constraints to recommend the most suitable architectural pattern.',
    code_snippet: '',
    options: [
      'A hybrid model using asyncio to handle concurrent image downloads, which offloads the downloaded image bytes to a multiprocessing.Pool for CPU-bound EXIF extraction and watermarking.',
      'A standard multi-threaded model using concurrent.futures.ThreadPoolExecutor for the entire pipeline, because modern Python threads run in parallel on multi-core systems when executing image manipulation libraries.',
      'A single-process asyncio architecture using cooperative multitasking for both downloading and image processing, as modern event loops automatically offload CPU-bound tasks to separate background threads.',
      'A pure multiprocessing pipeline where each image is processed end-to-end by a separate process in a pool, because network socket operations are highly CPU-intensive and benefit directly from multi-core parallelism.',
    ],
    correct_option: 'A',
    correct_answer:
      'A hybrid model using asyncio to handle concurrent image downloads, which offloads the downloaded image bytes to a multiprocessing.Pool for CPU-bound EXIF extraction and watermarking.',
    correct_answer_explanation:
      "Image downloading is network I/O-bound, which asyncio handles highly efficiently with very low overhead. EXIF extraction and watermarking are heavily CPU-bound. Offloading these CPU-intensive operations to a multiprocessing pool bypasses Python's GIL and utilizes multi-core hardware, avoiding blocking the main event loop.",
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: "A stock photography service must download high-resolution images from an external bucket, extract EXIF metadata, and apply digital watermarks. Given Python's Global Interpreter Lock (GIL) constraints, which concurrency architecture achieves the highest overall throughput under heavy production load?",
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Python Programming',
          question_type: 'non-programming',
          scenario_title:
            'Choosing a Concurrency Model for an Image Processing and Metadata Extraction Service',
          business_scenario:
            'A stock photography company is designing a backend service that downloads high-resolution images from a third-party storage bucket, extracts EXIF metadata, and applies watermarks. The engineering team is debating whether to use standard multithreading, multiprocessing, or asyncio in Python to optimize throughput. The system architect must evaluate the bottlenecks (network I/O vs. CPU-bound image manipulation) and the Global Interpreter Lock (GIL) constraints to recommend the most suitable architectural pattern.',
          code_snippet: '',
          question:
            "A stock photography service must download high-resolution images from an external bucket, extract EXIF metadata, and apply digital watermarks. Given Python's Global Interpreter Lock (GIL) constraints, which concurrency architecture achieves the highest overall throughput under heavy production load?",
          options: [
            'A hybrid model using asyncio to handle concurrent image downloads, which offloads the downloaded image bytes to a multiprocessing.Pool for CPU-bound EXIF extraction and watermarking.',
            'A standard multi-threaded model using concurrent.futures.ThreadPoolExecutor for the entire pipeline, because modern Python threads run in parallel on multi-core systems when executing image manipulation libraries.',
            'A single-process asyncio architecture using cooperative multitasking for both downloading and image processing, as modern event loops automatically offload CPU-bound tasks to separate background threads.',
            'A pure multiprocessing pipeline where each image is processed end-to-end by a separate process in a pool, because network socket operations are highly CPU-intensive and benefit directly from multi-core parallelism.',
          ],
          correct_option: 'A',
          correct_answer:
            'A hybrid model using asyncio to handle concurrent image downloads, which offloads the downloaded image bytes to a multiprocessing.Pool for CPU-bound EXIF extraction and watermarking.',
          correct_answer_explanation:
            "Image downloading is network I/O-bound, which asyncio handles highly efficiently with very low overhead. EXIF extraction and watermarking are heavily CPU-bound. Offloading these CPU-intensive operations to a multiprocessing pool bypasses Python's GIL and utilizes multi-core hardware, avoiding blocking the main event loop.",
          feedback: 'Not Applicable',
          id: 'aa9c48d2-e648-4067-9a6a-5b988cdf2e52',
          row_number: 3,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
  {
    id: '3630d9ce-0b1a-4bbd-a5d4-84dee5dd5b93',
    row_number: 4,
    question:
      'In the provided multi-threaded order pipeline, simulating a high-traffic event causes severe thread starvation within the pipelineExecutor, reducing throughput to near zero. Which modification best resolves this performance bottleneck while maintaining robust asynchronous execution?',
    competency: 'Technical Skills',
    subCompetency: 'Java Programming',
    question_type: 'programming',
    scenario_title: 'Optimizing E-commerce Order Processing Pipeline',
    business_scenario:
      "An e-commerce platform is experiencing performance bottlenecks during high-traffic events. The system uses a multi-threaded Java application to process incoming orders, update inventory, and trigger notification emails. The current implementation relies on synchronized blocks and shared resource pools, leading to thread contention and high CPU utilization. The engineering team wants to transition this pipeline to use concurrent data structures, ExecutorService, and Java's CompletableFuture to process these orders asynchronously and improve throughput without risking data inconsistency.",
    code_snippet:
      'public class OrderPipeline {\n    private final ExecutorService pipelineExecutor = Executors.newFixedThreadPool(8);\n    private final InventoryService inventoryService = new InventoryService();\n\n    public CompletableFuture<OrderResult> processOrder(Order order) {\n        return CompletableFuture.supplyAsync(() -> {\n            boolean reserved = inventoryService.reserve(order.getItemId(), order.getQty());\n            if (!reserved) {\n                return new OrderResult(order, "OUT_OF_STOCK");\n            }\n            String pref = inventoryService.fetchNotificationPreference(order.getCustomerId());\n            return new OrderResult(order, "RESERVED", pref);\n        }, pipelineExecutor)\n        .thenApply(result -> {\n            if ("RESERVED".equals(result.getStatus())) {\n                sendEmailNotification(result).join();\n            }\n            return result;\n        });\n    }\n}',
    options: [
      'A. Replace the synchronous `.join()` call inside `thenApply` with `thenComposeAsync` to chain the email notification asynchronously, and assign blocking I/O tasks to a separate dedicated thread pool.',
      'B. Enclose both `inventoryService.reserve` and `sendEmailNotification` inside a single synchronized block and scale the `pipelineExecutor` thread count to 500.',
      'C. Reconfigure `pipelineExecutor` to use `ForkJoinPool.commonPool()` and handle the email notification task synchronously within the main execution thread.',
      'D. Replace the `CompletableFuture` chain with a parallel Stream that processes incoming orders concurrently using the JVM-wide default shared common pool.',
    ],
    correct_option: 'A',
    correct_answer:
      'A. Replace the synchronous `.join()` call inside `thenApply` with `thenComposeAsync` to chain the email notification asynchronously, and assign blocking I/O tasks to a separate dedicated thread pool.',
    correct_answer_explanation:
      'Invoking `.join()` inside a CompletableFuture callback blocks a thread from the limited `pipelineExecutor` pool. Under heavy traffic, this causes thread starvation because all threads become blocked waiting for network-intensive operations like email notifications to complete. Replacing `.join()` with `thenComposeAsync` and delegating the blocking network/email calls to a separate, dedicated I/O thread pool keeps the core pipeline threads free to process incoming orders.',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'In the provided multi-threaded order pipeline, simulating a high-traffic event causes severe thread starvation within the pipelineExecutor, reducing throughput to near zero. Which modification best resolves this performance bottleneck while maintaining robust asynchronous execution?',
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Java Programming',
          question_type: 'programming',
          scenario_title: 'Optimizing E-commerce Order Processing Pipeline',
          business_scenario:
            "An e-commerce platform is experiencing performance bottlenecks during high-traffic events. The system uses a multi-threaded Java application to process incoming orders, update inventory, and trigger notification emails. The current implementation relies on synchronized blocks and shared resource pools, leading to thread contention and high CPU utilization. The engineering team wants to transition this pipeline to use concurrent data structures, ExecutorService, and Java's CompletableFuture to process these orders asynchronously and improve throughput without risking data inconsistency.",
          code_snippet:
            'public class OrderPipeline {\n    private final ExecutorService pipelineExecutor = Executors.newFixedThreadPool(8);\n    private final InventoryService inventoryService = new InventoryService();\n\n    public CompletableFuture<OrderResult> processOrder(Order order) {\n        return CompletableFuture.supplyAsync(() -> {\n            boolean reserved = inventoryService.reserve(order.getItemId(), order.getQty());\n            if (!reserved) {\n                return new OrderResult(order, "OUT_OF_STOCK");\n            }\n            String pref = inventoryService.fetchNotificationPreference(order.getCustomerId());\n            return new OrderResult(order, "RESERVED", pref);\n        }, pipelineExecutor)\n        .thenApply(result -> {\n            if ("RESERVED".equals(result.getStatus())) {\n                sendEmailNotification(result).join();\n            }\n            return result;\n        });\n    }\n}',
          question:
            'In the provided multi-threaded order pipeline, simulating a high-traffic event causes severe thread starvation within the pipelineExecutor, reducing throughput to near zero. Which modification best resolves this performance bottleneck while maintaining robust asynchronous execution?',
          options: [
            'A. Replace the synchronous `.join()` call inside `thenApply` with `thenComposeAsync` to chain the email notification asynchronously, and assign blocking I/O tasks to a separate dedicated thread pool.',
            'B. Enclose both `inventoryService.reserve` and `sendEmailNotification` inside a single synchronized block and scale the `pipelineExecutor` thread count to 500.',
            'C. Reconfigure `pipelineExecutor` to use `ForkJoinPool.commonPool()` and handle the email notification task synchronously within the main execution thread.',
            'D. Replace the `CompletableFuture` chain with a parallel Stream that processes incoming orders concurrently using the JVM-wide default shared common pool.',
          ],
          correct_option: 'A',
          correct_answer:
            'A. Replace the synchronous `.join()` call inside `thenApply` with `thenComposeAsync` to chain the email notification asynchronously, and assign blocking I/O tasks to a separate dedicated thread pool.',
          correct_answer_explanation:
            'Invoking `.join()` inside a CompletableFuture callback blocks a thread from the limited `pipelineExecutor` pool. Under heavy traffic, this causes thread starvation because all threads become blocked waiting for network-intensive operations like email notifications to complete. Replacing `.join()` with `thenComposeAsync` and delegating the blocking network/email calls to a separate, dedicated I/O thread pool keeps the core pipeline threads free to process incoming orders.',
          feedback: 'Not Applicable',
          id: '3630d9ce-0b1a-4bbd-a5d4-84dee5dd5b93',
          row_number: 4,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
  {
    id: '6a512093-499b-4dce-8649-78edf8791016',
    row_number: 5,
    question:
      'To parse gigabytes of malformed legacy financial transactions without causing an OutOfMemoryError (OOM) due to collection accumulation in the JVM heap, which architectural refactoring should be applied to this parser class?',
    competency: 'Technical Skills',
    subCompetency: 'Java Programming',
    question_type: 'programming',
    scenario_title: 'Custom JSON Parser for Legacy Financial Records',
    business_scenario:
      'A financial services firm has millions of legacy transactions stored in a custom-structured text format that resembles partially malformed JSON. The team needs to parse these files and transform them into standardized Java objects for database ingestion. Standard libraries fail due to non-standard nesting and specific custom data types that require precise mapping. The task is to build a robust, custom stream-based parser in Java using core language features, custom exceptions, and efficient memory management to process gigabytes of data without triggering OutOfMemory errors.',
    code_snippet:
      'public class LegacyParser {\n    public List<Transaction> parseAll(InputStream in) throws Exception {\n        List<Transaction> records = new ArrayList<>();\n        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {\n            String line;\n            while ((line = reader.readLine()) != null) {\n                if (line.startsWith("{")) {\n                    Transaction t = parseTransaction(reader);\n                    records.add(t);\n                }\n            }\n        }\n        return records;\n    }\n}',
    options: [
      'A. Refactor the method to return a lazy, custom `Stream<Transaction>` using a custom `Spliterator` that parses records line-by-line, avoiding the accumulation of transactions in heap memory.',
      'B. Increase the JVM heap size using `-Xmx32g` and replace the `ArrayList` with a thread-safe `CopyOnWriteArrayList` to handle concurrent additions.',
      'C. Read the entire `InputStream` into a single high-performance `ByteBuffer` and use a multi-threaded parallel pool to parse segments of raw bytes in memory.',
      'D. Replace the `BufferedReader` with a memory-mapped file buffer (`MappedByteBuffer`) and immediately deserialize everything into a cached `WeakHashMap` object cache.',
    ],
    correct_option: 'A',
    correct_answer:
      'A. Refactor the method to return a lazy, custom `Stream<Transaction>` using a custom `Spliterator` that parses records line-by-line, avoiding the accumulation of transactions in heap memory.',
    correct_answer_explanation:
      'Accumulating millions of transaction objects in a standard ArrayList inside heap memory inevitably leads to an OutOfMemoryError when processing gigabytes of data. Transitioning to a stream-based lazy evaluation approach using a Spliterator allows consumers to pull and process transactions one at a time, garbage collecting old records and keeping the heap footprint low and stable.',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'To parse gigabytes of malformed legacy financial transactions without causing an OutOfMemoryError (OOM) due to collection accumulation in the JVM heap, which architectural refactoring should be applied to this parser class?',
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Java Programming',
          question_type: 'programming',
          scenario_title: 'Custom JSON Parser for Legacy Financial Records',
          business_scenario:
            'A financial services firm has millions of legacy transactions stored in a custom-structured text format that resembles partially malformed JSON. The team needs to parse these files and transform them into standardized Java objects for database ingestion. Standard libraries fail due to non-standard nesting and specific custom data types that require precise mapping. The task is to build a robust, custom stream-based parser in Java using core language features, custom exceptions, and efficient memory management to process gigabytes of data without triggering OutOfMemory errors.',
          code_snippet:
            'public class LegacyParser {\n    public List<Transaction> parseAll(InputStream in) throws Exception {\n        List<Transaction> records = new ArrayList<>();\n        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {\n            String line;\n            while ((line = reader.readLine()) != null) {\n                if (line.startsWith("{")) {\n                    Transaction t = parseTransaction(reader);\n                    records.add(t);\n                }\n            }\n        }\n        return records;\n    }\n}',
          question:
            'To parse gigabytes of malformed legacy financial transactions without causing an OutOfMemoryError (OOM) due to collection accumulation in the JVM heap, which architectural refactoring should be applied to this parser class?',
          options: [
            'A. Refactor the method to return a lazy, custom `Stream<Transaction>` using a custom `Spliterator` that parses records line-by-line, avoiding the accumulation of transactions in heap memory.',
            'B. Increase the JVM heap size using `-Xmx32g` and replace the `ArrayList` with a thread-safe `CopyOnWriteArrayList` to handle concurrent additions.',
            'C. Read the entire `InputStream` into a single high-performance `ByteBuffer` and use a multi-threaded parallel pool to parse segments of raw bytes in memory.',
            'D. Replace the `BufferedReader` with a memory-mapped file buffer (`MappedByteBuffer`) and immediately deserialize everything into a cached `WeakHashMap` object cache.',
          ],
          correct_option: 'A',
          correct_answer:
            'A. Refactor the method to return a lazy, custom `Stream<Transaction>` using a custom `Spliterator` that parses records line-by-line, avoiding the accumulation of transactions in heap memory.',
          correct_answer_explanation:
            'Accumulating millions of transaction objects in a standard ArrayList inside heap memory inevitably leads to an OutOfMemoryError when processing gigabytes of data. Transitioning to a stream-based lazy evaluation approach using a Spliterator allows consumers to pull and process transactions one at a time, garbage collecting old records and keeping the heap footprint low and stable.',
          feedback: 'Not Applicable',
          id: '6a512093-499b-4dce-8649-78edf8791016',
          row_number: 5,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
  {
    id: '03ff357c-9cea-4ed2-8f75-cd6034b44b64',
    row_number: 6,
    question:
      'A low-latency trading platform running on a 16GB heap suffers from 150ms stop-the-world (STW) pauses under high transaction volumes. To maintain sub-millisecond GC pause times, the team plans to migrate from G1 to ZGC. What operational trade-offs and tuning adjustments must they consider for this migration?',
    competency: 'Technical Skills',
    subCompetency: 'Java Programming',
    question_type: 'non-programming',
    scenario_title: 'Garbage Collector Tuning for Low-Latency Trading Platform',
    business_scenario:
      'A high-frequency trading platform built in Java is experiencing sporadic latency spikes (stop-the-world pauses) that impact trade execution times. The engineering team is analyzing heap dumps and GC logs to decide whether to migrate from the G1 Garbage Collector to ZGC (Z Garbage Collector) or Shenandoah, and what specific JVM flag optimizations are needed. They must evaluate the trade-offs between throughput, footprint, and response-time predictability under high allocation rates without writing or refactoring any code.',
    code_snippet: '',
    options: [
      'A. ZGC will dramatically lower GC pause times to sub-milliseconds, but concurrent GC threads will consume extra CPU cycles; they must tune `-XX:ConcGCThreads` to prevent allocation stalls under high allocation rates.',
      'B. ZGC completely eliminates application CPU overhead but requires an immediate 100% expansion of JVM heap size, necessitating the use of the `-XX:G1ReservePercent` flag to prevent heap division.',
      'C. Migrating to ZGC eliminates the need for any manual thread tuning because ZGC automatically utilizes GPU-assisted parallel collection cycles, resulting in zero overhead on the main application CPU.',
      'D. ZGC guarantees hard real-time execution by instantly shifting compaction processes to an asynchronous disk swap file, which introduces a disk I/O write throughput penalty rather than CPU usage.',
    ],
    correct_option: 'A',
    correct_answer:
      'A. ZGC will dramatically lower GC pause times to sub-milliseconds, but concurrent GC threads will consume extra CPU cycles; they must tune `-XX:ConcGCThreads` to prevent allocation stalls under high allocation rates.',
    correct_answer_explanation:
      'ZGC achieves ultra-low latency by performing GC phases concurrently with application threads. This introduces a trade-off: GC threads actively compete with application threads for CPU. Under extreme allocation rates, if the GC cannot keep up, application threads face allocation stalls. Adjusting the concurrent GC thread count via `-XX:ConcGCThreads` balances GC execution speed against CPU consumption.',
    isSaved: false,
    regeneration_limit: 2,
    versions: [
      {
        version: 1,
        text: 'A low-latency trading platform running on a 16GB heap suffers from 150ms stop-the-world (STW) pauses under high transaction volumes. To maintain sub-millisecond GC pause times, the team plans to migrate from G1 to ZGC. What operational trade-offs and tuning adjustments must they consider for this migration?',
        label: 'Version 1 — Original',
        raw: {
          competency: 'Technical Skills',
          sub_competency: 'Java Programming',
          question_type: 'non-programming',
          scenario_title:
            'Garbage Collector Tuning for Low-Latency Trading Platform',
          business_scenario:
            'A high-frequency trading platform built in Java is experiencing sporadic latency spikes (stop-the-world pauses) that impact trade execution times. The engineering team is analyzing heap dumps and GC logs to decide whether to migrate from the G1 Garbage Collector to ZGC (Z Garbage Collector) or Shenandoah, and what specific JVM flag optimizations are needed. They must evaluate the trade-offs between throughput, footprint, and response-time predictability under high allocation rates without writing or refactoring any code.',
          code_snippet: '',
          question:
            'A low-latency trading platform running on a 16GB heap suffers from 150ms stop-the-world (STW) pauses under high transaction volumes. To maintain sub-millisecond GC pause times, the team plans to migrate from G1 to ZGC. What operational trade-offs and tuning adjustments must they consider for this migration?',
          options: [
            'A. ZGC will dramatically lower GC pause times to sub-milliseconds, but concurrent GC threads will consume extra CPU cycles; they must tune `-XX:ConcGCThreads` to prevent allocation stalls under high allocation rates.',
            'B. ZGC completely eliminates application CPU overhead but requires an immediate 100% expansion of JVM heap size, necessitating the use of the `-XX:G1ReservePercent` flag to prevent heap division.',
            'C. Migrating to ZGC eliminates the need for any manual thread tuning because ZGC automatically utilizes GPU-assisted parallel collection cycles, resulting in zero overhead on the main application CPU.',
            'D. ZGC guarantees hard real-time execution by instantly shifting compaction processes to an asynchronous disk swap file, which introduces a disk I/O write throughput penalty rather than CPU usage.',
          ],
          correct_option: 'A',
          correct_answer:
            'A. ZGC will dramatically lower GC pause times to sub-milliseconds, but concurrent GC threads will consume extra CPU cycles; they must tune `-XX:ConcGCThreads` to prevent allocation stalls under high allocation rates.',
          correct_answer_explanation:
            'ZGC achieves ultra-low latency by performing GC phases concurrently with application threads. This introduces a trade-off: GC threads actively compete with application threads for CPU. Under extreme allocation rates, if the GC cannot keep up, application threads face allocation stalls. Adjusting the concurrent GC thread count via `-XX:ConcGCThreads` balances GC execution speed against CPU consumption.',
          feedback: 'Not Applicable',
          id: '03ff357c-9cea-4ed2-8f75-cd6034b44b64',
          row_number: 6,
          regeneration_limit: 2,
          assessment_format: 'static',
          shuffle_per_candidate: false,
          competency_id: 'd6bd17dd-93d7-4c4a-9f9c-8f50584c9bbf',
          subcompetency_id: null,
        },
      },
    ],
  },
];

function saveToTxt(data, filePath = './final-list_2.txt') {
  // Create parent directory if it doesn't exist
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Save pretty-printed JSON to the txt file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`File saved to ${filePath}`);
}

const finalList = attachQuestionsByCompetency(competencyList, questionsList);

// saveToTxt(finalList); // Creates final-list.txt if it doesn't exist

function mapQuestion(question) {
  const {
    question: questionText,
    options = [],
    correct_answer,
    code_snippet,
    ...questionDetails
  } = question;

  return {
    question_text: questionText,

    // Convert options array -> option_1, option_2, ...
    ...Object.fromEntries(
      options.map((option, index) => [`option_${index + 1}`, option]),
    ),

    correct_option_text: correct_answer,
    code_snippets: code_snippet,
    hints_text: null,
    marks: 1,
    source: 'ai-generated',

    // Everything else
    question_details: questionDetails,
  };
}

// saveToTxt(mapQuestion(questionsList[0]));

const DSL = "# Principal Backend Engineer (Java) Roadmap\n## Advanced Java Language Features\n### Modern Java Constructs\n- Java 8+ Features (Lambdas, Streams, Optionals) [1]\n- Records and Pattern Matching [1]\n- Sealed Classes and Interfaces [2]\n- Virtual Threads (Project Loom) [1]\n@m.assessment: Module Assessment\n### Concurrency and Parallelism\n- Advanced Concurrency Utilities (Executors, Fork/Join) [1]\n- Reactive Programming with Project Reactor/RxJava [2]\n- Non-blocking I/O (NIO.2) [2]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## High-Performance Backend Systems\n### Performance Tuning and Profiling\n- JVM Internals and Memory Management [1]\n- Garbage Collection Tuning [1]\n- Java Profiling Tools (JFR, VisualVM, YourKit) [1]\n- Benchmarking with JMH [2]\n@m.assessment: Module Assessment\n### Distributed Systems Patterns\n- Microservices Architecture Principles [1]\n- Event-Driven Architectures (Kafka, RabbitMQ) [1]\n- Distributed Caching (Redis, Hazelcast) [2]\n- API Gateway and Service Mesh Concepts [2]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Robust and Scalable Architectures\n### Design Patterns and Principles\n- Advanced Design Patterns (e.g., Saga, CQRS) [1]\n- SOLID Principles in Practice [1]\n- Domain-Driven Design (DDD) [2]\n- Clean Architecture and Hexagonal Architecture [2]\n@m.assessment: Module Assessment\n### Database and Data Management\n- Advanced SQL and NoSQL Database Optimization [1]\n- ORM Deep Dive (Hibernate/JPA Performance) [1]\n- Data Consistency in Distributed Systems [2]\n- Polyglot Persistence Strategies [3]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Cloud-Native and DevOps\n### Cloud Platforms and Deployment\n- Containerization with Docker and Kubernetes [1]\n- Cloud Providers (AWS, Azure, GCP) for Java Apps [1]\n- Serverless Architectures (AWS Lambda, Azure Functions) [2]\n- Infrastructure as Code (Terraform) [3]\n@m.assessment: Module Assessment\n### Observability and Reliability\n- Logging Best Practices (SLF4J, Logback) [1]\n- Monitoring and Alerting (Prometheus, Grafana) [1]\n- Tracing (OpenTelemetry, Jaeger) [2]\n- Chaos Engineering Principles [3]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n## Leadership and Mentorship\n### Technical Leadership\n- Code Review Best Practices [1]\n- Mentoring Junior Developers [2]\n- System Design Interview Preparation [1]\n- Architectural Decision Records (ADRs) [2]\n@m.assessment: Module Assessment\n### Project Management and Best Practices\n- Agile Methodologies (Scrum, Kanban) [1]\n- Git Advanced Workflows [1]\n- CI/CD Pipelines (Jenkins, GitLab CI, GitHub Actions) [1]\n@m.assessment: Module Assessment\n@t.assessment: Assessment\n@r.assessment: Final Assessment\n@r.project: Capstone Project"


saveToTxt(getReactflowDiagramFromRoadmapDSL(DSL))
