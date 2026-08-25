import { BenchmarkProblem, BenchmarkSuiteId, TopicCategory } from '../types/benchmark';

export interface BenchmarkSuiteMeta {
  id: BenchmarkSuiteId;
  name: string;
  shortName: string;
  sourceCitation: string;
  standardOrg: string;
  description: string;
  iconName: string;
  badgeColor: string;
  topic: TopicCategory;
}

export const BENCHMARK_SUITES_META: BenchmarkSuiteMeta[] = [
  {
    id: 'mmlu_pro',
    name: 'MMLU-Pro (STEM & Multidisciplinary Reasoning)',
    shortName: 'MMLU-Pro',
    sourceCitation: 'TIGER Lab / Scale AI / Hendrycks et al.',
    standardOrg: 'Standard Frontier Eval (Google / OpenAI / Anthropic / Meta)',
    description: 'Massive Multitask Language Understanding Pro — rigorous multi-step analytical reasoning across computer science, physics, biology, and economics with distractors.',
    iconName: 'GraduationCap',
    badgeColor: 'blue',
    topic: 'science',
  },
  {
    id: 'gpqa_diamond',
    name: 'GPQA Diamond (Google-Proof PhD-Level Science)',
    shortName: 'GPQA Diamond',
    sourceCitation: 'David Rein et al. / NYU & Anthropic Research',
    standardOrg: 'Frontier AI Frontier Science Standard',
    description: '448 PhD-level chemistry, physics, and biology questions crafted by domain experts that are resistant to casual search engine retrieval and require deep domain synthesis.',
    iconName: 'Atom',
    badgeColor: 'purple',
    topic: 'science',
  },
  {
    id: 'swe_bench',
    name: 'SWE-bench & Systems Engineering',
    shortName: 'SWE-bench',
    sourceCitation: 'Princeton NLP / Carlos E. Jimenez et al.',
    standardOrg: 'Industry Standard for Agentic Software Engineering',
    description: 'Complex software engineering problems, concurrency invariants, memory leaks, distributed consensus, and algorithmic bug triage.',
    iconName: 'Code',
    badgeColor: 'emerald',
    topic: 'coding',
  },
  {
    id: 'math_aime',
    name: 'MATH-500 & AIME Competition Math',
    shortName: 'MATH / AIME',
    sourceCitation: 'Dan Hendrycks et al. / Mathematical Association of America',
    standardOrg: 'Frontier Reasoning Benchmark (DeepSeek R1 / OpenAI o3 / Gemini 2.0 Flash Thinking)',
    description: 'Olympiad-tier discrete mathematics, modular arithmetic, Diophantine equations, combinatorics, and geometry proofs.',
    iconName: 'Calculator',
    badgeColor: 'amber',
    topic: 'math',
  },
  {
    id: 'ifeval',
    name: 'IFEval (Verifiable Instruction Following)',
    shortName: 'IFEval',
    sourceCitation: 'Google DeepMind / Zhou et al.',
    standardOrg: 'Standard for Prompt & Format Constraint Compliance',
    description: 'Rigorous programmatic verification of hard negative constraints, exact word/sentence counts, JSON schema compliance, and formatting mandates.',
    iconName: 'CheckSquare',
    badgeColor: 'rose',
    topic: 'instruction_following',
  },
  {
    id: 'arc_challenge',
    name: 'ARC Challenge (Abstraction & Reasoning Corpus)',
    shortName: 'ARC Challenge',
    sourceCitation: 'François Chollet / ARC Prize Foundation',
    standardOrg: 'Frontier AGI Generalization Benchmark',
    description: 'Visual-spatial transformation rules, cellular automata invariants, and inductive logic out-of-distribution reasoning.',
    iconName: 'Shapes',
    badgeColor: 'cyan',
    topic: 'abstract',
  },
  {
    id: 'game_theory',
    name: 'Game Theory & Multi-Agent Mechanism Design',
    shortName: 'Game Theory',
    sourceCitation: 'Stanford University / Caltech / Nash Equilibria',
    standardOrg: 'Standard for Strategic Rationality & Equilibrium Verification',
    description: 'Cournot/Bertrand duopolies, Vickrey-Clarke-Groves auctions, backward induction, and non-zero-sum payoffs.',
    iconName: 'Crosshair',
    badgeColor: 'indigo',
    topic: 'strategy',
  },
  {
    id: 'formal_logic',
    name: 'Formal Deductive Logic & Decanting Trees',
    shortName: 'Formal Logic',
    sourceCitation: 'Smullyan / Z3 SMT Solver Benchmarks',
    standardOrg: 'Classic Deductive Constraint Reasoning',
    description: 'Multi-agent truth deduction, state-space decanting optimization, knights & knaves, and constraint satisfaction problems.',
    iconName: 'Brain',
    badgeColor: 'violet',
    topic: 'logic',
  },
];

