import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const dummyAFDetails = {
  data: {},
  file: {
    filename: 'AI_Engineer_Assessment_100_Questions.xlsx',
    file_size_bytes: 33557,
    file_size_display: '32.8 KB',
  },
  question_groups: [
    {
      competency: 'Programming & Software Engineering',
      sub_competency: 'Python Programming',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 1,
          question_text: 'What is the output of `print(type([]))` in Python?',
          question_type: 'MCQ',
          option_1: "<class 'list'>",
          option_2: "<class 'tuple'>",
          option_3: "<class 'dict'>",
          option_4: "<class 'set'>",
          correct_option_text: "<class 'list'>",
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Python Programming',
          topic: 'Python Basics',
          subtopic: 'Data Types',
          code_snippets: '',
          hints_text:
            'Think about what a pair of square brackets creates literally.',
          marks: 1,
          solution_explanation:
            "`[]` creates an empty list literal, so `type()` returns `<class 'list'>`.",
        },
        {
          ID: 2,
          question_text:
            'Which command is used to create a virtual environment in Python using the built-in module?',
          question_type: 'MCQ',
          option_1: 'python -m venv env',
          option_2: 'pip install venv',
          option_3: 'python venv create',
          option_4: 'conda venv new',
          correct_option_text: 'python -m venv env',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Python Programming',
          topic: 'Python Basics',
          subtopic: 'Environment Management',
          code_snippets: '',
          hints_text: '`venv` is a built-in standard library module.',
          marks: 1,
          solution_explanation:
            'The `venv` module is invoked as `python -m venv <name>` to create an isolated Python environment.',
        },
        {
          ID: 3,
          question_text: 'What will be the output of the following code?',
          question_type: 'MCQ',
          option_1: '[1] then [2]',
          option_2: '[1] then [1, 2]',
          option_3: '[1, 2] then [1, 2]',
          option_4: 'Raises an error',
          correct_option_text: '[1] then [1, 2]',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Python Programming',
          topic: 'Python Basics',
          subtopic: 'Mutable Default Arguments',
          code_snippets:
            'def func(a, b=[]):\n    b.append(a)\n    return b\nprint(func(1))\nprint(func(2))',
          hints_text:
            'Default mutable arguments are evaluated only once, at function definition time.',
          marks: 3,
          solution_explanation:
            'The default list `b=[]` is created once when the function is defined, so it persists and accumulates values across calls: `func(1)` returns `[1]`, and `func(2)` returns `[1, 2]`.',
        },
        {
          ID: 4,
          question_text:
            'What does the `yield` keyword do inside a Python function?',
          question_type: 'MCQ',
          option_1: 'Terminates a function immediately',
          option_2:
            'Returns a value and pauses execution so it can resume later',
          option_3: 'Raises an exception',
          option_4: 'Imports a module lazily',
          correct_option_text:
            'Returns a value and pauses execution so it can resume later',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Python Programming',
          topic: 'Python Basics',
          subtopic: 'Generators',
          code_snippets: '',
          hints_text:
            'This keyword is central to how generator functions work.',
          marks: 2,
          solution_explanation:
            "`yield` produces a value and suspends the function's execution state, allowing it to resume from that exact point on the next call — this is the basis of Python generators.",
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Programming & Software Engineering',
      sub_competency: 'Data Structures & Algorithms',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 5,
          question_text:
            'What is the average-case time complexity of searching for an element in a balanced binary search tree?',
          question_type: 'MCQ',
          option_1: 'O(1)',
          option_2: 'O(log n)',
          option_3: 'O(n)',
          option_4: 'O(n log n)',
          correct_option_text: 'O(log n)',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Data Structures & Algorithms',
          topic: 'DSA',
          subtopic: 'Trees',
          code_snippets: '',
          hints_text: 'Consider the height of a balanced tree relative to n.',
          marks: 1,
          solution_explanation:
            'A balanced BST has height O(log n), so a search that eliminates roughly half the remaining nodes at each level takes O(log n) time.',
        },
        {
          ID: 6,
          question_text:
            'Which combination of data structures is most suitable for implementing an efficient Least Recently Used (LRU) cache?',
          question_type: 'MCQ',
          option_1: 'A single array',
          option_2: 'A hash map combined with a doubly linked list',
          option_3: 'A stack only',
          option_4: 'A binary search tree only',
          correct_option_text: 'A hash map combined with a doubly linked list',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Data Structures & Algorithms',
          topic: 'DSA',
          subtopic: 'Caching Structures',
          code_snippets: '',
          hints_text:
            'You need O(1) average time for both lookups and reordering/eviction.',
          marks: 2,
          solution_explanation:
            'A hash map gives O(1) average lookup, while a doubly linked list gives O(1) insertion/removal for reordering and evicting the least recently used item — combined, they enable an efficient O(1) LRU cache.',
        },
        {
          ID: 7,
          question_text:
            'What is the time complexity of building a min-heap from an unsorted array of n elements using the standard heapify algorithm?',
          question_type: 'MCQ',
          option_1: 'O(n log n)',
          option_2: 'O(n)',
          option_3: 'O(n^2)',
          option_4: 'O(log n)',
          correct_option_text: 'O(n)',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Data Structures & Algorithms',
          topic: 'DSA',
          subtopic: 'Heaps',
          code_snippets: '',
          hints_text:
            'The bottom-up heap construction is more efficient than repeatedly inserting elements.',
          marks: 3,
          solution_explanation:
            'Although each individual sift-down can take O(log n), the bottom-up heapify algorithm builds the entire heap in O(n) total time due to the way work is distributed across levels.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Programming & Software Engineering',
      sub_competency: 'Software Engineering Best Practices',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 8,
          question_text:
            'What is the primary purpose of writing unit tests for a software module?',
          question_type: 'MCQ',
          option_1: "To document the code's style guide",
          option_2:
            'To verify that individual components work as expected in isolation',
          option_3: 'To deploy code directly to production',
          option_4: 'To optimize the runtime performance of the code',
          correct_option_text:
            'To verify that individual components work as expected in isolation',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Software Engineering Best Practices',
          topic: 'SW Eng',
          subtopic: 'Testing',
          code_snippets: '',
          hints_text: "Think about what the word 'unit' refers to.",
          marks: 1,
          solution_explanation:
            'Unit tests validate that individual units of code, such as functions or classes, behave correctly on their own, independent of the rest of the system.',
        },
        {
          ID: 9,
          question_text:
            "In Git, what does 'rebasing' a branch onto another branch do?",
          question_type: 'MCQ',
          option_1: "Deletes the branch's commit history",
          option_2:
            "Reapplies the branch's commits on top of another base commit",
          option_3: 'Merges two branches, always creating a merge commit',
          option_4: 'Reverts the most recent commit',
          correct_option_text:
            "Reapplies the branch's commits on top of another base commit",
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Software Engineering Best Practices',
          topic: 'SW Eng',
          subtopic: 'Version Control',
          code_snippets: '',
          hints_text: 'Rebasing rewrites history to keep it linear.',
          marks: 2,
          solution_explanation:
            'Rebasing takes the commits from the current branch and replays them on top of a new base commit, producing a linear history rather than the merge commit produced by a standard merge.',
        },
        {
          ID: 10,
          question_text:
            'Which SOLID design principle states that a class should have only one reason to change?',
          question_type: 'MCQ',
          option_1: 'Open/Closed Principle',
          option_2: 'Single Responsibility Principle',
          option_3: 'Liskov Substitution Principle',
          option_4: 'Dependency Inversion Principle',
          correct_option_text: 'Single Responsibility Principle',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Programming & Software Engineering',
          sub_competency: 'Software Engineering Best Practices',
          topic: 'SW Eng',
          subtopic: 'SOLID Principles',
          code_snippets: '',
          hints_text: "This is the 'S' in SOLID.",
          marks: 2,
          solution_explanation:
            'The Single Responsibility Principle states that a class should have exactly one reason to change, meaning it should focus on a single, well-defined responsibility.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Mathematics & Statistics for AI',
      sub_competency: 'Linear Algebra',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 11,
          question_text: 'What does the rank of a matrix represent?',
          question_type: 'MCQ',
          option_1: 'The number of rows in the matrix',
          option_2: 'The number of linearly independent rows or columns',
          option_3: 'The determinant of the matrix',
          option_4: "The sum of the matrix's eigenvalues",
          correct_option_text:
            'The number of linearly independent rows or columns',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Linear Algebra',
          topic: 'Linear Algebra',
          subtopic: 'Matrix Properties',
          code_snippets: '',
          hints_text: 'It relates to linear independence, not just size.',
          marks: 1,
          solution_explanation:
            'The rank of a matrix is the maximum number of linearly independent row (or equivalently column) vectors it contains.',
        },
        {
          ID: 12,
          question_text: 'If A is an orthogonal matrix, what does A^T A equal?',
          question_type: 'MCQ',
          option_1: 'A',
          option_2: 'The identity matrix',
          option_3: 'The zero matrix',
          option_4: 'A^-1',
          correct_option_text: 'The identity matrix',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Linear Algebra',
          topic: 'Linear Algebra',
          subtopic: 'Orthogonal Matrices',
          code_snippets: '',
          hints_text:
            'Orthogonal matrices have columns that are unit vectors and mutually perpendicular.',
          marks: 2,
          solution_explanation:
            'For an orthogonal matrix A, A^T equals A^-1 by definition, so A^T A = A^-1 A = I, the identity matrix.',
        },
        {
          ID: 13,
          question_text:
            'What do the eigenvectors of a linear transformation matrix represent?',
          question_type: 'MCQ',
          option_1:
            'Directions that only get scaled (not rotated) when the transformation is applied',
          option_2: 'Directions that always get rotated by 90 degrees',
          option_3: 'The rows containing the maximum values',
          option_4: 'Randomly chosen directions in space',
          correct_option_text:
            'Directions that only get scaled (not rotated) when the transformation is applied',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Linear Algebra',
          topic: 'Linear Algebra',
          subtopic: 'Eigenvalues and Eigenvectors',
          code_snippets: '',
          hints_text: 'Recall the defining equation Av = λv.',
          marks: 2,
          solution_explanation:
            'An eigenvector v of matrix A satisfies Av = λv for some scalar λ (the eigenvalue), meaning the transformation only scales v without changing its direction.',
        },
        {
          ID: 14,
          question_text:
            'In Singular Value Decomposition (SVD), a matrix A is decomposed into which form?',
          question_type: 'MCQ',
          option_1: 'A = LU',
          option_2: 'A = QR',
          option_3: 'A = UΣV^T',
          option_4: 'A = LDL^T',
          correct_option_text: 'A = UΣV^T',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Linear Algebra',
          topic: 'Linear Algebra',
          subtopic: 'Singular Value Decomposition',
          code_snippets: '',
          hints_text: 'Σ is a diagonal matrix containing the singular values.',
          marks: 3,
          solution_explanation:
            'SVD decomposes a matrix A into U (left singular vectors), Σ (a diagonal matrix of singular values), and V^T (right singular vectors transposed).',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Mathematics & Statistics for AI',
      sub_competency: 'Probability & Statistics',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 15,
          question_text: "What does Bayes' Theorem relate?",
          question_type: 'MCQ',
          option_1: 'Correlation and causation',
          option_2: 'Prior and posterior probabilities given new evidence',
          option_3: 'The mean and variance of a distribution',
          option_4: 'Sample size and confidence interval width',
          correct_option_text:
            'Prior and posterior probabilities given new evidence',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Probability & Statistics',
          topic: 'Probability',
          subtopic: "Bayes' Theorem",
          code_snippets: '',
          hints_text: 'Consider the formula P(A|B).',
          marks: 1,
          solution_explanation:
            "Bayes' Theorem relates the posterior probability P(A|B) to the prior probability P(A), the likelihood P(B|A), and the evidence P(B).",
        },
        {
          ID: 16,
          question_text:
            'Which statistical measure describes the spread of a distribution around its mean?',
          question_type: 'MCQ',
          option_1: 'Mean',
          option_2: 'Median',
          option_3: 'Variance',
          option_4: 'Mode',
          correct_option_text: 'Variance',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Probability & Statistics',
          topic: 'Statistics',
          subtopic: 'Descriptive Statistics',
          code_snippets: '',
          hints_text: 'It is based on squared deviations from the mean.',
          marks: 1,
          solution_explanation:
            'Variance measures the average squared deviation of data points from the mean, quantifying how spread out the distribution is.',
        },
        {
          ID: 17,
          question_text:
            'In hypothesis testing, what does the p-value represent?',
          question_type: 'MCQ',
          option_1: 'The probability that the null hypothesis is true',
          option_2:
            'The probability of observing data as extreme as (or more extreme than) the observed result, assuming the null hypothesis is true',
          option_3: 'The effect size of the observed result',
          option_4: 'The confidence level chosen by the researcher',
          correct_option_text:
            'The probability of observing data as extreme as (or more extreme than) the observed result, assuming the null hypothesis is true',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Probability & Statistics',
          topic: 'Statistics',
          subtopic: 'Hypothesis Testing',
          code_snippets: '',
          hints_text:
            'The p-value is always computed conditional on the null hypothesis.',
          marks: 2,
          solution_explanation:
            'The p-value is the probability, calculated under the assumption that the null hypothesis is true, of observing a result at least as extreme as the one actually obtained.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Mathematics & Statistics for AI',
      sub_competency: 'Optimization Techniques',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 18,
          question_text:
            'What is the main idea behind Stochastic Gradient Descent (SGD) compared to full-batch Gradient Descent?',
          question_type: 'MCQ',
          option_1: 'It uses the entire dataset for every parameter update',
          option_2:
            'It updates parameters using a single sample or a small mini-batch at a time',
          option_3: 'It never converges to a minimum',
          option_4: 'It only works for convex loss functions',
          correct_option_text:
            'It updates parameters using a single sample or a small mini-batch at a time',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Optimization Techniques',
          topic: 'Optimization',
          subtopic: 'Gradient Descent Variants',
          code_snippets: '',
          hints_text: "The word 'stochastic' hints at randomness/sampling.",
          marks: 1,
          solution_explanation:
            'SGD approximates the true gradient using one sample or a small mini-batch per update, making each step faster and noisier than the gradient computed from the full dataset in batch gradient descent.',
        },
        {
          ID: 19,
          question_text:
            'What key problem does the Adam optimizer address by combining momentum with adaptive per-parameter learning rates?',
          question_type: 'MCQ',
          option_1: 'Overfitting on small datasets',
          option_2: 'Vanishing gradients only',
          option_3: 'Slow and unstable convergence experienced with plain SGD',
          option_4: 'Data leakage between train and test sets',
          correct_option_text:
            'Slow and unstable convergence experienced with plain SGD',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Optimization Techniques',
          topic: 'Optimization',
          subtopic: 'Adaptive Optimizers',
          code_snippets: '',
          hints_text: 'Adam merges ideas from momentum and RMSProp.',
          marks: 2,
          solution_explanation:
            'Adam combines momentum (smoothing update direction using past gradients) with adaptive, per-parameter learning rates (similar to RMSProp), improving convergence speed and stability over plain SGD.',
        },
        {
          ID: 20,
          question_text:
            'A convex optimization problem guarantees which property about its local minima?',
          question_type: 'MCQ',
          option_1:
            'There can be multiple distinct local minima with different objective values',
          option_2: 'Every local minimum is also a global minimum',
          option_3: 'No minimum exists for convex functions',
          option_4: 'The function must be non-differentiable everywhere',
          correct_option_text: 'Every local minimum is also a global minimum',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Mathematics & Statistics for AI',
          sub_competency: 'Optimization Techniques',
          topic: 'Optimization',
          subtopic: 'Convexity',
          code_snippets: '',
          hints_text:
            'Think about the geometric shape a convex function forms.',
          marks: 3,
          solution_explanation:
            'For convex functions, any local minimum is guaranteed to also be a global minimum, which is a key property that simplifies optimization considerably.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Machine Learning Fundamentals',
      sub_competency: 'Supervised Learning',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 21,
          question_text:
            'Which algorithm is primarily used for classification by finding the hyperplane that maximizes the margin between classes?',
          question_type: 'MCQ',
          option_1: 'K-Means',
          option_2: 'Support Vector Machine',
          option_3: 'Principal Component Analysis',
          option_4: 'DBSCAN',
          correct_option_text: 'Support Vector Machine',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Supervised Learning',
          topic: 'Supervised Learning',
          subtopic: 'Classification Algorithms',
          code_snippets: '',
          hints_text: 'This algorithm is known as a maximum-margin classifier.',
          marks: 1,
          solution_explanation:
            'A Support Vector Machine (SVM) finds the optimal separating hyperplane that maximizes the margin between the closest points of different classes.',
        },
        {
          ID: 22,
          question_text:
            'In a Random Forest, how are individual decision trees typically made diverse from one another?',
          question_type: 'MCQ',
          option_1: 'By using the same features and same data for every tree',
          option_2:
            'Via bootstrap sampling of the data and random selection of feature subsets at each split',
          option_3:
            'By training trees sequentially on the residual errors of previous trees',
          option_4: 'By restricting the model to only categorical features',
          correct_option_text:
            'Via bootstrap sampling of the data and random selection of feature subsets at each split',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Supervised Learning',
          topic: 'Supervised Learning',
          subtopic: 'Ensemble Methods',
          code_snippets: '',
          hints_text: "Think 'bagging' plus feature randomness.",
          marks: 2,
          solution_explanation:
            'Random Forests use bootstrap aggregating (bagging) to sample training data with replacement for each tree, and randomly select a subset of features at each split, decorrelating the trees.',
        },
        {
          ID: 23,
          question_text:
            'What key characteristic distinguishes Gradient Boosting from Random Forest?',
          question_type: 'MCQ',
          option_1:
            'Gradient Boosting builds trees independently and in parallel',
          option_2:
            'Gradient Boosting builds trees sequentially, with each tree correcting the errors of the previous ones',
          option_3: 'Random Forest uses gradients to update tree weights',
          option_4: 'They are functionally identical algorithms',
          correct_option_text:
            'Gradient Boosting builds trees sequentially, with each tree correcting the errors of the previous ones',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Supervised Learning',
          topic: 'Supervised Learning',
          subtopic: 'Ensemble Methods',
          code_snippets: '',
          hints_text: 'Consider the difference between boosting and bagging.',
          marks: 2,
          solution_explanation:
            "Gradient Boosting trains trees sequentially, where each new tree is fit to the residual errors of the combined ensemble so far, unlike Random Forest's independent, parallel trees.",
        },
        {
          ID: 24,
          question_text:
            'What is the purpose of L1/L2 regularization in a linear regression model?',
          question_type: 'MCQ',
          option_1: "To increase the model's complexity",
          option_2: 'To penalize large coefficients, reducing overfitting',
          option_3: 'To speed up training regardless of accuracy',
          option_4: 'To convert the regression task into a classification task',
          correct_option_text:
            'To penalize large coefficients, reducing overfitting',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Supervised Learning',
          topic: 'Supervised Learning',
          subtopic: 'Regularization',
          code_snippets: '',
          hints_text:
            'Regularization adds a penalty term to the loss function.',
          marks: 1,
          solution_explanation:
            "L1/L2 regularization adds a penalty proportional to the size of the model's coefficients to the loss function, discouraging overly complex models and helping reduce overfitting.",
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Machine Learning Fundamentals',
      sub_competency: 'Unsupervised Learning',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 25,
          question_text:
            'What is the objective of the K-Means clustering algorithm?',
          question_type: 'MCQ',
          option_1:
            "Minimize the within-cluster sum of squared distances to each cluster's centroid",
          option_2: 'Maximize the total number of clusters formed',
          option_3: 'Find a hyperplane that separates two classes',
          option_4: 'Predict a continuous target variable',
          correct_option_text:
            "Minimize the within-cluster sum of squared distances to each cluster's centroid",
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Unsupervised Learning',
          topic: 'Unsupervised Learning',
          subtopic: 'Clustering',
          code_snippets: '',
          hints_text: 'K-Means is a centroid-based method.',
          marks: 1,
          solution_explanation:
            'K-Means iteratively assigns points to their nearest centroid and updates centroids to minimize the within-cluster sum of squared distances.',
        },
        {
          ID: 26,
          question_text:
            'Which dimensionality reduction technique preserves the directions of maximum variance in the data?',
          question_type: 'MCQ',
          option_1: 't-SNE',
          option_2: 'Principal Component Analysis (PCA)',
          option_3: 'K-Means',
          option_4: 'Apriori Algorithm',
          correct_option_text: 'Principal Component Analysis (PCA)',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Unsupervised Learning',
          topic: 'Unsupervised Learning',
          subtopic: 'Dimensionality Reduction',
          code_snippets: '',
          hints_text:
            'This technique uses the eigenvectors of the covariance matrix.',
          marks: 2,
          solution_explanation:
            'PCA projects data onto orthogonal principal components ordered by the amount of variance they capture, preserving the directions of maximum variance.',
        },
        {
          ID: 27,
          question_text:
            'DBSCAN clustering primarily identifies clusters based on which concept?',
          question_type: 'MCQ',
          option_1: 'A fixed number of clusters specified beforehand',
          option_2: 'The density of points in a local neighborhood',
          option_3: 'Distance to a single fixed centroid only',
          option_4: 'Hierarchical merging of pairs of clusters',
          correct_option_text: 'The density of points in a local neighborhood',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Unsupervised Learning',
          topic: 'Unsupervised Learning',
          subtopic: 'Density-Based Clustering',
          code_snippets: '',
          hints_text: 'DBSCAN stands for Density-Based Spatial Clustering.',
          marks: 2,
          solution_explanation:
            'DBSCAN groups together points that are closely packed in dense regions, while marking points in sparse, low-density regions as noise/outliers, without requiring a predefined number of clusters.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Machine Learning Fundamentals',
      sub_competency: 'Model Evaluation & Metrics',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 28,
          question_text:
            'In a highly imbalanced classification dataset, which metric is generally more informative than plain accuracy?',
          question_type: 'MCQ',
          option_1: 'Accuracy',
          option_2: 'F1-score',
          option_3: 'Mean Squared Error',
          option_4: 'R-squared',
          correct_option_text: 'F1-score',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Model Evaluation & Metrics',
          topic: 'Model Evaluation',
          subtopic: 'Classification Metrics',
          code_snippets: '',
          hints_text: 'This metric balances two other metrics.',
          marks: 1,
          solution_explanation:
            'The F1-score balances precision and recall, giving a more meaningful measure of performance than accuracy when class distributions are heavily imbalanced.',
        },
        {
          ID: 29,
          question_text:
            'What does the Area Under the ROC Curve (AUC-ROC) measure?',
          question_type: 'MCQ',
          option_1: "The model's training speed",
          option_2:
            "The model's ability to distinguish between classes across all classification thresholds",
          option_3: 'The mean absolute error of predictions',
          option_4: 'The number of features used by the model',
          correct_option_text:
            "The model's ability to distinguish between classes across all classification thresholds",
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Model Evaluation & Metrics',
          topic: 'Model Evaluation',
          subtopic: 'Classification Metrics',
          code_snippets: '',
          hints_text:
            'It plots true positive rate against false positive rate.',
          marks: 2,
          solution_explanation:
            'AUC-ROC summarizes the trade-off between the true positive rate and false positive rate across all possible classification thresholds, measuring overall discriminative ability.',
        },
        {
          ID: 30,
          question_text:
            'What is the primary purpose of k-fold cross-validation?',
          question_type: 'MCQ',
          option_1: 'To artificially increase the size of the dataset',
          option_2:
            'To obtain a more reliable estimate of model performance by testing on multiple train/validation splits',
          option_3: 'To eliminate the need for a separate test set entirely',
          option_4:
            'To speed up hyperparameter tuning without any performance evaluation',
          correct_option_text:
            'To obtain a more reliable estimate of model performance by testing on multiple train/validation splits',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Machine Learning Fundamentals',
          sub_competency: 'Model Evaluation & Metrics',
          topic: 'Model Evaluation',
          subtopic: 'Cross-Validation',
          code_snippets: '',
          hints_text: 'The results from each fold are typically averaged.',
          marks: 2,
          solution_explanation:
            'K-fold cross-validation splits the data into k folds, training and validating the model k times on different combinations of folds, then averages the results for a more robust performance estimate.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Deep Learning',
      sub_competency: 'Neural Network Fundamentals',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 31,
          question_text:
            'What is the primary purpose of an activation function in a neural network?',
          question_type: 'MCQ',
          option_1: "To initialize the network's weights",
          option_2:
            'To introduce non-linearity so the network can learn complex patterns',
          option_3: 'To normalize the input data',
          option_4: 'To reduce the total number of parameters',
          correct_option_text:
            'To introduce non-linearity so the network can learn complex patterns',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Deep Learning',
          sub_competency: 'Neural Network Fundamentals',
          topic: 'Neural Networks',
          subtopic: 'Activation Functions',
          code_snippets: '',
          hints_text:
            'Without it, stacked layers would just compose into one linear function.',
          marks: 1,
          solution_explanation:
            'Activation functions introduce non-linearity into the network, enabling it to approximate complex, non-linear functions rather than behaving like a single linear model.',
        },
        {
          ID: 32,
          question_text:
            'What problem does the ReLU activation function help mitigate compared to sigmoid/tanh in deep networks?',
          question_type: 'MCQ',
          option_1: 'Overfitting',
          option_2: 'Vanishing gradients',
          option_3: 'Data imbalance',
          option_4: 'Label noise',
          correct_option_text: 'Vanishing gradients',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Neural Network Fundamentals',
          topic: 'Neural Networks',
          subtopic: 'Activation Functions',
          code_snippets: '',
          hints_text: 'Consider the gradient of ReLU for positive inputs.',
          marks: 2,
          solution_explanation:
            "ReLU's gradient is constant (equal to 1) for positive inputs and does not saturate, which helps mitigate the vanishing gradient problem common with sigmoid/tanh in deep networks.",
        },
        {
          ID: 33,
          question_text:
            'What is backpropagation used for when training neural networks?',
          question_type: 'MCQ',
          option_1: "To randomly initialize the network's weights",
          option_2:
            'To compute gradients of the loss with respect to the weights using the chain rule',
          option_3: 'To perform data augmentation on the training set',
          option_4: 'To select an appropriate batch size',
          correct_option_text:
            'To compute gradients of the loss with respect to the weights using the chain rule',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Neural Network Fundamentals',
          topic: 'Neural Networks',
          subtopic: 'Backpropagation',
          code_snippets: '',
          hints_text: 'It relies on a well-known rule from calculus.',
          marks: 2,
          solution_explanation:
            'Backpropagation applies the chain rule of calculus to efficiently compute the gradient of the loss with respect to every weight, propagating error signals from the output layer back to the input layer.',
        },
        {
          ID: 34,
          question_text:
            'What does batch normalization primarily do during neural network training?',
          question_type: 'MCQ',
          option_1: 'Removes the need for activation functions entirely',
          option_2:
            'Normalizes layer inputs (per mini-batch) to help stabilize and speed up training',
          option_3:
            'Automatically increases the number of layers in the network',
          option_4: 'Replaces the need for a loss function',
          correct_option_text:
            'Normalizes layer inputs (per mini-batch) to help stabilize and speed up training',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Neural Network Fundamentals',
          topic: 'Neural Networks',
          subtopic: 'Regularization Techniques',
          code_snippets: '',
          hints_text: 'It normalizes activations computed for each mini-batch.',
          marks: 2,
          solution_explanation:
            'Batch normalization normalizes the inputs to a layer using statistics computed over each mini-batch, which reduces internal covariate shift and typically stabilizes and speeds up training.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Deep Learning',
      sub_competency: 'Convolutional Neural Networks',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 35,
          question_text:
            'What is the main advantage of using convolutional layers over fully connected layers for image data?',
          question_type: 'MCQ',
          option_1: 'They require more parameters than fully connected layers',
          option_2:
            'They exploit spatial locality and share weights, greatly reducing the number of parameters',
          option_3: 'They cannot capture any spatial features',
          option_4: 'They only work on one-dimensional data',
          correct_option_text:
            'They exploit spatial locality and share weights, greatly reducing the number of parameters',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Deep Learning',
          sub_competency: 'Convolutional Neural Networks',
          topic: 'CNN',
          subtopic: 'Convolutional Layers',
          code_snippets: '',
          hints_text:
            'Think about how the same small filter is reused across the whole image.',
          marks: 1,
          solution_explanation:
            'Convolutional layers use small filters with shared weights that slide across the image, exploiting spatial locality and drastically reducing parameter count compared to fully connected layers.',
        },
        {
          ID: 36,
          question_text:
            'What is the role of a pooling layer (e.g., max pooling) in a CNN?',
          question_type: 'MCQ',
          option_1: 'To increase spatial resolution of feature maps',
          option_2:
            'To downsample feature maps, reducing computation while retaining important features',
          option_3: 'To add more channels to the feature maps',
          option_4: 'To perform the final classification directly',
          correct_option_text:
            'To downsample feature maps, reducing computation while retaining important features',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Convolutional Neural Networks',
          topic: 'CNN',
          subtopic: 'Pooling Layers',
          code_snippets: '',
          hints_text: 'It reduces spatial dimensions.',
          marks: 2,
          solution_explanation:
            'Pooling layers downsample feature maps, for example by taking the maximum value in each local window, reducing spatial dimensions and computational cost while retaining the most salient features.',
        },
        {
          ID: 37,
          question_text:
            'In a CNN, what does increasing the stride of a convolutional filter typically result in?',
          question_type: 'MCQ',
          option_1: 'A larger output feature map',
          option_2: 'A smaller output feature map (more downsampling)',
          option_3: 'No change to the output feature map size',
          option_4: 'An increased number of output channels',
          correct_option_text:
            'A smaller output feature map (more downsampling)',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Deep Learning',
          sub_competency: 'Convolutional Neural Networks',
          topic: 'CNN',
          subtopic: 'Convolution Parameters',
          code_snippets: '',
          hints_text:
            'Stride controls how far the filter moves between applications.',
          marks: 3,
          solution_explanation:
            'A larger stride means the filter moves further between each application, producing fewer output positions and thus a smaller, more downsampled feature map.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Deep Learning',
      sub_competency: 'Sequence Models (RNN/LSTM)',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 38,
          question_text:
            'What problem in vanilla RNNs does the LSTM architecture primarily address?',
          question_type: 'MCQ',
          option_1: 'Overfitting on small datasets',
          option_2:
            'Learning long-term dependencies, hindered by vanishing/exploding gradients',
          option_3: 'Excessively fast training speed',
          option_4: 'A complete lack of activation functions',
          correct_option_text:
            'Learning long-term dependencies, hindered by vanishing/exploding gradients',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Sequence Models (RNN/LSTM)',
          topic: 'Sequence Models',
          subtopic: 'LSTM',
          code_snippets: '',
          hints_text:
            'Gating mechanisms help control the flow of gradients over time.',
          marks: 2,
          solution_explanation:
            'LSTMs use gating mechanisms (input, forget, and output gates) along with a cell state to maintain gradient flow across long sequences, addressing the vanishing/exploding gradient problem of vanilla RNNs.',
        },
        {
          ID: 39,
          question_text:
            "What is the purpose of the 'forget gate' in an LSTM cell?",
          question_type: 'MCQ',
          option_1: 'To decide what new information to add to the cell state',
          option_2:
            'To decide what portion of the previous cell state should be discarded',
          option_3: "To output the network's final prediction",
          option_4: 'To initialize the hidden state at the start of training',
          correct_option_text:
            'To decide what portion of the previous cell state should be discarded',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Deep Learning',
          sub_competency: 'Sequence Models (RNN/LSTM)',
          topic: 'Sequence Models',
          subtopic: 'LSTM',
          code_snippets: '',
          hints_text: "The word 'forget' hints at its function.",
          marks: 2,
          solution_explanation:
            'The forget gate uses a sigmoid function to decide which parts of the previous cell state should be discarded (values near 0) or retained (values near 1).',
        },
        {
          ID: 40,
          question_text:
            'Compared to RNNs/LSTMs, why do Transformer architectures generally allow more parallelization during training?',
          question_type: 'MCQ',
          option_1:
            'They process sequences recurrently, one time step at a time',
          option_2:
            'They use self-attention, which processes all sequence positions simultaneously',
          option_3: 'They do not rely on gradients at all',
          option_4: 'They can only operate on very short sequences',
          correct_option_text:
            'They use self-attention, which processes all sequence positions simultaneously',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Deep Learning',
          sub_competency: 'Sequence Models (RNN/LSTM)',
          topic: 'Sequence Models',
          subtopic: 'Transformers vs RNNs',
          code_snippets: '',
          hints_text:
            'Consider whether there is a sequential dependency between time steps.',
          marks: 3,
          solution_explanation:
            'Self-attention computes relationships between all positions in a sequence simultaneously using matrix operations, unlike RNNs, which must process time steps sequentially, enabling much greater parallelization.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Natural Language Processing',
      sub_competency: 'Text Preprocessing & Representation',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 41,
          question_text: "What does 'tokenization' mean in the context of NLP?",
          question_type: 'MCQ',
          option_1: 'Encrypting text data for secure storage',
          option_2:
            'Splitting text into smaller units such as words or subwords',
          option_3: 'Translating text into another language',
          option_4: 'Removing only stopwords from text',
          correct_option_text:
            'Splitting text into smaller units such as words or subwords',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Text Preprocessing & Representation',
          topic: 'NLP',
          subtopic: 'Text Preprocessing',
          code_snippets: '',
          hints_text: "Think of the word's root: 'token'.",
          marks: 1,
          solution_explanation:
            'Tokenization splits raw text into smaller units called tokens — such as words, subwords, or characters — as an early step in most NLP pipelines.',
        },
        {
          ID: 42,
          question_text: 'What is TF-IDF primarily used for?',
          question_type: 'MCQ',
          option_1: 'To generate images from text descriptions',
          option_2:
            'To weigh terms based on their frequency in a document relative to their frequency across the whole corpus',
          option_3: 'To translate text between languages',
          option_4: 'To perform part-of-speech tagging',
          correct_option_text:
            'To weigh terms based on their frequency in a document relative to their frequency across the whole corpus',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Text Preprocessing & Representation',
          topic: 'NLP',
          subtopic: 'Text Representation',
          code_snippets: '',
          hints_text:
            'TF-IDF stands for Term Frequency-Inverse Document Frequency.',
          marks: 2,
          solution_explanation:
            'TF-IDF weighs a term by how frequently it appears in a specific document (TF), balanced against how common it is across the entire corpus (IDF), highlighting distinctive terms.',
        },
        {
          ID: 43,
          question_text:
            'What is a key advantage of dense word embeddings (e.g., Word2Vec, GloVe) over one-hot encoding?',
          question_type: 'MCQ',
          option_1: 'They require no training whatsoever',
          option_2:
            'They capture semantic similarity between words in a dense, lower-dimensional space',
          option_3: 'They are always sparse and extremely high-dimensional',
          option_4: 'They eliminate the need for tokenization altogether',
          correct_option_text:
            'They capture semantic similarity between words in a dense, lower-dimensional space',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Text Preprocessing & Representation',
          topic: 'NLP',
          subtopic: 'Word Embeddings',
          code_snippets: '',
          hints_text:
            'Similar words end up close together in the vector space.',
          marks: 2,
          solution_explanation:
            'Word embeddings map words to dense, low-dimensional vectors where semantically similar words are positioned close together, unlike sparse one-hot vectors that carry no notion of similarity.',
        },
        {
          ID: 44,
          question_text:
            'Why is subword tokenization (e.g., Byte Pair Encoding) commonly used in modern NLP models?',
          question_type: 'MCQ',
          option_1: 'It only works for the English language',
          option_2:
            'It handles out-of-vocabulary words by breaking them into known subword units',
          option_3: 'It eliminates the need for any vocabulary',
          option_4:
            'It always requires a larger vocabulary than word-level tokenization',
          correct_option_text:
            'It handles out-of-vocabulary words by breaking them into known subword units',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Text Preprocessing & Representation',
          topic: 'NLP',
          subtopic: 'Tokenization Methods',
          code_snippets: '',
          hints_text:
            'It balances vocabulary size against the ability to represent rare words.',
          marks: 3,
          solution_explanation:
            'Subword tokenization methods like Byte Pair Encoding decompose rare or unknown words into common subword units, letting models handle out-of-vocabulary words gracefully with a manageable vocabulary size.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Natural Language Processing',
      sub_competency: 'Language Models',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 45,
          question_text: 'What does a language model fundamentally predict?',
          question_type: 'MCQ',
          option_1: 'The sentiment of a given sentence',
          option_2:
            'The probability distribution over the next token given the preceding context',
          option_3: 'The exact translation of a piece of text',
          option_4: 'The named entities present in a text',
          correct_option_text:
            'The probability distribution over the next token given the preceding context',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Language Models',
          topic: 'NLP',
          subtopic: 'Language Modeling',
          code_snippets: '',
          hints_text: "Think of the classic 'next word prediction' task.",
          marks: 1,
          solution_explanation:
            'A language model estimates the probability distribution over the next token given the sequence of tokens that came before it.',
        },
        {
          ID: 46,
          question_text:
            "What is 'perplexity' used to measure in the evaluation of language models?",
          question_type: 'MCQ',
          option_1: "The model's inference speed",
          option_2:
            'How well a probability model predicts a sample; a lower perplexity indicates better prediction',
          option_3: 'The total number of parameters in the model',
          option_4: 'The size of the training dataset used',
          correct_option_text:
            'How well a probability model predicts a sample; a lower perplexity indicates better prediction',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Language Models',
          topic: 'NLP',
          subtopic: 'Language Model Evaluation',
          code_snippets: '',
          hints_text:
            'It is derived from the exponentiated cross-entropy loss.',
          marks: 2,
          solution_explanation:
            "Perplexity is derived from cross-entropy loss and measures how well a language model predicts a sample; lower perplexity means the model is less 'surprised' by the data and predicts it better.",
        },
        {
          ID: 47,
          question_text:
            'What is the key difference between an autoregressive language model (e.g., GPT) and a masked language model (e.g., BERT)?',
          question_type: 'MCQ',
          option_1:
            'Autoregressive models predict the next token sequentially using only past context; masked models predict masked tokens using bidirectional context',
          option_2: 'They are functionally identical approaches',
          option_3: 'Masked language models cannot make use of any context',
          option_4: 'Autoregressive models are incapable of generating text',
          correct_option_text:
            'Autoregressive models predict the next token sequentially using only past context; masked models predict masked tokens using bidirectional context',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Natural Language Processing',
          sub_competency: 'Language Models',
          topic: 'NLP',
          subtopic: 'Language Model Architectures',
          code_snippets: '',
          hints_text:
            'Think about which direction of context each type of model can use.',
          marks: 3,
          solution_explanation:
            'Autoregressive models like GPT generate tokens left-to-right using only preceding tokens as context, while masked models like BERT predict masked-out tokens using both left and right (bidirectional) context.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Natural Language Processing',
      sub_competency: 'NLP Applications',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 48,
          question_text: 'Named Entity Recognition (NER) is the task of:',
          question_type: 'MCQ',
          option_1: 'Classifying the overall sentiment of a document',
          option_2:
            'Identifying and classifying entities like names, organizations, and locations in text',
          option_3: 'Translating text between two languages',
          option_4: 'Producing a short summary of a long document',
          correct_option_text:
            'Identifying and classifying entities like names, organizations, and locations in text',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Natural Language Processing',
          sub_competency: 'NLP Applications',
          topic: 'NLP',
          subtopic: 'NLP Tasks',
          code_snippets: '',
          hints_text:
            "'Entity' refers to real-world objects like people or places.",
          marks: 1,
          solution_explanation:
            'NER identifies spans of text that refer to entities — such as people, organizations, locations, and dates — and classifies them into predefined categories.',
        },
        {
          ID: 49,
          question_text:
            'In machine translation, what does the BLEU score measure?',
          question_type: 'MCQ',
          option_1: 'Grammatical correctness only',
          option_2:
            'Overlap of n-grams between a machine-generated translation and reference translations',
          option_3: 'The raw speed of the translation process',
          option_4: 'The vocabulary size of the translation model',
          correct_option_text:
            'Overlap of n-grams between a machine-generated translation and reference translations',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Natural Language Processing',
          sub_competency: 'NLP Applications',
          topic: 'NLP',
          subtopic: 'Machine Translation',
          code_snippets: '',
          hints_text:
            'It is an n-gram precision-based metric with a brevity penalty.',
          marks: 2,
          solution_explanation:
            'BLEU (Bilingual Evaluation Understudy) measures the overlap of n-grams between a candidate translation and one or more reference translations, applying a brevity penalty for overly short outputs.',
        },
        {
          ID: 50,
          question_text:
            'Which NLP task focuses on determining whether a piece of text expresses positive, negative, or neutral opinion?',
          question_type: 'MCQ',
          option_1: 'Sentiment Analysis',
          option_2: 'Part-of-Speech Tagging',
          option_3: 'Coreference Resolution',
          option_4: 'Dependency Parsing',
          correct_option_text: 'Sentiment Analysis',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Natural Language Processing',
          sub_competency: 'NLP Applications',
          topic: 'NLP',
          subtopic: 'NLP Tasks',
          code_snippets: '',
          hints_text: 'It is about the emotional polarity of the text.',
          marks: 1,
          solution_explanation:
            'Sentiment analysis classifies text according to the emotional tone or opinion polarity it expresses, such as positive, negative, or neutral.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Transformers & Generative AI',
      sub_competency: 'Transformer Architecture & Attention',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 51,
          question_text:
            'What is the core mechanism that allows Transformer models to weigh the importance of different tokens in a sequence?',
          question_type: 'MCQ',
          option_1: 'Convolution',
          option_2: 'Self-attention',
          option_3: 'Recurrence',
          option_4: 'Pooling',
          correct_option_text: 'Self-attention',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Transformer Architecture & Attention',
          topic: 'Transformers',
          subtopic: 'Attention Mechanism',
          code_snippets: '',
          hints_text:
            'Recall the title of the paper that introduced Transformers.',
          marks: 1,
          solution_explanation:
            'Self-attention computes a weighted representation of each token based on its relevance (attention score) to every other token in the sequence.',
        },
        {
          ID: 52,
          question_text:
            'In the scaled dot-product attention formula, why is the dot product scaled by 1/sqrt(d_k)?',
          question_type: 'MCQ',
          option_1: 'To increase the magnitude of gradients artificially',
          option_2:
            'To prevent extremely large dot products from pushing softmax into regions with tiny gradients',
          option_3: 'To reduce the total number of model parameters',
          option_4: 'To make the attention mechanism fully deterministic',
          correct_option_text:
            'To prevent extremely large dot products from pushing softmax into regions with tiny gradients',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Transformer Architecture & Attention',
          topic: 'Transformers',
          subtopic: 'Scaled Dot-Product Attention',
          code_snippets: '',
          hints_text:
            "Think about how large dot products can affect the softmax function's gradient.",
          marks: 3,
          solution_explanation:
            'Without scaling, large dot products (especially with high dimension d_k) can push softmax outputs into regions with extremely small gradients; dividing by sqrt(d_k) keeps values in a numerically stable range.',
        },
        {
          ID: 53,
          question_text:
            'What is the purpose of positional encoding in Transformer models?',
          question_type: 'MCQ',
          option_1: 'To reduce the overall size of the model',
          option_2:
            'To inject information about token order, since self-attention itself is permutation-invariant',
          option_3: 'To completely replace the embedding layer',
          option_4: 'To normalize the computed attention scores',
          correct_option_text:
            'To inject information about token order, since self-attention itself is permutation-invariant',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Transformer Architecture & Attention',
          topic: 'Transformers',
          subtopic: 'Positional Encoding',
          code_snippets: '',
          hints_text:
            'Self-attention alone has no inherent sense of sequence order.',
          marks: 2,
          solution_explanation:
            'Since self-attention treats input tokens as an unordered set, positional encodings are added to token embeddings to give the model information about the position and order of tokens.',
        },
        {
          ID: 54,
          question_text:
            'What is the role of multi-head attention in Transformer architectures?',
          question_type: 'MCQ',
          option_1:
            'It allows the model to jointly attend to information from different representation subspaces at different positions',
          option_2: 'It reduces the model to a single attention computation',
          option_3: 'It removes the need for any feedforward layers',
          option_4: 'It is only used during model inference, not training',
          correct_option_text:
            'It allows the model to jointly attend to information from different representation subspaces at different positions',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Transformer Architecture & Attention',
          topic: 'Transformers',
          subtopic: 'Multi-Head Attention',
          code_snippets: '',
          hints_text:
            'Think of multiple attention computations running in parallel.',
          marks: 2,
          solution_explanation:
            'Multi-head attention runs several attention computations in parallel, each with its own learned projections, allowing the model to capture diverse relationships and representation subspaces simultaneously.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Transformers & Generative AI',
      sub_competency: 'Prompt Engineering',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 55,
          question_text:
            "What is 'few-shot prompting' in the context of large language models?",
          question_type: 'MCQ',
          option_1:
            "Providing zero examples and relying purely on the model's pretraining",
          option_2:
            "Including a small number of input-output examples directly in the prompt to guide the model's response",
          option_3:
            "Fine-tuning the model's weights using a handful of labeled examples",
          option_4: 'Using only a system prompt with no user input',
          correct_option_text:
            "Including a small number of input-output examples directly in the prompt to guide the model's response",
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Prompt Engineering',
          topic: 'Prompt Engineering',
          subtopic: 'Prompting Techniques',
          code_snippets: '',
          hints_text: "'Few-shot' refers to a small number of examples.",
          marks: 1,
          solution_explanation:
            'Few-shot prompting includes a handful of example input-output pairs directly within the prompt to demonstrate the desired task or output format, without updating any model weights.',
        },
        {
          ID: 56,
          question_text: "What is the purpose of 'chain-of-thought' prompting?",
          question_type: 'MCQ',
          option_1: 'To make the model produce shorter responses',
          option_2:
            'To encourage the model to generate intermediate reasoning steps before producing the final answer',
          option_3: "To hide the model's reasoning process from the end user",
          option_4: 'To reduce the number of tokens used by the model',
          correct_option_text:
            'To encourage the model to generate intermediate reasoning steps before producing the final answer',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Prompt Engineering',
          topic: 'Prompt Engineering',
          subtopic: 'Prompting Techniques',
          code_snippets: '',
          hints_text: 'Think of asking the model to reason step-by-step.',
          marks: 2,
          solution_explanation:
            'Chain-of-thought prompting asks the model to articulate intermediate reasoning steps, which often improves accuracy on tasks requiring multi-step logical or arithmetic reasoning.',
        },
        {
          ID: 57,
          question_text:
            'In prompt engineering, what is the main risk of using an overly ambiguous or vague prompt?',
          question_type: 'MCQ',
          option_1: 'The model will always refuse to answer',
          option_2:
            'The model may produce inconsistent or irrelevant outputs due to unclear instructions',
          option_3: 'The model will always run faster than usual',
          option_4: 'The model will completely ignore any system prompt',
          correct_option_text:
            'The model may produce inconsistent or irrelevant outputs due to unclear instructions',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Prompt Engineering',
          topic: 'Prompt Engineering',
          subtopic: 'Prompt Design',
          code_snippets: '',
          hints_text:
            'Ambiguity leaves more room for the model to interpret the request differently each time.',
          marks: 2,
          solution_explanation:
            'Vague or ambiguous prompts leave more room for interpretation, often leading to inconsistent, irrelevant, or lower-quality outputs from the model.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Transformers & Generative AI',
      sub_competency: 'Fine-tuning & Transfer Learning',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 58,
          question_text:
            "What is 'transfer learning' in the context of deep learning models?",
          question_type: 'MCQ',
          option_1:
            'Training a model completely from scratch for every new task',
          option_2:
            "Reusing a pretrained model's learned representations and adapting them to a new, related task",
          option_3: 'Transferring raw data between different servers',
          option_4:
            "Copying a model's architecture without any of its learned weights",
          correct_option_text:
            "Reusing a pretrained model's learned representations and adapting them to a new, related task",
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Fine-tuning & Transfer Learning',
          topic: 'Fine-tuning',
          subtopic: 'Transfer Learning',
          code_snippets: '',
          hints_text:
            'Think about reusing prior knowledge instead of starting over.',
          marks: 1,
          solution_explanation:
            'Transfer learning leverages the knowledge (weights and representations) a model learned on one task or dataset and adapts it to a new, often related, task — reducing the training time and data required.',
        },
        {
          ID: 59,
          question_text:
            'What is LoRA (Low-Rank Adaptation) primarily used for when fine-tuning large language models?',
          question_type: 'MCQ',
          option_1: 'To fully retrain every parameter of the model',
          option_2:
            'To efficiently fine-tune by injecting small trainable low-rank matrices while freezing most of the original weights',
          option_3:
            'To compress the model exclusively for deployment, unrelated to training',
          option_4: 'To generate synthetic training data for pretraining',
          correct_option_text:
            'To efficiently fine-tune by injecting small trainable low-rank matrices while freezing most of the original weights',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Fine-tuning & Transfer Learning',
          topic: 'Fine-tuning',
          subtopic: 'Parameter-Efficient Fine-Tuning',
          code_snippets: '',
          hints_text:
            'The name refers to matrices of reduced rank that add far fewer trainable parameters.',
          marks: 3,
          solution_explanation:
            "LoRA freezes the pretrained model's weights and injects small trainable low-rank matrices into selected layers, drastically reducing the number of trainable parameters while still achieving competitive fine-tuning results.",
        },
        {
          ID: 60,
          question_text:
            "What is 'catastrophic forgetting' a risk of when fine-tuning a pretrained model on a new task?",
          question_type: 'MCQ',
          option_1: 'The model becomes too large to ever deploy',
          option_2:
            'The model may lose previously learned general capabilities while adapting to the new task',
          option_3: 'Training becomes computationally impossible',
          option_4: 'The model no longer requires any additional data',
          correct_option_text:
            'The model may lose previously learned general capabilities while adapting to the new task',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Transformers & Generative AI',
          sub_competency: 'Fine-tuning & Transfer Learning',
          topic: 'Fine-tuning',
          subtopic: 'Fine-tuning Challenges',
          code_snippets: '',
          hints_text: 'The term itself describes forgetting older knowledge.',
          marks: 2,
          solution_explanation:
            'Catastrophic forgetting occurs when fine-tuning on a new task causes the model to overwrite or lose previously learned general knowledge and capabilities.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'RAG & LLM Systems',
      sub_competency: 'RAG Architecture',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 61,
          question_text:
            'What is the primary goal of Retrieval-Augmented Generation (RAG)?',
          question_type: 'MCQ',
          option_1: 'To train a language model completely from scratch',
          option_2:
            'To combine information retrieval from an external knowledge source with generative language modeling to ground responses',
          option_3: 'To compress the size of a language model',
          option_4: 'To remove the need for embeddings entirely',
          correct_option_text:
            'To combine information retrieval from an external knowledge source with generative language modeling to ground responses',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'RAG Architecture',
          topic: 'RAG',
          subtopic: 'RAG Fundamentals',
          code_snippets: '',
          hints_text: "Combine the words 'Retrieval' and 'Generation'.",
          marks: 1,
          solution_explanation:
            'RAG retrieves relevant documents or passages from an external knowledge source and supplies them as context to a generative model, grounding its responses in retrieved facts.',
        },
        {
          ID: 62,
          question_text:
            'In a typical RAG pipeline, what happens right after a user query is received?',
          question_type: 'MCQ',
          option_1: 'The query is sent directly to fine-tune the model',
          option_2:
            'The query is converted into an embedding and used to retrieve relevant documents from a vector store',
          option_3:
            'The model generates an answer with no retrieval step at all',
          option_4: 'The query is discarded and a cached answer is returned',
          correct_option_text:
            'The query is converted into an embedding and used to retrieve relevant documents from a vector store',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'RAG Architecture',
          topic: 'RAG',
          subtopic: 'RAG Pipeline',
          code_snippets: '',
          hints_text: 'Think of embedding-based similarity search.',
          marks: 2,
          solution_explanation:
            'The query is embedded into a vector representation, which is then used to perform a similarity search against a vector store to retrieve the most relevant documents or passages.',
        },
        {
          ID: 63,
          question_text:
            "Why is 'chunking' documents important in a RAG system?",
          question_type: 'MCQ',
          option_1: 'To unnecessarily increase storage costs',
          option_2:
            'To break large documents into manageable pieces that fit within context windows and improve retrieval relevance',
          option_3: 'To remove all text formatting from the documents',
          option_4: 'To avoid the need for generating embeddings',
          correct_option_text:
            'To break large documents into manageable pieces that fit within context windows and improve retrieval relevance',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'RAG Architecture',
          topic: 'RAG',
          subtopic: 'Document Chunking',
          code_snippets: '',
          hints_text:
            'Consider both context window limits and retrieval granularity.',
          marks: 2,
          solution_explanation:
            "Chunking splits large documents into smaller, semantically coherent pieces so that retrieval can be more precise and the retrieved chunks fit within the generative model's context window.",
        },
        {
          ID: 64,
          question_text:
            'What is a common failure mode of RAG systems related to poor retrieval quality?',
          question_type: 'MCQ',
          option_1: 'The model always ignores any retrieved context',
          option_2:
            'Irrelevant or low-quality retrieved chunks can lead to hallucinated or incorrect answers',
          option_3: 'RAG systems never hallucinate under any circumstances',
          option_4: "Retrieval always improves the system's response latency",
          correct_option_text:
            'Irrelevant or low-quality retrieved chunks can lead to hallucinated or incorrect answers',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'RAG Architecture',
          topic: 'RAG',
          subtopic: 'RAG Failure Modes',
          code_snippets: '',
          hints_text: "Consider the phrase 'garbage in, garbage out'.",
          marks: 3,
          solution_explanation:
            'If the retrieval step returns irrelevant or noisy chunks, the generative model may produce inaccurate or hallucinated answers, since its response is grounded in poor-quality context.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'RAG & LLM Systems',
      sub_competency: 'Vector Databases & Embeddings',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 65,
          question_text:
            'What is the main purpose of a vector database in an AI application?',
          question_type: 'MCQ',
          option_1: 'To store relational tables joined by foreign keys',
          option_2:
            'To efficiently store and perform similarity search over high-dimensional embedding vectors',
          option_3: 'To store only plain, unstructured text',
          option_4: 'To manage user authentication and permissions',
          correct_option_text:
            'To efficiently store and perform similarity search over high-dimensional embedding vectors',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'Vector Databases & Embeddings',
          topic: 'Vector Databases',
          subtopic: 'Vector Database Basics',
          code_snippets: '',
          hints_text:
            'Vector databases are optimized for nearest-neighbor style searches.',
          marks: 1,
          solution_explanation:
            'Vector databases are optimized to store embeddings and perform fast approximate or exact nearest-neighbor similarity search over high-dimensional vectors.',
        },
        {
          ID: 66,
          question_text:
            'Which similarity metric is most commonly used to compare embedding vectors in semantic search?',
          question_type: 'MCQ',
          option_1: 'Cosine similarity',
          option_2: 'Levenshtein distance',
          option_3: 'Hamming distance',
          option_4: 'Jaccard index exclusively',
          correct_option_text: 'Cosine similarity',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'Vector Databases & Embeddings',
          topic: 'Vector Databases',
          subtopic: 'Similarity Metrics',
          code_snippets: '',
          hints_text: 'This metric measures the angle between two vectors.',
          marks: 2,
          solution_explanation:
            'Cosine similarity measures the cosine of the angle between two vectors and is commonly used to compare embedding vectors regardless of their magnitude, reflecting semantic similarity.',
        },
        {
          ID: 67,
          question_text:
            'Which technique do many vector databases use to speed up approximate nearest neighbor search at large scale?',
          question_type: 'MCQ',
          option_1: 'A linear brute-force scan of every vector on every query',
          option_2:
            'Approximate Nearest Neighbor (ANN) indexing structures such as HNSW or IVF',
          option_3: 'Sorting all vectors alphabetically by label',
          option_4: 'Retaining only the first 10 vectors added',
          correct_option_text:
            'Approximate Nearest Neighbor (ANN) indexing structures such as HNSW or IVF',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'Vector Databases & Embeddings',
          topic: 'Vector Databases',
          subtopic: 'ANN Indexing',
          code_snippets: '',
          hints_text: 'Think of a trade-off between exactness and query speed.',
          marks: 3,
          solution_explanation:
            'ANN indexing structures such as HNSW (Hierarchical Navigable Small World) or IVF (Inverted File Index) enable fast approximate similarity search at scale, trading a small amount of accuracy for large gains in speed.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'RAG & LLM Systems',
      sub_competency: 'LLM Evaluation & Safety',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 68,
          question_text:
            "What does 'hallucination' refer to in the context of large language models?",
          question_type: 'MCQ',
          option_1: 'The model refusing to respond to a prompt',
          option_2:
            'The model generating plausible-sounding but factually incorrect or fabricated information',
          option_3: 'The model running out of available memory',
          option_4: 'The model repeating the input text verbatim',
          correct_option_text:
            'The model generating plausible-sounding but factually incorrect or fabricated information',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'LLM Evaluation & Safety',
          topic: 'LLM Safety',
          subtopic: 'Hallucination',
          code_snippets: '',
          hints_text: 'Think of confidently stated but wrong outputs.',
          marks: 1,
          solution_explanation:
            'Hallucination refers to an LLM producing text that sounds fluent and confident but is factually incorrect or entirely fabricated.',
        },
        {
          ID: 69,
          question_text:
            "What is 'red-teaming' in the context of LLM safety evaluation?",
          question_type: 'MCQ',
          option_1: 'A training technique used to increase model size',
          option_2:
            'Deliberately probing a model with adversarial inputs to uncover harmful or unsafe behaviors',
          option_3: 'A method used to speed up model inference',
          option_4: 'A technique used to compress model weights',
          correct_option_text:
            'Deliberately probing a model with adversarial inputs to uncover harmful or unsafe behaviors',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'LLM Evaluation & Safety',
          topic: 'LLM Safety',
          subtopic: 'Safety Testing',
          code_snippets: '',
          hints_text:
            'It is an adversarial testing approach borrowed from security practice.',
          marks: 2,
          solution_explanation:
            'Red-teaming involves deliberately crafting adversarial or edge-case prompts to test and expose potential harmful, biased, or unsafe model behaviors before deployment.',
        },
        {
          ID: 70,
          question_text:
            'Why is human feedback (e.g., RLHF) commonly used to align LLM outputs with human preferences?',
          question_type: 'MCQ',
          option_1: 'Because it eliminates the need for any pretraining',
          option_2:
            'Because it helps tune model behavior toward being more helpful, honest, and harmless based on human judgments',
          option_3: 'Because it reduces the overall model size',
          option_4: 'Because it removes the need for any evaluation metrics',
          correct_option_text:
            'Because it helps tune model behavior toward being more helpful, honest, and harmless based on human judgments',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'RAG & LLM Systems',
          sub_competency: 'LLM Evaluation & Safety',
          topic: 'LLM Safety',
          subtopic: 'RLHF',
          code_snippets: '',
          hints_text:
            'RLHF stands for Reinforcement Learning from Human Feedback.',
          marks: 2,
          solution_explanation:
            'RLHF uses human-labeled preference data to train a reward model, then fine-tunes the LLM via reinforcement learning so its outputs better align with human values such as helpfulness and harmlessness.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'MLOps & Deployment',
      sub_competency: 'Model Deployment',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 71,
          question_text:
            'What is the primary benefit of containerizing a machine learning model (e.g., with Docker) for deployment?',
          question_type: 'MCQ',
          option_1: 'It guarantees 100% model accuracy',
          option_2:
            'It packages the model with its dependencies for consistent, portable deployment across environments',
          option_3: 'It automatically improves inference speed',
          option_4: 'It eliminates the need for any API layer',
          correct_option_text:
            'It packages the model with its dependencies for consistent, portable deployment across environments',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Deployment',
          topic: 'Deployment',
          subtopic: 'Containerization',
          code_snippets: '',
          hints_text: 'Think about consistency across different machines.',
          marks: 1,
          solution_explanation:
            'Containerization bundles the model code, dependencies, and runtime environment together, ensuring consistent behavior when the model is deployed across different machines or environments.',
        },
        {
          ID: 72,
          question_text: "What is a 'canary deployment' strategy used for?",
          question_type: 'MCQ',
          option_1: 'To deploy a new model version to all users immediately',
          option_2:
            'To gradually roll out a new model version to a small subset of users before a full rollout',
          option_3:
            'To roll back a deployment automatically without any monitoring',
          option_4: "To train models exclusively on a small 'canary' dataset",
          correct_option_text:
            'To gradually roll out a new model version to a small subset of users before a full rollout',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Deployment',
          topic: 'Deployment',
          subtopic: 'Deployment Strategies',
          code_snippets: '',
          hints_text: 'Think of testing on a small group first.',
          marks: 2,
          solution_explanation:
            'Canary deployment releases a new model version to a small percentage of traffic or users first, monitoring performance before gradually increasing the rollout, reducing risk.',
        },
        {
          ID: 73,
          question_text:
            "What is model 'quantization' primarily used for in deployment?",
          question_type: 'MCQ',
          option_1: 'To increase model precision to 64-bit floating point',
          option_2:
            'To reduce model size and inference latency by using lower-precision numerical representations',
          option_3: 'To add additional layers to the model',
          option_4: 'To retrain the model on newly collected data',
          correct_option_text:
            'To reduce model size and inference latency by using lower-precision numerical representations',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Deployment',
          topic: 'Deployment',
          subtopic: 'Model Optimization',
          code_snippets: '',
          hints_text: 'Think of using fewer bits to represent each weight.',
          marks: 2,
          solution_explanation:
            'Quantization converts model weights and activations from higher precision (e.g., FP32) to lower precision (e.g., INT8), reducing model size and often speeding up inference with only minor accuracy trade-offs.',
        },
        {
          ID: 74,
          question_text:
            'In a typical model-serving architecture, what is the role of a REST or gRPC API endpoint?',
          question_type: 'MCQ',
          option_1: "To store the model's training data",
          option_2:
            'To expose the trained model for inference requests from client applications',
          option_3: 'To visualize training loss curves',
          option_4: 'To manage version control of the source code',
          correct_option_text:
            'To expose the trained model for inference requests from client applications',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Deployment',
          topic: 'Deployment',
          subtopic: 'Model Serving',
          code_snippets: '',
          hints_text:
            'It acts as the interface between client applications and the model.',
          marks: 1,
          solution_explanation:
            'The API endpoint provides a standardized interface (REST or gRPC) that allows client applications to send inputs and receive model predictions over the network.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'MLOps & Deployment',
      sub_competency: 'Model Monitoring & Maintenance',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 75,
          question_text:
            "What is 'data drift' in the context of a deployed machine learning model?",
          question_type: 'MCQ',
          option_1: "The model's source code changing without version control",
          option_2:
            'A change in the statistical properties of the input data over time compared to the training data',
          option_3: 'The model being retrained too frequently',
          option_4:
            'A network latency issue affecting the serving infrastructure',
          correct_option_text:
            'A change in the statistical properties of the input data over time compared to the training data',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Monitoring & Maintenance',
          topic: 'Monitoring',
          subtopic: 'Data Drift',
          code_snippets: '',
          hints_text:
            'Think of a distribution shift in production data over time.',
          marks: 2,
          solution_explanation:
            'Data drift occurs when the statistical distribution of incoming production data diverges from the distribution the model was originally trained on, potentially degrading model performance.',
        },
        {
          ID: 76,
          question_text:
            'Why is it important to monitor prediction latency and throughput of a deployed ML model?',
          question_type: 'MCQ',
          option_1: 'To ensure the model architecture remains convolutional',
          option_2:
            'To ensure the service meets performance SLAs and can handle expected traffic',
          option_3: 'To increase the size of the training dataset',
          option_4: 'To reduce the total number of API endpoints',
          correct_option_text:
            'To ensure the service meets performance SLAs and can handle expected traffic',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Monitoring & Maintenance',
          topic: 'Monitoring',
          subtopic: 'Performance Monitoring',
          code_snippets: '',
          hints_text: 'Think of service-level agreements (SLAs).',
          marks: 1,
          solution_explanation:
            'Monitoring latency and throughput ensures the deployed model can serve predictions within acceptable response times and can handle the expected volume of requests reliably.',
        },
        {
          ID: 77,
          question_text:
            "What is 'concept drift' in a deployed machine learning system?",
          question_type: 'MCQ',
          option_1: "A change in the model's code style over time",
          option_2:
            'A change in the underlying relationship between input features and the target variable over time',
          option_3: 'A change in the server hardware used for serving',
          option_4: 'A reduction in the size of the model file',
          correct_option_text:
            'A change in the underlying relationship between input features and the target variable over time',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'Model Monitoring & Maintenance',
          topic: 'Monitoring',
          subtopic: 'Concept Drift',
          code_snippets: '',
          hints_text:
            'This differs from data drift — here, the relationship changes, not just the input distribution.',
          marks: 3,
          solution_explanation:
            'Concept drift refers to a change over time in the statistical relationship between input features and the target variable, meaning a previously accurate model may become less effective even if input distributions stay similar.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'MLOps & Deployment',
      sub_competency: 'CI/CD for ML Pipelines',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 78,
          question_text: "What does 'CI/CD' stand for in the context of MLOps?",
          question_type: 'MCQ',
          option_1: 'Continuous Inference / Continuous Deployment',
          option_2:
            'Continuous Integration / Continuous Delivery (or Deployment)',
          option_3: 'Cloud Infrastructure / Cloud Data',
          option_4: 'Code Inspection / Code Debugging',
          correct_option_text:
            'Continuous Integration / Continuous Delivery (or Deployment)',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'CI/CD for ML Pipelines',
          topic: 'CI/CD',
          subtopic: 'CI/CD Basics',
          code_snippets: '',
          hints_text: 'This is a standard software engineering acronym.',
          marks: 1,
          solution_explanation:
            'CI/CD stands for Continuous Integration (frequently merging and testing code changes) and Continuous Delivery/Deployment (automating the release of validated changes to production).',
        },
        {
          ID: 79,
          question_text:
            'In an ML CI/CD pipeline, what additional step is typically included beyond a standard software CI/CD pipeline?',
          question_type: 'MCQ',
          option_1:
            'Automated model training, evaluation, and validation against performance thresholds',
          option_2: 'Only compiling the source code',
          option_3: 'Exclusively manual code review with no automation',
          option_4: 'Skipping all automated testing entirely',
          correct_option_text:
            'Automated model training, evaluation, and validation against performance thresholds',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'CI/CD for ML Pipelines',
          topic: 'CI/CD',
          subtopic: 'ML Pipeline Automation',
          code_snippets: '',
          hints_text:
            'ML pipelines add a dedicated training and validation stage.',
          marks: 2,
          solution_explanation:
            'ML CI/CD pipelines typically add automated stages for retraining models, evaluating them against defined metrics or thresholds, and validating them before promoting to production, in addition to standard code build/test steps.',
        },
        {
          ID: 80,
          question_text:
            "What is the purpose of a 'model registry' in an MLOps workflow?",
          question_type: 'MCQ',
          option_1: 'To store only the raw, unprocessed training data',
          option_2:
            'To version, track, and manage trained model artifacts and their metadata across the ML lifecycle',
          option_3: 'To manage user permissions exclusively',
          option_4: 'To replace the need for a CI/CD pipeline entirely',
          correct_option_text:
            'To version, track, and manage trained model artifacts and their metadata across the ML lifecycle',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'MLOps & Deployment',
          sub_competency: 'CI/CD for ML Pipelines',
          topic: 'CI/CD',
          subtopic: 'Model Registry',
          code_snippets: '',
          hints_text:
            'It is analogous to a package registry, but for trained models.',
          marks: 2,
          solution_explanation:
            'A model registry stores versioned model artifacts along with metadata such as metrics, lineage, and stage, enabling teams to track, compare, and promote models through the ML lifecycle.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Data Engineering',
      sub_competency: 'Data Pipelines & ETL',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 81,
          question_text:
            "What does the acronym 'ETL' stand for in data engineering?",
          question_type: 'MCQ',
          option_1: 'Extract, Transform, Load',
          option_2: 'Evaluate, Train, Launch',
          option_3: 'Encode, Tokenize, Learn',
          option_4: 'Execute, Test, Log',
          correct_option_text: 'Extract, Transform, Load',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Data Engineering',
          sub_competency: 'Data Pipelines & ETL',
          topic: 'Data Engineering',
          subtopic: 'ETL Basics',
          code_snippets: '',
          hints_text: 'Think of the standard stages of a data pipeline.',
          marks: 1,
          solution_explanation:
            'ETL stands for Extract (pull data from sources), Transform (clean and reshape the data), and Load (write the data into a target system such as a data warehouse).',
        },
        {
          ID: 82,
          question_text:
            'What is the key difference between the ETL and ELT approaches to data pipelines?',
          question_type: 'MCQ',
          option_1:
            'There is no meaningful difference; they are the same thing',
          option_2:
            'In ELT, raw data is loaded into the target system first and transformed afterward, whereas ETL transforms data before loading',
          option_3: 'ELT does not require a target system at all',
          option_4: 'ETL is only ever used for streaming data',
          correct_option_text:
            'In ELT, raw data is loaded into the target system first and transformed afterward, whereas ETL transforms data before loading',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Data Engineering',
          sub_competency: 'Data Pipelines & ETL',
          topic: 'Data Engineering',
          subtopic: 'ETL vs ELT',
          code_snippets: '',
          hints_text: 'Consider the order of the transform and load steps.',
          marks: 2,
          solution_explanation:
            "ELT loads raw data directly into the target system, such as a data warehouse, and performs transformations there using the target's compute power, while ETL transforms the data before it is loaded.",
        },
        {
          ID: 83,
          question_text:
            'What is the purpose of using an orchestration tool like Apache Airflow in a data pipeline?',
          question_type: 'MCQ',
          option_1: 'To store data permanently as the final destination',
          option_2:
            'To schedule, monitor, and manage dependencies between pipeline tasks',
          option_3: 'To perform model training directly within the tool',
          option_4: 'To completely replace the need for databases',
          correct_option_text:
            'To schedule, monitor, and manage dependencies between pipeline tasks',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Data Engineering',
          sub_competency: 'Data Pipelines & ETL',
          topic: 'Data Engineering',
          subtopic: 'Pipeline Orchestration',
          code_snippets: '',
          hints_text:
            'Think of pipelines represented as Directed Acyclic Graphs (DAGs).',
          marks: 2,
          solution_explanation:
            'Orchestration tools like Airflow define pipelines as DAGs of tasks, handling scheduling, dependency management, retries, and monitoring of pipeline execution.',
        },
        {
          ID: 84,
          question_text:
            'What is a common risk of not implementing data validation checks in an ingestion pipeline?',
          question_type: 'MCQ',
          option_1: 'The pipeline will run noticeably faster',
          option_2:
            'Corrupted or malformed data can silently propagate downstream and degrade model or analytics quality',
          option_3: 'Storage costs will automatically decrease',
          option_4:
            'Data will be automatically cleaned without any additional effort',
          correct_option_text:
            'Corrupted or malformed data can silently propagate downstream and degrade model or analytics quality',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Data Engineering',
          sub_competency: 'Data Pipelines & ETL',
          topic: 'Data Engineering',
          subtopic: 'Data Validation',
          code_snippets: '',
          hints_text:
            "Consider the phrase 'garbage in, garbage out' applied at scale.",
          marks: 3,
          solution_explanation:
            'Without validation checks, bad or malformed data can pass silently through the pipeline into downstream systems, corrupting analytics and degrading model training or inference quality.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Data Engineering',
      sub_competency: 'Feature Engineering',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 85,
          question_text:
            "What is 'one-hot encoding' used for in feature engineering?",
          question_type: 'MCQ',
          option_1: 'To normalize numerical features to a common scale',
          option_2:
            'To convert categorical variables into a binary vector representation',
          option_3: 'To reduce the dimensionality of numeric features',
          option_4: 'To automatically handle missing values in a dataset',
          correct_option_text:
            'To convert categorical variables into a binary vector representation',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Data Engineering',
          sub_competency: 'Feature Engineering',
          topic: 'Feature Engineering',
          subtopic: 'Categorical Encoding',
          code_snippets: '',
          hints_text: 'Think of binary indicator columns, one per category.',
          marks: 1,
          solution_explanation:
            'One-hot encoding transforms a categorical variable into multiple binary columns, one per category, indicating the presence (1) or absence (0) of that category.',
        },
        {
          ID: 86,
          question_text:
            'Why might you apply a log transformation to a skewed numerical feature?',
          question_type: 'MCQ',
          option_1: 'To increase the skewness of the distribution even further',
          option_2:
            'To make the distribution more symmetric and reduce the impact of extreme values',
          option_3: 'To convert the numerical feature into a categorical one',
          option_4: 'To automatically remove all outliers from the feature',
          correct_option_text:
            'To make the distribution more symmetric and reduce the impact of extreme values',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Data Engineering',
          sub_competency: 'Feature Engineering',
          topic: 'Feature Engineering',
          subtopic: 'Feature Transformation',
          code_snippets: '',
          hints_text:
            'A log function compresses large values more than small ones.',
          marks: 2,
          solution_explanation:
            'A log transformation compresses the scale of large values more than small ones, often making a right-skewed distribution more symmetric and reducing the influence of extreme outliers.',
        },
        {
          ID: 87,
          question_text:
            'What is the purpose of feature scaling (e.g., standardization) before training many machine learning models?',
          question_type: 'MCQ',
          option_1: 'To remove certain features from the dataset entirely',
          option_2:
            'To bring features to a comparable scale so that no single feature dominates due to its magnitude',
          option_3: 'To increase the total number of features in the dataset',
          option_4: 'To convert numerical features into text data',
          correct_option_text:
            'To bring features to a comparable scale so that no single feature dominates due to its magnitude',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Data Engineering',
          sub_competency: 'Feature Engineering',
          topic: 'Feature Engineering',
          subtopic: 'Feature Scaling',
          code_snippets: '',
          hints_text:
            'Distance-based and gradient-based algorithms are sensitive to feature scale.',
          marks: 2,
          solution_explanation:
            'Feature scaling standardizes or normalizes feature ranges so that algorithms sensitive to magnitude, such as gradient descent-based or distance-based models, are not unduly influenced by features with larger numeric ranges.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'Data Engineering',
      sub_competency: 'Databases & Data Storage',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 88,
          question_text:
            'Which type of database is generally best suited for storing and querying highly structured, relational data with defined schemas?',
          question_type: 'MCQ',
          option_1: 'A document store (e.g., MongoDB)',
          option_2: 'A relational database (e.g., PostgreSQL)',
          option_3: 'A key-value store (e.g., Redis)',
          option_4: 'A graph database exclusively',
          correct_option_text: 'A relational database (e.g., PostgreSQL)',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'Data Engineering',
          sub_competency: 'Databases & Data Storage',
          topic: 'Databases',
          subtopic: 'Database Types',
          code_snippets: '',
          hints_text:
            'Think of tables organized with fixed schemas and relationships.',
          marks: 1,
          solution_explanation:
            'Relational databases such as PostgreSQL are designed for structured data with well-defined schemas and relationships, supporting SQL queries and ACID transactions.',
        },
        {
          ID: 89,
          question_text:
            'What is a key advantage of a data warehouse over a traditional operational (transactional) database for analytics?',
          question_type: 'MCQ',
          option_1:
            'It is optimized for high-frequency, single-row transactional writes',
          option_2:
            'It is optimized for large-scale, read-heavy analytical queries across historical data',
          option_3: 'It cannot store any historical data',
          option_4: 'It requires no schema definitions whatsoever',
          correct_option_text:
            'It is optimized for large-scale, read-heavy analytical queries across historical data',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'Data Engineering',
          sub_competency: 'Databases & Data Storage',
          topic: 'Databases',
          subtopic: 'Data Warehousing',
          code_snippets: '',
          hints_text:
            'Think of the difference between OLAP and OLTP workloads.',
          marks: 2,
          solution_explanation:
            'Data warehouses are designed for OLAP (Online Analytical Processing) workloads — large-scale aggregation and analytical queries over historical data — unlike OLTP systems, which are optimized for many small transactional writes.',
        },
        {
          ID: 90,
          question_text:
            'What does the CAP theorem state about distributed database systems?',
          question_type: 'MCQ',
          option_1:
            'A distributed system can achieve Consistency, Availability, and Partition tolerance simultaneously at all times',
          option_2:
            'A distributed system can provide at most two of Consistency, Availability, and Partition tolerance simultaneously during a network partition',
          option_3:
            'The theorem is primarily about database indexing strategies',
          option_4: 'The theorem applies only to SQL query optimization',
          correct_option_text:
            'A distributed system can provide at most two of Consistency, Availability, and Partition tolerance simultaneously during a network partition',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'Data Engineering',
          sub_competency: 'Databases & Data Storage',
          topic: 'Databases',
          subtopic: 'Distributed Systems',
          code_snippets: '',
          hints_text:
            'Consider the trade-off that must be made during a network partition.',
          marks: 3,
          solution_explanation:
            'The CAP theorem states that in the presence of a network partition, a distributed system must trade off between Consistency and Availability — it cannot fully guarantee all three of Consistency, Availability, and Partition tolerance simultaneously.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'AI Ethics & Cloud Infrastructure',
      sub_competency: 'Bias, Fairness & Responsible AI',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 4,
      questions: [
        {
          ID: 91,
          question_text: "What is 'algorithmic bias' in machine learning?",
          question_type: 'MCQ',
          option_1: 'A bug that always causes the model to crash',
          option_2:
            'Systematic and unfair discrimination in model outcomes, often stemming from biased training data or design choices',
          option_3: 'A type of regularization technique',
          option_4: 'A method used to speed up model training',
          correct_option_text:
            'Systematic and unfair discrimination in model outcomes, often stemming from biased training data or design choices',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Bias, Fairness & Responsible AI',
          topic: 'Responsible AI',
          subtopic: 'Bias',
          code_snippets: '',
          hints_text:
            'Think of unfair, systematic patterns appearing in model predictions.',
          marks: 1,
          solution_explanation:
            'Algorithmic bias refers to systematic and unfair outcomes produced by a model, often arising from biased training data, flawed feature choices, or problematic modeling decisions.',
        },
        {
          ID: 92,
          question_text:
            'What is a common technique to help mitigate bias present in a training dataset?',
          question_type: 'MCQ',
          option_1: 'Ignoring the demographic composition of the data entirely',
          option_2:
            'Auditing and re-balancing the dataset to ensure fair representation across relevant groups',
          option_3:
            "Increasing the model's size only, without touching the data",
          option_4: 'Removing all labels from the dataset',
          correct_option_text:
            'Auditing and re-balancing the dataset to ensure fair representation across relevant groups',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Bias, Fairness & Responsible AI',
          topic: 'Responsible AI',
          subtopic: 'Bias Mitigation',
          code_snippets: '',
          hints_text:
            'Think of addressing representation imbalance directly in the data.',
          marks: 2,
          solution_explanation:
            'Auditing training data for representation gaps and re-balancing or augmenting it across relevant subgroups is a common approach to reduce bias in the resulting model.',
        },
        {
          ID: 93,
          question_text:
            'Why is model explainability (e.g., using SHAP or LIME) important in high-stakes AI applications?',
          question_type: 'MCQ',
          option_1: 'It guarantees a higher model accuracy',
          option_2:
            'It helps stakeholders understand and trust model decisions, supporting accountability and debugging',
          option_3: 'It replaces the need for any model testing',
          option_4: "It reduces the model's inference time",
          correct_option_text:
            'It helps stakeholders understand and trust model decisions, supporting accountability and debugging',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Bias, Fairness & Responsible AI',
          topic: 'Responsible AI',
          subtopic: 'Explainability',
          code_snippets: '',
          hints_text:
            'Think of transparency into why a model made a specific decision.',
          marks: 2,
          solution_explanation:
            'Explainability techniques like SHAP or LIME help reveal which features drove a specific prediction, supporting trust, accountability, debugging, and regulatory compliance in high-stakes applications.',
        },
        {
          ID: 94,
          question_text:
            "What is 'differential privacy' designed to protect against?",
          question_type: 'MCQ',
          option_1: 'Model overfitting only',
          option_2:
            'The ability to infer information about specific individuals from a dataset or model outputs',
          option_3: 'Slow model training speed',
          option_4: 'High data storage costs',
          correct_option_text:
            'The ability to infer information about specific individuals from a dataset or model outputs',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Bias, Fairness & Responsible AI',
          topic: 'Responsible AI',
          subtopic: 'Privacy',
          code_snippets: '',
          hints_text:
            'Think of adding calibrated noise to protect individual data points.',
          marks: 3,
          solution_explanation:
            "Differential privacy adds carefully calibrated statistical noise to data or query results so that the presence or absence of any single individual's data cannot be reliably inferred from the outputs.",
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'AI Ethics & Cloud Infrastructure',
      sub_competency: 'Cloud Platforms for AI',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 95,
          question_text:
            'What is the primary benefit of using managed cloud ML services (e.g., SageMaker, Vertex AI, Azure ML) for training models?',
          question_type: 'MCQ',
          option_1: 'They eliminate the need for any training data whatsoever',
          option_2:
            'They provide managed infrastructure, scaling, and tooling for training and deploying models without manually managing servers',
          option_3: 'They guarantee 100% model accuracy on any task',
          option_4: 'They can only be used for very small datasets',
          correct_option_text:
            'They provide managed infrastructure, scaling, and tooling for training and deploying models without manually managing servers',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Cloud Platforms for AI',
          topic: 'Cloud AI',
          subtopic: 'Managed ML Services',
          code_snippets: '',
          hints_text:
            'Think of how much infrastructure management is abstracted away.',
          marks: 1,
          solution_explanation:
            'Managed ML platforms provide pre-configured infrastructure, autoscaling, and integrated tooling for training, tuning, and deploying models, reducing the operational burden of managing servers directly.',
        },
        {
          ID: 96,
          question_text:
            'What is a key advantage of using spot/preemptible instances in the cloud for large-scale model training jobs?',
          question_type: 'MCQ',
          option_1: 'They guarantee the instance will never be terminated',
          option_2:
            'They offer significantly reduced cost compared to on-demand instances, in exchange for potential interruption',
          option_3: 'They provide unlimited GPU memory',
          option_4: 'They are mandatory for all production deployments',
          correct_option_text:
            'They offer significantly reduced cost compared to on-demand instances, in exchange for potential interruption',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Cloud Platforms for AI',
          topic: 'Cloud AI',
          subtopic: 'Cost Optimization',
          code_snippets: '',
          hints_text: 'They are cheaper, but the provider can reclaim them.',
          marks: 2,
          solution_explanation:
            'Spot/preemptible instances offer substantial cost savings over on-demand pricing but can be reclaimed by the cloud provider with short notice, making them best suited for interruptible or checkpointed workloads.',
        },
        {
          ID: 97,
          question_text:
            'What is the purpose of auto-scaling in a cloud-hosted model inference service?',
          question_type: 'MCQ',
          option_1:
            'To permanently fix the number of running instances regardless of load',
          option_2:
            'To automatically adjust the number of compute instances based on real-time traffic or load',
          option_3: 'To reduce model accuracy intentionally under high load',
          option_4:
            'To disable the service entirely during peak traffic periods',
          correct_option_text:
            'To automatically adjust the number of compute instances based on real-time traffic or load',
          another_correct_option_text: '',
          complexity: 'Medium',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'Cloud Platforms for AI',
          topic: 'Cloud AI',
          subtopic: 'Auto-scaling',
          code_snippets: '',
          hints_text: 'Think of matching capacity to current demand.',
          marks: 2,
          solution_explanation:
            'Auto-scaling dynamically increases or decreases the number of running instances based on current demand, helping maintain performance during traffic spikes while controlling cost during periods of low usage.',
        },
      ],
      add_to_test: true,
    },
    {
      competency: 'AI Ethics & Cloud Infrastructure',
      sub_competency: 'GPU/Compute Optimization',
      competency_definition: '',
      sub_competency_definition: '',
      priority: 'must_have',
      questions_count: 3,
      questions: [
        {
          ID: 98,
          question_text:
            'Why are GPUs generally preferred over CPUs for training deep neural networks?',
          question_type: 'MCQ',
          option_1: 'GPUs have higher clock speeds than CPUs in every case',
          option_2:
            'GPUs have many parallel cores well-suited for the matrix/tensor operations common in deep learning',
          option_3: 'GPUs always consume less power than CPUs',
          option_4: 'GPUs are always cheaper to acquire than CPUs',
          correct_option_text:
            'GPUs have many parallel cores well-suited for the matrix/tensor operations common in deep learning',
          another_correct_option_text: '',
          complexity: 'Easy',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'GPU/Compute Optimization',
          topic: 'Compute Optimization',
          subtopic: 'GPU Computing',
          code_snippets: '',
          hints_text:
            'Think of parallelism applied to large matrix multiplications.',
          marks: 1,
          solution_explanation:
            'GPUs contain thousands of smaller cores optimized for parallel execution, making them well-suited for the large matrix and tensor operations that dominate deep learning workloads.',
        },
        {
          ID: 99,
          question_text:
            "What is 'mixed precision training' designed to achieve?",
          question_type: 'MCQ',
          option_1:
            'Training exclusively in FP64 for maximum numerical precision',
          option_2:
            'Using a combination of lower precision (e.g., FP16) and higher precision (e.g., FP32) computations to speed up training and reduce memory usage while maintaining accuracy',
          option_3: 'Disabling GPU acceleration during training',
          option_4: 'Increasing the total number of model parameters',
          correct_option_text:
            'Using a combination of lower precision (e.g., FP16) and higher precision (e.g., FP32) computations to speed up training and reduce memory usage while maintaining accuracy',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'GPU/Compute Optimization',
          topic: 'Compute Optimization',
          subtopic: 'Mixed Precision Training',
          code_snippets: '',
          hints_text: 'It strategically combines FP16 and FP32 computations.',
          marks: 3,
          solution_explanation:
            'Mixed precision training uses lower-precision (e.g., FP16) computations for most operations to save memory and increase throughput, while selectively using higher precision (FP32) for numerically sensitive operations to maintain model accuracy.',
        },
        {
          ID: 100,
          question_text:
            'What is the purpose of gradient checkpointing when training very large neural networks?',
          question_type: 'MCQ',
          option_1:
            'To permanently store all intermediate activations for a faster backward pass',
          option_2:
            'To trade off additional recomputation for reduced memory usage by not storing all intermediate activations',
          option_3: 'To eliminate the need for backpropagation entirely',
          option_4:
            "To increase the model's batch size without any additional memory cost",
          correct_option_text:
            'To trade off additional recomputation for reduced memory usage by not storing all intermediate activations',
          another_correct_option_text: '',
          complexity: 'Hard',
          key_competency: 'AI Ethics & Cloud Infrastructure',
          sub_competency: 'GPU/Compute Optimization',
          topic: 'Compute Optimization',
          subtopic: 'Memory Optimization',
          code_snippets: '',
          hints_text: 'Think of recomputing values instead of storing them.',
          marks: 3,
          solution_explanation:
            'Gradient checkpointing saves memory by not storing all intermediate activations during the forward pass; instead, it recomputes them during the backward pass as needed, trading extra compute for a reduced memory footprint — useful for training very large models.',
        },
      ],
      add_to_test: true,
    },
  ],
  summary: {
    total_competencies: 10,
    total_sub_competencies: 30,
    selected_sub_competencies: 30,
    total_questions: 100,
    total_estimated_duration_minutes: 100,
  },
};

export const assessmentFormationSourceType = {
  QUESTION_UPLOAD:
    'uploaded competency and sub-competency along with questions',
  COMPTENCY_UPLOAD: 'uploaded competency and sub-competency',
  AI_GENERATE: 'ai generated',
};

export const useAssessmentFormationStore = create(
  persist(
    (set, get, store) => ({
      assessmentFormationId: null,
      setAssessmentFormationId: (value) => set({ assessmentFormationId: value }),

      assessmentFormationDetails: null,
      setAssessmentFormationDetails: (updater) =>
        set((state) => ({
          assessmentFormationDetails:
            typeof updater === 'function'
              ? updater(state.assessmentFormationDetails)
              : updater,
        })),

      assessmentFormationSource: null,
      setAssessmentFormationSource: (value) =>
        set({ assessmentFormationSource: value }),

      reset: () => {
        set({
          assessmentFormationId: null,
          assessmentFormationDetails: null,
          assessmentFormationSource: null,
        });
      },
    }),
    {
      name: 'setu_assessment_formation_store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