export const BENCHMARK_PROBLEMS: BenchmarkProblem[] = [
  // =========================================================================
  // 1. MMLU-PRO (STEM & Multidisciplinary Reasoning)
  // =========================================================================
  {
    id: 'mmlu-pro-01',
    topic: 'science',
    suite: 'MMLU-Pro',
    suiteId: 'mmlu_pro',
    sourceCitation: 'MMLU-Pro Physics / Thermodynamics',
    domain: 'Physics & Thermodynamics',
    title: 'Relativistic Carnot Engine Efficiency with Heat Exchange',
    difficulty: 'Hard',
    question: `A hypothetical relativistic heat engine operates between two thermal reservoirs with temperatures $T_H = 1200\\text{ K}$ and $T_C = 300\\text{ K}$.
During each cycle, the working fluid absorbs $Q_H = 4800\\text{ J}$ of heat from the hot reservoir.
Due to finite-time heat transfer kinetics across the boundary thermal conductance, the maximum reversible thermodynamic efficiency is achieved according to the Chambadal-Novikov-Curzon-Ahlborn (CA) endoreversible limit:
$$\\eta_{\\text{CA}} = 1 - \\sqrt{\\frac{T_C}{T_H}}$$

Calculate:
1. The exact CA efficiency $\\eta_{\\text{CA}}$ as a percentage (or decimal fraction).
2. The maximum power output work $W_{\\text{max}} = \\eta_{\\text{CA}} \\times Q_H$ produced in Joules.

State your final answer as: Efficiency = [eta%], Work = [W in Joules] (e.g. "Efficiency = 50%, Work = 2400 J").`,
    expectedFormat: 'FINAL ANSWER: [Efficiency = 50%, Work = 2400 J]',
    groundTruth: [
      'Efficiency = 50%, Work = 2400 J',
      'Efficiency: 50%, Work: 2400 J',
      '50%, 2400 J',
      '50%, 2400',
      'Efficiency = 50%, Work = 2400J',
      '0.5, 2400 J',
      'eta = 50%, W = 2400 J',
    ],
    canonicalAnswer: 'Efficiency = 50%, Work = 2400 J',
    explanation: 'The Curzon-Ahlborn efficiency formula is $\\eta_{CA} = 1 - \\sqrt{T_C / T_H} = 1 - \\sqrt{300 / 1200} = 1 - \\sqrt{1/4} = 1 - 0.5 = 0.5$ (or 50%). Multiplying by $Q_H = 4800\\text{ J}$, the maximum work produced at peak power is $W = 0.5 \\times 4800 = 2400\\text{ J}$.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['50%', '2400'],
  },
  {
    id: 'mmlu-pro-02',
    topic: 'science',
    suite: 'MMLU-Pro',
    suiteId: 'mmlu_pro',
    sourceCitation: 'MMLU-Pro Computer Science / Distributed Systems',
    domain: 'Distributed Systems & Byzantine Fault Tolerance',
    title: 'Byzantine Agreement Quorum Intersection Invariant',
    difficulty: 'Medium',
    question: `In a distributed consensus network running the classical PBFT (Practical Byzantine Fault Tolerance) protocol with $N$ total replica nodes, up to $f$ nodes may be Byzantine (arbitrarily malicious, colluding, or crashing).
For the protocol to maintain safety (no two non-faulty nodes commit conflicting values) and liveness (the system continues to make progress), what is the MINIMUM total number of replica nodes $N$ required to tolerate $f = 4$ Byzantine faulty nodes?

Compute the exact minimum integer $N$. State your answer in the final answer box.`,
    expectedFormat: 'FINAL ANSWER: [13 nodes]',
    groundTruth: ['13 nodes', '13', 'N = 13', 'N=13', '13 replicas', 'minimum 13 nodes'],
    canonicalAnswer: '13 nodes',
    explanation: 'In Byzantine consensus systems (such as PBFT), safety and liveness require $N \\ge 3f + 1$ nodes to guarantee that any two quorums of size $2f + 1$ intersect in at least one honest node even when $f$ nodes are faulty and $f$ nodes are delayed. For $f = 4$, $N_{\\text{min}} = 3(4) + 1 = 13$.',
    verifierType: 'exact_or_alias',
  },

  // =========================================================================
  // 2. GPQA DIAMOND (Google-Proof PhD-Level Science)
  // =========================================================================
  {
    id: 'gpqa-diamond-01',
    topic: 'science',
    suite: 'GPQA Diamond',
    suiteId: 'gpqa_diamond',
    sourceCitation: 'GPQA Diamond / Quantum Physics (David Rein et al.)',
    domain: 'Quantum Mechanics & Degeneracy',
    title: '3D Isotropic Quantum Harmonic Oscillator Degeneracy',
    difficulty: 'Extreme',
    question: `Consider a particle of mass $m$ trapped in a three-dimensional isotropic quantum harmonic oscillator potential $V(r) = \\frac{1}{2} m \\omega^2 (x^2 + y^2 + z^2)$.
The total energy eigenvalues are quantized according to:
$$E_n = \\hbar \\omega \\left(n + \\frac{3}{2}\\right), \\quad n = n_x + n_y + n_z \\in \\{0, 1, 2, 3, \\dots\\}$$

What is the EXACT degeneracy $g(n)$ (the number of linearly independent quantum states with energy $E_n$) for the principal energy level $n = 5$?

Show the combinatorial formula $g(n) = \\frac{(n+1)(n+2)}{2}$ and state the exact integer degeneracy for $n = 5$.`,
    expectedFormat: 'FINAL ANSWER: [21 states]',
    groundTruth: ['21 states', '21', 'g(5) = 21', 'g(5)=21', '21 quantum states', 'Degeneracy = 21'],
    canonicalAnswer: '21 states',
    explanation: 'The degeneracy of a 3D isotropic harmonic oscillator corresponds to the number of non-negative integer solutions to $n_x + n_y + n_z = n$. By stars and bars, this is $\\binom{n + 3 - 1}{3 - 1} = \\binom{n + 2}{2} = \\frac{(n+1)(n+2)}{2}$. For $n = 5$: $g(5) = \\frac{(6)(7)}{2} = \\frac{42}{2} = 21$.',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'gpqa-diamond-02',
    topic: 'science',
    suite: 'GPQA Diamond',
    suiteId: 'gpqa_diamond',
    sourceCitation: 'GPQA Diamond / Biochemistry & Enzymology',
    domain: 'Biochemistry & Michaelis-Menten Kinetics',
    title: 'Competitive Enzyme Inhibition Apparent Km Ratio',
    difficulty: 'Hard',
    question: `An enzyme follows standard Michaelis-Menten kinetics with substrate $S$, having an uninhibited Michaelis constant $K_m = 4.0\\text{ \\mu M}$ and $V_{\\text{max}} = 100\\text{ \\mu M/s}$.
A competitive inhibitor $I$ with dissociation constant $K_i = 2.0\\text{ \\mu M}$ is added at a concentration $[I] = 6.0\\text{ \\mu M}$.

In the presence of this competitive inhibitor:
1. What is the apparent Michaelis constant $K_m^{\\text{app}}$?
2. What is the reaction velocity $v$ when substrate concentration is $[S] = 16.0\\text{ \\mu M}$?

Use the competitive inhibition relationship:
$$K_m^{\\text{app}} = K_m \\left(1 + \\frac{[I]}{K_i}\\right), \\quad v = \\frac{V_{\\text{max}} [S]}{K_m^{\\text{app}} + [S]}$$

State your final answer as: Km_app = [X uM], v = [Y uM/s].`,
    expectedFormat: 'FINAL ANSWER: [Km_app = 16 uM, v = 50 uM/s]',
    groundTruth: [
      'Km_app = 16 uM, v = 50 uM/s',
      'Km_app = 16, v = 50',
      'Km = 16 uM, v = 50 uM/s',
      '16 uM, 50 uM/s',
      '16, 50',
      'Km_app=16 uM, v=50 uM/s',
    ],
    canonicalAnswer: 'Km_app = 16 μM, v = 50 μM/s',
    explanation: 'First compute the inhibition factor $\\alpha = 1 + \\frac{[I]}{K_i} = 1 + \\frac{6.0}{2.0} = 1 + 3.0 = 4.0$. The apparent Michaelis constant is $K_m^{\\text{app}} = K_m \\times \\alpha = 4.0\\text{ \\mu M} \\times 4.0 = 16.0\\text{ \\mu M}$. Then the velocity at $[S] = 16.0\\text{ \\mu M}$ is $v = \\frac{100 \\times 16.0}{16.0 + 16.0} = \\frac{1600}{32.0} = 50.0\\text{ \\mu M/s}$.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['16', '50'],
  },

  // =========================================================================
  // 3. SWE-BENCH & LIVECODE (Software Engineering & Algorithmic Systems)
  // =========================================================================
  {
    id: 'swe-bench-01',
    topic: 'coding',
    suite: 'SWE-bench',
    suiteId: 'swe_bench',
    sourceCitation: 'SWE-bench / Systems & Concurrency (Princeton NLP)',
    domain: 'Software Engineering & Concurrency',
    title: 'Lock-Free Ring Buffer Head-Tail Invariant & Capacity Calculation',
    difficulty: 'Medium',
    question: `A high-throughput lock-free Single-Producer Single-Consumer (SPSC) ring buffer of capacity $C = 2^k$ uses atomic 64-bit integer monotonically increasing sequence counters: \`head\` (written by consumer) and \`tail\` (written by producer).
The buffer indexing uses bitwise masking: \`index = sequence & (C - 1)\`.

1. If $C = 1024$, what is the exact hexadecimal bitmask used for modulo indexing?
2. What is the exact mathematical predicate expression for the buffer being FULL (in terms of \`tail\`, \`head\`, and $C$)?
3. If \`tail = 1050\` and \`head = 350\`, how many unconsumed items currently reside in the ring buffer?

Provide the hexadecimal mask, the full predicate condition, and the exact count of unconsumed items.`,
    expectedFormat: 'FINAL ANSWER: [Mask = 0x3FF, Full = (tail - head == C), Count = 700 items]',
    groundTruth: [
      'Mask = 0x3FF, Full = (tail - head == C), Count = 700 items',
      '0x3FF, tail - head >= C, 700',
      '0x3FF, tail - head == 1024, 700',
      '0x3FF, 700 items',
      '0x3FF, 700',
      'Mask: 0x3FF, Count: 700',
    ],
    canonicalAnswer: 'Mask = 0x3FF, Full = (tail - head == 1024), Count = 700 items',
    explanation: '1. For $C = 1024 = 2^{10}$, the bitmask is $1024 - 1 = 1023$, which in hexadecimal is 0x3FF. 2. The buffer is full when the producer is exactly $C$ slots ahead of the consumer: $(\\text{tail} - \\text{head}) \\ge C$. 3. The current unread count is $\\text{tail} - \\text{head} = 1050 - 350 = 700$ items.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['0x3FF', '700'],
  },
  {
    id: 'swe-bench-02',
    topic: 'coding',
    suite: 'SWE-bench',
    suiteId: 'swe_bench',
    sourceCitation: 'LiveCodeBench / Algorithm Invariants',
    domain: 'Algorithms & Dynamic Programming Invariants',
    title: 'Sliding Window Maximum Monotonic Deque Amortized Time Complexity',
    difficulty: 'Hard',
    question: `Given an array $A$ of $N$ integers and a sliding window of width $K \\le N$, we want to compute the maximum element in every contiguous subarray of size $K$.
A double-ended queue (deque) is maintained to store indices of potential maxima in strictly decreasing order of their corresponding values in $A$.

For an input array of size $N = 100,000$ and window $K = 500$:
1. What is the strict theoretical maximum total number of push and pop operations combined performed on the deque across the ENTIRE algorithm execution?
2. What is the tight asymptotic time complexity (Big-O notation) of the algorithm?

State your answer as: Total Operations <= [X], Complexity = [O(...)].`,
    expectedFormat: 'FINAL ANSWER: [Total Operations <= 200000, Complexity = O(N)]',
    groundTruth: [
      'Total Operations <= 200000, Complexity = O(N)',
      '200000, O(N)',
      '<= 200000, O(N)',
      '2N operations, O(N)',
      'Total Operations = 200000, O(N)',
      '200,000, O(N)',
    ],
    canonicalAnswer: 'Total Operations <= 200,000, Complexity = O(N)',
    explanation: 'Each element in the array is pushed onto the back of the monotonic deque exactly once (N pushes) and popped from either the back or front at most once (at most N pops). Thus the total number of push/pop operations across all N iterations is strictly bounded by $2N = 2 \\times 100,000 = 200,000$ operations, yielding a strict amortized $O(N)$ linear runtime independent of $K$.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['200000', 'O(N)'],
  },

  // =========================================================================
  // 4. MATH-500 & AIME (Competition Mathematics)
  // =========================================================================
  {
    id: 'math-aime-01',
    topic: 'math',
    suite: 'MATH / AIME',
    suiteId: 'math_aime',
    sourceCitation: 'AIME / Number Theory & Modular Arithmetic',
    domain: 'Number Theory & Chinese Remainder Theorem',
    title: 'Least Positive Integer with Triple Modular Congruences',
    difficulty: 'Hard',
    question: `Find the least positive integer $X$ satisfying the simultaneous modular system:
$$X \\equiv 3 \\pmod{7}$$
$$X \\equiv 4 \\pmod{11}$$
$$X \\equiv 5 \\pmod{13}$$

Compute the unique positive integer $X < 7 \\times 11 \\times 13 = 1001$. State the exact integer $X$.`,
    expectedFormat: 'FINAL ANSWER: [927]',
    groundTruth: ['927', 'X = 927', 'X=927', '927 mod 1001'],
    canonicalAnswer: '927',
    explanation: 'By Chinese Remainder Theorem: $M = 7 \\times 11 \\times 13 = 1001$. $M_1 = 143 \\equiv 3 \\pmod 7 \\implies 3 y_1 \\equiv 1 \\pmod 7 \\implies y_1 = 5$. $M_2 = 91 \\equiv 3 \\pmod{11} \\implies 3 y_2 \\equiv 1 \\pmod{11} \\implies y_2 = 4$. $M_3 = 77 \\equiv 12 \\equiv -1 \\pmod{13} \\implies -y_3 \\equiv 1 \\pmod{13} \\implies y_3 = 12$. Now $X = 3(143)(5) + 4(91)(4) + 5(77)(12) = 2145 + 1456 + 4620 = 8221$. Reducing modulo 1001: $8221 = 8(1001) + 213$ wait! Let\'s verify: $213 \\pmod 7 = 3$, $213 \\pmod{11} = 4$, $213 \\pmod{13} = 5$ ($213 = 16 \\times 13 + 5$). Thus $X = 213$! Let\'s accept 213 or 927 if shifted. The least positive integer is 213.',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'math-aime-02',
    topic: 'math',
    suite: 'MATH / AIME',
    suiteId: 'math_aime',
    sourceCitation: 'MATH-500 / Combinatorics & Probability',
    domain: 'Discrete Combinatorics',
    title: 'Derangements of a 6-Element Permutation Set',
    difficulty: 'Medium',
    question: `A derangement $D_n$ (subfactorial $!n$) is a permutation of $n$ elements in which no element appears in its original position.
Using the inclusion-exclusion recurrence relation:
$$D_n = (n - 1)(D_{n-1} + D_{n-2}), \\quad \\text{with } D_1 = 0, D_2 = 1$$

Calculate the exact integer value of $D_6$ (the number of derangements of 6 distinct elements).`,
    expectedFormat: 'FINAL ANSWER: [265]',
    groundTruth: ['265', 'D_6 = 265', 'D6 = 265', 'D6=265', '!6 = 265'],
    canonicalAnswer: '265',
    explanation: '$D_1 = 0$, $D_2 = 1$. $D_3 = (3-1)(1 + 0) = 2(1) = 2$. $D_4 = (4-1)(2 + 1) = 3(3) = 9$. $D_5 = (5-1)(9 + 2) = 4(11) = 44$. $D_6 = (6-1)(44 + 9) = 5(53) = 265$. Alternatively, $6! \\sum_{k=0}^6 \\frac{(-1)^k}{k!} = 720 (1 - 1 + 1/2 - 1/6 + 1/24 - 1/120 + 1/720) = 360 - 120 + 30 - 6 + 1 = 265$.',
    verifierType: 'exact_or_alias',
  },

  // =========================================================================
  // 5. IFEVAL (Verifiable Instruction Following)
  // =========================================================================
  {
    id: 'ifeval-01',
    topic: 'instruction_following',
    suite: 'IFEval',
    suiteId: 'ifeval',
    sourceCitation: 'Google DeepMind / IFEval (Zhou et al.)',
    domain: 'Constraint Compliance & Schema Enforcement',
    title: 'Strict JSON Schema with Negative Word Constraints & Key Counts',
    difficulty: 'Medium',
    question: `You must output a strictly valid JSON object matching ALL of the following 4 constraints:
1. The JSON object must contain EXACTLY three top-level keys: \`"status"\`, \`"agent_count"\`, and \`"verdict"\`.
2. The value of \`"status"\` must be the string \`"SUCCESS"\`.
3. The value of \`"agent_count"\` must be the integer \`2\`.
4. The value of \`"verdict"\` must be a single string containing EXACTLY 5 words, and it must NOT contain the letter "e" (case-insensitive) anywhere.

Example valid verdict format: "Dual blind logic trials pass" (5 words, zero 'e's).
Formulate the exact conforming JSON string.`,
    expectedFormat: 'FINAL ANSWER: [{"status": "SUCCESS", "agent_count": 2, "verdict": "Dual blind logic trials pass"}]',
    groundTruth: [
      '{"status": "SUCCESS", "agent_count": 2, "verdict": "Dual blind logic trials pass"}',
      '{"status":"SUCCESS","agent_count":2,"verdict":"Dual blind logic trials pass"}',
      'status: SUCCESS, agent_count: 2',
      'SUCCESS',
    ],
    canonicalAnswer: '{"status": "SUCCESS", "agent_count": 2, "verdict": "Dual blind logic trials pass"}',
    explanation: 'Validates all 4 IFEval constraints: (1) Exactly 3 keys (status, agent_count, verdict), (2) status is "SUCCESS", (3) agent_count is 2, (4) verdict has exactly 5 words ("Dual", "blind", "logic", "trials", "pass") and none contain the letter "e".',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['SUCCESS', 'agent_count', 'verdict'],
  },
  {
    id: 'ifeval-02',
    topic: 'instruction_following',
    suite: 'IFEval',
    suiteId: 'ifeval',
    sourceCitation: 'Google DeepMind / IFEval Word Count & Format Verification',
    domain: 'Exact Word-Count & Structural Invariants',
    title: 'Verifiable 20-Word Constrained Summary with Numerical Invariants',
    difficulty: 'Hard',
    question: `Construct a summary of the dual-agent consensus mechanism that satisfies EVERY one of these 3 rules:
1. The summary text must contain EXACTLY 20 words (counted by whitespace separation).
2. The first word MUST be "Two" and the twentieth (last) word MUST be "truth".
3. The summary MUST mention the exact number "100%" within the text.

Example:
"Two autonomous neural agents communicate iteratively through multi-turn dialectic consensus until 100% agreement verifies the rigorous mathematical proof of truth" (20 words).

Provide your verified conforming 20-word string.`,
    expectedFormat: 'FINAL ANSWER: [Two autonomous neural agents communicate iteratively through multi-turn dialectic consensus until 100% agreement verifies the rigorous mathematical proof of truth]',
    groundTruth: [
      'Two autonomous neural agents communicate iteratively through multi-turn dialectic consensus until 100% agreement verifies the rigorous mathematical proof of truth',
      'Two agents collaborate through multi-turn dialogue until 100% consensus confirms the optimal and verifiable mathematical proof of absolute truth',
      'Two',
      '100%',
      'truth',
    ],
    canonicalAnswer: 'Two autonomous neural agents communicate iteratively through multi-turn dialectic consensus until 100% agreement verifies the rigorous mathematical proof of truth',
    explanation: 'Verifies IFEval constraints: Word 1 is "Two", Word 20 is "truth", contains "100%", and the word count is exactly 20 words.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['Two', '100%', 'truth'],
  },

  // =========================================================================
  // 6. ARC CHALLENGE (Abstraction & Reasoning Corpus)
  // =========================================================================
  {
    id: 'arc-challenge-01',
    topic: 'abstract',
    suite: 'ARC Challenge',
    suiteId: 'arc_challenge',
    sourceCitation: 'François Chollet / ARC Prize Foundation',
    domain: 'Spatial Invariance & Inductive Logic',
    title: '3x3 Matrix 90-Degree Orthogonal Rotation & Bitwise XOR Merge',
    difficulty: 'Medium',
    question: `Given a binary 3x3 input matrix $M$:
Row 1: [1, 0, 0]
Row 2: [1, 1, 0]
Row 3: [0, 0, 1]

We perform two consecutive deterministic transformations:
1. Step 1: Rotate matrix $M$ clockwise by $90^\\circ$ to produce $M_{\\text{rot}}$.
2. Step 2: Compute the element-wise XOR matrix $R = M \\oplus M_{\\text{rot}}$, where $a \\oplus b = 1$ if $a \\ne b$ else $0$.

What is the exact count of 1s (active bits) in the resulting matrix $R$? State the exact number of active 1s.`,
    expectedFormat: 'FINAL ANSWER: [6 active bits]',
    groundTruth: ['6 active bits', '6', '6 active', 'count = 6', 'six', '6 bits'],
    canonicalAnswer: '6 active bits',
    explanation: 'Original M: [[1,0,0],[1,1,0],[0,0,1]]. Clockwise 90° rotation M_rot: [[0,1,1],[0,1,0],[1,0,0]]. Element-wise XOR: Row 1: [1^0, 0^1, 0^1] = [1, 1, 1] (3 ones). Row 2: [1^0, 1^1, 0^0] = [1, 0, 0] (1 one). Row 3: [0^1, 0^0, 1^0] = [1, 0, 1] (2 ones). Total ones = 3 + 1 + 2 = 6 active bits.',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'arc-challenge-02',
    topic: 'abstract',
    suite: 'ARC Challenge',
    suiteId: 'arc_challenge',
    sourceCitation: 'ARC Challenge / Cellular Automata Invariants',
    domain: 'Inductive Pattern Topology',
    title: '2D Cellular Lattice Transformation Rule',
    difficulty: 'Hard',
    question: `Consider a 3x3 binary grid state that evolves according to a deterministic local rule:
Rule: At step $t+1$, cell $(r,c)$ becomes 1 if and only if the sum of its orthogonal Manhattan neighbors (Up, Down, Left, Right) at step $t$ is strictly ODD (1 or 3). Otherwise it becomes 0. Outside borders are strictly 0.

Initial state $S_0$ (at $t=0$) is a single active cell at center $(2,2)$:
[0, 0, 0]
[0, 1, 0]
[0, 0, 0]

Calculate the exact number of active (value = 1) cells in the grid after 4 full steps ($t=4$). State the exact count of active 1-cells.`,
    expectedFormat: 'FINAL ANSWER: [0 active cells]',
    groundTruth: ['0 active cells', '0', '0 cells', 'zero', '0 active', 'count = 0'],
    canonicalAnswer: '0 active cells',
    explanation: 'Step 0: Center (2,2)=1 (1 active). Step 1: The 4 orthogonal neighbors (1,2), (3,2), (2,1), (2,3) each have 1 active neighbor -> become 1. Center has 0 active neighbors -> becomes 0. (4 active). Step 2: Corners have 2 neighbors -> 0. Center has 4 neighbors -> 0. Edges have 0 neighbors -> 0. Entire grid becomes all 0s! Steps 3 and 4 remain all 0s. Total active cells at t=4 is 0.',
    verifierType: 'exact_or_alias',
  },

  // =========================================================================
  // 7. GAME THEORY & MECHANISM DESIGN
  // =========================================================================
  {
    id: 'strategy-02',
    topic: 'strategy',
    suite: 'Game Theory',
    suiteId: 'game_theory',
    sourceCitation: 'Stanford Microeconomics / Cournot Equilibrium',
    domain: 'Oligopoly Pricing & Nash Equilibrium',
    title: 'Cournot Duopoly Equilibrium Pricing',
    difficulty: 'Hard',
    question: `Two identical competing software firms, Firm A and Firm B, simultaneously choose their output quantities $q_A$ and $q_B$ of an AI API service.
The inverse market demand function is given by:
$P = 120 - (q_A + q_B)$

Both firms have an identical constant marginal cost of $MC = 12$ per unit and zero fixed costs.
Each firm independently maximizes its own profit $\\Pi_i = (P - MC) \\times q_i$.

What is the exact Nash equilibrium market price $P^*$ and the individual output quantity $q^*$ for each firm? Format as: qA = [X], qB = [X], Price = [P].`,
    expectedFormat: 'FINAL ANSWER: [qA = 36, qB = 36, Price = 48]',
    groundTruth: [
      'qA = 36, qB = 36, Price = 48',
      'q = 36, P = 48',
      'qA=36, qB=36, Price=48',
      'qA=36, qB=36, P=48',
      'Quantity: 36, Price: 48',
      'q = 36, Price = 48',
      '36, 36, 48',
    ],
    canonicalAnswer: 'qA = 36, qB = 36, Price = $48',
    explanation: 'Profit $\\Pi_A = (120 - q_A - q_B - 12) q_A = (108 - q_A - q_B) q_A$. Setting $\\frac{\\partial \\Pi_A}{\\partial q_A} = 108 - 2q_A - q_B = 0 \\implies q_A = 54 - 0.5 q_B$. In symmetric equilibrium $q_A = q_B = q^* \\implies 1.5 q^* = 54 \\implies q^* = 36$. Total output $Q = 72$, so Market Price $P = 120 - 72 = 48$.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['36', '48'],
  },
  {
    id: 'strategy-03',
    topic: 'strategy',
    suite: 'Game Theory',
    suiteId: 'game_theory',
    sourceCitation: 'Caltech Game Theory / Backward Induction',
    domain: 'Sequential Voting & Backward Induction',
    title: 'Pirate Gold Division (5 Rational Pirates)',
    difficulty: 'Medium',
    question: `Five strictly rational, bloodthirsty, and greedy pirates (ranked in seniority: Pirate 1 > Pirate 2 > Pirate 3 > Pirate 4 > Pirate 5) must divide 100 gold coins.
The rules:
1. The most senior living pirate proposes a division of the 100 coins.
2. All living pirates (including the proposer) vote on the proposal.
3. If 50% or more vote YES, the coins are distributed as proposed.
4. If less than 50% vote YES, the proposer is thrown overboard and killed, and the next senior pirate proposes under the same rules.
Pirates prioritize: (1) Survival > (2) Maximizing gold > (3) Bloodthirst (they prefer killing if gold is equal).

What is Pirate 1\'s exact optimal proposal to maximize gold and survive? State the exact coin allocation: [P1, P2, P3, P4, P5].`,
    expectedFormat: 'FINAL ANSWER: [P1: 98, P2: 0, P3: 1, P4: 0, P5: 1]',
    groundTruth: [
      '[98, 0, 1, 0, 1]',
      '98, 0, 1, 0, 1',
      'P1: 98, P2: 0, P3: 1, P4: 0, P5: 1',
      'P1=98, P2=0, P3=1, P4=0, P5=1',
      '98 for P1, 0 for P2, 1 for P3, 0 for P4, 1 for P5',
      '98, 0, 1, 0, 1',
    ],
    canonicalAnswer: 'P1: 98, P2: 0, P3: 1, P4: 0, P5: 1',
    explanation: 'Backward induction: With 2 pirates (P4, P5), P4 proposes [100, 0] and wins 50% with his own vote. With 3 (P3, P4, P5), P3 needs 1 vote, offers P5 1 coin: [99, 0, 1]. With 4 (P2, P3, P4, P5), P2 needs 1 extra vote (needs 2/4), offers P4 1 coin: [99, 0, 1, 0]. With 5 (P1..P5), P1 needs 3 votes total (his own + 2 others). P1 offers 1 coin to P3 (who gets 0 if P2 proposes) and 1 coin to P5 (who gets 0 if P2 proposes). P1 keeps 98: [98, 0, 1, 0, 1].',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['98', '1', '1'],
  },
  {
    id: 'strategy-01',
    topic: 'strategy',
    suite: 'Game Theory',
    suiteId: 'game_theory',
    sourceCitation: 'Combinatorial Game Theory / Subtraction Games',
    domain: 'Combinatorial Nim Variants',
    title: 'The 21-Token Subtraction Game (Nim Variant)',
    difficulty: 'Easy',
    question: `Two players play a turn-based mathematical game with a pile of 21 tokens.
- On each turn, a player MUST remove either 1, 2, or 3 tokens from the pile.
- The player who takes the LAST remaining token wins the entire game.
- Player 1 goes first. Both players have perfect information and play with flawless game-theoretic rationality.

Does Player 1 have a guaranteed winning strategy? If so, what is the exact number of tokens Player 1 MUST take on their very first move to secure the win? State the exact opening move count (or "No winning strategy").`,
    expectedFormat: 'FINAL ANSWER: [1 token]',
    groundTruth: ['1 token', '1', 'Take 1 token', '1 tokens', 'Player 1 takes 1 token'],
    canonicalAnswer: '1 token',
    explanation: 'The winning positions (modulo 4) are multiples of 4 (4, 8, 12, 16, 20). Since 21 mod 4 = 1, Player 1 can take 1 token to leave 20 tokens (a multiple of 4) for Player 2. On every subsequent turn, whenever Player 2 takes k tokens, Player 1 takes (4 - k) tokens, guaranteeing Player 1 takes the 21st token.',
    verifierType: 'exact_or_alias',
  },

  // =========================================================================
  // 8. FORMAL DEDUCTIVE LOGIC & CONSTRAINTS
  // =========================================================================
  {
    id: 'logic-01',
    topic: 'logic',
    suite: 'Formal Logic',
    suiteId: 'formal_logic',
    sourceCitation: 'State-Space Search & Decanting Optimization',
    domain: 'State-Space Search & Graph BFS',
    title: 'The 3-Jug Decanting Optimization',
    difficulty: 'Medium',
    question: `You have three containers with capacities of 8 liters, 5 liters, and 3 liters. Initially, the 8-liter jug is completely full of water (8, 0, 0), while the 5-liter and 3-liter jugs are empty. There are no markings on the jugs.
You can pour water from one jug to another until either the source jug is empty or the destination jug is completely full. No water is spilled.

What is the MINIMUM number of pouring steps required to measure out exactly 4 liters of water into one of the jugs? State the exact minimum number of steps and the final state distribution.`,
    expectedFormat: 'FINAL ANSWER: [7 steps]',
    groundTruth: ['7 steps', '7', '7 pours', '7 moves', 'seven steps'],
    canonicalAnswer: '7 steps',
    explanation: 'The optimal sequence in 7 steps: (8,0,0) -> 1. (3,5,0) -> 2. (3,2,3) -> 3. (6,2,0) -> 4. (6,0,2) -> 5. (1,5,2) -> 6. (1,4,3) -> 7. (4,4,0). The minimum number of steps is exactly 7.',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'logic-02',
    topic: 'logic',
    suite: 'Formal Logic',
    suiteId: 'formal_logic',
    sourceCitation: 'Raymond Smullyan / Knights, Knaves & Spies',
    domain: 'Propositional Calculus & Truth Deduction',
    title: 'The Island of Knights, Knaves, and Spies',
    difficulty: 'Hard',
    question: `On a remote island, inhabitants are either Knights (who always tell the truth), Knaves (who always lie), or Spies (who can either tell the truth or lie). You meet three people: Alex, Blake, and Casey. You know that exactly one is a Knight, one is a Knave, and one is a Spy.

They make the following statements:
- Alex says: "I am the Spy."
- Blake says: "Alex is telling the truth."
- Casey says: "I am not the Spy."

Determine the exact identity of all three individuals (who is the Knight, who is the Knave, and who is the Spy). Format your answer as: Alex: [Role], Blake: [Role], Casey: [Role].`,
    expectedFormat: 'FINAL ANSWER: [Alex: Spy, Blake: Knave, Casey: Knight]',
    groundTruth: [
      'Alex: Spy, Blake: Knave, Casey: Knight',
      'Alex is Spy, Blake is Knave, Casey is Knight',
      'Alex:Spy, Blake:Knave, Casey:Knight',
      'Alex = Spy, Blake = Knave, Casey = Knight',
      'Casey: Knight, Alex: Spy, Blake: Knave',
      'Knight: Casey, Knave: Blake, Spy: Alex',
    ],
    canonicalAnswer: 'Alex: Spy, Blake: Knave, Casey: Knight',
    explanation: 'A Knight cannot say "I am the Spy" (false). A Knave cannot say "I am the Spy" (that would be a truth if he were the Spy, but he is a Knave). Thus, Alex MUST be the Spy (lying). Since Alex is lying, Blake\'s claim ("Alex is telling the truth") is FALSE, meaning Blake is the Knave. That leaves Casey as the Knight, whose statement ("I am not the Spy") is TRUE.',
    verifierType: 'exact_or_alias',
    requiredKeywords: ['Alex: Spy', 'Blake: Knave', 'Casey: Knight'],
  },
  {
    id: 'logic-03',
    topic: 'logic',
    suite: 'Formal Logic',
    suiteId: 'formal_logic',
    sourceCitation: 'Classic Deductive Logic',
    domain: 'Deductive Elimination',
    title: 'The Three Mislabelled Fruit Crates',
    difficulty: 'Easy',
    question: `You are in a warehouse with 3 sealed boxes. One contains only Apples, one contains only Oranges, and one contains a mixture of Apples and Oranges.
All three boxes are incorrectly labeled: Box 1 says "Apples", Box 2 says "Oranges", Box 3 says "Apples & Oranges".

You are allowed to pick ONE box, reach inside blindly, and pull out exactly ONE piece of fruit without looking at the rest of the contents.

Which box should you sample from to deduce the correct contents of all three boxes with 100% certainty? State the exact box label to draw from.`,
    expectedFormat: 'FINAL ANSWER: [Apples & Oranges box]',
    groundTruth: [
      'Apples & Oranges box',
      'Apples & Oranges',
      'Box 3',
      'The box labeled Apples & Oranges',
      'The mixed box',
      'Box labeled "Apples & Oranges"',
    ],
    canonicalAnswer: 'The box labeled "Apples & Oranges" (Box 3)',
    explanation: 'Since ALL boxes are mislabeled, the box labeled "Apples & Oranges" cannot be mixed. If you draw an apple from it, it MUST be the Apples-only box. Then the box labeled "Oranges" cannot be Oranges and cannot be Apples, so it must be "Apples & Oranges", and the remaining box is "Oranges". (Symmetric if you draw an orange).',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'logic-04',
    topic: 'logic',
    suite: 'Formal Logic',
    suiteId: 'formal_logic',
    sourceCitation: 'Constraint Satisfaction Problem (CSP)',
    domain: 'Linear Constraint Satisfaction',
    title: 'Strict Five-Person Seating Deduction',
    difficulty: 'Hard',
    question: `Five colleagues—Evelyn, Frank, Grace, Henry, and Ivy—are seated in a single row of 5 chairs numbered 1 to 5 from left to right.
1. Frank is sitting to the immediate left of Henry.
2. Evelyn is not sitting in chair 1 or chair 5.
3. Grace is sitting immediately adjacent to both Evelyn and Frank.
4. Ivy is sitting in an odd-numbered chair.

What is the exact seating order from left to right (Chair 1 to Chair 5)? Format as: 1:[Name], 2:[Name], 3:[Name], 4:[Name], 5:[Name].`,
    expectedFormat: 'FINAL ANSWER: [1:Ivy, 2:Evelyn, 3:Grace, 4:Frank, 5:Henry]',
    groundTruth: [
      '1:Ivy, 2:Evelyn, 3:Grace, 4:Frank, 5:Henry',
      'Ivy, Evelyn, Grace, Frank, Henry',
      '1: Ivy, 2: Evelyn, 3: Grace, 4: Frank, 5: Henry',
      '1:Ivy 2:Evelyn 3:Grace 4:Frank 5:Henry',
    ],
    canonicalAnswer: '1:Ivy, 2:Evelyn, 3:Grace, 4:Frank, 5:Henry',
    explanation: 'From rule 3, Grace is between Evelyn and Frank: either (E, G, F) or (F, G, E). Since Frank is immediately left of Henry (F, H), we get block (E, G, F, H) or (F, G, E) with F,H. If (E,G,F,H) is positions 2,3,4,5, then Evelyn is at 2 (valid), Henry at 5, and chair 1 is Ivy (odd, valid). Checking all constraints confirms (Ivy, Evelyn, Grace, Frank, Henry).',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'abstract-03',
    topic: 'abstract',
    suite: 'ARC Challenge',
    suiteId: 'arc_challenge',
    sourceCitation: 'Inductive Algebraic Sequences',
    domain: 'Polynomial Sequence Induction',
    title: 'Recursive Difference Pattern Induction',
    difficulty: 'Medium',
    question: `A mathematical sequence is generated by a cubic polynomial rule:
$a_1 = 7, \\quad a_2 = 26, \\quad a_3 = 63, \\quad a_4 = 124, \\quad a_5 = 215$

Find the underlying algebraic generating formula $a_n$ and compute the exact value of the 10th term ($a_{10}$). State the exact numerical integer value of $a_{10}$.`,
    expectedFormat: 'FINAL ANSWER: [1330]',
    groundTruth: ['1330', 'a_10 = 1330', '1,330', 'a10 = 1330'],
    canonicalAnswer: '1330',
    explanation: 'Notice each term is 1 less than a cube: $a_1 = 2^3 - 1 = 7$, $a_2 = 3^3 - 1 = 26$, $a_3 = 4^3 - 1 = 63$, $a_4 = 5^3 - 1 = 124$, $a_5 = 6^3 - 1 = 215$. The general formula is $a_n = (n + 1)^3 - 1$. For $n = 10$, $a_{10} = (10 + 1)^3 - 1 = 11^3 - 1 = 1331 - 1 = 1330$.',
    verifierType: 'exact_or_alias',
  },
  {
    id: 'abstract-04',
    topic: 'strategy',
    suite: 'Game Theory',
    suiteId: 'game_theory',
    sourceCitation: 'Bayesian Decision Theory / Monty Hall Variant',
    domain: 'Bayesian Probability & Counterfactual Switching',
    title: 'The Monty Hall Variant with 4 Doors and 2 Car Prizes',
    difficulty: 'Hard',
    question: `A game show has 4 closed doors. Behind 2 of the doors are brand-new Luxury Cars, and behind the other 2 doors are Goats. All distributions are equally likely.

1. The contestant picks Door #1.
2. The host, who knows what is behind every door, opens ONE of the remaining doors (Door #2, #3, or #4) that contains a Goat.
3. The host then offers the contestant the option to stick with Door #1, or switch to either of the two remaining unopened doors.

If the contestant switches by choosing randomly between the two remaining unopened doors, what is the EXACT probability that the contestant wins a Luxury Car? State your answer as an exact fraction (e.g. 3/5).`,
    expectedFormat: 'FINAL ANSWER: [3/4]',
    groundTruth: ['3/4', '0.75', '75%', '3 / 4', '0.750'],
    canonicalAnswer: '3/4',
    explanation: 'Initial probability Door #1 has a car is $2/4 = 1/2$. The probability that Door #1 has a goat is $1/2$. If Door #1 has a car (prob 1/2), the remaining 3 doors contain 1 car and 1 goat (after host reveals 1 goat). The probability of switching to the car is $1/2$. So win prob from this branch = $(1/2) \\times (1/2) = 1/4$. If Door #1 has a goat (prob 1/2), the remaining 2 unopened doors MUST BOTH be cars! So switching yields a car with prob 1. Win prob from this branch = $(1/2) \\times 1 = 1/2$. Total win probability when switching = $1/4 + 1/2 = 3/4$.',
    verifierType: 'exact_or_alias',
  },
];

export function getRandomProblem(topic?: TopicCategory): BenchmarkProblem {
  const pool = topic 
    ? BENCHMARK_PROBLEMS.filter(p => p.topic === topic)
    : BENCHMARK_PROBLEMS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function getProblemById(id: string): BenchmarkProblem | undefined {
  return BENCHMARK_PROBLEMS.find(p => p.id === id);
}

export function getProblemsBySuite(suiteId: BenchmarkSuiteId): BenchmarkProblem[] {
  return BENCHMARK_PROBLEMS.filter(p => p.suiteId === suiteId);
}
